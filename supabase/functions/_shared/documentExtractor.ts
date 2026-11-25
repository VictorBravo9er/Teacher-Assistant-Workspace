import { unzipSync, strFromU8 } from "npm:fflate@0.8.3";
import {
  extractImages,
  extractText,
  inspectPages,
} from "npm:unpdf@2.1.0";

export interface ContentItemLike {
  id?: string;
  name?: string;
  type?: string;
  path?: string;
  value?: string;
  description?: string;
  mime_type?: string;
  size_bytes?: number;
}

export type DocumentAssetType =
  | "diagram"
  | "chart"
  | "illustration"
  | "equation"
  | "table_image"
  | "text_scan"
  | "photo"
  | "other";

export type AssetStoragePolicy = "auto" | "always_base64" | "description_only";

export interface ExtractedVisualAsset {
  filename: string;
  title: string;
  assetType: DocumentAssetType;
  mimeType: string;
  extension: string;
  bytes: Uint8Array;
  retainImageData: boolean;
  retentionReason: string;
  contentItemId?: string;
  pageNumber?: number;
  width?: number;
  height?: number;
  altText?: string;
  description?: string;
  markdownText?: string;
  ocrText?: string;
}

export interface VisionAssetAnalysis {
  assetType: DocumentAssetType;
  preserveImageData: boolean;
  retentionReason: string;
  description: string;
  markdownText?: string;
  ocrText?: string;
}

export interface DocumentParseOutput {
  format: string;
  text: string;
  pageCount: number;
  ocrUsed: boolean;
  assets: ExtractedVisualAsset[];
  warnings: string[];
}

export interface ExtractedContentItem {
  id?: string;
  name: string;
  type: string;
  format: string;
  text: string;
  charCount: number;
  pageCount: number;
  ocrUsed: boolean;
  assets: ExtractedVisualAsset[];
  warnings: string[];
}

export interface ExtractOptions {
  enableOcr?: boolean;
  describeVisualAssets?: boolean;
  assetStoragePolicy?: AssetStoragePolicy;
  openRouterApiKey?: string;
  openRouterModel?: string;
  maxOcrBytes?: number;
  maxVisualAssetsPerDoc?: number;
  maxDescribedAssetsPerDoc?: number;
}

export interface StorageDownloader {
  storage: {
    from: (bucket: string) => {
      download: (
        path: string,
      ) => Promise<{ data: Blob | null; error: { message?: string } | null }>;
    };
  };
}

const DEFAULT_MAX_OCR_BYTES = 10 * 1024 * 1024; // 10 MB cap for multimodal inline requests
const DEFAULT_MAX_ASSETS = 15;
const DEFAULT_MAX_DESCRIBED_ASSETS = 4;
const MIN_MEANINGFUL_IMAGE_DIM = 24;
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: false });
const UTF16LE_DECODER = new TextDecoder("utf-16le", { fatal: false });

/** Normalize line endings, remove binary control bytes, and collapse excessive blank lines. */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Decode common XML/HTML named and numeric entities in a single non-recursive pass. */
export function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "-",
    mdash: "--",
    hellip: "...",
  };

  return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (full, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const cp = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : full;
    }
    if (body.startsWith("#")) {
      const cp = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 ? String.fromCodePoint(cp) : full;
    }
    return named[body] ?? full;
  });
}

/** Stack-safe conversion from Uint8Array to base64 string. */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const slice = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function getFileExtension(name: string): string {
  const clean = name.split("?")[0].split("#")[0];
  const idx = clean.lastIndexOf(".");
  return idx >= 0 ? clean.slice(idx + 1).toLowerCase() : "";
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, idx) => bytes[idx] === byte);
}

function mimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  return map[ext] || "image/png";
}

function extensionFromMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
  if (lower.includes("webp")) return "webp";
  if (lower.includes("gif")) return "gif";
  if (lower.includes("svg")) return "svg";
  return "png";
}

function detectImageMimeFromBytes(bytes: Uint8Array, fallbackName: string, fallbackMime?: string): string {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    bytes.length >= 12 &&
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (fallbackMime?.startsWith("image/")) return fallbackMime.split(";")[0].trim();
  return mimeFromExtension(getFileExtension(fallbackName));
}

const VALID_ASSET_TYPES = new Set<DocumentAssetType>([
  "diagram",
  "chart",
  "illustration",
  "equation",
  "table_image",
  "text_scan",
  "photo",
  "other",
]);

function classifyAssetType(label: string): DocumentAssetType {
  const lower = label.toLowerCase();
  if (lower.includes("chart") || lower.includes("graph") || lower.includes("plot")) return "chart";
  if (lower.includes("diagram") || lower.includes("flow") || lower.includes("circuit")) return "diagram";
  if (lower.includes("equation") || lower.includes("formula")) return "equation";
  if (lower.includes("table")) return "table_image";
  if (lower.includes("scan")) return "text_scan";
  if (lower.includes("photo") || lower.includes("img_") || lower.includes("dsc")) return "photo";
  return "illustration";
}

export function normalizeAssetType(
  raw: unknown,
  fallback: DocumentAssetType = "other",
): DocumentAssetType {
  if (typeof raw !== "string") return fallback;
  const cleaned = raw.trim().toLowerCase();
  if (VALID_ASSET_TYPES.has(cleaned as DocumentAssetType)) {
    return cleaned as DocumentAssetType;
  }
  if (cleaned === "table_snapshot" || cleaned === "table") return "table_image";
  if (cleaned === "scan" || cleaned === "scanned_page" || cleaned === "document") return "text_scan";
  if (cleaned === "image" || cleaned === "figure") return "illustration";
  return fallback;
}

