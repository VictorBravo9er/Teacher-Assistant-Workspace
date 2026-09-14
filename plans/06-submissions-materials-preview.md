# Plan 06: Submission Previews, Edit Mode Polish, & State Hygiene

## 1. Problem Statement & Root Cause

### 1.1 Missing `'Text'` Enum Value & Pseudo-URI Crashes in Preview Modal
- **Affected Files**: 
  - [`frontend/src/features/classroom/MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx)
  - [`frontend/src/features/students/StudentSubmissionUploadModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentSubmissionUploadModal.tsx)
- **Defect**: In Teach&Learn, student submissions can be uploaded files (PDF, DOCX) or direct text entries. Because `'Text'` was historically omitted from the database `public.content_type` enum (Plan 01/02), the upload modal coerced text entries to `type: 'File' as any` and stored pseudo-paths like `text://${itemId}` or `grade://${submissionId}`.
- When a teacher clicks to preview the submission, `MaterialPreviewModal` sees `type: 'File'` and attempts to download the pseudo-URI from Supabase Storage via `supabase.storage.from('student-submissions').createSignedUrl(path, ...)`.
- Supabase Storage rejects `text://...` with HTTP 400 Bad Request, resulting in a blank modal or infinite loading spinner.

### 1.2 Immutable Institute in Classroom Edit Mode
- **Affected File**: [`frontend/src/features/classroom/ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx)
- **Defect**: When entering class edit mode (`isEditMode === true`), the class title, description, and subject are editable, but the Institute Name is rendered as a static, read-only tag. If a teacher made a typo or needs to re-assign the course to a different department or institution, they are blocked.

### 1.3 State Mutation in Report Card Modal
- **Affected File**: [`frontend/src/features/students/ReportCardModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/ReportCardModal.tsx)
- **Defect**: Form inputs in the report card modal directly mutate properties on the passed `student` prop object instead of maintaining localized state or lifting immutably via `onUpdate` callbacks, violating React's unidirectional data flow.

