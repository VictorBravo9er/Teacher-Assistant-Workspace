# Atomic Workflows: Student Portal Operations

This document defines atomic operational specifications for student-specific tasks within the **Teach&Learn** Student Portal (`frontend/src/views/StudentApp.tsx`).

---

## ATOM-SP-01: Switch Active Enrolled Course

### 1. Trigger
- **Event**: Student selects a different course from the top dropdown selector in [`StudentApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/StudentApp.tsx).

### 2. Preconditions
- The student is authenticated (`auth.role() = 'student'`).
- The student is enrolled in at least one class in `public.class_students`.

### 3. Input Parameters
```typescript
interface SwitchCourseParams {
  selectedClassId: string;
}
```

### 4. Execution Pipeline
1. Sets `activeClassId` state in `StudentApp.tsx`.
2. Concurrently dispatches:
   - `studentPortalService.fetchClassDetails(selectedClassId)`
   - `announcementService.fetchAnnouncements(selectedClassId)`
3. Rerenders course banner, teacher contact, letter grade, and active tab content.

### 5. Error Handling & Rollbacks
- Network failure surfaces a localized error banner while retaining previous course state.

### 6. Postconditions
- Local state reflects the newly selected class data. No database writes occur (read-only query).

---

## ATOM-SP-02: Self-Service Assignment Turn-In

### 1. Trigger
- **Event**: Student clicks **"Turn In"** inside [`StudentTurnInModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/student-portal/StudentTurnInModal.tsx).

### 2. Preconditions
- Student is enrolled in the course.
- Assignment material exists with `to_be_scored = true`.

### 3. Input Parameters
```typescript
interface TurnInParams {
  classId: string;
  studentId: string;
  materialId: string;
  content: Array<{
    id: string;
    name: string;
    type: 'File' | 'URL' | 'Text';
    path: string;
    description?: string;
    size_bytes?: number;
    mime_type?: string;
  }>;
}
```

### 4. Execution Pipeline
1. For binary files: uploads byte payload to Supabase Storage (`student-submissions/{material_id}/{content_item_id}`) while displaying an asymptotic progress bar.
2. Calls `studentPortalService.submitAssignment()`.
3. Database upserts record into `public.student_submissions` (`status = 'Submitted'`, `submitted_at = now()`).
4. Invokes `onSubmitted(newSubmission)` in `StudentApp.tsx` for immediate 0ms optimistic UI update.
5. In background, calls Edge Function `notify-submission` to alert the teacher.

### 5. Postconditions
- Row inserted/updated in `public.student_submissions`.
- Subsequent AI grading workflow (`ATOM-AIS-01`) is triggered via database webhook.

---

## ATOM-SP-03: Resolve Material Signed Download URL

### 1. Trigger
- **Event**: Student clicks **"Preview"** or **"Download"** on a course material in `StudentApp.tsx`.

### 2. Preconditions
- The student is enrolled in the course that contains the material.

### 3. Input Parameters
```typescript
interface ResolveMaterialUrlParams {
  classId: string;
  materialId: string;
  contentItemId: string;
}
```

### 4. Execution Pipeline
1. Calls Edge Function `get-material-url` via POST.
2. Edge Function queries `public.class_students` verifying caller's `auth.uid() = student_id`.
3. Edge Function generates a 3600-second signed URL via Supabase Storage admin client.
4. Returns signed URL to frontend for in-app preview or browser download.

### 5. Postconditions
- Temporary signed URL generated; no database state mutation.

---

## ATOM-SP-04: Student Password Setup & Rotation

### 1. Trigger
- **Event**: Student submits the password form in `StudentPasswordModal`.

### 2. Preconditions
- Active Supabase Auth session exists.
- `newPassword === confirmPassword` with minimum 6 characters.

### 3. Input Parameters
```typescript
interface UpdatePasswordParams {
  newPassword: string;
}
```

### 4. Execution Pipeline
1. Activates blocking progress bar (`isUpdating = true`).
2. Invokes `supabase.auth.updateUser({ password: newPassword })`.
3. On success, closes modal and shows confirmation toast.

### 5. Error Handling & Rollbacks
- Displays localized error message and restores form inputs without terminating session.

### 6. Postconditions
- Encrypted password digest updated in `auth.users`.

---

## ATOM-SP-05: Inspect Grades, Letter Grade & Feedback

### 1. Trigger
- **Event**: Student selects the **"Grades"** sub-tab in [`StudentApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/StudentApp.tsx).

### 2. Preconditions
- The student is authenticated (`auth.role() = 'student'`).
- The student has an active course selected.

### 3. Input Parameters
```typescript
interface InspectGradesParams {
  classId: string;
}
```

### 4. Execution Pipeline
1. Sets `activeTab = 'grades'` in `StudentApp.tsx`.
2. Computes summary metrics from `activeClass` state:
   - Cumulative percentage score (`activeClass.currentScore`).
   - Assigned letter grade (`activeClass.currentGrade`).
   - Attendance percentage (`activeClass.attendancePercentage`).
   - Teacher portfolio remarks (`activeClass.generalFeedback`).
3. Maps `submissions` array to graded item cards displaying assignment title, turn-in status, rubric feedback, and points earned vs. max points.

### 5. Error Handling & Rollbacks
- If score data is not yet computed, renders localized fallback states (`"Not Graded Yet"`, `"Pending Evaluation"`).

### 6. Postconditions
- Read-only presentation; no database or cache mutations.

