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

    alt Direct Student Creation
        Teacher->>UI: Fills Student Form (Name, Email, Enrollment No, Learning Style)
        Teacher->>UI: Clicks "Add Student"
        UI->>Svc: addStudentToClass(classId, studentPayload)
        Svc->>DB: UPSERT INTO public.students (name, email, enrollment_number, ...) RETURNING id
        Svc->>DB: INSERT INTO public.class_students (class_id, student_id, status='Enrolled')
        DB-->>Svc: Returns linked ClassStudent record
        Svc-->>Hook: Resolves Student object
        Hook->>UI: Appends student to roster state & initializes gradebook row
    else Invite via Email Link
        Teacher->>UI: Enters student email & clicks "Send Invite"
        UI->>Edge: POST /invite-student (class_id, email, name)
        Edge->>DB: Creates pending student record in public.students & class_students
        Edge->>Edge: Generates secure onboarding invitation token
        Edge-->>UI: Returns { inviteToken, inviteUrl }
        UI-->>Teacher: Displays shareable enrollment URL / confirms email sent
    end
```

### Step-by-Step Execution Details:

1. **User Initiation**:
   - In [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx), the teacher clicks **"Add Student"** or **"Invite Students"**.
   - Input fields: Student Full Name, Email, Enrollment/ID Number, Parent Contact Information, Learning Style (`Visual`, `Auditory`, `Kinesthetic`, `Read/Write`).
2. **Database Provisioning**:
   - The student master record is created or updated in `public.students`.
   - A junction entry is inserted into `public.class_students` initialized with default metrics (`current_score = null`, `attendance_rate = 100.0`, `status = 'Enrolled'`).
3. **Workspace State Synchronization**:
   - [`useClassOperations`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useClassOperations.ts) adds the student to the active class state, initializing their row in the Gradebook Matrix.

---

## 2. Workflow: Daily Roll-Call Attendance Logging & Rate Recalculation

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as AttendanceManagerModal.tsx
    participant Hook as useClassOperations
    participant Svc as studentService
    participant DB as PostgreSQL (public)
    participant Calc as studentCalculations.ts

    Teacher->>UI: Opens Attendance Manager & selects Date (e.g. 2026-08-31)
    Teacher->>UI: Marks statuses for roster (Present, Absent, Late, Excused)
    Teacher->>UI: Clicks "Save Attendance"
    UI->>Svc: logAttendanceBatch(classId, date, records)
    
    loop For each student in batch
        Svc->>DB: UPSERT INTO public.attendance_records (class_id, student_id, date, status, notes)
    end
    
    DB-->>Svc: Batch write confirmed
    
    Note over Svc,Calc: Recalculate Attendance Rates
    Svc->>DB: SELECT * FROM public.attendance_records WHERE class_id = ?
    DB-->>Svc: Full attendance history
    Svc->>Calc: calculateAttendanceRate(studentAttendanceHistory)
    Calc-->>Svc: Returns updated percentage (e.g. 94.2%)
    
    Svc->>DB: UPDATE public.class_students SET attendance_rate = ? WHERE class_id = ? AND student_id = ?
    
    Svc-->>Hook: Resolves updated attendance records
    Hook->>UI: Updates class student state & attendance badges in roster
    UI-->>Teacher: Displays success confirmation toast
```

### Step-by-Step Execution Details:

1. **Roll-Call Interface**:
   - The teacher opens [`AttendanceManagerModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/AttendanceManagerModal.tsx).
   - Allows bulk actions (e.g. **"Mark All Present"**) followed by individual exceptions (`Absent`, `Late`, `Excused`).
2. **Database Persistence**:
   - [`studentService.logAttendanceBatch()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts) executes batch upserts into `public.attendance_records`.
3. **Attendance Rate Recalculation**:
   - [`calculateAttendanceRate()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/studentCalculations.ts) evaluates total sessions, weighting `Present` as 100%, `Late` as 50%, and excluding `Excused` absences.
   - The recalculated `attendance_rate` is saved to `public.class_students`.
4. **Realtime UI Reflection**:
   - Attendance percentages update across the student directory, individual student cards, and AI Copilot prompt context.

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
