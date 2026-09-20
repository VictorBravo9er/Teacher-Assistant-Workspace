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

## ATOM-STU-02: Student Invitation Token Issuance

### 1. Trigger
- **Event**: Teacher clicks "Send Class Invite" with an email address in [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx).

### 2. Execution Pipeline
1. Client calls Edge Function [`invite-student`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/invite-student):
   ```http
   POST /functions/v1/invite-student
   Payload: { class_id: string, email: string, name?: string }
   ```
2. Edge Function verifies teacher authorization on the class.
3. Inserts placeholder student in `public.students` and `class_students` with status `'Pending'`.
4. Creates onboarding cryptographic invitation token and signs URL:
   `https://app.teachlearn.internal/join?token=<signed_token>`
5. Returns `{ inviteToken, inviteUrl }`.

### 3. Conclusion
- Modal displays the generated invite link with a **"Copy Link"** button.

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
1. UI invokes [`studentService.logAttendanceBatch()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts#L300-L360).
2. For each student record, executes atomic upsert:
   ```sql
   INSERT INTO public.attendance_records (class_id, student_id, date, status, notes, recorded_by)
   VALUES (:classId, :studentId, :date, :status, :notes, auth.uid())
   ON CONFLICT (class_id, student_id, date) DO UPDATE SET
     status = EXCLUDED.status,
     notes = EXCLUDED.notes,
     updated_at = timezone('utc'::text, now());
   ```
3. Triggers aggregate rate recalculation (`ATOM-STU-04`).

### 4. Conclusion & Re-render
- All session records are persisted.
- Modal closes and displays toast: `"Attendance logged for N students on YYYY-MM-DD"`.

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

## ATOM-STU-06: Remove / Drop Student from Class

### 1. Trigger
- **Event**: Teacher confirms dropping a student from the active class roster.

### 2. Execution Pipeline
1. Executes delete or status transition:
   ```sql
   DELETE FROM public.class_students
   WHERE class_id = :classId AND student_id = :studentId;
   ```
2. Master student record in `public.students` is **preserved**.
3. Student is removed from `class_students` local state and Gradebook Matrix.
