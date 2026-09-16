# Plan 07: Dedicated Student Portal & Role-Based Routing

> **Status**: ✅ **COMPLETED** (Enrolled student RLS policies applied via migration 002, studentPortalService implemented, role routing added to App.tsx, StudentApp shell and StudentTurnInModal created, verified via `npm run lint`, `npm run build`, and `uv run poe lint`)

## 1. Problem Statement & Architecture Gap
In the current application:
- **Sign-Up Allows Role Selection**: [`frontend/src/views/AuthPage.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/AuthPage.tsx#L28) provides a toggle allowing users to register as either **Educator** or **Student**.
- **Missing Student Destination**: Regardless of role, [`frontend/src/App.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/App.tsx) unconditionally renders [`ClassApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/ClassApp.tsx) (the Educator Cockpit).
- **Broken User Experience**:
  - `ClassApp` queries `classes` where `user_id = auth.uid()`.
  - Because students are enrolled via `public.class_students` and do not own classes, they see an empty dashboard with 0 classes and an erroneous prompt to "Create a Class".
  - There is no student portal for enrolled students to:
    1. View courses they are enrolled in.
    2. Download syllabus documents and class study materials.
    3. Self-submit homework assignments (file upload or written text).
    4. View their grades, teacher feedback, and report cards.

---

## 2. Target Architecture: Role-Based Routing & Student Experience

```
                    Authenticated User (App.tsx)
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   Role: 'teacher'                       Role: 'student'
   (Default or Educator)                 (Enrolled in public.students)
            │                                     │
            ▼                                     ▼
      <ClassApp />                          <StudentApp />
   Teacher Cockpit                       Student Portal
   - Class Management                    - Enrolled Course Dashboard
   - Roster & Grading                    - Material Downloads
   - Template Studio                     - Assignment Self-Turn-in
   - AI Guidelines                       - Gradebook & Feedback Review
```

### Role Determination Logic:
```typescript
const isStudent = 
  user?.user_metadata?.role === 'student' || 
  Boolean(studentProfile); // Inferred from public.students
```

---

## 3. Implementation Steps

### Step 3.0: Update PostgreSQL RLS Policies for Enrolled Students ([`schema/schema-db.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-db.sql))
In [`schema/schema-db.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-db.sql), existing RLS policies restrict `classes`, `materials`, and `instructions` strictly to `user_id = auth.uid()`. Because teachers own classes, enrolled students (`public.class_students`) are completely blocked from reading class metadata, syllabus materials, and assignment prompts.

Update the RLS policies in `schema/schema-db.sql` and staging migrations:
1. **`public.classes`**:
   ```sql
   DROP POLICY IF EXISTS "Users can only view their own classes" ON public.classes;
   CREATE POLICY "Users can view classes" ON public.classes FOR SELECT USING (
     (SELECT auth.uid()) = user_id 
     OR EXISTS (
       SELECT 1 FROM public.class_students cs 
       WHERE cs.class_id = classes.id AND cs.student_id = (SELECT auth.uid())
     )
   );
   ```
2. **`public.class_materials` & `public.materials`**:
   ```sql
   -- Allow enrolled students to view which materials are assigned to their classes
   DROP POLICY IF EXISTS "Users can access class_materials via class ownership" ON public.class_materials;
   CREATE POLICY "Users can access class_materials" ON public.class_materials FOR ALL USING (
     EXISTS (
       SELECT 1 FROM public.classes c
       WHERE c.id = class_materials.class_id AND c.user_id = (SELECT auth.uid())
     )
     OR EXISTS (
       SELECT 1 FROM public.class_students cs
       WHERE cs.class_id = class_materials.class_id AND cs.student_id = (SELECT auth.uid())
     )
   );

   -- Allow enrolled students to read material records linked to their classes
   DROP POLICY IF EXISTS "Users can only view their own materials" ON public.materials;
   CREATE POLICY "Users can view materials" ON public.materials FOR SELECT USING (
     (SELECT auth.uid()) = user_id
     OR EXISTS (
       SELECT 1 FROM public.class_materials cm
       JOIN public.class_students cs ON cs.class_id = cm.class_id
       WHERE cm.material_id = materials.id AND cs.student_id = (SELECT auth.uid())
     )
   );
   ```
3. **`public.class_instructions` & `public.instructions`**:
   ```sql
   -- Allow enrolled students to view assignment prompts/instructions assigned to their classes
   DROP POLICY IF EXISTS "Users can access class_instructions via class ownership" ON public.class_instructions;
   CREATE POLICY "Users can access class_instructions" ON public.class_instructions FOR ALL USING (
     EXISTS (
       SELECT 1 FROM public.classes c
       WHERE c.id = class_instructions.class_id AND c.user_id = (SELECT auth.uid())
     )
     OR EXISTS (
       SELECT 1 FROM public.class_students cs
       WHERE cs.class_id = class_instructions.class_id AND cs.student_id = (SELECT auth.uid())
     )
   );

   DROP POLICY IF EXISTS "Users can only view their own instructions" ON public.instructions;
   CREATE POLICY "Users can view instructions" ON public.instructions FOR SELECT USING (
     (SELECT auth.uid()) = user_id
     OR EXISTS (
       SELECT 1 FROM public.class_instructions ci
       JOIN public.class_students cs ON cs.class_id = ci.class_id
       WHERE ci.instruction_id = instructions.id AND cs.student_id = (SELECT auth.uid())
     )
   );
   ```

### Step 3.1: Service Layer for Student Perspective ([`frontend/src/services/studentPortalService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentPortalService.ts))
Create a lightweight service dedicated to student-scoped data fetching:
1. `fetchEnrolledClasses()`:
   ```typescript
   // Query classes where student is enrolled via class_students
   const { data, error } = await supabase
     .from('class_students')
     .select(`
       class_id,
       classes (
         id, title, description, subject, institute_name, stage, created_at
       )
     `)
     .eq('student_id', user.id);
   ```
