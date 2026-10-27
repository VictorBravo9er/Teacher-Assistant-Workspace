# Student Portal Workflows & Self-Service Operations

This document details the end-to-end user journeys for students accessing the platform via the dedicated **Student Portal** (`frontend/src/views/StudentApp.tsx`), including course navigation, learning resource consumption, assignment turn-in, and account security.

---

## 1. Workflow: Student Course Navigation & Dashboard Overview

When an authenticated user has `role === 'student'`, the top-level router (`App.tsx`) renders [`StudentApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/StudentApp.tsx) instead of the educator workspace.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant App as App.tsx / StudentApp.tsx
    participant Svc as studentPortalService
    participant AnnSvc as announcementService
    participant DB as PostgreSQL (public)

    Student->>App: Logs in or loads portal route
    App->>Svc: fetchEnrolledClasses()
    Svc->>DB: Query public.class_students JOIN classes WHERE student_id = auth.uid()
    DB-->>Svc: Returns list of enrolled courses
    Svc-->>App: Populates active course selector
    App->>Svc: fetchClassDetails(activeClassId)
    App->>AnnSvc: fetchAnnouncements(activeClassId)
    DB-->>App: Returns course materials, submissions, instructions, announcements
    App-->>Student: Renders course header (GPA, tier badge, instructor) & pinned alerts
```

### Execution Details:
1. **Course Selection**: The header provides an active course dropdown. Switching courses triggers a targeted fetch for the newly selected class.
2. **Pinned Announcement Alerts**: Pinned announcements from `public.announcements` display prominently in a banner above the tab views.
3. **5 Navigation Tabs**:
   - `assignments`: Actionable assignments with due dates, max points, and submission statuses (`Assigned`, `Submitted`, `Evaluated`, `Graded`).
   - `coursework`: Reading materials, syllabus notes, and reference files.
   - `announcements`: Course-wide bulletin board notices.
   - `calendar`: Monthly schedule aggregating deadlines, class dates, and announcements.
   - `grades`: Comprehensive history of scored submissions, rubrics, and instructor feedback.

---

## 2. Workflow: Student Assignment Turn-In (Files, URLs, Text)

Students can submit their completed work directly from the `assignments` tab using [`StudentTurnInModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/student-portal/StudentTurnInModal.tsx).

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant UI as StudentTurnInModal.tsx
    participant Portal as StudentApp.tsx
    participant Svc as studentPortalService
    participant Storage as Supabase Storage (student-submissions)
    participant DB as PostgreSQL (public.student_submissions)
    participant Edge as Edge Function (notify-submission)
    actor Teacher as Course Instructor

    Student->>Portal: Clicks "Turn In" on pending assignment
    Portal->>UI: Opens StudentTurnInModal(material, existingSubmission)
    Student->>UI: Selects mode: File Upload, Web URL, or Written Text
    alt File Upload
        Student->>UI: Chooses document / image (PDF, DOCX, PNG)
        UI->>UI: Shows asymptotic upload progress bar (15% -> 92% -> 100%)
        UI->>Storage: Uploads to student-submissions/{material_id}/{content_id}
    else Web URL / Text
        Student->>UI: Pastes link or enters plaintext answer
    end
    Student->>UI: Clicks "Submit Assignment"
    UI->>Svc: submitAssignment(classId, studentId, materialId, contentArray)
    Svc->>DB: Upserts public.student_submissions (status='Submitted', submitted_at=now())
    Svc-->>UI: Returns updated StudentSubmission
    UI->>Portal: Invokes onSubmitted(newSubmission)
    Portal->>Portal: 0ms optimistic state merge: updates local submission badge to "Submitted"
    UI-->>Student: Closes modal with success toast
    Svc->>Edge: Background POST /notify-submission
    Edge->>Teacher: Dispatches email alert to instructor inbox
```

### Execution Details:
1. **Multi-Mode Submission**: Supports physical files (PDF, DOCX, PPTX, TXT, images up to 50MB), external URLs (Google Docs, GitHub, Canva), or native written text responses without synthetic URI prefixes.
2. **Instant UI Reflection (`0ms`)**: `onSubmitted(newSub)` merges the newly submitted record immediately into local React state, reflecting the `"Submitted"` badge without triggering a full multi-table reload.
3. **Blocking Progress for Binary Blobs**: When uploading physical files, `LoadingOverlay` prevents backdrop dismissal and displays an explicit warning until bytes are fully stored in the `student-submissions` bucket.

---

## 3. Workflow: Coursework Viewing & Signed Material Downloads

Students browse syllabus materials and reference documents from the `coursework` tab.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant UI as StudentApp.tsx
    participant Preview as MaterialPreviewModal.tsx
    participant Edge as Edge Function (get-material-url)
    participant Storage as Supabase Storage (class-materials)

    Student->>UI: Clicks "Preview" or "Download" on course resource
    alt Direct File in Private Storage
        UI->>Edge: POST /functions/v1/get-material-url { class_id, material_id, content_item_id }
        Edge->>Edge: Verifies student enrollment in class_students
        Edge->>Storage: Generates 60-minute signed URL
        Edge-->>UI: Returns signed download URL
        UI->>Preview: Opens in-app document viewer or triggers browser download
    else External URL
        UI-->>Student: Opens resource link in a secure external tab
    end
```

---

## 4. Workflow: Student Password & Security Setup

When students are invited to a course via email or magic link, they configure and rotate their account credentials via [`StudentPasswordModal`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/StudentApp.tsx).

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant UI as StudentPasswordModal
    participant Supa as Supabase Auth (supabase.auth.updateUser)

    Student->>UI: Clicks "Change Password" in student profile dropdown
    Student->>UI: Enters new password & confirmation
    Student->>UI: Clicks "Update Password"
    UI->>UI: Shows indeterminate encryption progress bar & disables inputs
    UI->>Supa: supabase.auth.updateUser({ password: newPassword })
    alt Success
        Supa-->>UI: Session credentials rotated successfully
        UI-->>Student: Closes modal and displays success toast
    else Failure
        Supa-->>UI: Returns AuthError (e.g., weak password, expired session)
        UI-->>Student: Displays inline error message and re-enables inputs
    end
```

---

## 5. Workflow: Student Grade & Performance Review

Students inspect their academic standing, cumulative letter grade, assignment-specific scores, and qualitative instructor feedback via the `grades` sub-tab in [`StudentApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/StudentApp.tsx).

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant Portal as StudentApp (Tab: grades)
    participant Svc as studentPortalService
    participant DB as PostgreSQL (public)

    Student->>Portal: Clicks "Grades" tab in course navigation
    Portal->>Portal: Reads activeClass state (currentScore, currentGrade, generalFeedback)
    Portal->>Portal: Reads submissions state (scores, rubric feedback, status)
    Portal-->>Student: Renders Cumulative Score metric card (e.g., "88%")
    Portal-->>Student: Renders Letter Grade metric card (e.g., "B+") & attendance stat
    Portal-->>Student: Displays Instructor Remarks & Portfolio Feedback
    Portal-->>Student: Displays Graded Work scoreboard (itemized scores & rubric comments)
```

### Invariants:
1. **RLS Isolation**: Grade statistics and submission scores are strictly scoped to the student's own `student_id` in `class_students` and `student_submissions`.
2. **Real-Time Consistency**: When new submissions are evaluated by AI or updated by instructors, active class data is refreshed via `studentPortalService.fetchClassDetails(classId)`.