export function resolveRetentionDecision(params: {
  aiPreserve?: boolean;
  assetType: DocumentAssetType;
  policy?: AssetStoragePolicy;
  aiReason?: string;
  hasTextAlternative?: boolean;
}): { retainImageData: boolean; retentionReason: string } {
  const policy = params.policy ?? "auto";
  const cleanReason = params.aiReason?.trim();

  if (policy === "always_base64") {
    return {
      retainImageData: true,
      retentionReason: cleanReason || "Retained raw image data per always_base64 policy",
    };
  }
  if (policy === "description_only") {
    return {
      retainImageData: false,
      retentionReason: cleanReason || "Stored textual description only per description_only policy",
    };
  }

  if (typeof params.aiPreserve === "boolean") {
    return {
      retainImageData: params.aiPreserve,
      retentionReason:
        cleanReason ||
        (params.aiPreserve
          ? `Retained visual ${params.assetType} bytes alongside structured description`
          : `Textual/tabular ${params.assetType} fully represented in Markdown`),
    };
  }

  if (params.hasTextAlternative && (params.assetType === "table_image" || params.assetType === "text_scan")) {
    return {
      retainImageData: false,
      retentionReason: cleanReason || `Textual/tabular ${params.assetType} captured cleanly without raw pixels`,
    };
  }

  return {
    retainImageData: true,
    retentionReason: cleanReason || "Preserved visual asset pending Vision classification/OCR",
  };
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseVisionAssetResponse(
  raw: string,
  fallbackType: DocumentAssetType,
  policy: AssetStoragePolicy = "auto",
): VisionAssetAnalysis {
  const candidate = stripJsonCodeFences(raw);
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const assetType = normalizeAssetType(parsed.asset_type, fallbackType);
      const aiPreserve = typeof parsed.preserve_image_data === "boolean"
        ? parsed.preserve_image_data
        : undefined;
      const description = typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : typeof parsed.markdown_text === "string"
        ? parsed.markdown_text.trim().slice(0, 600)
        : raw.trim().slice(0, 600);
      const markdownText = typeof parsed.markdown_text === "string" && parsed.markdown_text.trim()
        ? parsed.markdown_text.trim()
        : undefined;
      const ocrText = typeof parsed.ocr_text === "string" && parsed.ocr_text.trim()
        ? parsed.ocr_text.trim()
        : markdownText || description;
      const decision = resolveRetentionDecision({
        aiPreserve,
        assetType,
        policy,
        aiReason: typeof parsed.retention_reason === "string" ? parsed.retention_reason : undefined,
        hasTextAlternative: Boolean(markdownText || ocrText),
      });
      return {
        assetType,
        preserveImageData: decision.retainImageData,
        retentionReason: decision.retentionReason,
        description,
        markdownText,
        ocrText,
      };
    }
  } catch {
    // Non-JSON prose fallback below
  }

  const trimmed = raw.trim();
  const decision = resolveRetentionDecision({
    aiPreserve: undefined,
    assetType: fallbackType,
    policy,
    aiReason: "Retained visual asset alongside unstructured Vision transcription fallback",
    hasTextAlternative: false,
  });
  return {
    assetType: fallbackType,
    preserveImageData: decision.retainImageData,
    retentionReason: decision.retentionReason,
    description: trimmed.slice(0, 600),
    markdownText: trimmed,
    ocrText: trimmed,
  };
}

/** Detect canonical document format using magic bytes first, then MIME type and extension. */
export function detectDocumentFormat(
  bytes: Uint8Array,
  fileName: string,
  mimeType?: string,
): string {
  const ext = getFileExtension(fileName);
  const mime = (mimeType || "").toLowerCase();

  // %PDF-
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";

  // Raster image magic headers
  if (
    startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47]) ||
    startsWithBytes(bytes, [0xff, 0xd8, 0xff]) ||
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38])
  ) {
    return "image";
  }
  if (
    bytes.length >= 12 &&
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image";
  }

  // ZIP / OOXML magic bytes (PK\x03\x04)
  if (startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    if (ext === "docx" || mime.includes("wordprocessingml")) return "docx";
    if (ext === "pptx" || mime.includes("presentationml")) return "pptx";
    if (ext === "xlsx" || mime.includes("spreadsheetml")) return "xlsx";
    return "ooxml-zip";
  }

  // Legacy OLE2 Compound Binary (DOC, XLS, PPT)
  if (startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return "ole2";
  }

  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx" || mime.includes("wordprocessingml")) return "docx";
  if (ext === "pptx" || mime.includes("presentationml")) return "pptx";
  if (ext === "xlsx" || mime.includes("spreadsheetml")) return "xlsx";
  if (ext === "svg" || mime.includes("svg")) return "svg";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext) || mime.startsWith("image/")) {
    return "image";
  }
  if (ext === "csv" || mime.includes("csv")) return "csv";
  if (ext === "html" || ext === "htm" || mime.includes("text/html") || mime.includes("xhtml")) {
    return "html";
  }
  if (ext === "md" || ext === "markdown" || mime.includes("markdown")) return "markdown";
  if (ext === "json" || mime.includes("json")) return "json";
  if (["doc", "xls", "ppt"].includes(ext)) return "ole2";
  return "text";
}

function formatMarkdownTable(rows: string[][]): string {
  const nonEmpty = rows.filter((row) => row.some((cell) => cell.trim().length > 0));
  if (nonEmpty.length === 0) return "";
  const colCount = Math.max(...nonEmpty.map((r) => r.length));
  if (colCount === 0) return "";

  const normalizeRow = (r: string[]) =>
    Array.from({ length: colCount }, (_, i) =>
      (r[i] ?? "").replace(/\|/g, "\\|").replace(/\s*\n+\s*/g, " ").trim()
    );

  const header = normalizeRow(nonEmpty[0]);
  const separator = Array.from({ length: colCount }, () => "---");
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...nonEmpty.slice(1).map((r) => `| ${normalizeRow(r).join(" | ")} |`),
  ];
  return lines.join("\n");
}

/** Convert CSV into clean Markdown table (falling back cleanly on ragged single-column text). */
export function csvToMarkdown(rawCsv: string): string {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = rawCsv.replace(/\r\n?/g, "\n").trim();
  if (!input) return "";

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      if (rows.length >= 500) break;
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  const maxCols = Math.max(0, ...rows.map((r) => r.length));
  if (maxCols <= 1 || rows.length < 2) {
    return sanitizeText(rawCsv);
  }
  const table = formatMarkdownTable(rows);
  return rows.length >= 500 ? `${table}\n\n*(Truncated to first 500 CSV rows)*` : table;
}

/** Convert HTML pages/snippets into readable Markdown without heavy DOM dependencies. */
export function htmlToMarkdown(rawHtml: string): string {
  let text = rawHtml
    .replace(/<(script|style|noscript|template|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  for (let lvl = 1; lvl <= 6; lvl++) {
    const headingRegex = new RegExp(`<h${lvl}[^>]*>([\\s\\S]*?)<\\/h${lvl}>`, "gi");
    const hashes = "#".repeat(lvl);
    text = text.replace(headingRegex, (_m, inner: string) => `\n\n${hashes} ${inner.trim()}\n\n`);
  }

  text = text
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(li|tr|p|div|section|article|blockquote|pre|header|footer|aside)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<t[dh][^>]*>/gi, " | ")
    .replace(/<hr\s*\/?>/gi, "\n---\n")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const cleanLabel = label.replace(/<[^>]+>/g, "").trim();
      return cleanLabel ? `[${cleanLabel}](${href})` : href;
    })
    .replace(/<[^>]+>/g, " ");

  text = decodeEntities(text);
  return sanitizeText(text);
}

