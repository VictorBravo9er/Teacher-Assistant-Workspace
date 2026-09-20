# Plan 10: Multi-Component TTL & Granular Database Revalidation Engine

> **Status**: ✅ **COMPLETED & VERIFIED**  
> **Target Subsystems**: `schema/` (PostgreSQL), `frontend/src/lib/` (Storage), `frontend/src/hooks/` (Workspace State), `frontend/src/services/` (Data Services), `frontend/src/features/students/` (Observability)

---

## 1. Context & Architectural Evolution

### 1.1 The Stale Cache & Granularity Dilemma
During local testing, when the database was reset, the frontend continued to render stale classes and templates from `localStorage` because cached items were saved without a bounded TTL. When attempting to enroll a student in that nonexistent class, Supabase edge functions and PostgreSQL rejected the request.

However, resolving this with a crude "all-or-nothing" workspace timestamp invalidation creates a performance bottleneck:
- In Teach&Learn LMS, a classroom workspace is composed of multiple independent components:
  1. **Classes Metadata** (`classes`, `institutes`)
  2. **Student Roster & Portfolios** (`class_students`, `students`, `attendance_records`)
  3. **Course Materials & Assignments** (`class_materials`, `materials`)
  4. **Classroom Instructions & Guidelines** (`class_instructions`, `instructions`)
  5. **Lesson Templates Preset** (`templates`, `template_materials`, `template_instructions`)
- If a teacher grades an assignment or updates a student's contact details, invalidating and re-downloading the entire workspace (all classes, templates, materials, PDFs, rubrics, and instructions) is wasteful and causes UI jitter.
- Furthermore, **student users** also need cached access to their enrolled classes, coursework, and assignments without teacher-only RPC queries failing or leaking teacher-exclusive records.

---

## 2. Core Architectural Objectives

### 2.1 Reusable `updated_at` Triggers across PostgreSQL
- Add `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())` to all core tables missing it:
  - `public.templates`
  - `public.materials`
  - `public.instructions`
  - `public.students`
  - `public.class_students`
  - `public.attendance_records`
- Create a reusable trigger function `public.set_updated_at()` setting `NEW.updated_at = timezone('utc'::text, now())`.
- Attach `BEFORE UPDATE` triggers to all relevant tables.

### 2.2 Component-Aware Revalidation RPC: `check_workspace_modifications(p_client_timestamps jsonb)`
Instead of returning a single monolithic timestamp, the RPC accepts a JSON map of client-held timestamps for each component/class and returns an array of component keys that are **actually stale or missing in the DB**:

```sql
-- Client inputs:
{
  "templates": "2026-09-17T17:00:00Z",
  "classes_meta": "2026-09-17T17:00:00Z",
  "class_students:9a7cd82a-...": "2026-09-17T17:00:00Z",
  "class_materials:9a7cd82a-...": "2026-09-17T17:00:00Z",
  "class_instructions:9a7cd82a-...": "2026-09-17T17:00:00Z"
}

-- Database returns:
{
  "stale_components": ["class_students:9a7cd82a-..."],
  "server_timestamps": { ... },
  "is_wiped": false
}
```

### 2.3 Dual Role Support (Teachers & Students)
- For **Teachers**: Evaluates classes owned by `auth.uid()`, their class rosters, class materials, and personal templates.
- For **Students**: Evaluates the classes they are enrolled in (`class_students`), their assigned materials, and class instructions via existing RLS junction rules.
- If a user has no classes/enrollments because the database was wiped or reset, the RPC returns `is_wiped: true` and marks all components as stale so the client immediately evicts stale local storage.

### 2.4 Separation of TTL vs. `modified_at` in Client Cache
- **TTL (`ttlMs`)**: Strictly determines *when* the client should re-check with the database (e.g. 5 minutes).
- **`lastModified` (`updated_at`)**: Strictly determines *whether* the payload data must actually be re-fetched.
- When TTL expires or on page reload/network recovery:
  1. Client sends its stored `lastModified` timestamps to `check_workspace_modifications`.
  2. If `stale_components` is empty: data hasn't changed! Client simply extends TTL (`expiresAt = Date.now() + ttlMs`). Zero heavy queries run.
  3. If `stale_components` contains specific keys (e.g. only `class_students:class-123`): the client only refetches the student roster for that class, updates the localized cache slice, and updates state without re-querying materials or templates!
  4. If `is_wiped: true`: client clears the cache completely and initializes a clean empty slate.

