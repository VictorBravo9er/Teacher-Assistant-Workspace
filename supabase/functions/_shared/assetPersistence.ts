import { adminSupabase } from "./supabaseAdmin.ts";
import {
  type AssetStoragePolicy,
  type DocumentAssetType,
  type ExtractedVisualAsset,
  uint8ArrayToBase64,
} from "./documentExtractor.ts";

export const DEFAULT_MAX_INLINE_BASE64_BYTES = 3 * 1024 * 1024; // 3 MB inline safety cap

export type AssetRepresentationMode =
  | "description_only"
  | "base64_only"
  | "binary_only"
  | "hybrid";

export interface PersistAssetsParams {
  materialId?: string;
  submissionId?: string;
  materialTreeId?: string;
  materialInsightId?: string;
  submissionEvaluationId?: string;
  conceptId?: string;
  contentItemId?: string;
  treeNodeId?: string;
  assetStoragePolicy?: AssetStoragePolicy;
  maxInlineBytes?: number;
  db?: SupabaseLike;
}

export interface PersistedAssetRecord {
  id: string;
  filename: string;
  title: string;
  assetType: DocumentAssetType;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  pageNumber?: number;
  contentItemId?: string;
  treeNodeId?: string;
  conceptId?: string;
  representationMode: AssetRepresentationMode;
  retainImageData: boolean;
  retentionReason: string;
  description?: string;
  markdownText?: string;
  ocrText?: string;
  hasInlineData: boolean;
  checksumSha256: string;
}

// Minimal typed surface matching supabaseAdmin so unit tests can pass mocks without Deno deps.
export interface SupabaseQueryResult<T = Record<string, unknown>> {
  data: T | null;
  error: { message?: string } | null;
}

export interface SupabaseFilterBuilder<T = Record<string, unknown>> extends PromiseLike<SupabaseQueryResult<T[]>> {
  select: (columns?: string) => SupabaseFilterBuilder<T>;
  eq: (column: string, value: unknown) => SupabaseFilterBuilder<T>;
  is: (column: string, value: null) => SupabaseFilterBuilder<T>;
  limit: (count: number) => SupabaseFilterBuilder<T>;
  maybeSingle: () => Promise<SupabaseQueryResult<T>>;
  single: () => Promise<SupabaseQueryResult<T>>;
}

export interface SupabaseLike {
  schema: (schema: string) => {
    from: (table: string) => {
      select: (columns?: string) => SupabaseFilterBuilder;
      insert: (values: Record<string, unknown> | Record<string, unknown>[]) => SupabaseFilterBuilder;
      update: (values: Record<string, unknown>) => SupabaseFilterBuilder;
      upsert: (
        values: Record<string, unknown> | Record<string, unknown>[],
        options?: { onConflict?: string },
      ) => SupabaseFilterBuilder;
    };
  };
}

async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildAssetTextBundle(asset: ExtractedVisualAsset): {
  description: string | null;
  ocrText: string | null;
  markdownText: string | null;
} {
  const description = asset.description?.trim() || null;
  const markdownText = asset.markdownText?.trim() || null;
  const ocrText = asset.ocrText?.trim() || null;
  return { description, ocrText, markdownText };
}

function determineInlinePersistence(params: {
  asset: ExtractedVisualAsset;
  policy: AssetStoragePolicy;
  maxInlineBytes: number;
  warnings: string[];
}): {
  retainImageData: boolean;
  retentionReason: string;
  representationMode: AssetRepresentationMode;
  imageBase64: string | null;
  fallbackDescription: string | null;
  oversizedOmitted: boolean;
} {
  const { asset, policy, maxInlineBytes, warnings } = params;
  const { description, ocrText, markdownText } = buildAssetTextBundle(asset);
  const hasAnyText = Boolean(description || ocrText || markdownText);

  let wantImage = asset.retainImageData;
  let reason = asset.retentionReason;

  if (policy === "always_base64") {
    wantImage = true;
    reason = reason || "Retained inline image per always_base64 policy";
  } else if (policy === "description_only") {
    wantImage = false;
    reason = reason || "Stored textual representation only per description_only policy";
  }

  let oversizedOmitted = false;
  let imageBase64: string | null = null;

  if (wantImage) {
    if (asset.bytes.byteLength <= maxInlineBytes) {
      imageBase64 = uint8ArrayToBase64(asset.bytes);
    } else {
      oversizedOmitted = true;
      wantImage = false;
      reason = `${reason ? `${reason}; ` : ""}Omitted raw bytes because ${asset.bytes.byteLength} bytes exceeds ${maxInlineBytes}-byte inline cap`;
      warnings.push(
        `Visual asset ${asset.filename} (${asset.bytes.byteLength} bytes) exceeded inline base64 cap (${maxInlineBytes}); stored textual representation only.`,
      );
    }
  }

  let fallbackDescription = description || markdownText;
  if (!wantImage && !hasAnyText) {
    fallbackDescription = `[Visual Asset: ${asset.title} (${asset.mimeType}, ${asset.bytes.byteLength} bytes)]`;
  }

  let representationMode: AssetRepresentationMode;
  if (imageBase64) {
    representationMode = hasAnyText ? "hybrid" : "base64_only";
  } else {
    representationMode = "description_only";
  }

  return {
    retainImageData: wantImage,
    retentionReason: reason,
    representationMode,
    imageBase64,
    fallbackDescription,
    oversizedOmitted,
  };
}