2. `fetchClassMaterials(classId: string)`:
   Fetch materials assigned to the enrolled class via `class_materials`.
3. `fetchClassInstructions(classId: string)`:
   Fetch assignments and prompts assigned to the enrolled class via `class_instructions`.
4. `submitAssignment(classId: string, materialId: string, submission: { file?: File; text?: string })`:
   - Note: The database table is `public.student_submissions` (never `submissions`).
   - For file submissions:
     - Upload file to `student-submissions` bucket (path: `${classId}/${materialId}/${user.id}_${Date.now()}_${file.name}`).
     - Store content array as:
       ```json
       [
         {
           "type": "File",
           "name": file.name,
           "path": storagePath,
           "size": file.size,
           "mime_type": file.type
         }
       ]
       ```
   - For written text submissions:
     - Store native `type: "Text"` with empty `path: ""` (adhering to relaxed `validate_content_array` check from Plan 01):
       ```json
       [
         {
           "type": "Text",
           "name": "Written Response",
           "path": "",
           "value": text,
           "description": "Student submission text"
         }
       ]
       ```
     - **No pseudo-URIs**: Synthetic `text://` prefixes are strictly prohibited for new submissions.
   - Insert record into `public.student_submissions` with `status = 'Submitted'` and `submitted_at = new Date().toISOString()`.
   - If automated notifications are enabled ([Plan 08.5](./08.5-classroom-notifications-resend.md)), invoke the notification edge function to notify the teacher via email. **This call must be non-blocking and wrapped in a try/catch**, since the edge function will not exist until Plan 08.5 is deployed:
     ```typescript
     // Best-effort notification — silently skip if edge function not yet deployed
     try {
       await supabase.functions.invoke('notify-submission', {
         body: { submission_id: data.id, class_id: classId }
       });
     } catch {
       // Plan 08.5 not yet deployed — skip notification silently
     }
     ```