/** Extract readable labels, titles, and descriptions from SVG graphics. */
export function svgToMarkdown(rawSvg: string, name: string): string {
  const parts: string[] = [];
  const titleMatch = rawSvg.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = rawSvg.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
  if (titleMatch?.[1]) parts.push(`Title: ${decodeEntities(titleMatch[1]).trim()}`);
  if (descMatch?.[1]) parts.push(`Description: ${decodeEntities(descMatch[1]).trim()}`);

  const labels: string[] = [];
  const textRegex = /<(text|tspan)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = textRegex.exec(rawSvg)) !== null) {
    const cleaned = sanitizeText(decodeEntities(match[2].replace(/<[^>]+>/g, " ")));
    if (cleaned) labels.push(cleaned);
  }
  if (labels.length > 0) {
    parts.push(`Labels: ${labels.join(" | ")}`);
  }

  const summary = parts.join("\n").trim();
  return summary ? `### SVG Illustration: ${name}\n${summary}` : `SVG Illustration: ${name}`;
}

/** Best-effort text recovery from legacy OLE2 binary documents (.doc/.xls/.ppt). */
export function extractOle2PrintableText(bytes: Uint8Array): string {
  const utf16 = UTF16LE_DECODER.decode(bytes);
  const ascii = TEXT_DECODER.decode(bytes);

  const collectRuns = (src: string) =>
    (src.match(/[A-Za-z0-9.,;:'"?!()\-/%+\s]{10,}/g) || [])
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) =>
        s.length >= 10 &&
        !/^(Root Entry|WordDocument|SummaryInformation|DocumentSummaryInformation|Workbook|PowerPoint Document|Current User)/i.test(s)
      );

  const candidates = new Set<string>([...collectRuns(ascii), ...collectRuns(utf16)]);
  return sanitizeText(Array.from(candidates).join("\n"));
}

/** Scan OOXML block elements cleanly in document order (handling nested tables). */
function extractTopLevelBlocks(
  xml: string,
  primaryTag: string,
  secondaryTag: string,
): Array<{ tag: string; xml: string }> {
  const blocks: Array<{ tag: string; xml: string }> = [];
  const openPrimary = `<${primaryTag}`;
  const closePrimary = `</${primaryTag}>`;
  const openSecondary = `<${secondaryTag}`;
  const closeSecondary = `</${secondaryTag}>`;

  let pos = 0;
  while (pos < xml.length) {
    const idxP = xml.indexOf(openPrimary, pos);
    const idxS = xml.indexOf(openSecondary, pos);
    if (idxP === -1 && idxS === -1) break;

    const usePrimary = idxP !== -1 && (idxS === -1 || idxP < idxS);
    const startIdx = usePrimary ? idxP : idxS;
    const openTok = usePrimary ? openPrimary : openSecondary;
    const closeTok = usePrimary ? closePrimary : closeSecondary;
    const tag = usePrimary ? primaryTag : secondaryTag;

    const nextChar = xml[startIdx + openTok.length];
    if (nextChar !== ">" && nextChar !== " " && nextChar !== "/") {
      pos = startIdx + openTok.length;
      continue;
    }

    // Track tag depth in case tables contain inner tables or paragraphs
    let depth = 1;
    let cursor = startIdx + openTok.length;
    while (depth > 0 && cursor < xml.length) {
      const nextOpen = xml.indexOf(openTok, cursor);
      const nextClose = xml.indexOf(closeTok, cursor);
      if (nextClose === -1) {
        cursor = xml.length;
        break;
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        const nc = xml[nextOpen + openTok.length];
        if (nc === ">" || nc === " " || nc === "/") {
          depth++;
        }
        cursor = nextOpen + openTok.length;
      } else {
        depth--;
        cursor = nextClose + closeTok.length;
      }
    }

    blocks.push({ tag, xml: xml.slice(startIdx, cursor) });
    pos = cursor;
  }

  return blocks;
}

function parseDocxParagraph(pXml: string): string {
  const styleMatch = pXml.match(/<w:pStyle\b[^>]*\bw:val=["']([^"']+)["']/);
  const styleVal = styleMatch?.[1] || "";
  const isList = /<w:numPr\b/.test(pXml);

  const normalizedXml = pXml
    .replace(/<w:tab\s*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n");

  const runs: string[] = [];
  const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let match: RegExpExecArray | null;
  while ((match = tRegex.exec(normalizedXml)) !== null) {
    runs.push(decodeEntities(match[1]));
  }
  const text = runs.join("").replace(/[ \t]+/g, " ").trim();
  if (!text) return "";

  const headingNumMatch = styleVal.match(/^(?:Heading|heading)\s*([1-6])$/);
  if (headingNumMatch) {
    return `${"#".repeat(Number(headingNumMatch[1]))} ${text}`;
  }
  if (/^Title$/i.test(styleVal)) return `# ${text}`;
  if (/^Subtitle$/i.test(styleVal)) return `## ${text}`;
  if (isList) return `- ${text}`;
  return text;
}

function parseDocxTable(tblXml: string): string {
  const rowBlocks = tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
  const rows: string[][] = [];
  for (const rXml of rowBlocks) {
    const cellBlocks = rXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
    const cells = cellBlocks.map((cXml) => {
      const paras = cXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
      return paras.map(parseDocxParagraph).filter(Boolean).join(" ");
    });
    if (cells.length > 0) rows.push(cells);
  }
  return formatMarkdownTable(rows);
}

function extractMediaFromZip(
  files: Record<string, Uint8Array>,
  mediaPrefix: string,
  maxAssets: number,
  altTexts: string[] = [],
): ExtractedVisualAsset[] {
  const mediaEntries = Object.entries(files)
    .filter(([path]) => path.startsWith(mediaPrefix) && !path.endsWith("/"))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .slice(0, maxAssets);

  const assets: ExtractedVisualAsset[] = [];
  mediaEntries.forEach(([path, bytes], idx) => {
    const baseName = path.split("/").pop() || `illustration-${idx + 1}.png`;
    const ext = getFileExtension(baseName);
    if (["wmf", "emf"].includes(ext)) return; // Vector metafiles unsupported by raster renderers

    const mimeType = detectImageMimeFromBytes(bytes, baseName);
    const resolvedExt = extensionFromMime(mimeType);
    const altText = altTexts[idx]?.trim() || undefined;
    const detectedType = classifyAssetType(altText || baseName);
    assets.push({
      filename: baseName,
      title: altText || baseName,
      assetType: detectedType,
      mimeType,
      extension: resolvedExt,
      bytes,
      retainImageData: true,
      retentionReason: "Preserved embedded Office media pending Vision classification",
      altText,
    });
  });

  return assets;
}

function extractOoxmlAltTexts(xml: string): string[] {
  const result: string[] = [];
  const tagRegex = /<(?:wp:docPr|p:cNvPr)\b([^>]*)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const descr = attrs.match(/\bdescr=["']([^"']+)["']/)?.[1];
    const title = attrs.match(/\btitle=["']([^"']+)["']/)?.[1];
    const name = attrs.match(/\bname=["']([^"']+)["']/)?.[1];
    const val = decodeEntities(descr || title || name || "").trim();
    if (val && !/^Picture \d+$/i.test(val)) {
      result.push(val);
    }
  }
  return result;
}

/** Parse DOCX OOXML archive into normalized Markdown headings/tables + embedded media assets. */
export function parseDocxBytes(bytes: Uint8Array, maxAssets: number): DocumentParseOutput {
  const files = unzipSync(bytes);
  const docEntry = files["word/document.xml"];
  if (!docEntry) {
    return {
      format: "docx",
      text: "",
      pageCount: 1,
      ocrUsed: false,
      assets: [],
      warnings: ["DOCX archive missing word/document.xml"],
    };
  }

  const docXml = strFromU8(docEntry);
  const bodyMatch = docXml.match(/<w:body\b[^>]*>([\s\S]*?)<\/w:body>/);
  const bodyXml = bodyMatch ? bodyMatch[1] : docXml;

  const blocks = extractTopLevelBlocks(bodyXml, "w:tbl", "w:p");
  const mdBlocks: string[] = [];
  for (const blk of blocks) {
    if (blk.tag === "w:tbl") {
      const tableMd = parseDocxTable(blk.xml);
      if (tableMd) mdBlocks.push(tableMd);
    } else {
      const paraMd = parseDocxParagraph(blk.xml);
      if (paraMd) mdBlocks.push(paraMd);
    }
  }

  const altTexts = extractOoxmlAltTexts(docXml);
  const assets = extractMediaFromZip(files, "word/media/", maxAssets, altTexts);
  const text = sanitizeText(mdBlocks.join("\n\n"));

  let pageCount = Math.max(1, Math.round(text.length / 2500));
  const appEntry = files["docProps/app.xml"];
  if (appEntry) {
    const appXml = strFromU8(appEntry);
    const pagesMatch = appXml.match(/<Pages>(\d+)<\/Pages>/i);
    if (pagesMatch) {
      pageCount = Math.max(1, Number.parseInt(pagesMatch[1], 10));
    }
  }

  return {
    format: "docx",
    text,
    pageCount,
    ocrUsed: false,
    assets,
    warnings: [],
  };
}

function parseDrawingParagraph(pXml: string): string {
  const normalized = pXml.replace(/<a:br\b[^>]*\/>/g, "\n");
  const runs: string[] = [];
  const tRegex = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
  let match: RegExpExecArray | null;
  while ((match = tRegex.exec(normalized)) !== null) {
    runs.push(decodeEntities(match[1]));
  }
  return runs.join("").replace(/[ \t]+/g, " ").trim();
}

function parseDrawingTable(tblXml: string): string {
  const rowBlocks = tblXml.match(/<a:tr\b[\s\S]*?<\/a:tr>/g) || [];
  const rows: string[][] = [];
  for (const rXml of rowBlocks) {
    const cellBlocks = rXml.match(/<a:tc\b[\s\S]*?<\/a:tc>/g) || [];
    const cells = cellBlocks.map((cXml) => {
      const paras = cXml.match(/<a:p\b[\s\S]*?<\/a:p>/g) || [];
      return paras.map(parseDrawingParagraph).filter(Boolean).join(" ");
    });
    if (cells.length > 0) rows.push(cells);
  }
  return formatMarkdownTable(rows);
}

/** Parse PPTX OOXML archive into per-slide Markdown sections + speaker notes + media assets. */
export function parsePptxBytes(bytes: Uint8Array, maxAssets: number): DocumentParseOutput {
  const files = unzipSync(bytes);
  const slideEntries = Object.keys(files)
    .map((path) => {
      const m = path.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      return m ? { path, slideNum: Number.parseInt(m[1], 10) } : null;
    })
    .filter((x): x is { path: string; slideNum: number } => x !== null)
    .sort((a, b) => a.slideNum - b.slideNum);

  const slideSections: string[] = [];
  const altTexts: string[] = [];

  for (const slide of slideEntries) {
    const slideXml = strFromU8(files[slide.path]);
    altTexts.push(...extractOoxmlAltTexts(slideXml));

    const lines: string[] = [];
    const tables = slideXml.match(/<a:tbl\b[\s\S]*?<\/a:tbl>/g) || [];
    const slideWithoutTables = slideXml.replace(/<a:tbl\b[\s\S]*?<\/a:tbl>/g, "");

    const paras = slideWithoutTables.match(/<a:p\b[\s\S]*?<\/a:p>/g) || [];
    for (const p of paras) {
      const pt = parseDrawingParagraph(p);
      if (pt) lines.push(pt);
    }
    for (const tbl of tables) {
      const tableMd = parseDrawingTable(tbl);
      if (tableMd) lines.push(tableMd);
    }

    const notesEntry = files[`ppt/notesSlides/notesSlide${slide.slideNum}.xml`];
    if (notesEntry) {
      const notesXml = strFromU8(notesEntry);
      const noteLines = (notesXml.match(/<a:p\b[\s\S]*?<\/a:p>/g) || [])
        .map(parseDrawingParagraph)
        .filter((l) => l.length > 0 && l !== String(slide.slideNum));
      if (noteLines.length > 0) {
        lines.push(`> Speaker Notes: ${noteLines.join(" ")}`);
      }
    }

    if (lines.length > 0) {
      slideSections.push(`## Slide ${slide.slideNum}\n${lines.join("\n")}`);
    }
  }

  const assets = extractMediaFromZip(files, "ppt/media/", maxAssets, altTexts);
  return {
    format: "pptx",
    text: sanitizeText(slideSections.join("\n\n")),
    pageCount: Math.max(1, slideEntries.length),
    ocrUsed: false,
    assets,
    warnings: slideEntries.length === 0 ? ["PPTX archive contained no slide XML entries."] : [],
  };
}

function columnLettersToIndex(ref: string): number {
  const letters = ref.match(/^([A-Za-z]+)/)?.[1]?.toUpperCase() || "";
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return Math.max(0, col - 1);
}

function parseSharedStringsXml(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = siRegex.exec(xml)) !== null) {
    const tParts: string[] = [];
    const tRegex = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(match[1])) !== null) {
      tParts.push(decodeEntities(tMatch[1]));
    }
    strings.push(tParts.join(""));
  }
  return strings;
}