### 1.4 Calculation Inversion & Desynchronized Late Attendance Weight
- **Affected Files**:
  - [`frontend/src/lib/studentCalculations.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/studentCalculations.ts)
  - [`frontend/src/features/students/AttendanceManagerModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/AttendanceManagerModal.tsx)
  - [`frontend/src/features/classroom/GradebookMatrix.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/GradebookMatrix.tsx)
- **Defect**:
  1. `calculateAverageScore` returns `fallbackScore` immediately if provided, causing `currentScore` from PostgreSQL to hide real submission scores in `GradebookMatrix` and `ReportCardModal`.
  2. `calculateAttendanceRate` gave `0%` credit to `'Late'` attendance, whereas `AttendanceManagerModal` used hardcoded inline math (`lateCount * 0.5`). There was no unified function or ability for teachers to configure the late attendance weight credit (e.g., 50% default, with 0%, 25%, 75%, or 100% options).

---

## 2. Target Architecture & Solutions

### 2.1 Polymorphic Material Preview Protocol
`MaterialPreviewModal` should inspect the content type and path protocol defensively:
1. **Direct HTTP/HTTPS or `type === 'URL'`**: Render external link or embedded iframe.
2. **Native Text (`type === 'Text'`) & Legacy Pseudo-URI (`text://`)**: Bypass Supabase Storage completely. Decode and render an inline typography reader card with text selection, word count, character count, and copy controls, reading from `item.value || item.description`.
3. **Pseudo-URI (`grade://`)**: Render a structured grading ledger view with criteria breakdowns.
4. **Physical File (`type === 'File'`)**: Query Supabase Storage via `createSignedUrl` or `download` only for real storage bucket keys.

### 2.2 Clean Native Text Submissions
With `'Text'` added to `public.content_type` in Plan 01/02, `StudentSubmissionUploadModal.tsx` eliminates `type: 'File' as any`. It submits `type: 'Text'` natively with the text body in `value` and `description`, setting `path: ''`.

### 2.3 Editable Institute Control
Render an `InstituteAutocompleteField` or editable text input when `isEditMode === true` and pass `instituteName` in `onUpdateClass`.

### 2.4 Pure State in Report Card Modal & ClassApp Wireup
Manage report card feedback and score adjustments using React `useState` and dispatch immutable updates to parent state via `onUpdateStudent` in `ClassApp.tsx`.

### 2.5 Configurable Late Attendance Weight & Primary Grade Calculation
1. **Configurable Late Weight**: Standardize `calculateAttendanceRate(records, lateWeight = 0.5)`. The late weight defaults to 50% (`0.5`), reads from educator preferences (`user_metadata.preferences.lateAttendanceWeight`), and can be adjusted by the teacher.
2. **Primary Submission Aggregation**: In `calculateAverageScore`, compute the real average from actual evaluated submissions first; only fall back to `fallbackScore` if zero evaluated submissions exist.

---

## 3. Implementation Steps

### Step 3.1: Enhance [`frontend/src/features/classroom/MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx)
1. Add defensive polymorphic detection for native text and legacy pseudo-URIs:
   ```typescript
   const firstItem = material?.content?.[0];
   const isTextSubmission = 
     firstItem?.type === 'Text' || 
     firstItem?.path?.startsWith('text://') || 
     material?.type === 'Text';
   const isGradeLog = firstItem?.path?.startsWith('grade://');
   const isUrl = firstItem?.type === 'URL' || material?.category === 'Link';
   const isStorageFile = Boolean(firstItem?.type === 'File' && firstItem?.path && !isTextSubmission && !isGradeLog);
   ```
2. When `isTextSubmission` is true:
   - Extract text content from `firstItem?.value || firstItem?.description || material?.description || ''`.
   - Render an inline text inspection card showing:
     - Submission title and submission date
     - Formatted text body inside a styled container (`bg-surface p-4 rounded border font-mono text-sm leading-relaxed whitespace-pre-wrap select-text`)
     - Word count & Character count badges
     - "Copy Content" button
3. Guard storage download calls so they only execute when `isStorageFile` is true.

### Step 3.2: Clean Native Text Submissions in [`frontend/src/features/students/StudentSubmissionUploadModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentSubmissionUploadModal.tsx)
1. Update `handleSubmit` for text mode:
   - Remove `type: 'File' as any`.
   - Set native `type: 'Text'`.
   - Store the submitted text directly in `value` and `description`:
   ```typescript
   contentItems = [
     {
       id: itemId,
       name: `${displayTitle} (Text Excerpt)`,
       type: 'Text',
       value: textContent.trim(),
       path: '',
       description: textContent.trim() || 'Student provided written answers directly.',
     },
   ];
   ```

### Step 3.3: Enable Institute Editing in [`frontend/src/features/classroom/ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx)
1. Add state for `editInstitute`:
   ```typescript
   const [editInstitute, setEditInstitute] = useState(classItem.instituteName || '');
   ```
2. In the edit mode header, render an input field alongside title and subject:
   ```tsx
   {isEditMode ? (
     <input
       type="text"
       value={editInstitute}
       onChange={(e) => setEditInstitute(e.target.value)}
       placeholder="Institute / School Name"
       className="bg-elevated border border-border-color rounded px-2 py-1 text-xs text-primary-text"
     />
   ) : (
     <span className="text-xs text-muted-text font-medium">{classItem.instituteName}</span>
   )}
   ```
3. In `handleSaveClassDetails`, include `instituteName: editInstitute`.

### Step 3.4: Refactor [`frontend/src/features/students/ReportCardModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/ReportCardModal.tsx)
1. Add `onUpdateStudent?: (studentId: string, updates: Partial<Student>) => void` to `ReportCardModalProps`.
2. Replace direct object mutations (`student.behavioralNotes = ...`) with functional state setters and call `onUpdateStudent(student.id, { behavioralNotes: customParentNote, parentNotes: customParentNote })`.
3. In [`frontend/src/views/ClassApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/ClassApp.tsx), pass an updater to `ReportCardModal` that immutably updates `activeClass.students`.

### Step 3.5: Correct Calculations in [`frontend/src/lib/studentCalculations.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/studentCalculations.ts)
1. In `calculateAverageScore`, evaluate actual submissions first before returning fallback:
   ```typescript
   export function calculateAverageScore(
     submissions?: StudentSubmission[],
     fallbackScore?: number
   ): number {
     const evaluated = (submissions || []).filter(
       (s) => s.score !== undefined && s.score !== null
     );
     if (evaluated.length > 0) {
       const sumPct = evaluated.reduce((acc, sub) => {
         const max = sub.maxScore || sub.max_score || parseFloat(sub.grade || '100') || 100;
         return acc + (sub.score || 0) / (max > 0 ? max : 100);
       }, 0);
       return Math.round((sumPct / evaluated.length) * 100);
     }
     if (fallbackScore !== undefined && fallbackScore !== null) {
       return fallbackScore;
     }
     return 80;
   }
   ```
2. In `calculateAttendanceRate`, add configurable `lateWeight` (default `0.5` = `50%`):
   ```typescript
   export function calculateAttendanceRate(
     records?: AttendanceRecord[],
     lateWeight: number = 0.5
   ): number {
     if (!records || records.length === 0) return 100;
     const presentOrExcused = records.filter(
       (r) => r.status === 'Present' || r.status === 'Excused'
     ).length;
     const lateCount = records.filter((r) => r.status === 'Late').length;
     const effectivePresent = presentOrExcused + (lateCount * lateWeight);
     return Math.round((effectivePresent / records.length) * 100);
   }
   ```

### Step 3.6: Wire Configurable Late Weight in [`frontend/src/features/students/AttendanceManagerModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/AttendanceManagerModal.tsx)
1. Read `lateWeight` from user preferences in `AuthContext` (e.g. `user?.user_metadata?.preferences?.lateAttendanceWeight ?? 0.5`).
2. Replace ad-hoc inline math with `calculateAttendanceRate(records, lateWeight)`.
3. Provide a quick weight indicator / selector in the modal toolbar (e.g. `Late Credit: 50%` with options `0%`, `25%`, `50%`, `75%`, `100%`) so educators can override the weight dynamically per class.

---

## 4. Verification Plan

### Automated Verification:
- Run `npm run build` in `frontend/` to confirm zero compiler errors.

### Manual Verification:
1. **Text Submissions**:
   - Create a text submission for a student.
   - Click to preview the submission.
   - Verify that the preview modal displays the full text cleanly without any Supabase Storage errors in the DevTools console.
2. **Classroom Edit Mode**:
   - Open a class and toggle **Edit Mode**.
   - Change the Institute Name from "Westwood High" to "Oakridge Academy".
   - Save changes and reload the page.
   - Verify that the class header and sidebar display "Oakridge Academy".
3. **Report Card**:
   - Open Report Card Modal for a student.
   - Modify performance tier or general remarks.
   - Save and verify updates persist without throwing React state mutation warnings.
4. **Late Attendance Weight**:
   - In Attendance Manager Modal, mark 1 student "Present" and 1 student "Late" (2 sessions).
   - Verify that with the 50% default late credit, the overall attendance shows 75%.
   - Toggle late credit to 0%, verify it recalculates to 50%.
   - Toggle late credit to 100%, verify it recalculates to 100%.
5. **Gradebook Live Average Score**:
   - Add a graded submission for an assessment.
   - Verify that `GradebookMatrix` and `ReportCardModal` display the real computed average of evaluated submissions rather than being blocked by the static `currentScore` fallback.

---

## 5. Downstream Dependencies
- **Relates to**: [Plan 07 (`07-student-portal-architecture.md`)](./07-student-portal-architecture.md) for student submission previews, and [Plan 08.5 (`08.5-classroom-notifications-resend.md`)](./08.5-classroom-notifications-resend.md) for automated material publish/update email notifications to enrolled students.

