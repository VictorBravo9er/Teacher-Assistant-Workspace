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

    Student->>UI: Selects file (PDF/Doc) or writes text/URL for an assigned material
    Student->>UI: Clicks "Turn In Assignment"
    alt Text or URL Response (No Binary File)
        UI-->>Student: Dismisses modal in 0ms & merges optimistic "Submitted" state in StudentApp.tsx
        UI->>Svc: Background submitAssignment(...)
        Svc->>DB: UPSERT public.student_submissions (status='Submitted')
    else Binary File Attached (file !== null)
        UI->>UI: Locks modal dismissal (!isSubmitting) & renders animated progress bar (15% → 92% → 100%) with file size
        UI->>Svc: submitAssignment(classId, studentId, materialId, file, textContent)
        Svc->>Storage: upload("/{material_id}/{content_item_id}", fileBlob)
        Storage-->>Svc: Upload confirmed (storagePath saved)
        Svc->>DB: UPSERT public.student_submissions (status='Submitted')
        DB-->>Svc: Submission confirmed
        Svc-->>UI: Resolves submission record
        UI-->>Student: Merges newSub directly into StudentApp.tsx submissions state (no 4-query reload) & closes modal
    end
```

### Step-by-Step Execution Details:

1. **Multi-Channel User Initiation (`0ms` Optimistic vs. Blocking Progress Bar)**:
   - In [`StudentTurnInModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/student-portal/StudentTurnInModal.tsx) or [`StudentSubmissionUploadModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentSubmissionUploadModal.tsx), students or teachers submit work via three channels:
     - **Binary File Attachment (`type: 'File'`)**: Uploaded to private storage bucket `student-submissions/{material_id}/{content_item_id}`. Modal locks dismissal and renders a blocking progress bar overlay (`15% → 92% → 100%`) with formatted file size (`MB`/`KB`) and wait warning until upload finishes.
     - **Web Resource URL (`type: 'URL'`)**: External URL (e.g. Google Docs, GitHub, Figma) recorded directly in `path: url`. Closes modal in `0ms` and persists in background.
     - **Native Written Response (`type: 'Text'`)**: Inline text submitted with `path: ''` and response body in `value`. Closes modal in `0ms` and persists in background.
   - All three submission forms strictly satisfy the PostgreSQL `valid_content_shape` trigger (`validate_content_array`).
2. **Instant State Reflection in `StudentApp.tsx`**:
   - Instead of re-running the 4-query `loadClassData()` waterfall, `StudentApp.tsx` immediately merges `newSub` into local `submissions` state upon `onSubmitted(newSub)`.
3. **Database State Transition & Review Support**:
   - The submission is recorded in `public.student_submissions` with `status = 'Submitted'`, triggering `trg_sync_student_scores`.
   - In [`SubmissionGradingModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/SubmissionGradingModal.tsx), educators can review files (via signed URL download), web URLs (opening external link directly), and text submissions (displaying formatted text content) without errors or pseudo-scheme anomalies.

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

    DB-.->Edge: Planned pg_net webhook (`trg_submission_ai_eval` commented out in SQL)
    Edge->>Storage: Downloads submission document & UTF-8 decodes text
    Edge->>DB: UPSERT INTO ai.submission_evaluations (submission_id, status='processing')
    
    Edge->>BE: POST /api/grade (submission_id, material_name, submission_text, rubric_criteria, max_score)
    BE->>LLM: Evaluates work per criterion, drafts feedback & private teacher notes
    LLM-->>BE: Returns structured GradeResponse JSON
    
    BE->>DB: Stores full evaluation in ai.submission_evaluations, updates mastery & proposed misconceptions
    BE-->>Edge: Returns GradeResponse
