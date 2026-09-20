# Text Extraction Architecture & Pipeline

This document details the document text extraction pipeline and storage access contracts in `supabase/functions/extract-material-text/`.

---

## 1. Extraction Pipeline Architecture

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Python Backend / Frontend
    participant EdgeFunc as extract-material-text (index.ts)
    participant Storage as Supabase Storage (class-materials)
    participant Parser as PDF / Text Extraction Engine

    Caller->>EdgeFunc: POST /functions/v1/extract-material-text { storage_path, material_id }
    EdgeFunc->>EdgeFunc: Verify caller JWT
    EdgeFunc->>Storage: Download file bytes (supabaseAdmin.storage)
    Storage-->>EdgeFunc: Uint8Array byte stream
    EdgeFunc->>Parser: Parse text chunks from stream
    Parser-->>EdgeFunc: Cleaned text string & metadata
    EdgeFunc-->>Caller: 200 OK { text, charCount, chunkCount }
```

---

## 2. Invariants & Performance Design

1. **Streaming Downloads**:
   Downloads binary blobs directly into memory buffers, parses content, and clears references immediately to adhere to Deno memory constraints.
2. **Path Sanitization**:
   Strictly validates `storage_path` against UUID path segments (`{teacher_id}/{material_id}/{content_item_id}`) to prevent path traversal attempts.
