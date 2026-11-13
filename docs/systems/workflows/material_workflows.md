# Educational Material & Curriculum Analysis Workflows

This document details the start-to-finish workflows for adding educational materials, uploading document files, triggering automated AI syllabus gap analyses, previewing documents, and managing material lifecycles (unlinking vs. atomic deletion).

---

## 1. Workflow: Adding / Uploading Educational Material

Teachers can upload lecture slides, syllabus documents, practical assignments, reading notes, and external reference links to a class.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as ClassDetails.tsx (Materials Tab)
    participant Svc as materialService
    participant Storage as Supabase Storage (class-materials)
    participant DB as PostgreSQL (public & ai)
    participant Edge as Edge Function (trigger-material-analysis)
    participant BE as Backend FastAPI (/api/materials/analyze)
    participant LLM as OpenRouter LLM

    Teacher->>UI: Selects file (PDF/Doc) or enters URL/Text & sets Category + Due Date
    Teacher->>UI: Clicks "Upload Material"
    UI->>Svc: uploadMaterial(classId, file, options)
    
    Note over Svc,Storage: 1. Upload Binary File to Storage Bucket
    Svc->>Storage: upload("/{user_id}/{material_id}/{content_item_id}", fileBlob)
    Storage-->>Svc: Upload confirmed (path saved)

    Note over Svc,DB: 2. Insert into public.materials & class_materials
    Svc->>DB: INSERT INTO public.materials (id, user_id, name, category, content JSONB, rubric_criteria)
    Svc->>DB: INSERT INTO public.class_materials (class_id, material_id)
    DB-->>Svc: Material record confirmed

    Note over DB,Edge: 3. Planned Async DB Webhook -> AI Analysis (Trigger Currently Commented Out)
    DB-.->Edge: Planned pg_net webhook (`trg_material_ai_analysis` commented out in SQL)
    Edge->>Storage: Downloads document blob / fetches URL (UTF-8 text)
    Edge->>DB: UPSERT INTO ai.material_insights (material_id, status='processing')
    Edge->>BE: POST /api/materials/analyze (extracted_text, category, name)
    BE->>LLM: Analyzes syllabus topics, prerequisite gaps, sample Q&A
    LLM-->>BE: Returns MaterialAnalyzeResponse JSON
    BE->>DB: Persists ai.material_insights, ontology concepts & optional ai.material_trees
    BE-->>Edge: Returns structured analysis

    Svc-->>UI: Resolves Material object & appends to class state
    UI-->>Teacher: Material appears in list
```

### Step-by-Step Execution Details:

1. **User Form Submission**:
   - In [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx) (Materials tab), the teacher selects from the 3-mode resource creator:
     - **File Upload (`type: 'File'`)**: Local PDF, DOCX, PPTX, or text file attached via dropzone. Uploads to Supabase Storage `class-materials` bucket at `/{teacher_user_id}/{material_id}/{content_item_id}`.
     - **Web URL (`type: 'URL'`)**: External URL reference (Google Doc, YouTube, online reader). Saved directly with `path = url` without physical storage allocation.
     - **Notes & Text (`type: 'Text'`)**: Rich markdown/plaintext notes or syllabus definitions. Saved with `path = ''` and body in `value` property, conforming to `valid_content_shape`.
     - **Metadata**: Title, Category (`Study Material`, `Note`, `Assigned Book`, `Link`, `Practical`, `Assignment`, `Test`, `Exam`), Description, and Tags.
     - **Assessment Parameters**: Graded Assessment toggle (`toBeScored`). When enabled, enforces non-null `due_at` and `max_score` per database check constraint `to_be_scored = false OR (due_at IS NOT NULL AND max_score IS NOT NULL)`.
2. **Binary Storage vs Virtual Content Ingestion**:
   - **For Files**: [`materialService.uploadMaterial()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/materialService.ts) uploads the binary to `class-materials/{teacher_user_id}/{material_id}/{content_item_id}` and captures `size_bytes` and `mime_type`.
   - **For Links**: [`materialService.createLinkMaterial()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/materialService.ts) structures `content` with `type: 'URL'`, `path: url`.
   - **For Text Notes**: [`materialService.createTextMaterial()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/materialService.ts) structures `content` with `type: 'Text'`, `path: ''`, and content in `value`.
