# Student Roster, Attendance & Portfolio Workflows

This document details the start-to-finish workflows for student enrollment, daily roll-call attendance tracking, 360 portfolio diagnostics, and student report card generation.

---

## 1. Workflow: Enrolling / Adding Students to a Class

Teachers can enroll students individually or generate secure invitations for student onboarding.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as StudentRegister.tsx
    participant Hook as useClassOperations
    participant Svc as studentService
    participant Edge as Edge Function (invite-student)
    participant DB as PostgreSQL (public)

    Teacher->>UI: Fills Student Form (Name, Email, Enrollment No, Learning Style)
    Teacher->>UI: Clicks "Add Student" / "Send Invite"
    UI->>UI: Prepends temp-invite-* card (isPending: true, "Inviting..." pill)
    UI-->>Teacher: Closes Add Student Modal in 0ms (does NOT auto-open StudentDetailModal)
    UI->>Svc: Background addStudentToClass(classId, studentPayload)
    Svc->>Edge: POST /invite-student (class_id, email, name, ...)
    alt Success (200 OK)
        Edge->>DB: Creates student & class_students records, sends invite email
        Edge-->>Svc: Returns { student_id: realId }
        Svc-->>UI: Resolves Student with realId
        UI->>UI: Replaces temp-invite-* with realId & clears isPending via classItemRef
        UI-->>Teacher: Displays toast ("Invited <Name> to class")
    else Failure / Network Error
        Edge-->>Svc: Rejects error
        Svc-->>UI: Throws error
        UI->>UI: Evicts temp-invite-* from roster via classItemRef
        UI-->>Teacher: Displays error toast
    end
```

### Step-by-Step Execution Details:

1. **Optimistic User Initiation (`0ms`)**:
   - In [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx), the teacher fills out the student form and clicks **"Add Student"**.
   - A temporary `Student` object (`id: "temp-invite-<timestamp>"`, `isPending: true`) is immediately inserted into the roster via `classItemRef`, displaying an animated `"Inviting..."` overlay pill on the card.
   - The Add Student modal closes immediately (`0ms`) without interrupting the teacher by opening `StudentDetailModal`.
2. **Background Edge Function & Database Provisioning**:
   - [`studentService.addStudentToClass()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts) invokes the `invite-student` Edge Function in the background.
   - The student master record is created or updated in `public.students` and linked in `public.class_students`.
3. **Reconciliation or Rollback**:
   - On success, `temp-invite-*` is swapped in-place with the real database UUID and `isPending` is cleared.
   - On error, `temp-invite-*` is evicted from `classItemRef.current.students` and an error toast is shown.

---

## 2. Workflow: Daily Roll-Call Attendance Logging & Rate Recalculation

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as AttendanceManagerModal.tsx
    participant Reg as StudentRegister.tsx
    participant Svc as studentService
    participant DB as PostgreSQL (public)

    Teacher->>UI: Opens Attendance Manager & selects Date (e.g. 2026-08-31)
    Teacher->>UI: Marks statuses for roster (Present, Absent, Late, Excused)
    Teacher->>UI: Clicks "Save Attendance"
    UI->>UI: Captures previousStudents snapshot & computes updatedStudents rates in-memory
    UI->>Reg: Immediately emits onUpdateStudents(updatedStudents) & calls onClose() (0ms)
    UI->>Svc: Background bulkLogAttendance(classId, selectedDate, records)
    alt Success
        Svc->>DB: Batch UPSERT public.attendance_records & UPDATE public.class_students
        DB-->>Svc: Write confirmed
        Svc-->>UI: Resolves
        UI-->>Teacher: Displays toast ("Attendance saved for <Date>")
    else Failure
        Svc-->>UI: Rejects error
        UI->>Reg: Reverts via onUpdateStudents(previousStudents)
        UI-->>Teacher: Displays error toast ("Failed to save attendance — reverted changes.")
    end
