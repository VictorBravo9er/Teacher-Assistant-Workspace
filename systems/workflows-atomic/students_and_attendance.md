# Atomic Workflows: Students & Attendance

This document details the discrete atomic tasks governing student enrollment, onboarding invitations, attendance logging, rate recomputations, and report card generation.

---

## ATOM-STU-01: Direct Student Enrollment

### 1. Trigger
- **Event**: Teacher fills the Add Student modal in [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx) and clicks **"Enroll Student"**.

### 2. Preconditions
- Teacher owns the active class (`auth.uid() = classes.user_id`).
- Student Name and Email are non-empty.

### 3. Input Parameters
```typescript
interface AddStudentPayload {
  classId: string;
  name: string;
  email: string;
  enrollmentNumber?: string;
  parentContact?: string;
  learningStyle?: string; // 'Visual', 'Auditory', 'Kinesthetic', 'Read/Write'
}
```

### 4. Execution Pipeline
1. UI invokes [`studentService.addStudentToClass()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts).
2. Upsert Master Student Record:
   ```sql
   INSERT INTO public.students (name, email, enrollment_number, parent_contact)
   VALUES (:name, :email, :enrollmentNumber, :parentContact)
   ON CONFLICT (email) DO UPDATE SET
     name = EXCLUDED.name,
     enrollment_number = COALESCE(EXCLUDED.enrollment_number, students.enrollment_number)
   RETURNING id;
   ```
3. Insert Class Enrollment Junction:
   ```sql
   INSERT INTO public.class_students (
     class_id, student_id, learning_style, status, attendance_rate, current_score, current_grade, performance_tier
   ) VALUES (
     :classId, :studentId, :learningStyle, 'Enrolled', 100.0, NULL, 'N/A', 'Unassessed'
   ) RETURNING *;
   ```

### 5. Postconditions & Conclusion
- The student is registered in `public.students` and enrolled in `public.class_students`.
- [`useClassOperations`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useClassOperations.ts) appends the student to the active class state.
- The Student Register updates its table, and a new row appears in the Gradebook Matrix.

---

## ATOM-STU-02: Optimistic Student Invitation & Onboarding Token Issuance

### 1. Trigger
- **Event**: Teacher submits the Add Student / Invite form in [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx).

### 2. Execution Pipeline
1. **0ms Optimistic Roster Card**:
   - UI generates `tempId = "temp-invite-" + Date.now()` with `isPending: true`, appends the placeholder `Student` card to `classItemRef.current.students`, and closes the modal immediately (`0ms`) without opening `StudentDetailModal`.
2. **Background Edge Function Invocation**:
   - Client calls [`studentService.addStudentToClass()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts) $\rightarrow$ Edge Function [`invite-student`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/invite-student).
3. Edge Function verifies teacher authorization, provisions the student in `public.students` and `public.class_students`, and dispatches the onboarding invitation email.
4. Returns `{ student_id: realId }`.

### 3. Reconciliation & Rollback
- **On Success**: Replaces `tempId` with `realId` in `classItemRef.current.students`, clears `isPending`, and shows a success toast.
- **On Failure**: Evicts `tempId` from `classItemRef.current.students` and displays an error toast.
- **State Sync Invariant**: Calls to `onUpdateClass(classItem.id, { students })` during optimistic insert, reconciliation, and rollback update local React state (`useClassOperations.handleUpdateClass`) without dispatching `UPDATE public.classes` queries.

---

## ATOM-STU-03: Daily Roll-Call Attendance Batch Logging

### 1. Trigger
- **Event**: Teacher reviews attendance statuses for a class date in [`AttendanceManagerModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/AttendanceManagerModal.tsx) and clicks **"Save Attendance"**.

### 2. Input Parameters
```typescript
interface BatchAttendancePayload {
  classId: string;
  date: string; // YYYY-MM-DD
  records: Array<{
    studentId: string;
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    notes?: string;
  }>;
}
```

### 3. Execution Pipeline
1. **0ms Optimistic State Application**:
   - Captures `previousStudents = classItem.students` for rollback.
   - Computes updated attendance histories and rates in memory, calls `onUpdateStudents(updatedStudents)`, and closes the modal immediately (`onClose()`).
2. **Background Database Persistence**:
   - Invokes [`studentService.bulkLogAttendance()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts) in the background to upsert `public.attendance_records` and update `public.class_students`.