5. `fetchMyGrades(classId: string)`:
   Query `public.student_submissions` for the current `student_id = user.id` in `classId` to retrieve grades, rubric breakdowns, and teacher feedback.

### Step 3.2: Root Routing in [`frontend/src/App.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/App.tsx)
Update `App.tsx` to conditionally render based on the authenticated role:
```tsx
if (role === 'student') {
  return <StudentApp />;
}
return <ClassApp />;
```

### Step 3.3: Build Student Portal Shell ([`frontend/src/StudentApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/StudentApp.tsx))
A clean, student-centric UI shell featuring:
- Top bar with enrolled class dropdown / selector, notification bell, and student avatar.
- 3 Primary Tabs:
  1. **Coursework & Materials**: View teacher-uploaded handouts, syllabus, and study notes with one-click download/preview using [`MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx).
  2. **Assignments & Turn-In**: View pending tasks, due dates, and an interactive "Turn In Assignment" drawer/modal (drag-and-drop file upload or direct text entry).
  3. **My Grades & Feedback**: Personal report card showing rubric performance, teacher remarks, and grade trends.

### Step 3.4: Student Assignment Submission Modal ([`frontend/src/features/student-portal/StudentTurnInModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/student-portal/StudentTurnInModal.tsx))
Create `StudentTurnInModal.tsx`:
- Toggle between **File Upload** (PDF, DOCX, images) and **Written Response** (textarea with rich formatting).
- Uploads files directly to Supabase Storage `student-submissions` bucket under student's authenticated folder.
- Submits native `type: 'Text'` (with `path: ''` and response in `value`/`description`) for written work.
- Inserts into `public.student_submissions` with `status: 'Submitted'` and `submitted_at: new Date().toISOString()`.

---

## 4. PostgreSQL RLS Security Verification
Verify that Row Level Security policies in [`schema/schema-db.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/schema-db.sql) permit students to:
1. `SELECT` from `public.classes` where `user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.class_students cs WHERE cs.class_id = classes.id AND cs.student_id = auth.uid())`.
2. `SELECT` from `public.class_materials` and `public.materials` for enrolled classes.
3. `SELECT` from `public.class_instructions` and `public.instructions` for enrolled classes.
4. `INSERT`, `UPDATE`, and `SELECT` on `public.student_submissions` where `student_id = auth.uid()`.
5. Upload to `storage.objects` in bucket `student-submissions` where `bucket_id = 'student-submissions' AND (storage.foldername(name))[3] = auth.uid()::text`.

---

## 5. Verification Plan

### Automated Verification:
- Run `npm run build` in `frontend/` to confirm all types and routing logic compile cleanly.

### Manual Verification:
1. **Teacher Invitation / Enrollment**:
   - As a teacher, invite a student with email `student.test@example.com` to "Biology 101".
2. **Student Login**:
   - Log out of teacher account.
   - Sign up / Log in as `student.test@example.com` with role `student`.
3. **Student Portal Mount**:
   - Verify that `App.tsx` routes directly into `StudentApp` (no teacher sidebar, no "Create Class" button).
   - Verify "Biology 101" appears in the student's enrolled course list.
4. **Download Material**:
   - Verify the student can view and download lecture slides uploaded by the teacher.
5. **Turn-In Assignment**:
   - Submit a test homework file and a written response.
   - Log back in as teacher and confirm both submissions appear in the teacher's grading queue, preview cleanly via `MaterialPreviewModal.tsx`, and can be graded.

---

## 6. Downstream Dependencies
- **Depends on**: [Plan 01](./01-database-schema-alignment.md), [Plan 02](./02-instruction-type-enum-safety.md), [Plan 05](./05-student-roster-portfolio-persistence.md), [Plan 06](./06-submissions-materials-preview.md).
