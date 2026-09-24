# Student Management Architecture & Submission Lifecycle

This document details the student data model, submission state machine, and grading pipeline in `frontend/src/features/students/`.

---

## 1. Submission Lifecycle & Grading Flow

```mermaid
stateDiagram-v2
    [*] --> Assigned: Material assigned to student
    Assigned --> Pending: Student uploads submission file / URL / text
    Pending --> Submitted: Final submission confirmed
    Submitted --> Evaluated: AI auto-grading diagnosis generated
    Evaluated --> Graded: Teacher approves / adjusts rubric scores & saves
    Graded --> [*]
```

---

## 2. Component Design & Scoring Invariants

1. **Criteria Breakdown Scoring (`SubmissionGradingModal.tsx`)**:
   - Calculates real-time total scores across criteria: `computedScore = sum(criteriaScores.map(c => c.score))`.
   - Compares against `material.maxScore` and computes student percentage grade `(computedScore / maxScore) * 100`.
2. **Attendance Calculation Invariant (`AttendanceManagerModal.tsx`)**:
   - Computes student attendance rate using standard weighted logic:
     $$\text{Attendance Rate} = \frac{\text{Present Count} + (0.5 \times \text{Late Count})}{\text{Total Recorded Sessions}} \times 100$$
3. **Printable Document Formatting (`ReportCardModal.tsx`)**:
   - Incorporates CSS `@media print` rules to hide navigation buttons, format high-contrast report cards, and enforce clean page breaks for multi-page exports.

---

## 3. Optimistic Roster Enrolment Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Teacher
    participant UI as StudentRegister
    participant Service as studentService
    participant Edge as Edge Function (invite-student)

    Teacher->>UI: Submit "Add Student" Form
    UI->>UI: Append Student (`tempId`, `isPending: true`)
    Note over UI: Roster immediately shows card with animated "Inviting..." overlay
    UI-->>Teacher: Close Add Student Modal (no detail modal interruption)
    UI->>Service: Background addStudentToClass(classId, student)
    Service->>Edge: POST /invite-student
    alt Success (200 OK)
        Edge-->>Service: Return { student_id: realId }
        Service-->>UI: Resolve realId
        UI->>UI: Replace tempId with realId, clear isPending
        Note over UI: Remove loading overlay, card becomes interactive
    else Failure / Network Drop
        Edge-->>Service: Error / Timeout
        Service-->>UI: Reject error
        UI->>UI: Evict tempId from roster
        Note over UI: Remove card and show error toast notification
    end
```

---

## 4. Optimistic Mutations & Hybrid Upload Progress (Plan 12)

1. **Closure-Safe Concurrent Mutations (`classItemRef` in `StudentRegister.tsx`)**:
   - All background mutations (`handleAddStudent`, `handleSaveEvaluation`, `handleUpdateStudentDetails`, `handleDeleteStudent`) read and mutate `classItemRef.current`, capturing a pre-mutation snapshot (`previousClassSnapshot`) so concurrent saves never overwrite each other and automatically roll back on failure.
2. **0ms Optimistic Attendance Batch Logging (`AttendanceManagerModal.tsx`)**:
   - `handleSaveAttendance` immediately calculates updated student attendance histories and rates in memory, calls `onUpdateStudents(updatedStudents)` and `onClose()` in `0ms`, and runs `studentService.bulkLogAttendance` in the background with snapshot rollback on failure.
3. **Hybrid Submission Upload (`StudentSubmissionUploadModal.tsx`)**:
   - **Text/URL Submissions**: Dismiss the modal in `0ms`, emit a synthetic `StudentSubmission` to update the roster immediately, and persist in the background.
   - **Binary File Uploads (`file !== null`)**: Lock modal dismissal (`!isSubmitting`) and render an in-modal Blocking Progress Bar Overlay (`15% → 92% → 100%`) with formatted file size (`MB`/`KB`) and a wait warning until Supabase Storage receives the file bytes.