/** Parse XLSX OOXML archive into Markdown sheet tables + embedded chart/media assets. */
export function parseXlsxBytes(bytes: Uint8Array, maxAssets: number): DocumentParseOutput {
  const files = unzipSync(bytes);
  const sharedStrings = files["xl/sharedStrings.xml"]
    ? parseSharedStringsXml(strFromU8(files["xl/sharedStrings.xml"]))
    : [];

  const sheetNames: string[] = [];
  if (files["xl/workbook.xml"]) {
    const wbXml = strFromU8(files["xl/workbook.xml"]);
    const sheetTagRegex = /<sheet\b([^>]*)\/?>/g;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = sheetTagRegex.exec(wbXml)) !== null) {
      const nameMatch = sMatch[1].match(/\bname=["']([^"']+)["']/);
      if (nameMatch?.[1]) sheetNames.push(decodeEntities(nameMatch[1]));
    }
  }

  const sheetFiles = Object.keys(files)
    .map((path) => {
      const m = path.match(/^xl\/worksheets\/sheet(\d+)\.xml$/);
      return m ? { path, sheetIdx: Number.parseInt(m[1], 10) } : null;
    })
    .filter((x): x is { path: string; sheetIdx: number } => x !== null)
    .sort((a, b) => a.sheetIdx - b.sheetIdx);

  const sections: string[] = [];
  for (const sf of sheetFiles) {
    const sheetXml = strFromU8(files[sf.path]);
    const sheetTitle = sheetNames[sf.sheetIdx - 1] || `Sheet ${sf.sheetIdx}`;
    const rows: string[][] = [];
    const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = rowRegex.exec(sheetXml)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = cellRegex.exec(rMatch[1])) !== null) {
        const attrs = cMatch[1];
        const inner = cMatch[2];
        const ref = attrs.match(/\br=["']([^"']+)["']/)?.[1] || "";
        const typeAttr = attrs.match(/\bt=["']([^"']+)["']/)?.[1] || "";
        const colIdx = ref ? columnLettersToIndex(ref) : cells.length;
        if (colIdx > 199) continue;

        let val = "";
        if (typeAttr === "s") {
          const idxStr = inner.match(/<v>([^<]+)<\/v>/)?.[1];
          const ssIdx = idxStr ? Number.parseInt(idxStr, 10) : -1;
          val = sharedStrings[ssIdx] ?? "";
        } else if (typeAttr === "inlineStr") {
          const tParts = Array.from(inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)).map((m) =>
            decodeEntities(m[1])
          );
          val = tParts.join("");
        } else if (typeAttr === "b") {
          const bVal = inner.match(/<v>([^<]+)<\/v>/)?.[1];
          val = bVal === "1" ? "TRUE" : "FALSE";
        } else {
          const vRaw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
          val = vRaw !== undefined ? decodeEntities(vRaw) : "";
        }
        cells[colIdx] = val;
      }
      if (cells.some((c) => c && c.trim().length > 0)) {
        rows.push(cells);
      }
      if (rows.length >= 1000) break;
    }

    const mdTable = formatMarkdownTable(rows);
    if (mdTable) {
      sections.push(`## Sheet: ${sheetTitle}\n${mdTable}`);
    }
  }

  const assets = extractMediaFromZip(files, "xl/media/", maxAssets);
  return {
    format: "xlsx",
    text: sanitizeText(sections.join("\n\n")),
    pageCount: Math.max(1, sheetFiles.length),
    ocrUsed: false,
    assets,
    warnings: [],
  };
}

