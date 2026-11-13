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
  type PersistedAssetRecord,
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
      submission_id,
      class_id,
      storage_path: explicitPath,
      bucket: explicitBucket,
      content_item_id,
      enable_ocr = true,
      describe_assets = true,
      persist_assets = true,
      store_inline_base64 = true,
      asset_storage_policy,
    } = body;

    const effectivePolicy: AssetStoragePolicy =
      asset_storage_policy ||
      (store_inline_base64 === false ? "description_only" : "auto");

    const authCtx = await verifyCallerAuth(req, class_id);
    if (!authCtx.isAuthorized) {
      return jsonResponse({ error: authCtx.errorMessage || "Unauthorized" }, 401);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const authClient = getAuthClient(authHeader);

    let targetItems: ContentItemLike[] = [];
    let targetBucket = explicitBucket || "class-materials";
    let documentName = "Document";
    let documentType = "File";
    let primaryPath = explicitPath || "";

    // 1. Resolve items from Material (enforcing RLS access check unless service_role)
    if (material_id && !explicitPath) {
      if (!authCtx.isServiceRole) {
        const { data: visibleMat } = await authClient
          .from("materials")
          .select("id")
          .eq("id", material_id)
          .maybeSingle();
        if (!visibleMat) {
          return jsonResponse({ error: "Forbidden or material not found" }, 403);
        }
      }

      const { data: material, error: matErr } = await adminSupabase
        .from("materials")
        .select("id, name, category, content")
        .eq("id", material_id)
        .maybeSingle();

      if (matErr || !material) {
        return jsonResponse({ error: "Material not found" }, 404);
      }

      documentName = material.name;
      const canonical = Array.isArray(material.content) ? material.content : [];
      let custom: ContentItemLike[] = [];

      if (class_id) {
        const { data: classLink } = await adminSupabase
          .from("class_materials")
          .select("custom_content")
          .eq("class_id", class_id)
          .eq("material_id", material_id)
          .maybeSingle();
        if (Array.isArray(classLink?.custom_content)) {
          custom = classLink.custom_content as ContentItemLike[];
        }
      }

      const combined = [...(canonical as ContentItemLike[]), ...custom];
      targetItems = content_item_id
        ? combined.filter((c) => c.id === content_item_id)
        : combined;

      if (targetItems.length > 0) {
        documentType = targetItems[0].type || "File";
        documentName = targetItems[0].name || documentName;
        primaryPath = targetItems[0].path || primaryPath;
      }
    } else if (submission_id && !explicitPath) {
      // 2. Resolve items from Student Submission (enforcing RLS unless service_role)
      targetBucket = "student-submissions";
      if (!authCtx.isServiceRole) {
        const { data: visibleSub } = await authClient
          .from("student_submissions")
          .select("id")
          .eq("id", submission_id)
          .maybeSingle();
        if (!visibleSub) {
          return jsonResponse({ error: "Forbidden or submission not found" }, 403);
        }
      }

      const { data: submission, error: subErr } = await adminSupabase
        .from("student_submissions")
        .select("id, content")
        .eq("id", submission_id)
        .maybeSingle();

      if (subErr || !submission) {
        return jsonResponse({ error: "Submission not found" }, 404);
      }

      const contentList = Array.isArray(submission.content)
        ? (submission.content as ContentItemLike[])
        : [];
      targetItems = content_item_id
        ? contentList.filter((c) => c.id === content_item_id)
        : contentList;

      if (targetItems.length > 0) {
        documentName = targetItems[0].name || "Student Turn-in";
        documentType = targetItems[0].type || "File";
        primaryPath = targetItems[0].path || primaryPath;
      }
    } else if (explicitPath) {
      targetItems = [
        {
          id: content_item_id,
          name: explicitPath.split("/").pop() || "Document",
          type: explicitPath.startsWith("http") ? "URL" : "File",
          path: explicitPath,
        },
      ];
    }

    if (targetItems.length === 0) {
      return jsonResponse(
        { error: "Could not resolve any extractable content items for target document" },
        400,
      );
    }

    // Direct explicit storage_path calls from non-service users must abide by Storage RLS
    const storageClient =
      explicitPath && !authCtx.isServiceRole ? authClient : adminSupabase;

    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
    const openRouterModel =
      Deno.env.get("OPENROUTER_VISION_MODEL") ||
      Deno.env.get("OPENROUTER_MODEL") ||
      "google/gemini-2.5-flash";

    const extraction = await extractContentItems({
      items: targetItems,
      storageClient,
      defaultBucket: targetBucket,
      options: {
        enableOcr: Boolean(enable_ocr),
        describeVisualAssets: Boolean(describe_assets),
        assetStoragePolicy: effectivePolicy,
        openRouterApiKey,
        openRouterModel,
      },
    });

    let persistedAssets: PersistedAssetRecord[] = [];
    const warnings = [...extraction.warnings];

    if (persist_assets && extraction.assets.length > 0 && (material_id || submission_id)) {
      let existingInsightId: string | undefined;
      let existingTreeId: string | undefined;
      let existingEvaluationId: string | undefined;

      if (material_id) {
        const [{ data: insightRow }, { data: treeRow }] = await Promise.all([
          adminSupabase
            .schema("ai")
            .from("material_insights")
            .select("material_id")
            .eq("material_id", material_id)
            .maybeSingle(),
          adminSupabase
            .schema("ai")
            .from("material_trees")
            .select("id")
            .eq("material_id", material_id)
            .maybeSingle(),
        ]);
        if (insightRow?.material_id) existingInsightId = insightRow.material_id;
        if (treeRow?.id) existingTreeId = treeRow.id;
      }

      if (submission_id) {
        const { data: evalRow } = await adminSupabase
          .schema("ai")
          .from("submission_evaluations")
          .select("id")
          .eq("submission_id", submission_id)
          .maybeSingle();
        if (evalRow?.id) existingEvaluationId = evalRow.id;
      }

      const saved = await persistExtractedAssets(extraction.assets, {
        materialId: material_id,
        submissionId: submission_id,
        materialTreeId: existingTreeId,
        materialInsightId: existingInsightId,
        submissionEvaluationId: existingEvaluationId,
        contentItemId: content_item_id,
        assetStoragePolicy: effectivePolicy,
      });
      persistedAssets = saved.persisted;
      warnings.push(...saved.warnings);
    }

    const enrichedText = appendVisualAssetsMarkdown(extraction.text, persistedAssets);

    return jsonResponse({
      success: true,
      name: documentName,
      type: documentType,
      path: primaryPath || "inline",
      bucket: targetBucket,
      format: extraction.items[0]?.format || "text",
      text: enrichedText,
      char_count: enrichedText.length,
      page_count: extraction.pageCount,
      ocr_used: extraction.ocrUsed,
      items: extraction.items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        format: item.format,
        char_count: item.charCount,
        page_count: item.pageCount,
        ocr_used: item.ocrUsed,
        asset_count: item.assets.length,
      })),
      assets: persistedAssets.map((asset) => ({
        id: asset.id,
        filename: asset.filename,
        title: asset.title,
        asset_type: asset.assetType,
        mime_type: asset.mimeType,
        byte_size: asset.byteSize,
        width: asset.width ?? null,
        height: asset.height ?? null,
        page_number: asset.pageNumber ?? null,
        content_item_id: asset.contentItemId ?? null,
        representation_mode: asset.representationMode,
        retain_image_data: asset.retainImageData,
        retention_reason: asset.retentionReason,
        description: asset.description ?? null,
        markdown_text: asset.markdownText ?? null,
        ocr_text: asset.ocrText ?? null,
        has_inline_data: asset.hasInlineData,
        checksum_sha256: asset.checksumSha256,
      })),
      warnings,
    });
  } catch (error: unknown) {
    console.error("Extract Material Text Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return jsonResponse({ error: msg }, 500);
  }
});