/**
 * Persist extracted visual assets directly into `ai.document_assets` without
 * relying on Supabase Storage buckets or cross-schema foreign keys.
 */
export async function persistExtractedAssets(
  assets: ExtractedVisualAsset[],
  params: PersistAssetsParams,
): Promise<{ persisted: PersistedAssetRecord[]; warnings: string[] }> {
  const warnings: string[] = [];
  const persisted: PersistedAssetRecord[] = [];
  if (assets.length === 0) return { persisted, warnings };

  const hasOwner = Boolean(
    params.materialId ||
      params.submissionId ||
      params.materialTreeId ||
      params.materialInsightId ||
      params.submissionEvaluationId,
  );
  if (!hasOwner) {
    warnings.push("Skipped ai.document_assets persistence because no owner ID was provided.");
    return { persisted, warnings };
  }

  const db = params.db ?? (adminSupabase as unknown as SupabaseLike);
  const policy: AssetStoragePolicy = params.assetStoragePolicy ?? "auto";
  const maxInlineBytes = params.maxInlineBytes ?? DEFAULT_MAX_INLINE_BASE64_BYTES;

  for (const asset of assets) {
    try {
      const checksumSha256 = await computeSha256Hex(asset.bytes);
      const itemId = asset.contentItemId || params.contentItemId || null;
      const decision = determineInlinePersistence({
        asset,
        policy,
        maxInlineBytes,
        warnings,
      });

      const payload: Record<string, unknown> = {
        source_material_id: params.materialId ?? null,
        source_submission_id: params.submissionId ?? null,
        material_tree_id: params.materialTreeId ?? null,
        material_insight_id: params.materialInsightId ?? null,
        submission_evaluation_id: params.submissionEvaluationId ?? null,
        concept_id: params.conceptId ?? null,
        content_item_id: itemId,
        tree_node_id: params.treeNodeId ?? null,
        page_number: asset.pageNumber ?? null,
        title: asset.title,
        asset_type: asset.assetType,
        representation_mode: decision.representationMode,
        retain_image_data: decision.retainImageData,
        retention_reason: decision.retentionReason,
        mime_type: asset.mimeType,
        byte_size: asset.bytes.byteLength,
        width: asset.width ?? null,
        height: asset.height ?? null,
        checksum_sha256: checksumSha256,
        description: decision.fallbackDescription,
        alt_text: asset.altText ?? null,
        ocr_text: asset.ocrText ?? null,
        image_base64: decision.imageBase64,
        image_bytes: null,
        metadata: {
          filename: asset.filename,
          extension: asset.extension,
          markdown_text: asset.markdownText ?? null,
          oversized_inline_omitted: decision.oversizedOmitted,
        },
      };

      // Deduplicate against partial unique indexes explicitly (PostgREST onConflict cannot target partial indexes).
      let existingId: string | null = null;
      if (params.materialId || params.submissionId) {
        let lookup = db.schema("ai").from("document_assets").select("id");
        lookup = params.materialId
          ? lookup.eq("source_material_id", params.materialId)
          : lookup.eq("source_submission_id", params.submissionId);
        lookup = itemId === null ? lookup.is("content_item_id", null) : lookup.eq("content_item_id", itemId);
        const { data: existingRow } = await lookup.eq("checksum_sha256", checksumSha256).maybeSingle();
        if (existingRow && typeof existingRow.id === "string") {
          existingId = existingRow.id;
        }
      }

      const mutation = existingId
        ? db
            .schema("ai")
            .from("document_assets")
            .update(payload)
            .eq("id", existingId)
            .select("id")
            .single()
        : db.schema("ai").from("document_assets").insert(payload).select("id").single();

      const { data: savedRow, error: saveErr } = await mutation;
      if (saveErr || !savedRow || typeof savedRow.id !== "string") {
        warnings.push(
          `Failed persisting asset ${asset.filename} in ai.document_assets: ${saveErr?.message || "No row returned"}`,
        );
        continue;
      }

      persisted.push({
        id: savedRow.id,
        filename: asset.filename,
        title: asset.title,
        assetType: asset.assetType,
        mimeType: asset.mimeType,
        byteSize: asset.bytes.byteLength,
        width: asset.width,
        height: asset.height,
        pageNumber: asset.pageNumber,
        contentItemId: itemId ?? undefined,
        treeNodeId: params.treeNodeId,
        conceptId: params.conceptId,
        representationMode: decision.representationMode,
        retainImageData: decision.retainImageData,
        retentionReason: decision.retentionReason,
        description: decision.fallbackDescription ?? undefined,
        markdownText: asset.markdownText,
        ocrText: asset.ocrText,
        hasInlineData: Boolean(decision.imageBase64),
        checksumSha256,
      });
    } catch (err) {
      warnings.push(
        `Unexpected error persisting asset ${asset.filename}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { persisted, warnings };
}

/**
 * Append a distilled visual-asset Markdown reference section so downstream
 * LLM evaluators and graph builders can cite `[asset://<id>]` handles and
 * read full Vision transcriptions directly.
 */
export function appendVisualAssetsMarkdown(
  baseText: string,
  assets: PersistedAssetRecord[],
): string {
  if (assets.length === 0) return baseText;

  const lines: string[] = ["## Visual Assets & Knowledge Graph Figures"];
  for (const asset of assets) {
    const pagePart = asset.pageNumber ? `, p.${asset.pageNumber}` : "";
    const dimsPart = asset.width && asset.height ? `, ${asset.width}x${asset.height}` : "";
    const modeLabel = asset.hasInlineData
      ? `inline base64 retained (${asset.representationMode})`
      : `text-only (${asset.representationMode})`;

    lines.push(
      `### [asset://${asset.id}] ${asset.title} (${asset.assetType}${pagePart}${dimsPart} — ${modeLabel})`,
    );
    if (asset.retentionReason) {
      lines.push(`*Representation*: ${asset.retentionReason}`);
    }
    if (asset.markdownText) {
      lines.push(asset.markdownText);
    } else if (asset.description) {
      lines.push(asset.description);
    }
    if (asset.ocrText && asset.ocrText !== asset.description && asset.ocrText !== asset.markdownText) {
      lines.push(`> OCR Text: ${asset.ocrText}`);
    }
    lines.push("");
  }

  const section = lines.join("\n").trim();
  return baseText.trim() ? `${baseText.trim()}\n\n${section}` : section;
}

interface TreeNodeLike {
  node_id?: string;
  id?: string;
  title?: string;
  summary?: string;
  concept_id?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  children?: TreeNodeLike[];
}

function flattenTreeNodes(root: TreeNodeLike | null | undefined): TreeNodeLike[] {
  if (!root || typeof root !== "object") return [];
  const collected: TreeNodeLike[] = [root];
  if (Array.isArray(root.children)) {
    for (const child of root.children) {
      collected.push(...flattenTreeNodes(child));
    }
  }
  return collected;
}

function matchTreeNodeForAsset(
  nodes: TreeNodeLike[],
  asset: PersistedAssetRecord,
): TreeNodeLike | null {
  if (nodes.length === 0) return null;
  if (asset.pageNumber) {
    const byPage = nodes.find((node) => {
      const start = typeof node.page_start === "number" ? node.page_start : null;
      const end = typeof node.page_end === "number" ? node.page_end : start;
      return start !== null && asset.pageNumber! >= start && asset.pageNumber! <= (end ?? start);
    });
    if (byPage) return byPage;
  }

  const haystack = `${asset.title} ${asset.description || ""} ${asset.markdownText || ""} ${asset.ocrText || ""}`
    .toLowerCase();
  let bestNode: TreeNodeLike | null = null;
  let bestScore = 0;

  for (const node of nodes) {
    const titleWords = (node.title || "")
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 4);
    let score = 0;
    for (const word of titleWords) {
      if (haystack.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  return bestScore > 0 ? bestNode : null;
}

/**
 * Link persisted `ai.document_assets` rows back to the newly created
 * `ai.material_trees`, tree nodes, `ai.material_insights`, and
 * `ai.ontology_concepts` / `ai.asset_concept_mappings` rows.
 */
export async function syncAssetsToMaterialKnowledge(params: {
  materialId: string;
  classId?: string;
  treeId?: string;
  assets: PersistedAssetRecord[];
  linkMaterialHierarchy?: boolean;
  db?: SupabaseLike;
}): Promise<{ linkedCount: number; mappingsCount: number; warnings: string[] }> {
  const { materialId, classId, assets, linkMaterialHierarchy = true } = params;
  const warnings: string[] = [];
  if (assets.length === 0) return { linkedCount: 0, mappingsCount: 0, warnings };

  const db = params.db ?? (adminSupabase as unknown as SupabaseLike);
  let resolvedTreeId = params.treeId ?? null;
  let treeNodes: TreeNodeLike[] = [];

  const { data: treeRow } = await db
    .schema("ai")
    .from("material_trees")
    .select("id, root_node")
    .eq("material_id", materialId)
    .maybeSingle();

  if (treeRow && typeof treeRow.id === "string") {
    resolvedTreeId = resolvedTreeId || treeRow.id;
    treeNodes = flattenTreeNodes(treeRow.root_node as TreeNodeLike | undefined);
  }

  const { data: insightRow } = await db
    .schema("ai")
    .from("material_insights")
    .select("material_id, key_concepts")
    .eq("material_id", materialId)
    .maybeSingle();

  let concepts: Array<{ id: string; canonical_name?: string; display_name?: string }> = [];
  if (classId) {
    const { data: conceptRows } = await db
      .schema("ai")
      .from("ontology_concepts")
      .select("id, canonical_name, display_name")
      .eq("class_id", classId);
    if (Array.isArray(conceptRows)) {
      concepts = conceptRows as Array<{ id: string; canonical_name?: string; display_name?: string }>;
    }
  }

  let linkedCount = 0;
  let mappingsCount = 0;

  for (const asset of assets) {
    const matchedNode = matchTreeNodeForAsset(treeNodes, asset);
    const resolvedNodeId =
      asset.treeNodeId || matchedNode?.node_id || matchedNode?.id || null;
    let resolvedConceptId =
      asset.conceptId ||
      (typeof matchedNode?.concept_id === "string" ? matchedNode.concept_id : null);

    const haystack = `${asset.title} ${asset.description || ""} ${asset.markdownText || ""} ${asset.ocrText || ""}`
      .toLowerCase();

    const matchedConceptIds = new Set<string>();
    if (resolvedConceptId) matchedConceptIds.add(resolvedConceptId);

    for (const concept of concepts) {
      const name = (concept.display_name || concept.canonical_name || "").toLowerCase();
      if (name.length >= 3 && haystack.includes(name)) {
        matchedConceptIds.add(concept.id);
        if (!resolvedConceptId) resolvedConceptId = concept.id;
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (linkMaterialHierarchy && resolvedTreeId) updatePayload.material_tree_id = resolvedTreeId;
    if (linkMaterialHierarchy && insightRow?.material_id) updatePayload.material_insight_id = materialId;
    if (resolvedNodeId) updatePayload.tree_node_id = resolvedNodeId;
    if (resolvedConceptId) updatePayload.concept_id = resolvedConceptId;

    if (Object.keys(updatePayload).length > 0) {
      const { error: updErr } = await db
        .schema("ai")
        .from("document_assets")
        .update(updatePayload)
        .eq("id", asset.id);
      if (updErr) {
        warnings.push(`Failed linking asset ${asset.id} to material knowledge: ${updErr.message}`);
      } else {
        linkedCount++;
      }
    }

    const relationship =
      asset.assetType === "equation"
        ? "derives"
        : asset.assetType === "diagram" || asset.assetType === "chart"
        ? "explains"
        : "illustrates";

    for (const conceptId of matchedConceptIds) {
      const { error: mapErr } = await db
        .schema("ai")
        .from("asset_concept_mappings")
        .upsert(
          {
            asset_id: asset.id,
            concept_id: conceptId,
            relationship,
            relevance_score: conceptId === resolvedConceptId ? 0.9 : 0.7,
            excerpt_context: (asset.description || asset.markdownText || asset.title).slice(0, 400),
          },
          { onConflict: "asset_id,concept_id,relationship" },
        );
      if (mapErr) {
        warnings.push(`Failed mapping asset ${asset.id} to concept ${conceptId}: ${mapErr.message}`);
      } else {
        mappingsCount++;
      }
    }
  }

  return { linkedCount, mappingsCount, warnings };
}
