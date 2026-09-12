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
    const { material_id, class_id } = body;

    if (!material_id) {
      return jsonResponse({ error: "Missing required 'material_id'" }, 400);
    }

    // 1. Verify caller authorization
    const authCtx = await verifyCallerAuth(req);
    if (!authCtx.isAuthorized) {
      return jsonResponse({ error: authCtx.errorMessage || "Unauthorized" }, 401);
    }

    // 2. Fetch material record
    const { data: material, error: matErr } = await adminSupabase
      .from("materials")
      .select("id, user_id, name, category, content, rubric_criteria, max_score, tags")
      .eq("id", material_id)
      .maybeSingle();

    if (matErr || !material) {
      return jsonResponse({ error: "Material record not found" }, 404);
    }

    // 2b. Fetch class-private content if class_id is provided
    let customContent: any[] = [];
    let customRubric: any[] = [];
    if (class_id) {
      const { data: classLink } = await adminSupabase
        .from("class_materials")
        .select("custom_content, custom_rubric_criteria")
        .eq("class_id", class_id)
        .eq("material_id", material_id)
        .maybeSingle();

      if (classLink) {
        if (Array.isArray(classLink.custom_content)) customContent = classLink.custom_content;
        if (Array.isArray(classLink.custom_rubric_criteria)) customRubric = classLink.custom_rubric_criteria;
      }
    }

    // 3. Extract text from canonical + class-private content items
    let extractedText = "";
    const canonicalContent = Array.isArray(material.content) ? material.content : [];
    const contentList = [...canonicalContent, ...customContent];
    const combinedRubric = [...(Array.isArray(material.rubric_criteria) ? material.rubric_criteria : []), ...customRubric];

    for (const item of contentList) {
      if (item.type === "URL" && item.path) {
        try {
          const urlRes = await fetch(item.path);
          if (urlRes.ok) {
            const fetched = await urlRes.text();
            extractedText += `${fetched}\n`;
          }
        } catch {
          extractedText += `URL Resource: ${item.path}\n`;
        }
      } else if (item.type === "File" && item.path) {
        try {
          const { data: fileBlob } = await adminSupabase.storage
            .from("class-materials")
            .download(item.path);

          if (fileBlob) {
            const rawBuffer = await fileBlob.arrayBuffer();
            const decoder = new TextDecoder("utf-8", { fatal: false });
            extractedText += `${decoder.decode(rawBuffer)}\n`;
          }
        } catch (e: any) {
          console.warn(`Could not extract material file ${item.path}:`, e.message);
        }
      }
    }

    extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ").trim();

    // 4. Update status in hidden ai.material_insights
    await adminSupabase
      .from("material_insights")
      .upsert({
        material_id: material.id,
        status: "processing",
        updated_at: new Date().toISOString(),
      });

    // 5. Dispatch async request to FastAPI backend analysis endpoint
    const backendBaseUrl = Deno.env.get("BACKEND_API_URL") || "http://127.0.0.1:8000";
    const analyzeEndpoint = `${backendBaseUrl}/api/materials/analyze`;

    let backendResponse: any = null;
    try {
      const resp = await fetch(analyzeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") || "",
        },
        body: JSON.stringify({
          material_id: material.id,
          name: material.name,
          category: material.category,
          rubric_criteria: combinedRubric,
          extracted_text: extractedText || material.name,
        }),
      });

      if (resp.ok) {
        backendResponse = await resp.json();
      } else {
        const errText = await resp.text();
        console.warn(`Backend /api/materials/analyze returned ${resp.status}:`, errText);
      }
    } catch (backendErr: any) {
      console.warn("Backend /api/materials/analyze dispatch warning:", backendErr.message);
    }

    return jsonResponse({
      success: true,
      material_id: material.id,
      status: backendResponse ? "analyzed" : "queued_for_analysis",
      extracted_char_count: extractedText.length,
    });
  } catch (error: any) {
    console.error("Trigger Material Analysis Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
