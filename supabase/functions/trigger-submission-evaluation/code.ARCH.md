# Trigger Submission Evaluation Architecture

This document details the event-driven submission grading pipeline, request contracts, and backend AI integration for `supabase/functions/trigger-submission-evaluation/`.

---

## 1. Event Pipeline & Sequence

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Trigger["DB Trigger / pg_net / REST POST"] --> CORS{"OPTIONS Preflight?"}
    CORS -- Yes --> OK200["Return 200 OK"]
    CORS -- No --> Auth["verifyCallerAuth()"]
    
    Auth -- Unauthorized --> Err401["Return 401 Unauthorized"]
    Auth -- Authorized --> FetchSub["Fetch student_submissions row"]
    
    FetchSub --> FetchRubric["Fetch rubric_criteria from materials"]
    FetchRubric --> Extract["Extract plaintext (Storage blob or text://)"]
    Extract --> MarkProc["Update ai.submission_evaluations to 'processing'"]
    MarkProc --> CallBE["POST ${BACKEND_API_URL}/api/grade"]
    
    CallBE -- Success --> UpdateDB["Update score & grade in public.student_submissions<br/>Record full breakdown in ai.submission_evaluations"]
    CallBE -- Failure --> MarkErr["Update ai.submission_evaluations status='error'"]
    UpdateDB --> Done["Return 200 OK ({ status: 'evaluated' })"]
    MarkErr --> DoneErr["Return 502 / 500 Structured Error"]
```

---

## 2. Interface Contracts & Invariants

### Invocation Payload:
```typescript
interface SubmissionEvaluationTriggerPayload {
  submission_id: string;
  class_id?: string;
  material_id?: string;
  student_id?: string;
}
```

### Backend Forwarding Payload (`POST /api/grade`):
```typescript
interface BackendGradePayload {
  submission_text: string;
  material_title: string;
  max_score: number;
  rubric_criteria: Array<{
    id: string;
    name: string;
    description: string;
    max_score: number;
    weight: number;
  }>;
}
```

### Security & Invariants:
- **Authorization Verification**: Calls `verifyCallerAuth(req, class_id)` supporting both database webhooks (service role) and teacher-triggered manual re-grading.
- **Transactional Score Synchronization**: Database trigger `trg_sync_student_scores` automatically fires upon updating `student_submissions.score`, updating composite gradebook standings.
