# Database Schemas & DDL — `schema/`

This directory contains the PostgreSQL Data Definition Language (DDL) scripts, storage bucket definitions, Row Level Security (RLS) policies, and database reset routines for the Teach&Learn platform.

---

## 📁 Directory Files

- [`schema-db.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-db.sql): Core application DDL defining PostgreSQL schemas and extensions (`pg_trgm`, `pgcrypto`), custom ENUMs, core tables (`institutes`, `classes`, `templates`, `students`, `materials`, `instructions`), junction tables (`class_students`, `class_materials`, `class_instructions`, `template_materials`, `template_instructions`), tracking and communication tables (`student_submissions`, `attendance_records`, `chat_sessions`, `announcements`, `notification_logs`), foreign key constraints, explicit B-tree indexes on all foreign keys, automated triggers (`trg_sync_student_scores`, `trg_auto_set_to_be_scored`, `on_auth_user_created`, `on_auth_user_updated`, and `trg_*_updated_at` on all operational tables), RPC helper functions (`unlink_material_from_class`, `archive_material`, `delete_submission_atomic`, `delete_material`, `add_student_to_class`, `update_material_contents`, `check_workspace_modifications`, `get_workspace_last_modified`, `search_institutes`, `search_districts`, `search_cities`, `search_states`, `search_countries`), and strict user-scoped Row Level Security (RLS) policies.
- [`schema-ai.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-ai.sql): Hybrid vector & ontological knowledge graph DDL in the private `ai` schema. Initializes `vector` (`pgvector`), `pgcrypto`, and `pg_net` extensions. Contains `material_embeddings` and `submission_embeddings` (HNSW indexed with `pgvector`), `ontology_concepts`, `ontology_relationships`, `ontology_misconceptions`, `material_concept_mappings`, `student_concept_mastery`, `material_insights`, `submission_evaluations`, strict RLS policies, decoupled `pg_net` evaluation trigger handlers (commented out from automatic table execution to allow independent LMS and AI development), and public gateway RPCs (`get_submission_ai_diagnostic`, `get_material_ai_insights`, `get_student_concept_gaps`, `get_class_concept_matrix`).
- [`schema-langgraph.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-langgraph.sql): Configures RLS policies, ownership constraints, and indexes for the LangGraph state checkpointing and conversation store tables within the isolated `langgraph` schema.
- [`bucket-materials.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/bucket-materials.sql): Creates the private `class-materials` Supabase Storage bucket with 50MB file size limits, MIME type restrictions, and RLS policies scoped to teacher user IDs.
- [`bucket-submissions.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/bucket-submissions.sql): Creates the private `student-submissions` Supabase Storage bucket with RLS policies allowing enrolled students to upload/view their own work and teachers to review submissions for their classes.
- [`schema-reset.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-reset.sql): Database teardown script that cleanly drops all application tables, enums, triggers, `ai` schema, and helper functions in reverse dependency order for reproducible local resets.
- [`migrations/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations): Incremental SQL migration scripts (`001` through `007`) applied to target databases via `scripts/migrate.py`, including student portfolio fields, student portal RLS, announcements, notification logs, RLS recursion helpers, `updated_at` triggers and cache checking RPC, and relocating student contact/guardian fields to `public.students`.
- [`AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/AGENTS.md): Subsystem-specific rules for DDL design, mandatory RLS policies, indexing requirements, and naming conventions.

---

## 🏛️ Domain Enumerations (ENUMs)

- **`content_category`**: `Study Material`, `Note`, `Assigned Book`, `Link`, `Practical`, `Assignment`, `Test`, `Exam`
- **`content_type`**: `File`, `URL`, `Text`
- **`submission_status`**: `Assigned`, `Pending`, `Submitted`, `Evaluated`, `Graded`
- **`attendance_status`**: `Present`, `Absent`, `Late`, `Excused`
- **`experience_level`**: `Beginner`, `Intermediate`, `Advanced`, `Mixed`
- **`teaching_style`**: `Lecture`, `Socratic Method`, `Interactive`, `Project-Based`, `Flipped Classroom`, `Discussion-Based`, `Hands-On`
- **`assessment_preference`**: `Multiple Choice`, `Short Answer`, `Essays`, `Presentations`, `Single Project`, `Group Projects`, `Oral Exams`, `Peer Review`
- **`instruction_type`**: `System Persona`, `Grading Rubric`, `Lesson Plan Guideline`, `Material Generation Rule`, `Student Interaction Rule`, `Assessment Creation Rule`, `Content Filtering Rule`, `General Policy`

---

## 🗄️ Relational Entity Model