/** Call OpenRouter multimodal chat completions for image transcription or scanned PDF OCR. */
async function callOpenRouterVision(
  prompt: string,
  contentPart:
    | { type: "image_url"; image_url: { url: string } }
    | { type: "file"; file: { filename: string; file_data: string } },
  apiKey: string,
  model: string,
): Promise<string> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://didactiq.app",
      "X-Title": "Didactiq Document Extractor",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }, contentPart],
        },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenRouter Vision ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === "string") return sanitizeText(content);
  if (Array.isArray(content)) {
    const joined = content
      .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n");
    return sanitizeText(joined);
  }
  return "";
}

async function parsePdfBytes(
  bytes: Uint8Array,
  fileName: string,
  options: ExtractOptions,
): Promise<DocumentParseOutput> {
  const warnings: string[] = [];
  const maxAssets = options.maxVisualAssetsPerDoc ?? DEFAULT_MAX_ASSETS;
  const maxOcrBytes = options.maxOcrBytes ?? DEFAULT_MAX_OCR_BYTES;
  const apiKey = options.openRouterApiKey || "";
  const visionModel = options.openRouterModel || "google/gemini-2.5-flash";

  let totalPages = 1;
  let pageTexts: string[] = [];
  try {
    const textResult = await extractText(new Uint8Array(bytes), { mergePages: false });
    totalPages = Math.max(1, textResult.totalPages || 1);
    pageTexts = Array.isArray(textResult.text)
      ? textResult.text.map((t) => sanitizeText(t))
      : [sanitizeText(String(textResult.text || ""))];
  } catch (err) {
    warnings.push(`PDF text parsing warning: ${err instanceof Error ? err.message : String(err)}`);
  }

  const assets: ExtractedVisualAsset[] = [];
  let scannedHint = false;

  try {
    const inspection = await inspectPages(new Uint8Array(bytes));
    totalPages = Math.max(totalPages, inspection.totalPages || 1);

    for (let idx = 0; idx < inspection.pages.length; idx++) {
      const pageNum = idx + 1;
      const pageMeta = inspection.pages[idx];
      if (pageMeta.textLength < 40 && pageMeta.imageCoverage > 0.3) {
        scannedHint = true;
      }
      if (pageMeta.imageCount === 0 || assets.length >= maxAssets) continue;

      try {
        const extracted = await extractImages(new Uint8Array(bytes), pageNum, {
          format: "png",
        });
        for (let imgIdx = 0; imgIdx < extracted.length && assets.length < maxAssets; imgIdx++) {
          const img = extracted[imgIdx];
          if (img.width < MIN_MEANINGFUL_IMAGE_DIM || img.height < MIN_MEANINGFUL_IMAGE_DIM) {
            continue;
          }
          const imgName = `page-${pageNum}-fig-${imgIdx + 1}.png`;
          const heuristicType: DocumentAssetType =
            pageMeta.imageCoverage > 0.6 && pageMeta.textLength < 40 ? "text_scan" : "illustration";
          assets.push({
            filename: imgName,
            title: `${fileName} — Page ${pageNum} Figure ${imgIdx + 1}`,
            assetType: heuristicType,
            mimeType: "image/png",
            extension: "png",
            bytes: img.data,
            retainImageData: true,
            retentionReason:
              heuristicType === "text_scan"
                ? "Retained scanned PDF page bitmap pending Vision OCR"
                : "Retained embedded PDF figure pending Vision classification",
            pageNumber: pageNum,
            width: img.width,
            height: img.height,
          });
        }
      } catch (imgErr) {
        warnings.push(
          `Skipped image extraction on page ${pageNum}: ${imgErr instanceof Error ? imgErr.message : String(imgErr)}`,
        );
      }
    }
  } catch (inspectErr) {
    warnings.push(
      `PDF page inspection warning: ${inspectErr instanceof Error ? inspectErr.message : String(inspectErr)}`,
    );
  }

  let combinedText = sanitizeText(
    pageTexts
      .map((t, i) => (t ? (totalPages > 1 ? `<!-- page ${i + 1} -->\n${t}` : t) : ""))
      .filter(Boolean)
      .join("\n\n"),
  );
  let ocrUsed = false;

  // Fallback to multimodal PDF OCR when document looks scanned or yielded near-empty text
  if ((scannedHint || combinedText.length < totalPages * 35) && options.enableOcr && apiKey) {
    if (bytes.byteLength <= maxOcrBytes) {
      try {
        const b64 = uint8ArrayToBase64(bytes);
        const ocrMarkdown = await callOpenRouterVision(
          "Transcribe this educational PDF into clean Markdown, preserving headings (#, ##), tables, mathematical notation, and concise bracketed descriptions of any diagrams or figures.",
          {
            type: "file",
            file: {
              filename: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
              file_data: `data:application/pdf;base64,${b64}`,
            },
          },
          apiKey,
          visionModel,
        );
        if (ocrMarkdown.length > combinedText.length) {
          combinedText = ocrMarkdown;
          ocrUsed = true;
        }
      } catch (ocrErr) {
        warnings.push(
          `OpenRouter PDF OCR fallback skipped: ${ocrErr instanceof Error ? ocrErr.message : String(ocrErr)}`,
        );
      }
    } else {
      warnings.push(
        `PDF appears scanned/image-based (${bytes.byteLength} bytes exceeds ${maxOcrBytes}-byte OCR cap).`,
      );
    }
  } else if ((scannedHint || combinedText.length < 40) && !apiKey) {
    warnings.push("PDF contains minimal selectable text (likely scanned); configure OPENROUTER_API_KEY for OCR.");
  }

  return {
    format: "pdf",
    text: combinedText,
    pageCount: totalPages,
    ocrUsed,
    assets,
    warnings,
  };
}

