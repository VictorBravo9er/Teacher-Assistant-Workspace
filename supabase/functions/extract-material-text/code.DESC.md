# Material Text Extraction Function — `supabase/functions/extract-material-text/`

This directory contains the Edge Function responsible for extracting raw textual content from PDF documents and media stored in the private `class-materials` bucket.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/extract-material-text/index.ts): Deno serverless function entrypoint that handles `OPTIONS` CORS preflight, verifies caller permissions, downloads the specified document from Supabase Storage, extracts plain-text content using standard text/PDF parsers, and returns structured text chunks.

---

## 💡 Role in the Application

Provides text extraction pipelines for document ingestion, enabling the Python backend to vectorize learning resources for RAG context retrieval.

For extraction algorithms, payload schemas, and storage integration, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/extract-material-text/code.ARCH.md).