```mermaid
erDiagram
    INSTITUTES ||--o{ CLASSES : hosts
    INSTITUTES ||--o{ TEMPLATES : contains
    CLASSES ||--o{ CLASS_STUDENTS : enrolls
    STUDENTS ||--o{ CLASS_STUDENTS : attends
    CLASSES ||--o{ CLASS_MATERIALS : contains
    MATERIALS ||--o{ CLASS_MATERIALS : assigned_to
    CLASSES ||--o{ CLASS_INSTRUCTIONS : applies
    INSTRUCTIONS ||--o{ CLASS_INSTRUCTIONS : configured_for
    TEMPLATES ||--o{ TEMPLATE_MATERIALS : bundles
    MATERIALS ||--o{ TEMPLATE_MATERIALS : included_in
    TEMPLATES ||--o{ TEMPLATE_INSTRUCTIONS : bundles
    INSTRUCTIONS ||--o{ TEMPLATE_INSTRUCTIONS : included_in
    CLASS_STUDENTS ||--o{ STUDENT_SUBMISSIONS : turns_in
    MATERIALS ||--o{ STUDENT_SUBMISSIONS : targets
    CLASSES ||--o{ ATTENDANCE_RECORDS : logs
    CLASSES ||--o{ CHAT_SESSIONS : records
    CLASSES ||--o{ ANNOUNCEMENTS : publishes
    CLASSES ||--o{ NOTIFICATION_LOGS : records
    ANNOUNCEMENTS ||--o{ NOTIFICATION_LOGS : triggers
    MATERIALS ||--o{ NOTIFICATION_LOGS : tracks
    STUDENT_SUBMISSIONS ||--o{ NOTIFICATION_LOGS : tracks
```

---

## 📦 Storage Bucket Architecture

- **`class-materials` Bucket**: Path pattern `/{teacher_user_id}/{material_id}/{content_item_id}`. Managed directly by teachers via RLS; students retrieve signed URLs via `get-material-url`.
- **`student-submissions` Bucket**: Path pattern `/{material_id}/{content_item_id}`. Uploaded by enrolled students, reviewed by class teachers.


---

## 🏛️ Architecture & Data Flow

## 1. Multi-Tenant Security & RLS Execution Architecture

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Client["Client PostgREST Query"] --> AuthEngine{"Evaluate auth.uid()"}
    
    AuthEngine --> ClassesPolicy{"classes RLS"}
    ClassesPolicy -- "auth.uid() = teacher_id" --> PermitOwner["Allow SELECT / INSERT / UPDATE / DELETE"]
    ClassesPolicy -- "auth.uid() != teacher_id" --> CheckStudent{"Enrolled in class_students?"}
    CheckStudent -- Yes --> PermitReadOnly["Allow SELECT (Read Only)"]
    CheckStudent -- No --> Deny["Deny Access (Empty Result / 403)"]

    AuthEngine --> MaterialsPolicy{"materials RLS"}
    MaterialsPolicy -- "Created by teacher" --> AllowTeacher["Allow Full Access"]
    MaterialsPolicy -- "Linked via class_materials" --> AllowEnrolled["Allow Enrolled Students SELECT"]
```

---

## 2. DDL Design Patterns & Indexing Invariants

1. **Foreign Key Indexing Requirement**:
   As mandated in [`AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/AGENTS.md), **every foreign key column contains an explicit B-tree index** (e.g. `idx_classes_teacher_id`, `idx_class_materials_class_id`, `idx_student_submissions_student_id`) to prevent table-scan locks during cascade operations and join queries.
