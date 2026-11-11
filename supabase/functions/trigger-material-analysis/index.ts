import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { adminSupabase } from "../_shared/supabaseAdmin.ts";
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
      material_id,
      class_id,
      asset_storage_policy = "auto",
    }: {
      material_id?: string;
      class_id?: string;
      asset_storage_policy?: AssetStoragePolicy;
    } = body;

    if (!material_id) {
      return jsonResponse({ error: "Missing required 'material_id'" }, 400);
    }

    // 1. Verify caller authorization (Service Role from pg_net or Class Teacher)
    const authCtx = await verifyCallerAuth(req, class_id);
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

    if (!authCtx.isServiceRole && material.user_id !== authCtx.userId) {
      return jsonResponse({ error: "Forbidden: Only the material owner can trigger analysis" }, 403);
    }

    // 2b. Fetch class-private content & rubric overrides if class_id is provided
    let customContent: ContentItemLike[] = [];
    let customRubric: unknown[] = [];
    if (class_id) {
      const { data: classLink } = await adminSupabase
        .from("class_materials")
        .select("custom_content, custom_rubric_criteria")
        .eq("class_id", class_id)
        .eq("material_id", material_id)
        .maybeSingle();

      if (classLink) {
        if (Array.isArray(classLink.custom_content)) {
          customContent = classLink.custom_content as ContentItemLike[];
        }
        if (Array.isArray(classLink.custom_rubric_criteria)) {
          customRubric = classLink.custom_rubric_criteria;
        }
      }
    }

    // 3. Extract normalized Markdown text, page count & visual illustrations
    const canonicalContent = Array.isArray(material.content)
      ? (material.content as ContentItemLike[])
      : [];
    const contentList = [...canonicalContent, ...customContent];
    const combinedRubric = [
      ...(Array.isArray(material.rubric_criteria) ? material.rubric_criteria : []),
      ...customRubric,
    ];

    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
    const openRouterModel =
      Deno.env.get("OPENROUTER_VISION_MODEL") ||
      Deno.env.get("OPENROUTER_MODEL") ||
      "google/gemini-2.5-flash";

    const extraction = await extractContentItems({
      items: contentList,
      storageClient: adminSupabase,
      defaultBucket: "class-materials",
      options: {
        enableOcr: true,
        describeVisualAssets: Boolean(openRouterApiKey),
        assetStoragePolicy: asset_storage_policy,
        openRouterApiKey,
        openRouterModel,
      },
    });

    // 4. Mark hidden ai.material_insights as processing before persisting assets
    //    so intra-ai FK material_insight_id exists prior to insertion.
    const { error: insightUpsertErr } = await adminSupabase
      .schema("ai")
      .from("material_insights")
      .upsert(
        {
          material_id: material.id,
          status: "processing",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "material_id" },
      );

    const warnings = [...extraction.warnings];
    if (insightUpsertErr) {
      warnings.push(`ai.material_insights upsert warning: ${insightUpsertErr.message}`);
    }

    // 4b. Store extracted illustrations directly inside ai.document_assets
    const { persisted: persistedAssets, warnings: persistWarnings } =
      await persistExtractedAssets(extraction.assets, {
        materialId: material.id,
        materialInsightId: insightUpsertErr ? undefined : material.id,
        assetStoragePolicy: asset_storage_policy,
      });

    const normalizedText = appendVisualAssetsMarkdown(extraction.text, persistedAssets);
    warnings.push(...persistWarnings);

    // 5. Dispatch analysis request to FastAPI backend (with real page_count & class_id)
    const backendBaseUrl = Deno.env.get("BACKEND_API_URL") || "http://127.0.0.1:8000";
    const analyzeEndpoint = `${backendBaseUrl}/api/materials/analyze`;

    let backendResponse: unknown = null;
    try {
      const resp = await fetch(analyzeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") || "",
        },
        body: JSON.stringify({
          material_id: material.id,
          name: material.name,
          category: material.category,
          rubric_criteria: combinedRubric,
          extracted_text: normalizedText || material.name,
          page_count: extraction.pageCount,
          class_id: class_id || null,
        }),
      });

      if (resp.ok) {
        backendResponse = await resp.json();
        // Bind newly compiled ontology concepts & PageIndex tree nodes back to extracted assets
        const syncResult = await syncAssetsToMaterialKnowledge({
          materialId: material.id,
          classId: class_id || undefined,
          assets: persistedAssets,
        });
        warnings.push(...syncResult.warnings);
      } else {
        const errText = await resp.text();
        console.warn(`Backend /api/materials/analyze returned ${resp.status}:`, errText);
      }
    } catch (backendErr: unknown) {
      const msg = backendErr instanceof Error ? backendErr.message : String(backendErr);
      console.warn("Backend /api/materials/analyze dispatch warning:", msg);
    }

    return jsonResponse({
      success: true,
      material_id: material.id,
      status: backendResponse ? "analyzed" : "queued_for_analysis",
      extracted_char_count: normalizedText.length,
      page_count: extraction.pageCount,
      ocr_used: extraction.ocrUsed,
      asset_count: persistedAssets.length,
      warnings,
    });
  } catch (error: unknown) {
    console.error("Trigger Material Analysis Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: msg }, 500);
  }
});