```

### Step-by-Step Execution Details:

1. **Webhook Event Dispatch *(Currently Commented Out in SQL)***:
   - `20260915120100_ai_functions_and_triggers.sql` defines `trg_submission_ai_eval` (currently commented out) to invoke [`trigger-submission-evaluation`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-submission-evaluation) via `net.http_post`.
2. **Text Extraction & State Recording**:
   - When invoked, the Edge Function retrieves `"File"` blobs from `student-submissions` (UTF-8 `TextDecoder`) or legacy `"text://"` paths (native `"Text"` `item.value` extraction is not yet implemented here), and records `status = 'processing'` in `ai.submission_evaluations`.
3. **Backend Evaluator Invocation**:
   - The Edge Function invokes Backend `POST /api/grade`.
   - The Backend's [`EvaluatorService`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/evaluator.py) constructs a rubric-aligned prompt for OpenRouter (e.g. Gemini 2.5 Flash).
4. **Evaluation Ingestion**:
   - The LLM produces criterion-level scores, student feedback, private teacher notes, and detected misconceptions.
   - `EvaluatorService` persists the completed record into `ai.submission_evaluations` (`status = 'completed'`); `public.student_submissions` awaits teacher review/publishing rather than being overwritten automatically.

---

## 3. Workflow: Teacher Grade Review, AI Diagnostic Diff & Final Publication

Teachers retain full pedagogical authority. They can inspect submission content, run the diagnostic diff modal, adjust criterion scores, and publish the final grade.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as GradebookMatrix.tsx / SubmissionGradingModal.tsx
    participant DiffModal as AIDiagnosticDiffModal.tsx
    participant Hook as useClassOperations
    participant Svc as studentService
    participant DB as PostgreSQL (public & ai)

    Teacher->>UI: Opens SubmissionGradingModal & clicks "Diagnose with AI"
    Note over UI,DB: Currently runs local heuristic stub (get_submission_ai_diagnostic RPC wiring pending)
    
    UI->>DiffModal: Opens AI Diagnostic Diff Modal
    DiffModal-->>Teacher: Displays side-by-side comparison: Current Score vs. Proposed Breakdown
    
    Teacher->>DiffModal: Adjusts criterion scores, toggles acceptance, applies recommendations
    Teacher->>UI: Reviews feedback/score & clicks "Save & Grade"
    
    UI->>Svc: saveGrade(...) / studentService.saveSubmissionReview(...)
    Svc->>DB: UPDATE public.student_submissions SET score = ?, feedback = ?, status = 'Graded', reviewed_at = now()
    
    Note over DB: Trigger trg_sync_student_scores fires atomically!
    DB->>DB: Recomputes class_students.current_score, current_grade, and performance_tier
    
    Svc-->>Hook: Resolves updated submission & refreshed student records
    Hook->>UI: Gradebook Matrix updates locally & in PostgreSQL
    UI-->>Teacher: Displays success confirmation toast
```

### Step-by-Step Execution Details:

1. **Gradebook & Submission Review**:
   - In [`GradebookMatrix.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/GradebookMatrix.tsx) and [`SubmissionGradingModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/SubmissionGradingModal.tsx), teachers open a student submission cell to review work and click **"Diagnose with AI"**. *(Wiring **"Diagnose with AI"** / Gradebook chips to `get_submission_ai_diagnostic()` or live `POST /api/grade` is pending; it currently synthesizes a local heuristic preview.)*
