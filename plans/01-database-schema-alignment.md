# Plan 01: Database Schema Alignment & Portfolio Migration

## 1. Problem Statement & Context
In the teacher-facing LMS, [`StudentDetailModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentDetailModal.tsx) presents a rich student profile editor featuring:
- **Phone Number**
- **Home Address**
- **Parent / Guardian Name**
- **Parent Contact / Email**
- **Parent & Behavioral Notes**
- **Roll Number**
- **Custom IEP / Accommodation Fields** (`CustomField[]`)

However, inspecting [`schema/schema-db.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-db.sql) reveals that neither `public.students` nor `public.class_students` contains these columns:
- `public.students` only contains: `id`, `name`, `email`, `avatar_url`, `is_archived`.
- `public.class_students` only contains: `learning_style`, `strengths`, `weaknesses`, `current_score`, `current_grade`, `general_feedback`, `performance_tier`, `behavioral_notes`.

Because these columns are absent from PostgreSQL:
1. `studentService.ts` cannot persist or select them.
2. Form updates in the UI vanish upon page reload.
3. PostgREST rejects any updates containing these attributes.

### 1.2 Missing `'Text'` in `public.content_type` Enum
Additionally, [`schema/schema-db.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-db.sql#L18) defines `public.content_type AS ENUM ('File', 'URL')`.
- Documentation (`schema/code.DESC.md` and `database_and_storage.md`) intended `content_type` to include `'Text'`.
- The omission of `'Text'` causes `validate_content_array(arr jsonb)` to reject any submission or material item with `type: 'Text'`.
- This forced the frontend ([`StudentSubmissionUploadModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentSubmissionUploadModal.tsx#L100)) to hack text submissions with `type: 'File' as any` and pseudo-paths (`text://${itemId}`), directly causing preview modal crashes in [`MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx).

---

## 2. Architectural Analysis: Storage Location Decision
We evaluated whether student contact details belong in `auth.users.user_metadata`, `public.students`, or `public.class_students`:

1. **Why not `auth.users.user_metadata`?**
   - **PostgREST Security Boundary**: Supabase's `auth.users` table cannot be queried by regular clients over the PostgREST API (`anon` or `authenticated`). Teachers querying student rosters would receive 403 Forbidden or empty metadata.
   - **Teacher Authority & Class-Specific Data**: Roll numbers, behavioral parent notes, and classroom accommodations are class-scoped and assigned by teachers, not self-declared by students in their personal auth accounts.
2. **Target Table: `public.class_students` (Class-Scoped Enrollment)**:
   - Placing these attributes on `public.class_students` maintains multi-class isolation (e.g. a student can have different roll numbers or class notes in Math vs. History).
   - Inherits existing RLS policies: Teachers who own the class (`classes.user_id = auth.uid()`) can read and write `class_students` records seamlessly.

---

## 3. Implementation Steps

### Step 3.1: Update Canonical Schema ([`schema/schema-db.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-db.sql))
1. Add missing portfolio columns to `public.class_students`:
```sql
ALTER TABLE public.class_students
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS parent_name TEXT,
    ADD COLUMN IF NOT EXISTS parent_contact TEXT,
    ADD COLUMN IF NOT EXISTS parent_notes TEXT,
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS roll_number TEXT;
```

Also add explanatory comments for PostgREST schema documentation:
```sql
COMMENT ON COLUMN public.class_students.custom_fields IS 'Custom key-value accommodations and IEP tags configured by the teacher.';
COMMENT ON COLUMN public.class_students.parent_notes IS 'Private teacher observations and notes regarding parent communications.';
```

2. Extend `public.content_type` ENUM to include `'Text'`:
```sql
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'Text';
```

3. Relax `validate_content_array(arr jsonb)` in `schema/schema-db.sql`:
Ensure that for items with `elem->>'type' = 'Text'`, `path` is optional or can be an empty string, allowing inline text entries without forcing fake storage paths:
```sql
CREATE OR REPLACE FUNCTION validate_content_array(arr jsonb)
RETURNS boolean AS $$
DECLARE
    elem jsonb;
BEGIN
    IF jsonb_typeof(arr) != 'array' THEN RETURN false; END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(arr)
    LOOP
        IF NOT (
            elem ? 'id' AND jsonb_typeof(elem->'id') = 'string' AND
            elem ? 'name' AND jsonb_typeof(elem->'name') = 'string' AND
            elem ? 'type' AND (elem->>'type' = ANY (enum_range(NULL::public.content_type)::text[])) AND
            (
                (elem->>'type' = 'Text') OR 
                (elem ? 'path' AND jsonb_typeof(elem->'path') = 'string')
            ) AND
            (NOT elem ? 'description' OR jsonb_typeof(elem->'description') = 'string')
        ) THEN
            RETURN false;
        END IF;
    END LOOP;
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Step 3.2: Create Standalone Migration Script
Create migration file `schema/migrations/001_add_class_student_portfolio_fields.sql` incorporating the column additions, the `ALTER TYPE public.content_type ADD VALUE 'Text'` statement, and the updated `validate_content_array` function so existing databases can apply this change cleanly without wiping data.

### Step 3.3: Regenerate Static Types
Run the automated type generator (Rule 2.5):
```bash
uv run python scripts/_generate_types.py
```
This will regenerate:
- `frontend/src/types/db.ts`
- `backend/src/types/db.py`

*(Note: Direct manual edits to `db.ts` and `db.py` are strictly prohibited).*

---

## 4. Verification Plan

### Automated Verification:
1. Verify that `frontend/src/types/db.ts` contains `phone`, `address`, `parent_name`, `parent_contact`, `parent_notes`, `custom_fields`, and `roll_number` in `Database['public']['Tables']['class_students']['Row']`.
2. Verify that `frontend/src/types/db.ts` contains `"Text"` in `Database['public']['Enums']['content_type']` and `Constants.public.Enums.content_type`.
3. Run `npm run build` in `frontend/` to confirm that schema changes produce no TypeScript syntax errors.
4. Run `basedpyright .` in `backend/` to confirm Python database types are updated without warnings.

### Manual Verification:
1. Query `class_students` with a test payload containing `custom_fields: [{ id: '1', label: 'IEP Extra Time', type: 'boolean', value: 'true', visibility: true }]` and verify PostgreSQL accepts the JSONB structure.
2. Insert a test record into `public.student_submissions` with `content: [{"id": "...", "name": "Essay", "type": "Text", "description": "Sample text", "path": ""}]` and verify `validate_content_array` succeeds without error.

---

## 5. Downstream Dependencies
- **Unblocks**: 
  - [Plan 02 (`02-instruction-type-enum-safety.md`)](./02-instruction-type-enum-safety.md)
  - [Plan 05 (`05-student-roster-portfolio-persistence.md`)](./05-student-roster-portfolio-persistence.md)
  - [Plan 06 (`06-submissions-materials-preview.md`)](./06-submissions-materials-preview.md)