3. **Database Relational Linking**:
   - The material is inserted into `public.materials` with its `content` JSONB array conforming to `valid_content_shape` (`validate_content_array`).
   - A junction entry is inserted into `public.class_materials` linking the material to the active `class_id`.
4. **Asynchronous AI Curriculum Analysis *(Decoupled / Trigger Commented Out)***:
   - `20260915120100_ai_functions_and_triggers.sql` defines `trg_material_ai_analysis` / `trg_class_material_ai_analysis` (currently commented out) to dispatch `pg_net` webhooks to [`trigger-material-analysis`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-material-analysis).
   - When invoked, the Edge Function extracts UTF-8 text from `"File"` blobs or `"URL"` links (native `"Text"` `item.value` extraction is not yet implemented in the Edge Function), writes `status = 'processing'` to `ai.material_insights`, and invokes Backend `POST /api/materials/analyze` (`EvaluatorService` persists `ai.material_insights`, ontology mappings, and optional `ai.material_trees`).

---

## 2. Workflow: Material Preview & Signed URL Resolution

Because curriculum materials are stored in private Supabase Storage buckets, students and teachers preview files through secure, short-lived signed URLs.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Teacher or Student)
    participant UI as MaterialPreviewModal.tsx
    participant Svc as materialService
    participant Edge as Edge Function (get-material-url)
    participant DB as PostgreSQL (public & ai)
    participant Storage as Supabase Storage

    User->>UI: Clicks "Preview Material" on a document item
    UI->>Svc: getMaterialDownloadUrl(materialId, contentItemId)
    Svc->>Edge: POST /get-material-url (material_id, content_item_id)
    
    Edge->>DB: Checks if auth.uid() is owning teacher OR enrolled student in class_students
    DB-->>Edge: Authorization verified
    Edge->>Storage: createSignedUrl(path, 3600)
    Storage-->>Edge: Returns signed URL with 60-minute token
    Edge-->>Svc: { signedUrl: "https://...supabase.co/storage/v1/object/sign/..." }
    
    UI-.->DB: Planned: RPC get_material_ai_insights(material_id)
    UI-->>User: Renders inline PDF/image/text/URL preview (AI insights panel pending UI wiring)
```

### Step-by-Step Execution Details:

1. **User Interaction**:
   - The user opens [`MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx).
2. **Access Control & Signed URL Generation**:
   - The client invokes the [`get-material-url`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-material-url) Edge Function.
   - The function verifies that the requester owns the class or is enrolled in a class that references this material.
   - Generates a 60-minute signed URL from Supabase Storage.
3. **AI Insights Panel *(Pending UI Wiring)***:
   - The database exposes `get_material_ai_insights(p_material_id)` for retrieving syllabus coverage, prerequisite gap warnings, and practice questions; displaying that panel inside `MaterialPreviewModal.tsx` is pending frontend integration.

---

## 3. Workflow: Unlinking vs. Atomic Hard Deletion

The platform differentiates between **unlinking** a shared material from a single class and **deleting** the material globally.

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Action{"User Action"}
    
    Action -->|Unlink from Active Class| UnlinkFlow["Call RPC unlink_material_from_class(class_id, material_id)"]
    UnlinkFlow --> RemoveJunction["Deletes row from public.class_materials only"]
    RemoveJunction --> PreserveGlobal["Preserves material in public.materials & other classes"]

    Action -->|Delete Material Globally| DeleteFlow["Call RPC delete_material(material_id)"]
    DeleteFlow --> RefCountCheck{"Reference Counting Check in DB"}
    RefCountCheck --> DeleteRows["Deletes from public.materials, class_materials, template_materials"]
    DeleteRows --> ReturnPaths["Returns physical storage paths IF no other material references them"]
    ReturnPaths --> CleanupBlobs["Deletes physical blobs in 'class-materials' bucket"]
