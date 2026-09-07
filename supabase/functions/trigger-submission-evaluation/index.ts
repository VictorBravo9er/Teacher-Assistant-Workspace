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
    const { submission_id, class_id, material_id, student_id } = body;

    if (!submission_id) {
      return jsonResponse({ error: "Missing required 'submission_id'" }, 400);
    }

    // 1. Verify caller authorization (Service Role from pg_net or Authenticated User)
    const authCtx = await verifyCallerAuth(req, class_id);
    if (!authCtx.isAuthorized) {
      return jsonResponse({ error: authCtx.errorMessage || "Unauthorized" }, 401);
    }

    // 2. Fetch submission record
    const { data: submission, error: subErr } = await adminSupabase
      .from("student_submissions")
      .select("id, class_id, student_id, material_id, content, status, due_at, is_late")
      .eq("id", submission_id)
      .maybeSingle();

    if (subErr || !submission) {
      return jsonResponse({ error: "Submission record not found" }, 404);
    }

    // 3. Fetch material criteria & context if linked
    let rubricCriteria: any[] = [];
    let materialName = "Assignment";
    let maxScore = 100;

    if (submission.material_id) {
      const { data: material } = await adminSupabase
        .from("materials")
        .select("id, name, rubric_criteria, max_score")
        .eq("id", submission.material_id)
        .maybeSingle();

      if (material) {
        materialName = material.name;
        maxScore = material.max_score || 100;
        rubricCriteria = Array.isArray(material.rubric_criteria) ? material.rubric_criteria : [];
      }
    }

    // 4. Extract raw text from submission content
    let extractedText = "";
    const contentItems = Array.isArray(submission.content) ? submission.content : [];

    for (const item of contentItems) {
      if (item.path?.startsWith("text://")) {
        extractedText += `${item.description || ""}\n`;
      } else if (item.type === "File" && item.path && !item.path.startsWith("grade://")) {
        try {
          const { data: fileBlob } = await adminSupabase.storage
            .from("student-submissions")
            .download(item.path);

          if (fileBlob) {
            const rawBuffer = await fileBlob.arrayBuffer();
            const decoder = new TextDecoder("utf-8", { fatal: false });
            extractedText += `${decoder.decode(rawBuffer)}\n`;
          }
        } catch (e: any) {
          console.warn(`Could not extract file text for ${item.path}:`, e.message);
        }
      }
    }

    // Clean control characters
    extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ").trim();

    // 5. Update processing status in hidden ai.submission_evaluations
    await adminSupabase
      .from("submission_evaluations")
      .upsert({
        submission_id: submission.id,
        status: "processing",
        raw_extracted_text: extractedText || null,
        updated_at: new Date().toISOString(),
      });

    // 6. Forward payload to FastAPI Backend Evaluation Endpoint
    const backendBaseUrl = Deno.env.get("BACKEND_API_URL") || "http://127.0.0.1:8000";
    const gradeEndpoint = `${backendBaseUrl}/api/grade`;

    let backendResponse: any = null;
    try {
      const resp = await fetch(gradeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") || "",
        },
        body: JSON.stringify({
          submission_id: submission.id,
          class_id: submission.class_id,
          student_id: submission.student_id,
          material_id: submission.material_id,
          material_name: materialName,
          max_score: maxScore,
          rubric_criteria: rubricCriteria,
          submission_text: extractedText || "No text content provided.",
        }),
      });

      if (resp.ok) {
        backendResponse = await resp.json();
      } else {
        const errText = await resp.text();
        console.warn(`Backend /api/grade returned ${resp.status}:`, errText);
      }
    } catch (backendErr: any) {
      console.warn("Backend /api/grade dispatch warning (asynchronous):", backendErr.message);
    }

    return jsonResponse({
      success: true,
      submission_id: submission.id,
      status: backendResponse ? "evaluated" : "queued_for_evaluation",
      extracted_char_count: extractedText.length,
      rubric_criteria_count: rubricCriteria.length,
    });
  } catch (error: any) {
    console.error("Trigger Submission Evaluation Error:", error);
    return jsonResponse({ error: error.message || "Internal Server Error" }, 500);
  }
});
