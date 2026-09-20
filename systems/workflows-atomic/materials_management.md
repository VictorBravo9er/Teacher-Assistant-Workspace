# Atomic Workflows: Materials Management

This document details the discrete atomic tasks governing the creation, storage, URL resolution, unlinking, and deletion of educational materials.

---

## ATOM-MAT-01: Upload & Link File Material

### 1. Trigger
- **Event**: Teacher selects a local file (PDF, DOCX, PPTX, Image) in [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx) (Materials tab) and clicks **"Upload Material"**.

### 2. Preconditions
- Teacher owns the active class (`auth.uid() = classes.user_id`).
- File size is within 50MB limit.
- MIME type matches allowed extensions (`.pdf`, `.docx`, `.pptx`, `.txt`, `.csv`, `.png`, `.jpg`, `.jpeg`).

### 3. Input Parameters
```typescript
interface UploadMaterialPayload {
  classId: string;
  file: File;
  options?: {
    name?: string;
    category?: ContentCategory; // 'Study Material', 'Assignment', 'Practical', etc.
    tags?: string[];
    dueAt?: string;
    maxScore?: number;
    rubricCriteria?: Array<{ name: string; maxScore: number; description?: string }>;
  };
}
```

### 4. Execution Pipeline
1. **Identifier Generation**: Client creates `materialId = crypto.randomUUID()` and `itemId = crypto.randomUUID()`.
2. **Storage Path Compilation**: Path constructed as:
   ```
   storagePath = `${auth.uid()}/${materialId}/${itemId}`
   ```
3. **Storage Binary Upload**:
   - Client invokes Supabase Storage SDK:
     ```typescript
     await supabase.storage.from('class-materials').upload(storagePath, file);
     ```
   - RLS policy on `class-materials` verifies `(storage.foldername(name))[1] = auth.uid()::text`.
4. **Insert Material Entity**:
   - Client executes insert into `public.materials`:
     ```sql
     INSERT INTO public.materials (
       id, user_id, name, category, content, tags, due_at, max_score, rubric_criteria
     ) VALUES (
       :materialId, auth.uid(), :name, :category,
       jsonb_build_array(jsonb_build_object(
         'id', :itemId,
         'name', :fileName,
         'type', 'File',
         'path', :storagePath,
         'size_bytes', :fileSize,
         'mime_type', :mimeType,
         'description', :description
       )),
       :tags, :dueAt, :maxScore, :rubricCriteria
     ) RETURNING *;
     ```
5. **Insert Class-Material Junction**:
   - Links the material to the active classroom:
     ```sql
     INSERT INTO public.class_materials (class_id, material_id, order_index)
     VALUES (:classId, :materialId, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM public.class_materials WHERE class_id = :classId));
     ```

### 5. Error Handling & Rollbacks
- If storage upload fails: Throws error and halts execution before any database rows are created.
- If DB insert fails after storage upload: Client attempts compensation call to `supabase.storage.from('class-materials').remove([storagePath])` to prevent orphaned blobs.

### 6. Postconditions
- Binary blob is stored in private bucket `class-materials`.
- Row exists in `public.materials` and junction row exists in `public.class_materials`.
- Database trigger `trg_material_ai_analysis` is queued for asynchronous execution (see `ATOM-AIM-01`).

### 7. Conclusion & Re-render
- The resolved `Material` entity is appended to `materials` in [`useClassOperations`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useClassOperations.ts).
- UI renders the new material item card with pending AI analysis indicator.

---

## ATOM-MAT-02: Add Link / Plaintext Material

### 1. Trigger
- **Event**: Teacher selects "Link" or "Text Note" in the Add Material form and clicks **"Save Resource"**.

### 2. Execution Pipeline
1. No binary blob is uploaded to storage.
2. The material record is inserted into `public.materials` with `content` array specifying `type = 'URL'` or `type = 'Text'`:
   ```json
   [
     {
       "id": "uuid-v4",
       "name": "Course Reference Docs",
       "type": "URL",
       "path": "https://example.com/docs",
       "description": "Official documentation"
     }
   ]
   ```
3. A row is inserted into `public.class_materials`.
4. Material card appears immediately in the Materials tab.

---

## ATOM-MAT-03: Resolve Material Signed URL for Preview

### 1. Trigger
- **Event**: A teacher or enrolled student clicks on a document item in [`MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx).

### 2. Preconditions
- Requester holds a valid JWT token.
- Requester is either the teacher who owns the class OR an enrolled student in `public.class_students`.

### 3. Execution Pipeline
1. Client calls Edge Function endpoint:
   ```typescript
   POST /functions/v1/get-material-url
   Payload: { material_id: string, content_item_id: string }
   Headers: { Authorization: "Bearer <JWT>" }
   ```
2. Edge Function [`get-material-url`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-material-url):
   - Verifies JWT with `supabase.auth.getUser()`.
   - Queries `class_students` to ensure `auth.uid()` is an active student in a class where the material is assigned, or checks if `auth.uid()` matches `materials.user_id`.
   - Generates a 60-minute signed URL using the admin client:
     ```typescript
     const { data } = await supabaseAdmin.storage.from('class-materials').createSignedUrl(storagePath, 3600);
     ```
   - Returns `{ signedUrl: data.signedUrl }`.

### 4. Conclusion & Re-render
- The client receives the temporary HTTPS URL.
- The inline PDF/document reader iframe loads the document stream securely without exposing public bucket access.

---

## ATOM-MAT-04: Unlink Material from Class

### 1. Trigger
- **Event**: Teacher clicks **"Remove from Class"** on a material item in [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx).

### 2. Execution Pipeline
1. UI invokes database stored procedure:
   ```sql
   SELECT public.unlink_material_from_class(:classId, :materialId);
   ```
2. Stored Procedure logic:
   ```sql
   DELETE FROM public.class_materials
   WHERE class_id = p_class_id AND material_id = p_material_id;
   ```
3. The underlying `public.materials` row is **preserved**, and any other classes using this material are unaffected.

### 3. Conclusion & Re-render
- The material is removed from the active class's `materials` state.
- UI removes the material card from the class view with a notification: `"Material unlinked from class"`.

---

## ATOM-MAT-05: Atomic Hard Delete Material

### 1. Trigger
- **Event**: Teacher confirms permanent global deletion in the confirmation modal.

### 2. Execution Pipeline
1. UI calls atomic database function:
   ```sql
   SELECT public.delete_material(:materialId);
   ```
2. Stored Procedure logic:
   - Evaluates all files in `materials.content`.
   - Performs a reference count query across all other materials' `content` JSONB arrays in the database to verify if any other material points to the same storage path.
   - Drops the row from `public.materials` (cascading to `class_materials`, `template_materials`, and `ai.material_insights`).
   - Returns array of orphaned storage paths: `orphaned_paths text[]`.
3. Storage Cleanup:
   - For each returned path, client or backend executes:
     ```typescript
     await supabase.storage.from('class-materials').remove(orphanedPaths);
     ```

### 3. Postconditions & Conclusion
- Database records removed across all classes and templates.
- Physical blobs permanently purged from storage if no other materials reference them.
- All class tabs referencing the material update their local state.
