# Database & Schema Rules — PostgreSQL / Supabase / DDL

Cascades from root `/AGENTS.md`. Schema files: `schema/schema-db.sql` (tables, indexes, RLS) · `schema/schema-langgraph.sql` (LangGraph checkpoints). Edge functions: `supabase/functions/` — see [`supabase/functions/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/AGENTS.md).

## 1. Row Level Security (Mandatory on Every Table)
```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
```
- Write explicit policies for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- Scope to `auth.uid() = user_id` or verified org roles.
- Keep service role bypass guarded and explicitly declared.

## 2. DDL & Indexing Conventions
- **PKs**: `UUID PRIMARY KEY DEFAULT gen_random_uuid()` or bigint sequence.
- **FK Indexes**: Every foreign key column must have a corresponding index.
- **Audit Columns**: All core tables include `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
- **Naming**: `snake_case` for tables, columns, constraints, and indexes (e.g. `idx_classes_teacher_id`).

## 3. Enum Design — Pure Domain Values Only
- PostgreSQL enums represent domain identifiers and operational states (e.g. `instruction_type`, `submission_status`).
- Never create shadow enums, companion arrays, or catalog tables for UI copy, tooltips, or descriptions — that belongs in the frontend presentation layer.

## 4. Identity Modeling & Role Inversion
- Rely on `auth.users` as the single source of user identity. Avoid redundant `teachers` or `user_profiles` tables unless joins demand it.
- An authenticated user is implicitly an educator unless in `public.students` (`auth.uid() IN (SELECT id FROM public.students)`) or tagged `role: 'student'` in `user_metadata`.
- Store educator preferences (teaching style, tone, grading) in `auth.users.user_metadata` to avoid redundant queries and cache invalidation.