const VISUAL_ASSET_CLASSIFICATION_PROMPT = `Analyze this educational image or figure carefully.
Determine whether its meaning is 100% captured by Markdown text/tables (for example a typed text scan, plain printed worksheet, or clean table convertible into a Markdown table) OR whether the raw image contains essential visual, geometric, spatial, diagrammatic, plotted, handwritten, or illustrative detail that should be preserved alongside the text description.

Return ONLY valid JSON matching this schema (no extra prose):
{
  "asset_type": "diagram" | "chart" | "illustration" | "equation" | "table_image" | "text_scan" | "photo" | "other",
  "preserve_image_data": true | false,
  "retention_reason": "One short sentence explaining why the raw image should be kept or discarded.",
  "description": "Concise 1-3 sentence description of the visual content or layout.",
  "markdown_text": "Complete Markdown transcription of all legible text, tables, formulas (LaTeX), axis labels, and structure.",
  "ocr_text": "Verbatim readable text and labels found in the image."
}

Rules:
- Set "preserve_image_data": false ONLY when "markdown_text" captures all educational meaning (pure text scans, simple typed sheets without diagrams, or tables cleanly converted to Markdown).
- Set "preserve_image_data": true for diagrams, charts, plots, geometric figures, scientific illustrations, handwritten student work, multi-step visual equations, or annotated photos.`;