```

### Step-by-Step Execution Details:

1. **Roll-Call Interface & 0ms Optimistic Application**:
   - The teacher opens [`AttendanceManagerModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/AttendanceManagerModal.tsx) and marks `Present`, `Absent`, `Late`, or `Excused`.
   - Clicking **"Save Attendance"** captures a `previousStudents` snapshot, calculates the new attendance histories and percentages (`Math.round((presentCount / totalDays) * 100)`) in memory, immediately updates the parent roster (`onUpdateStudents(updatedStudents)`), and closes the modal in `0ms`.
2. **Background Database Persistence & Snapshot Rollback**:
   - [`studentService.bulkLogAttendance()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts) executes batch upserts into `public.attendance_records` and updates `public.class_students` in the background.
   - If the database write fails, `onUpdateStudents(previousStudents)` automatically restores the pre-save attendance state and alerts the teacher.

---

## 3. Workflow: 360 Student Portfolio Tracking

Teachers can inspect a student's holistic performance profile:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Click["Teacher clicks student card in StudentRegister.tsx"] --> OpenModal["Opens StudentDetailModal.tsx"]
    
    OpenModal --> Fetch1["Fetch submissions & scores from public.student_submissions"]
    OpenModal --> Fetch2["Fetch attendance trajectory from public.attendance_records"]
    OpenModal --> Fetch3["Fetch concept mastery & learning gaps via RPC get_student_concept_gaps()"]
    
    Fetch1 --> Aggregate["studentCalculations.ts computes GPA & submission completion rate"]
    Fetch2 --> Aggregate
    Fetch3 --> Aggregate

    Aggregate --> RenderProfile["Renders 360 Student Profile:
    • Cumulative GPA & Tier (Advanced / Proficient / Developing / Critical Support)
    • Longitudinal Attendance Chart
    • Assignment Timeline with Teacher Feedback & Rubric Breakdowns
    • AI Identified Concept Gaps & Recommended Practice"]
```

### Buffered Contact & Guardian Dossier Persistence:
- In [`StudentDetailModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentDetailModal.tsx), edits to Contact Dossier and Family/Guardian fields (`phone`, `address`, `parentName`, `parentContact`, `parentNotes`, `statusIndicator`) are held in local `dossierDraft` state without firing per-keystroke network requests.
- Student `email` is displayed as `readOnly` (linked to the student's Supabase Auth identity).
- Clicking **Save Dossier** (`student-detail-save-dossier-button`) dispatches a single diff payload through `handleUpdateStudentDetails` $\rightarrow$ [`studentService.updateStudentClassData()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts), while local roster state synchronization via `onUpdateClass({ students })` updates React state without triggering `classService.updateClass`.

---

## 4. Workflow: Generating & Exporting Report Cards

Educators can generate formal student report cards compiling grades, attendance statistics, teacher comments, and AI-assisted performance summaries.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as ReportCardModal.tsx
    participant Calc as studentCalculations.ts
    participant Print as Browser Print / PDF Export Engine

    Teacher->>UI: Selects student and clicks "Generate Report Card"
    UI->>Calc: Compiles overall grade, GPA, attendance percentage, and submission breakdown
    Calc-->>UI: Structured Report Card Payload
    Teacher->>UI: Reviews / edits General Feedback & Behavioral Notes
    Teacher->>UI: Clicks "Export PDF / Print"
    UI->>Print: Triggers @media print CSS styles (formatted for standard 8.5x11 / A4 report cards)
    Print-->>Teacher: Generates high-resolution printable report card
```

### Report Card Contents:
- **Header**: Institute Name, Academic Year, Term, Teacher Name, Class Subject.
- **Student Details**: Student Name, Enrollment ID, Contact Info, Learning Style.
- **Academic Metrics**: Cumulative Percentage, Letter Grade, Performance Tier, Class Standing.
- **Detailed Gradebook**: List of all graded assignments, tests, and practicals with scores and maximum points.
- **Attendance Summary**: Total Days, Present Days, Unexcused Absences, Tardy Count, Attendance Rate.
- **Pedagogical Assessment**: Teacher Narrative Remarks and AI-generated conceptual strengths and areas for growth.
