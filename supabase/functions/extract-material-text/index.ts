import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
import { verifyCallerAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const {
      material_id,
      submission_id,
      storage_path: explicitPath,
      bucket: explicitBucket,
      content_item_id,
    } = body;

    // 1. Verify caller authorization
    const authCtx = await verifyCallerAuth(req);
    if (!authCtx.isAuthorized) {
      return jsonResponse({ error: authCtx.errorMessage || "Unauthorized" }, 401);
    }

    let targetPath = explicitPath;
    let targetBucket = explicitBucket || "class-materials";
    let documentName = "Document";
    let documentType = "File";
    let inlineText = "";

    // 2. Resolve path from Material if material_id provided
    if (material_id && !targetPath) {
      const { data: material, error: matErr } = await adminSupabase
        .from("materials")
        .select("id, name, category, content")
        .eq("id", material_id)
        .maybeSingle();

      if (matErr || !material) {
        return jsonResponse({ error: "Material not found" }, 404);
      }

      documentName = material.name;
      const contentList = Array.isArray(material.content) ? material.content : [];
      const item = content_item_id
        ? contentList.find((c: any) => c.id === content_item_id)
        : contentList[0];

      if (item) {
        documentType = item.type;
        documentName = item.name || documentName;
        targetPath = item.path;

        if (item.type === "URL" || item.path?.startsWith("http")) {
          // Fetch external URL content if accessible
          try {
            const urlRes = await fetch(item.path);
            if (urlRes.ok) {
              const fetchedText = await urlRes.text();
              return jsonResponse({
                success: true,
                name: documentName,
                type: "URL",
                path: item.path,
                text: fetchedText,
                char_count: fetchedText.length,
              });
            }
          } catch (e: any) {
            inlineText = `URL Link: ${item.path}\nDescription: ${item.description || ""}`;
          }
        }
      }
    }

    // 3. Resolve path from Submission if submission_id provided
    if (submission_id && !targetPath) {
      targetBucket = "student-submissions";
      const { data: submission, error: subErr } = await adminSupabase
        .from("student_submissions")
        .select("id, content")
        .eq("id", submission_id)
        .maybeSingle();

      if (subErr || !submission) {
        return jsonResponse({ error: "Submission not found" }, 404);
      }

      const contentList = Array.isArray(submission.content) ? submission.content : [];
      const item = content_item_id
        ? contentList.find((c: any) => c.id === content_item_id)
        : contentList[0];

      if (item) {
        documentName = item.name || "Student Turn-in";
        documentType = item.type;
        targetPath = item.path;

        if (item.path?.startsWith("text://")) {
          inlineText = item.description || "";
        }
      }
    }

    // If we already have inline text
    if (inlineText) {
      return jsonResponse({
        success: true,
        name: documentName,
        type: documentType,
        path: targetPath || "inline",
        text: inlineText,
        char_count: inlineText.length,
      });
    }

    if (!targetPath) {
      return jsonResponse({ error: "Could not resolve storage path for target document" }, 400);
    }

    // 4. Download file from Supabase Storage
    const { data: fileBlob, error: downloadError } = await adminSupabase.storage
      .from(targetBucket)
      .download(targetPath);

    if (downloadError || !fileBlob) {
      return jsonResponse(
        { error: `Failed to download file from bucket '${targetBucket}': ${downloadError?.message || "File not found"}` },
        404,
      );
    }

    // 5. Decode text representation
    const rawBuffer = await fileBlob.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let decodedText = decoder.decode(rawBuffer);

    // Clean up null bytes or binary control characters if present
    decodedText = decodedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");

    return jsonResponse({
      success: true,
      name: documentName,
      type: documentType,
      path: targetPath,
      bucket: targetBucket,
      text: decodedText,
      char_count: decodedText.length,
    });
  } catch (error: any) {
    console.error("Extract Material Text Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