2. **Side-by-Side Diagnostic Diff**:
   - Opening [`AIDiagnosticDiffModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/AIDiagnosticDiffModal.tsx) presents the teacher with:
     - Per-criterion point allocations suggested vs. current scores with +/- delta sliders.
     - Editable constructive feedback and private diagnostic notes.
3. **Teacher Adjustments & Saving**:
   - The teacher can override any score or edit the commentary.
   - Saving persists `score`, `grade`, `rubric_breakdown`, `feedback`, `private_teacher_notes`, `reviewed_at`, and `status` to `public.student_submissions`.
4. **Atomic Grade Recalculation**:
   - The PostgreSQL trigger `trg_sync_student_scores` recalculates:
     - `current_score`: Running average percentage across scored submissions (`ROUND(AVG((score / max_score) * 100), 2)`).
     - `current_grade`: Letter grade (`A` >=88, `B` >=75, `C` >=60, `D` <60).
     - `performance_tier`: Database tier category (`High`, `Average`, `At Risk`; client-side in-memory recalculation in `studentCalculations.ts` uses `High` >=90 / `Average` >=65 / `At Risk` <65).
   - All student cards, gradebook cells, and report card metrics update automatically.

---

## 4. Workflow: Dynamic Concept Mastery Tracking & Proposed Misconception Review

In addition to letter grades, student comprehension is tracked per concept in PostgreSQL, and proposed misconceptions are exposed via FastAPI endpoints (with [`GradebookMatrix.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/GradebookMatrix.tsx) UI badge wiring currently pending):

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant Matrix as GradebookMatrix.tsx (Planned UI)
    participant BE as Backend FastAPI
    participant OntoSvc as OntologyService
    participant DB as PostgreSQL ai Schema

    Note over BE,DB: 1. Dynamic Mastery Updates (during /api/grade)
    BE->>DB: UPSERT INTO ai.student_concept_mastery (student_id, class_id, concept_id, mastery_score, status)

    Note over Teacher,Matrix: 2. Reviewing Proposed Misconceptions (Backend Ready, UI Pending)
    Matrix->>BE: GET /api/misconceptions/proposed?class_id={class_id}
    BE->>OntoSvc: get_proposed_misconceptions(class_id)
    OntoSvc->>DB: SELECT * FROM ai.ontology_misconceptions WHERE status = 'proposed'
    DB-->>OntoSvc: List of proposed misconceptions
    OntoSvc-->>BE: list[OntologyMisconception]
    BE-->>Matrix: Proposed misconceptions payload
    
    Teacher->>Matrix: Clicks [Confirm] or [Dismiss] on misconception badge
    Matrix->>BE: POST /api/misconceptions/{misconception_id}/review ({ status: 'confirmed'|'dismissed', reviewer_id })
    BE->>OntoSvc: review_misconception(misconception_id, req.status, req.reviewer_id)
    OntoSvc->>DB: UPDATE ai.ontology_misconceptions SET status = req.status, ...
    DB-->>Matrix: Returns { status: "ok", misconception_id, new_status }
```

### Key Highlights:
1. **Concept Mastery Classification & EMA Target**:
   - `EvaluatorService.grade_submission()` maps proficiency into `'mastered'` ($\ge 0.85$), `'practicing'` ($0.65 - 0.84$), and `'gap_detected'` ($< 0.65$).
   - **Current vs. Target**: `OntologyService.update_student_mastery()` currently overwrites `mastery_score` on conflict; smoothed Exponential Moving Average calibration ($\text{Mastery}_{new} = 0.35 \cdot M_{s_k} + 0.65 \cdot \text{Mastery}_{prev}$) is the target calibration formula.
2. **Human-in-the-Loop Governance**:
   - Backend API endpoints (`GET /api/misconceptions/proposed`, `POST /api/misconceptions/{misconception_id}/review`) are live; educator badge review inside `GradebookMatrix.tsx` awaits frontend integration.

---

## 5. Workflow: Daily Background Consolidation & Misconception Dreaming (`POST /api/consolidation/run`)

A daily cron runner executes comprehensive background health audits across the knowledge base:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Cron["Daily Maintenance Trigger (Cron / API POST /api/consolidation/run)"] --> Svc["ConsolidationService.run_daily_consolidation()"]
    
    subgraph AntiDrift["1. Graph Drift & Integrity Audit"]
        Svc --> CheckOrphans["Detect & Prune Orphaned Concepts"]
        Svc --> CheckCycles["Traverse & Break Cyclic Prerequisites (A -> B -> A)"]
        Svc --> CheckVocabulary["Validate Relationship Enums against chk_relationship_type"]
        CheckOrphans & CheckCycles & CheckVocabulary --> LintLog["Record Findings in ai.knowledge_lint_reports"]
    end

    subgraph MisconceptionDreaming["2. Autonomous Misconception Dreaming"]
        Svc --> PullSubmissions["Fetch Evaluated Submissions across Classes"]
        PullSubmissions --> ClusterErrors["Synthesize Cross-Student Error Signatures"]
        ClusterErrors --> Synthesize["Draft New Pedagogical Misconceptions"]
        Synthesize --> InsertProposed["INSERT into ai.ontology_misconceptions (status='proposed')"]
    end

    LintLog & InsertProposed --> RunLog["Log Execution Metrics in ai.consolidation_runs"]
```
