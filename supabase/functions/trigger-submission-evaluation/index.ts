import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
import { getAuthClient } from "../_shared/supabaseClient.ts";
import { verifyCallerAuth } from "../_shared/auth.ts";
import {
  type AssetStoragePolicy,
  type ContentItemLike,
  extractContentItems,
} from "../_shared/documentExtractor.ts";
import {
  appendVisualAssetsMarkdown,
  persistExtractedAssets,
  syncAssetsToMaterialKnowledge,
} from "../_shared/assetPersistence.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const {
      submission_id,
      class_id,
      asset_storage_policy = "auto",
    }: {
      submission_id?: string;
      class_id?: string;
      asset_storage_policy?: AssetStoragePolicy;
    } = body;

    if (!submission_id) {
      return jsonResponse({ error: "Missing required 'submission_id'" }, 400);
    }

    // 1. Verify caller authorization (Service Role from pg_net or Authorized User)
    const authCtx = await verifyCallerAuth(req, class_id);
    if (!authCtx.isAuthorized) {
      return jsonResponse({ error: authCtx.errorMessage || "Unauthorized" }, 401);
    }

    // 2. Enforce caller authorization on submission_id unless service_role
    if (!authCtx.isServiceRole) {
      const authClient = getAuthClient(req.headers.get("Authorization") || "");
      const { data: visibleSub } = await authClient
        .from("student_submissions")
        .select("id")
        .eq("id", submission_id)
        .maybeSingle();
      if (!visibleSub) {
        return jsonResponse({ error: "Forbidden or submission record not found" }, 403);
      }
    }

    // 3. Fetch submission record
    const { data: submission, error: subErr } = await adminSupabase
      .from("student_submissions")
      .select("id, class_id, student_id, material_id, content, status, due_at, is_late")
      .eq("id", submission_id)
      .maybeSingle();

    if (subErr || !submission) {
      return jsonResponse({ error: "Submission record not found" }, 404);
    }

    // 3. Fetch material criteria + optional class-private rubric overrides
    let rubricCriteria: unknown[] = [];
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
        if (Array.isArray(material.rubric_criteria)) {
          rubricCriteria = [...material.rubric_criteria];
        }
      }

      if (submission.class_id) {
        const { data: classMat } = await adminSupabase
          .from("class_materials")
          .select("custom_rubric_criteria")
          .eq("class_id", submission.class_id)
          .eq("material_id", submission.material_id)
          .maybeSingle();

        if (Array.isArray(classMat?.custom_rubric_criteria)) {
          rubricCriteria = [...rubricCriteria, ...classMat.custom_rubric_criteria];
        }
      }
    }

    // 4. Extract normalized Markdown text + student diagrams/scans from submission content
    const contentItems = Array.isArray(submission.content)
      ? (submission.content as ContentItemLike[])
      : [];

    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
    const openRouterModel =
      Deno.env.get("OPENROUTER_VISION_MODEL") ||
      Deno.env.get("OPENROUTER_MODEL") ||
      "google/gemini-2.5-flash";

    const extraction = await extractContentItems({
      items: contentItems,
      storageClient: adminSupabase,
      defaultBucket: "student-submissions",
      options: {
        enableOcr: true,
        describeVisualAssets: Boolean(openRouterApiKey),
        assetStoragePolicy: asset_storage_policy,
        openRouterApiKey,
        openRouterModel,
      },
    });

    // 5. Upsert hidden ai.submission_evaluations first so intra-ai FK
    //    submission_evaluation_id exists prior to inserting ai.document_assets.
    const { data: evalRow, error: evalUpsertErr } = await adminSupabase
      .schema("ai")
      .from("submission_evaluations")
      .upsert(
        {
          submission_id: submission.id,
          status: "processing",
          raw_extracted_text: extraction.text || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "submission_id" },
      )
      .select("id")
      .single();

    const warnings = [...extraction.warnings];
    if (evalUpsertErr) {
      warnings.push(`ai.submission_evaluations upsert warning: ${evalUpsertErr.message}`);
    }
    const submissionEvaluationId = evalRow?.id;

    // 5b. Persist student visual assets directly inside ai.document_assets
    const { persisted: persistedAssets, warnings: persistWarnings } =
      await persistExtractedAssets(extraction.assets, {
        submissionId: submission.id,
        submissionEvaluationId,
        assetStoragePolicy: asset_storage_policy,
      });
    warnings.push(...persistWarnings);

    if (persistedAssets.length > 0 && submission.material_id) {
      const syncResult = await syncAssetsToMaterialKnowledge({
        materialId: submission.material_id,
        classId: submission.class_id || undefined,
        assets: persistedAssets,
        linkMaterialHierarchy: false,
      });
      warnings.push(...syncResult.warnings);
    }

    const extractedText = appendVisualAssetsMarkdown(extraction.text, persistedAssets);

    // 5c. Refresh raw_extracted_text once visual asset references & descriptions are attached
    if (submissionEvaluationId && extractedText && extractedText !== extraction.text) {
      await adminSupabase
        .schema("ai")
        .from("submission_evaluations")
        .update({
          raw_extracted_text: extractedText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submissionEvaluationId);
    }

    // 6. Forward payload to FastAPI Backend Evaluation Endpoint
    const backendBaseUrl = Deno.env.get("BACKEND_API_URL") || "http://127.0.0.1:8000";
    const gradeEndpoint = `${backendBaseUrl}/api/grade`;

    let backendResponse: unknown = null;
    try {
      const resp = await fetch(gradeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || "",
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
    } catch (backendErr: unknown) {
      const msg = backendErr instanceof Error ? backendErr.message : String(backendErr);
      console.warn("Backend /api/grade dispatch warning (asynchronous):", msg);
    }

    return jsonResponse({
      success: true,
      submission_id: submission.id,
      status: backendResponse ? "evaluated" : "queued_for_evaluation",
      extracted_char_count: extractedText.length,
      page_count: extraction.pageCount,
      ocr_used: extraction.ocrUsed,
      asset_count: persistedAssets.length,
      rubric_criteria_count: rubricCriteria.length,
      warnings,
    });
  } catch (error: unknown) {
    console.error("Trigger Submission Evaluation Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: msg }, 500);
  }
});