export async function analyzeVisualAssetWithVision(
  bytes: Uint8Array,
  mimeType: string,
  filename: string,
  apiKey: string,
  model: string,
  policy: AssetStoragePolicy = "auto",
  fallbackType: DocumentAssetType = classifyAssetType(filename),
): Promise<VisionAssetAnalysis> {
  const b64 = uint8ArrayToBase64(bytes);
  const raw = await callOpenRouterVision(
    VISUAL_ASSET_CLASSIFICATION_PROMPT,
    {
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${b64}` },
    },
    apiKey,
    model,
  );
  if (!raw) {
    const decision = resolveRetentionDecision({
      assetType: fallbackType,
      policy,
      hasTextAlternative: false,
      aiReason: "Empty Vision response; retained image bytes for safety",
    });
    return {
      assetType: fallbackType,
      preserveImageData: decision.retainImageData,
      retentionReason: decision.retentionReason,
      description: "",
    };
  }
  return parseVisionAssetResponse(raw, fallbackType, policy);
}

async function parseImageBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string | undefined,
  options: ExtractOptions,
): Promise<DocumentParseOutput> {
  const warnings: string[] = [];
  const resolvedMime = detectImageMimeFromBytes(bytes, fileName, mimeType);
  const ext = extensionFromMime(resolvedMime);
  const maxOcrBytes = options.maxOcrBytes ?? DEFAULT_MAX_OCR_BYTES;
  const apiKey = options.openRouterApiKey || "";
  const visionModel = options.openRouterModel || "google/gemini-2.5-flash";
  const policy = options.assetStoragePolicy ?? "auto";
  const heuristicType = classifyAssetType(fileName);

  let text = `[Image Asset: ${fileName} (${resolvedMime}, ${bytes.byteLength} bytes)]`;
  let assetType: DocumentAssetType = heuristicType;
  let description: string | undefined;
  let markdownText: string | undefined;
  let ocrText: string | undefined;
  let ocrUsed = false;
  let decision = resolveRetentionDecision({
    assetType: heuristicType,
    policy,
    hasTextAlternative: false,
  });

  if ((options.enableOcr || options.describeVisualAssets) && apiKey && bytes.byteLength <= maxOcrBytes) {
    try {
      const analysis = await analyzeVisualAssetWithVision(
        bytes,
        resolvedMime,
        fileName,
        apiKey,
        visionModel,
        policy,
        heuristicType,
      );
      assetType = analysis.assetType;
      decision = {
        retainImageData: analysis.preserveImageData,
        retentionReason: analysis.retentionReason,
      };
      description = analysis.description || undefined;
      markdownText = analysis.markdownText;
      ocrText = analysis.ocrText;
      const transcribedText = markdownText || ocrText || description;
      if (transcribedText) {
        text = transcribedText;
        ocrUsed = true;
      }
    } catch (ocrErr) {
      warnings.push(
        `Image Vision OCR failed: ${ocrErr instanceof Error ? ocrErr.message : String(ocrErr)}`,
      );
    }
  } else if (!apiKey) {
    warnings.push("Image queued without Vision OCR; set OPENROUTER_API_KEY to enable automatic classification and transcription.");
  }

  return {
    format: "image",
    text,
    pageCount: 1,
    ocrUsed,
    assets: [
      {
        filename: fileName,
        title: fileName,
        assetType,
        mimeType: resolvedMime,
        extension: ext,
        bytes,
        retainImageData: decision.retainImageData,
        retentionReason: decision.retentionReason,
        pageNumber: 1,
        description,
        markdownText,
        ocrText,
      },
    ],
    warnings,
  };
}

async function enrichAssetsWithDescriptions(
  assets: ExtractedVisualAsset[],
  options: ExtractOptions,
  warnings: string[],
): Promise<void> {
  if (assets.length === 0) return;

  const policy = options.assetStoragePolicy ?? "auto";
  const apiKey = options.openRouterApiKey || "";
  const limit = options.maxDescribedAssetsPerDoc ?? DEFAULT_MAX_DESCRIBED_ASSETS;
  const visionModel = options.openRouterModel || "google/gemini-2.5-flash";
  const maxImgBytes = Math.min(options.maxOcrBytes ?? DEFAULT_MAX_OCR_BYTES, 4 * 1024 * 1024);

  let processed = 0;
  for (const asset of assets) {
    const canAnalyzeWithVision =
      Boolean(options.describeVisualAssets && apiKey) &&
      processed < limit &&
      !asset.description &&
      asset.bytes.byteLength <= maxImgBytes &&
      asset.mimeType !== "image/svg+xml";

    if (canAnalyzeWithVision) {
      try {
        const analysis = await analyzeVisualAssetWithVision(
          asset.bytes,
          asset.mimeType,
          asset.filename,
          apiKey,
          visionModel,
          policy,
          asset.assetType,
        );
        asset.assetType = analysis.assetType;
        asset.retainImageData = analysis.preserveImageData;
        asset.retentionReason = analysis.retentionReason;
        if (analysis.description) asset.description = analysis.description;
        if (analysis.markdownText) asset.markdownText = analysis.markdownText;
        if (analysis.ocrText) asset.ocrText = analysis.ocrText;
        processed++;
        continue;
      } catch (err) {
        warnings.push(
          `Skipped visual caption for ${asset.filename}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (policy !== "auto") {
      const forced = resolveRetentionDecision({
        aiPreserve: asset.retainImageData,
        assetType: asset.assetType,
        policy,
        aiReason: asset.retentionReason,
        hasTextAlternative: Boolean(asset.markdownText || asset.description || asset.ocrText),
      });
      asset.retainImageData = forced.retainImageData;
      asset.retentionReason = forced.retentionReason;
    }
  }
}

/** Dispatch binary or text bytes to the appropriate parser and return normalized Markdown + assets. */
export async function parseDocumentBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType?: string,
  options: ExtractOptions = {},
): Promise<DocumentParseOutput> {
  const format = detectDocumentFormat(bytes, fileName, mimeType);
  const maxAssets = options.maxVisualAssetsPerDoc ?? DEFAULT_MAX_ASSETS;

  let output: DocumentParseOutput;
  switch (format) {
    case "pdf":
      output = await parsePdfBytes(bytes, fileName, options);
      break;
    case "docx":
      output = parseDocxBytes(bytes, maxAssets);
      break;
    case "pptx":
      output = parsePptxBytes(bytes, maxAssets);
      break;
    case "xlsx":
      output = parseXlsxBytes(bytes, maxAssets);
      break;
    case "ooxml-zip": {
      const files = unzipSync(bytes);
      if (files["word/document.xml"]) output = parseDocxBytes(bytes, maxAssets);
      else if (Object.keys(files).some((k) => k.startsWith("ppt/slides/"))) {
        output = parsePptxBytes(bytes, maxAssets);
      } else if (Object.keys(files).some((k) => k.startsWith("xl/worksheets/"))) {
        output = parseXlsxBytes(bytes, maxAssets);
      } else {
        output = {
          format: "zip",
          text: "",
          pageCount: 1,
          ocrUsed: false,
          assets: [],
          warnings: ["Unrecognized ZIP archive structure."],
        };
      }
      break;
    }
    case "image":
      output = await parseImageBytes(bytes, fileName, mimeType, options);
      break;
    case "svg": {
      const svgRaw = TEXT_DECODER.decode(bytes);
      const md = svgToMarkdown(svgRaw, fileName);
      output = {
        format: "svg",
        text: md,
        pageCount: 1,
        ocrUsed: false,
        assets: [
          {
            filename: fileName,
            title: fileName,
            assetType: "diagram",
            mimeType: "image/svg+xml",
            extension: "svg",
            bytes,
            retainImageData: true,
            retentionReason: "Scalable vector diagram preserved alongside extracted text labels",
            pageNumber: 1,
            description: md,
            markdownText: md,
          },
        ],
        warnings: [],
      };
      break;
    }
    case "html":
      output = {
        format: "html",
        text: htmlToMarkdown(TEXT_DECODER.decode(bytes)),
        pageCount: 1,
        ocrUsed: false,
        assets: [],
        warnings: [],
      };
      break;
    case "csv":
      output = {
        format: "csv",
        text: csvToMarkdown(TEXT_DECODER.decode(bytes)),
        pageCount: 1,
        ocrUsed: false,
        assets: [],
        warnings: [],
      };
      break;
    case "ole2": {
      const recovered = extractOle2PrintableText(bytes);
      output = {
        format: "ole2",
        text: recovered,
        pageCount: Math.max(1, Math.round(recovered.length / 2500)),
        ocrUsed: false,
        assets: [],
        warnings: [
          "Legacy binary Office format (.doc/.xls/.ppt) used best-effort printable text extraction; convert to PDF or DOCX for full formatting.",
        ],
      };
      break;
    }
    default: {
      const plain = sanitizeText(TEXT_DECODER.decode(bytes));
      output = {
        format,
        text: plain,
        pageCount: Math.max(1, Math.round(plain.length / 2500)),
        ocrUsed: false,
        assets: [],
        warnings: [],
      };
      break;
    }
  }

  await enrichAssetsWithDescriptions(output.assets, options, output.warnings);
  return output;
}