2. **UUID Primary Keys & Timestamps**:
   - Primary keys utilize `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
   - Audit columns (`created_at`, `updated_at`) are attached to all domain tables with automatic `moddatetime` update triggers.
3. **JSONB Content Architecture**:
   - `materials.content` and `student_submissions.content` use structured JSONB arrays supporting mixed media types (`File`, `URL`, `Text`) with UUID identifiers for file path resolution.
   - The `validate_content_array` check function requires `id` and valid `type` across all entries, and mandates a non-empty `path` strictly for `File` and `URL` types while allowing `Text` items to omit storage paths.
4. **Student Identity Contact vs. Class-Scoped Portfolio & Accommodations**:
   - Identity-level student contact and guardian details (`phone`, `address`, `parent_name`, `parent_contact`) are stored on `public.students` (editable by both the student and enrolled class teachers via RLS).
   - Class-scoped observations, roll numbers, and extensible teacher accommodations are stored on `public.class_students` (`parent_notes`, `custom_fields`, `roll_number`).
   - `custom_fields` stores teacher-defined key-value accommodations (e.g. IEP accommodations, medical notes) as structured JSONB (`[{"name": "...", "value": "..."}]`).
5. **Automated Database Triggers**:
   - `trg_sync_student_scores`: Executes `public.sync_student_class_scores()` on `student_submissions` after INSERT, UPDATE (score), or DELETE to atomically recompute `current_score`, `current_grade`, and `performance_tier` in `public.class_students`.
   - `trg_auto_set_to_be_scored`: Executes `public.auto_set_to_be_scored()` on `materials` before INSERT or UPDATE to automatically set `to_be_scored = true` for `'Practical'`, `'Assignment'`, `'Test'`, or `'Exam'` categories.
   - `on_auth_user_created`: Executes `public.handle_new_user()` on `auth.users` after INSERT to auto-provision records in `public.students` for student-role signups.
   - `on_auth_user_updated`: Executes `public.handle_user_update()` on `auth.users` after UPDATE to synchronize student email and name changes into `public.students`.
   - `trg_*_updated_at`: Bound to all operational tables (`classes`, `templates`, `materials`, `instructions`, `students`, `class_students`, `attendance_records`, `student_submissions`, `class_materials`, `class_instructions`, `template_materials`, `template_instructions`, `announcements`, `notification_logs`, `chat_sessions`) via `public.set_updated_at()` to keep UTC timestamps synchronized.
6. **Class-Scoped Material & Operations RPCs**:
   - `unlink_material_from_class(p_class_id UUID, p_material_id UUID)`: Safely removes class-material links without destroying shared global materials or past submissions.
   - `delete_material(p_material_id UUID)`: Removes material DB rows and uses reference counting across all materials' `content` JSONB arrays to only return physical storage paths for deletion when no other material or class references that file.
   - `delete_submission_atomic(p_submission_id UUID)`: Removes submission DB rows and returns storage paths for physical blob cleanup in Supabase Storage.
   - `archive_material(p_material_id UUID)`: Sets `is_archived = true` on the material.
   - `add_student_to_class(p_class_id UUID, p_student_id UUID, ...)`: Upserts class enrollment into `public.class_students` with initial score, tier, and learning style profile.
   - `update_material_contents(p_table_name TEXT, p_record_id UUID, p_diff_array JSONB)`: Applies diff-based updates to JSONB `content` arrays in `materials` or `student_submissions` and returns deleted storage paths for cleanup.
   - `check_workspace_modifications(p_client_timestamps JSONB)` / `get_workspace_last_modified(p_client_timestamps JSONB)`: Granular SWR cache verification engine comparing client timestamps across classes, templates, students, materials, and instructions.
   - Fuzzy Directory Search RPCs: `search_institutes`, `search_districts`, `search_cities`, `search_states`, and `search_countries` using `pg_trgm.word_similarity` for auto-complete.
7. **LangGraph Checkpoint Isolation**:
   - LangGraph checkpoint tables are stored in the dedicated `langgraph` schema, preventing agent execution metadata from interfering with domain queries in `public`.
8. **Hybrid Vector & Ontological Knowledge Architecture (`ai` Schema)**:
   - Vector store tables (`material_embeddings`, `submission_embeddings`) use `pgvector` with HNSW cosine similarity indexing for fast RAG retrieval.
   - Ontological graph tables (`ontology_concepts`, `ontology_relationships`, `ontology_misconceptions`) maintain directed prerequisite hierarchies and learning standards.
   - `material_concept_mappings` connects material chunks and vector embeddings directly to pedagogical concepts.
   - `student_concept_mastery` maintains dynamic student-level mastery scores and detected learning gaps.
   - All `ai` tables are shielded from public PostgREST API exposure and accessed securely via `public` RPC gateway functions (`get_submission_ai_diagnostic`, `get_material_ai_insights`, `get_student_concept_gaps`, `get_class_concept_matrix`). Automatic event triggers (`trg_material_ai_analysis`, `trg_submission_ai_eval`) are decoupled from uploads and can be manually reconnected or triggered on demand.
9. **Infrastructure PostgreSQL Extensions**:
   - `vector` (`pgvector`): Semantic vector embeddings (1536 dims) and HNSW cosine distance indexing in `ai` schema.
   - `pg_trgm`: Trigram string similarity functions powering fuzzy autocomplete RPCs (`search_*`).
   - `pgcrypto`: Cryptographic UUID generation (`gen_random_uuid()`) for primary keys and tokens.
   - `pg_net`: Asynchronous HTTP networking extension in `net` schema for background webhooks and Edge Function triggers.