```

### Unlink Material:
- **Function**: `unlink_material_from_class(p_class_id UUID, p_material_id UUID)`
- **Behavior**: Drops the `class_materials` link for that specific class. The global material record remains intact and accessible in other classes or curriculum templates.

### Delete Material (Atomic Hard Delete):
- **Function**: `delete_material(p_material_id UUID)`
- **Behavior**: 
  1. Deletes `public.materials` row (cascading to `class_materials`, `template_materials`, and `ai.material_insights`).
  2. Performs a reference count check across all other materials' `content` JSONB arrays.
  3. Returns physical file paths only if no other material references that exact storage path.
  4. The client or backend deletes the physical blobs from Supabase Storage, preventing orphan files while protecting shared files.

---

## 4. Workflow: Hierarchical Document Tree Indexing (`POST /api/materials/tree`)

For on-demand hierarchical indexing—or automatically during `/api/materials/analyze` when educational materials reach $\ge 20$ pages or $\ge 15,000$ characters—the platform builds a PageIndex-inspired section tree:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Educator / Edge Worker
    participant BE as Backend FastAPI (/api/materials/tree)
    participant Svc as TreeIndexerService
    participant LLM as OpenRouter Model
    participant DB as PostgreSQL (public & ai.material_trees)

    Client->>BE: POST /api/materials/tree (material_id, force_rebuild=false)
    BE->>Svc: get_tree(material_id)
    
    alt Tree exists in ai.material_trees and !force_rebuild
        Svc->>DB: SELECT root_node, total_nodes, max_depth FROM ai.material_trees
        DB-->>Svc: Returns existing JSONB tree
        Svc-->>BE: MaterialTree
        BE-->>Client: MaterialTreeResponse(material_id, tree, cached=true, status="completed")
    else Cache miss or force_rebuild=true
        BE->>DB: SELECT name, content FROM public.materials WHERE id = material_id
        DB-->>BE: Material name & content (or 404 if missing)
        Note over Svc: 1. Structural Segmentation
        BE->>Svc: build_tree_from_text(material_id, name, content, model, api_key)
        Svc->>Svc: Parse Markdown headings (#, ##, ###) or 3,500-char fallback chunks
        Note over Svc,LLM: 2. Single-Pass Section Summarization (<= 15 excerpts)
        Svc->>LLM: Generate 2-sentence abstracts & 3-5 key concepts per section
        LLM-->>Svc: Section summaries & concept tags (heuristic slice fallback on error)
        Note over BE,DB: 3. JSONB Tree Persistence (depth 1-2)
        BE->>Svc: persist_tree(tree)
        Svc->>DB: UPSERT INTO ai.material_trees (material_id, root_node, total_nodes, max_depth)
        DB-->>Svc: Persisted (B-tree indexed on material_id via idx_ai_mat_trees_material_id)
        BE-->>Client: MaterialTreeResponse(material_id, tree, cached=false, status="completed")
    end
```

### Key Execution Highlights:
1. **Threshold Gate vs. On-Demand Endpoint**:
   - Automatic tree generation during `POST /api/materials/analyze` triggers when `page_count >= 20` or `len(extracted_text) >= 15,000`.
   - Direct calls to `POST /api/materials/tree` bypass that size threshold and build/return a tree for any `public.materials` record with non-empty `content`.
2. **Top-Down Branch Retrieval (`traverse_tree`)**:
   - During `/api/chat`, `TreeIndexerService.traverse_tree(material_id, query_terms)` scores child section nodes against query terms (`title`, `summary`, `key_concepts`) and selects up to 3 top matching sections.
3. **Structured Section Citations**:
   - Selected excerpts are formatted as `[Section Title] (pp. X-Y): Summary`, giving the model bounded document orientation without loading full raw texts.
