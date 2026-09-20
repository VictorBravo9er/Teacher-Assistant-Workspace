# Student Submission, AI Grading & Gradebook Workflows

This document details the start-to-finish workflows for student assignment turn-ins, automated event-driven AI grading pipelines, side-by-side diagnostic diff reviews, and atomic gradebook score synchronization.

---

## 1. Workflow: Student Assignment Turn-in & File Upload

Students turn in completed work by uploading digital documents (PDF, Word, Code, Images) or submitting written responses.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    participant UI as StudentSubmissionUploadModal.tsx
    participant Svc as studentService
    participant Storage as Supabase Storage (student-submissions)
    participant DB as PostgreSQL (public)

    Student->>UI: Selects file (PDF/Doc) or writes text for an assigned material
    Student->>UI: Clicks "Turn In Assignment"
    UI->>Svc: submitAssignment(classId, studentId, materialId, file, textContent)
    
    opt When physical file is attached
        Svc->>Storage: upload("/{material_id}/{content_item_id}", fileBlob)
        Storage-->>Svc: Upload confirmed (storagePath saved)
    end

    Svc->>DB: INSERT INTO public.student_submissions (class_id, student_id, material_id, status='Submitted', content JSONB, submitted_at=now())
    DB-->>Svc: Submission confirmed
    Svc-->>UI: Resolves submission record
    UI-->>Student: Displays "Submitted" badge and timestamp
```

### Step-by-Step Execution Details:

1. **User Initiation**:
   - In [`StudentSubmissionUploadModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentSubmissionUploadModal.tsx), the student selects an assigned material.
   - Attaches files or enters direct markdown/plaintext solutions.
2. **Storage Blob Persist**:
   - The file is uploaded to the private `student-submissions` bucket under `/{material_id}/{content_item_id}`.
3. **Database State Transition**:
   - The submission is recorded in `public.student_submissions` with `status = 'Submitted'`.
   - The database trigger `trg_sync_student_scores` executes, ensuring the student's running gradebook state acknowledges the turn-in.

---

## 2. Workflow: Autonomous Event-Driven AI Grading Pipeline

Upon submission turn-in, the system automatically evaluates the work against the assignment's rubric criteria without blocking the student or teacher.

```mermaid
sequenceDiagram
    autonumber
    participant DB as PostgreSQL (public & ai)
    participant Edge as Edge Function (trigger-submission-evaluation)
    participant Storage as Supabase Storage
    participant BE as Backend FastAPI (/api/grade)
    participant LLM as OpenRouter LLM

    DB->>Edge: pg_net fires webhook upon INSERT/UPDATE in public.student_submissions
    Edge->>Storage: Downloads submission document & extracts text
    Edge->>DB: INSERT INTO ai.submission_evaluations (submission_id, status='processing')
    
    Edge->>BE: POST /api/grade (submission_id, material_name, submission_text, rubric_criteria, max_score)
    BE->>LLM: Evaluates work per criterion, drafts feedback & private teacher notes
    LLM-->>BE: Returns structured GradeResponse JSON
    
    BE->>DB: Stores full evaluation in ai.submission_evaluations (rubric_breakdown, private_teacher_notes, rationale, status='completed')
    BE-->>Edge: Returns GradeResponse
    
    Edge->>DB: UPDATE public.student_submissions SET status='Evaluated', score=?, feedback=?, evaluated_at=now()
    DB-->>DB: Triggers trg_sync_student_scores (atomic grade average recalculation)
```

### Step-by-Step Execution Details:

1. **Webhook Event Dispatch**:
   - PostgreSQL's `trg_submission_ai_eval` fires on submission insert/update, invoking the `net.http_post` asynchronous dispatcher to [`trigger-submission-evaluation`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-submission-evaluation).
2. **Text Extraction & State Recording**:
   - The Edge Function retrieves the document from the `student-submissions` bucket, extracts its plaintext, and records `status = 'processing'` in `ai.submission_evaluations`.
3. **Backend Evaluator Invocation**:
   - The Edge Function invokes Backend `POST /api/grade`.
   - The Backend's [`EvaluatorService`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/evaluator.py) constructs a rubric-aligned prompt for OpenRouter (e.g. Gemini 2.5 Flash).
4. **Evaluation Ingestion & Score Sync**:
   - The LLM parses criterion-level scores, student feedback, and private teacher notes.
   - The submission status in `public.student_submissions` transitions to `'Evaluated'`.

---

## 3. Workflow: Teacher Grade Review, AI Diagnostic Diff & Final Publication

Teachers retain full pedagogical authority. They can inspect the AI evaluation, review differences, adjust criterion scores, and publish the final grade.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as GradebookMatrix.tsx / SubmissionGradingModal.tsx
    participant DiffModal as AIDiagnosticDiffModal.tsx
    participant Hook as useClassOperations
    participant Svc as studentService
    participant DB as PostgreSQL (public & ai)

    Teacher->>UI: Clicks "Evaluated" badge in Gradebook Matrix
    UI->>DB: Calls RPC get_submission_ai_diagnostic(submission_id)
    DB-->>UI: Returns AI rubric breakdown, feedback draft, and private diagnostic notes
    
    Teacher->>DiffModal: Opens AI Diagnostic Diff Modal
    DiffModal-->>Teacher: Displays side-by-side comparison: Current Grade vs. AI Proposed Breakdown
    
    Teacher->>DiffModal: Adjusts criterion scores, edits feedback, approves diagnostic
    Teacher->>UI: Clicks "Publish Final Grade"
    
    UI->>Svc: gradeSubmission(submissionId, { score, feedback, status: 'Graded' })
    Svc->>DB: UPDATE public.student_submissions SET score = ?, feedback = ?, status = 'Graded', updated_at = now()
    
    Note over DB: Trigger trg_sync_student_scores fires atomically!
    DB->>DB: Recomputes class_students.current_score, current_grade, and performance_tier
    
    Svc-->>Hook: Resolves updated submission & refreshed student records
    Hook->>UI: Gradebook Matrix updates in realtime (badge becomes "Graded")
    UI-->>Teacher: Displays success confirmation toast
```

### Step-by-Step Execution Details:

1. **Gradebook Review**:
   - In [`GradebookMatrix.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/GradebookMatrix.tsx), items with pending AI evaluations display an **"Evaluated"** chip.
2. **Side-by-Side Diagnostic Diff**:
   - Opening [`AIDiagnosticDiffModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/AIDiagnosticDiffModal.tsx) presents the teacher with:
     - Student's raw submission text.
     - Per-criterion point allocations generated by the AI vs. maximum possible points.
     - Editable constructive feedback for the student.
     - Private diagnostic notes (misconceptions identified, remedial recommendations).
3. **Teacher Adjustments & Publishing**:
   - The teacher can override any score or edit the commentary.
   - Clicking **"Publish Grade"** transitions `status` to `'Graded'`.
4. **Atomic Grade Recalculation**:
   - The PostgreSQL trigger `trg_sync_student_scores` recalculates:
     - `current_score`: Running weighted percentage across all graded assignments.
     - `current_grade`: Standard letter grade (`A`, `B`, `C`, `D`).
     - `performance_tier`: Tier category (`Advanced`, `Proficient`, `Developing`, `Critical Support`).
   - All student cards, gradebook cells, and report card metrics update automatically.