### 4. Conclusion & Error Rollback
- **On Success**: Displays toast `"Attendance saved for YYYY-MM-DD"`.
- **On Failure**: Calls `onUpdateStudents(previousStudents)` to restore pre-save attendance percentages and shows an error toast.

---

## ATOM-STU-04: Aggregate Attendance Rate Recalculation

### 1. Trigger
- **Event**: Initiated directly following any attendance record insert, update, or deletion for a student.

### 2. Execution Pipeline
1. Service fetches all historical attendance records for the student in this class:
   ```sql
   SELECT status FROM public.attendance_records
   WHERE class_id = :classId AND student_id = :studentId;
   ```
2. Invokes [`calculateAttendanceRate()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/studentCalculations.ts):
   $$\text{Rate} = \frac{\text{Count}(\text{Present}) \times 1.0 + \text{Count}(\text{Late}) \times 0.5}{\text{Total Non-Excused Days}} \times 100$$
3. Persists recalculated rate to `public.class_students`:
   ```sql
   UPDATE public.class_students
   SET attendance_rate = ROUND(:calculatedRate, 2),
       updated_at = timezone('utc'::text, now())
   WHERE class_id = :classId AND student_id = :studentId;
   ```

### 3. Conclusion
- Roster cards, student detail modal KPI indicators, and AI prompt context reflect the updated attendance percentage.

---

## ATOM-STU-05: Generate Student Report Card

### 1. Trigger
- **Event**: Teacher clicks **"Report Card"** in [`StudentDetailModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentDetailModal.tsx) or selects a student in [`ReportCardModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/ReportCardModal.tsx).

### 2. Execution Pipeline
1. Aggregates data from local class state:
   - Institute and Course headers.
   - Enrolled student profile (`name`, `enrollmentNumber`, `learningStyle`).
   - All graded assignment submissions (`material_name`, `score`, `max_score`, `feedback`).
   - Attendance summary (Total sessions, Present, Absent, Late, Excused, Overall Rate).
   - Cumulative GPA, overall letter grade, and performance tier.
2. Injects teacher remarks and editable behavioral feedback.
3. Formats document through dedicated `@media print` CSS layout.

### 3. Conclusion
- Teacher prints or exports the standardized report card directly to PDF via the browser print engine.

---

## ATOM-STU-06: Optimistic Remove / Drop Student from Class

### 1. Trigger
- **Event**: Teacher confirms dropping a student from the active class roster in [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx).

### 2. Execution Pipeline
1. **0ms Optimistic Removal**:
   - Captures `previousClassSnapshot = classItemRef.current` and immediately removes the student from `classItemRef.current.students` and closes `StudentDetailModal`.
2. **Background Deletion**:
   - Executes `studentService.deleteStudent(studentId)` in the background (`DELETE FROM public.class_students`).
3. **Rollback on Failure**:
   - If the deletion fails, restores `previousClassSnapshot` to `classItemRef` and displays an error toast.

---

## ATOM-STU-07: Buffered Student Contact & Guardian Dossier Update

### 1. Trigger
- **Event**: Teacher clicks the `Edit3` icon button (`student-detail-edit-dossier-button`) on the **Contact Dossier** & **Family & Guardians** section in [`StudentDetailModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentDetailModal.tsx), modifies fields (`phone`, `address`, `parentName`, `parentContact`, `parentNotes`), and clicks `Save` (`student-detail-save-dossier-button`).

### 2. Execution Pipeline
1. **Local Draft Buffering**:
   - Inputs are disabled (`disabled={!isEditingDossier}`) until `student-detail-edit-dossier-button` sets `isEditingDossier = true`.
   - Changes are held in `dossierDraft` without triggering per-keystroke queries; clicking `X` (`student-detail-cancel-dossier-button`) resets `dossierDraft` and exits edit mode.
2. **Split Table Persistence (`studentService.updateStudentClassData`)**:
   - Identity-level contact and guardian fields (`phone`, `address`, `parent_name`, `parent_contact`) execute `UPDATE public.students WHERE id = :studentId`.
   - Class-scoped feedback notes (`parent_notes`) execute `UPDATE public.class_students WHERE class_id = :classId AND student_id = :studentId`.
   - Each query runs only if its respective diff payload is non-empty.