async function extractFromUrl(url: string, name: string, options: ExtractOptions): Promise<DocumentParseOutput> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching URL`);
  }
  const contentType = resp.headers.get("content-type") || "";
  const buffer = new Uint8Array(await resp.arrayBuffer());
  const parsed = await parseDocumentBytes(buffer, name || url, contentType, options);
  return parsed;
}

/**
 * Extract normalized Markdown text, page estimates, and embedded visual assets
 * across native Text (`value` & legacy `text://`), external URLs, and Storage blobs.
 */
export async function extractContentItems(params: {
  items: ContentItemLike[];
  storageClient: StorageDownloader;
  defaultBucket: string;
  options?: ExtractOptions;
}): Promise<{
  text: string;
  charCount: number;
  pageCount: number;
  ocrUsed: boolean;
  items: ExtractedContentItem[];
  assets: ExtractedVisualAsset[];
  warnings: string[];
}> {
  const { items, storageClient, defaultBucket, options = {} } = params;
  const extractedItems: ExtractedContentItem[] = [];
  const allAssets: ExtractedVisualAsset[] = [];
  const allWarnings: string[] = [];

  for (const item of items) {
    const itemName = item.name || "Untitled Resource";
    const itemType = item.type || (item.path?.startsWith("http") ? "URL" : "File");

    // 1. Native Text item (`value`) or legacy `text://`
    if (itemType === "Text" || item.path?.startsWith("text://")) {
      const rawText = item.value || item.description || "";
      const clean = sanitizeText(rawText);
      const pages = Math.max(1, Math.round(clean.length / 2500));
      extractedItems.push({
        id: item.id,
        name: itemName,
        type: "Text",
        format: "text",
        text: clean,
        charCount: clean.length,
        pageCount: pages,
        ocrUsed: false,
        assets: [],
        warnings: [],
      });
      continue;
    }

    // 2. Skip synthetic grade-only placeholder paths
    if (item.path?.startsWith("grade://")) {
      continue;
    }

    // 3. External Web URL
    if (itemType === "URL" || item.path?.startsWith("http://") || item.path?.startsWith("https://")) {
      if (!item.path) continue;
      try {
        const urlParsed = await extractFromUrl(item.path, itemName, options);
        const urlAssets = urlParsed.assets.map((a) => ({
          ...a,
          contentItemId: a.contentItemId || item.id,
        }));
        extractedItems.push({
          id: item.id,
          name: itemName,
          type: "URL",
          format: urlParsed.format,
          text: urlParsed.text,
          charCount: urlParsed.text.length,
          pageCount: urlParsed.pageCount,
          ocrUsed: urlParsed.ocrUsed,
          assets: urlAssets,
          warnings: urlParsed.warnings,
        });
        allAssets.push(...urlAssets);
        allWarnings.push(...urlParsed.warnings);
      } catch (err) {
        const fallback = sanitizeText(`URL Link: ${item.path}\n${item.description || ""}`);
        const warnMsg = `URL fetch fallback for ${item.path}: ${err instanceof Error ? err.message : String(err)}`;
        allWarnings.push(warnMsg);
        extractedItems.push({
          id: item.id,
          name: itemName,
          type: "URL",
          format: "url-fallback",
          text: fallback,
          charCount: fallback.length,
          pageCount: 1,
          ocrUsed: false,
          assets: [],
          warnings: [warnMsg],
        });
      }
      continue;
    }

    // 4. Storage File Object
    if (item.path) {
      try {
        const { data: fileBlob, error: dlErr } = await storageClient.storage
          .from(defaultBucket)
          .download(item.path);

        if (dlErr || !fileBlob) {
          const warnMsg = `Storage download failed for ${item.path}: ${dlErr?.message || "Not found"}`;
          allWarnings.push(warnMsg);
          continue;
        }

        const bytes = new Uint8Array(await fileBlob.arrayBuffer());
        const fileName = item.name || item.path.split("/").pop() || "document";
        const parsed = await parseDocumentBytes(bytes, fileName, item.mime_type || fileBlob.type, options);

        const fileAssets = parsed.assets.map((a) => ({
          ...a,
          contentItemId: a.contentItemId || item.id,
        }));

        extractedItems.push({
          id: item.id,
          name: itemName,
          type: "File",
          format: parsed.format,
          text: parsed.text,
          charCount: parsed.text.length,
          pageCount: parsed.pageCount,
          ocrUsed: parsed.ocrUsed,
          assets: fileAssets,
          warnings: parsed.warnings,
        });
        allAssets.push(...fileAssets);
        allWarnings.push(...parsed.warnings);
      } catch (err) {
        allWarnings.push(
          `Failed processing file ${item.path}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  const combinedText =
    extractedItems.length <= 1
      ? extractedItems[0]?.text || ""
      : extractedItems
          .filter((i) => i.text.length > 0)
          .map((i) => `# ${i.name}\n\n${i.text}`)
          .join("\n\n---\n\n");

  const totalPages = Math.max(
    1,
    extractedItems.reduce((sum, i) => sum + i.pageCount, 0),
  );

  return {
    text: combinedText,
    charCount: combinedText.length,
    pageCount: totalPages,
    ocrUsed: extractedItems.some((i) => i.ocrUsed),
    items: extractedItems,
    assets: allAssets,
    warnings: allWarnings,
  };
}