### 2.5 Observability Alignment (Rule 8)
- Update [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx) to replace bare `console.error` with `logger.error('STUDENT_SERVICE', ...)` and `logger.info('STUDENT_SERVICE', ...)`.

---

## 3. Implementation Steps

### Step 3.1: PostgreSQL Migration `006_add_table_updated_at_triggers.sql`
1. **Trigger Function**:
   ```sql
   CREATE OR REPLACE FUNCTION public.set_updated_at()
   RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN
       NEW.updated_at = timezone('utc'::text, now());
       RETURN NEW;
   END;
   $$;
   ```
2. **Schema Alterations**:
   - Add `updated_at` to `templates`, `materials`, `instructions`, `students`, `class_students`, `attendance_records`.
   - Create `BEFORE UPDATE` triggers for all relevant tables.
3. **RPC `check_workspace_modifications(p_client_timestamps jsonb)`**:
   - Inspects `auth.uid()`.
   - Computes latest `updated_at` for:
     - `templates`
     - `classes_meta` (from `classes`)
     - per-class `students` (from `class_students` and `attendance_records`)
     - per-class `materials` (from `class_materials` and `materials`)
     - per-class `instructions` (from `class_instructions` and `instructions`)
   - Compares with `p_client_timestamps` and returns `stale_components` and `server_timestamps`.
4. Apply via `python scripts/migrate.py` and run `python scripts/_generate_types.py`.

### Step 3.2: Cache Infrastructure in `frontend/src/lib/storage.ts`
1. Update `CacheWrapper<T>`:
   ```typescript
   export interface CacheWrapper<T> {
     data: T;
     lastModified?: string;
     cachedAt: number;
     ttlMs: number;
     expiresAt: number;
   }
   ```
2. Add granular cache helpers:
   - `setCachedItemWithTTL<T>(key, data, ttlMs, lastModified)`
   - `getCachedItemDetails<T>(key): { data, lastModified, isExpired, expiresAt } | null`
   - `touchCachedItemTTL(key, newTtlMs): void`
   - `patchCachedItem<T>(key, updater: (prev: T) => T, newLastModified?: string): void`

### Step 3.3: Component-Level Slicing in `frontend/src/hooks/useWorkspaceData.ts`
1. Store cache keys by component:
   - `edu_rag_classes_meta`
   - `edu_rag_templates`
   - `edu_rag_class_students_{classId}`
2. On mount / reload / network recovery (`online`) / visibility change:
   - Gather `lastModified` timestamps across all active cache entries.
   - If TTL expired on any item, call `supabase.rpc('check_workspace_modifications', { p_client_timestamps: clientTimestamps })`.
   - For components marked stale, fetch only those specific entities:
     - If `classes_meta` stale: refetch classes table.
     - If `class_students:{classId}` stale: call `studentService.fetchStudentsForClass(classId)` and update that class's students.
     - If `templates` stale: call `templateService.fetchTemplates()`.
   - For components confirmed unmodified: call `touchCachedItemTTL` to extend TTL without network queries.
   - If database was reset (`is_wiped`): purge cache and set empty state.

### Step 3.4: Logging in `frontend/src/features/students/StudentRegister.tsx`
- Replace `console.error` with `logger.error('STUDENT_SERVICE', ...)` so every student addition failure is observable in `./logs/frontend-*.jsonl`.

---

## 4. Verification Plan

### 4.1 Automated Tests
- Run migration runner:
  ```bash
  python scripts/migrate.py
  ```
- Generate types:
  ```bash
  python scripts/_generate_types.py
  ```
- Build frontend:
  ```bash
  npm --prefix frontend run build
  ```
- Run backend linting:
  ```bash
  uv run poe lint
  ```

### 4.2 Manual & Functional Verification
1. **Teacher Granular Invalidation**:
   - Update a student in Class A.
   - Verify only `class_students:ClassA` is marked stale and refetched; Class B, templates, and materials are untouched.
2. **Student Role Compatibility**:
   - Log in as a student user.
   - Verify `check_workspace_modifications` returns enrolled classes and does not crash or throw permission errors.
3. **Database Reset Handling**:
   - Reset the database or test with empty tables.
   - Verify `is_wiped: true` cleans up old client localStorage and doesn't leave ghost classes.
4. **Offline & Network Recovery**:
   - Toggle offline mode; reconnect. Verify component-level revalidation triggers smoothly.
