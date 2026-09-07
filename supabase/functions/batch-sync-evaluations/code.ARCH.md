# Batch Sync Evaluations Architecture

This document details the batch processing architecture, validation contracts, and database updates for `supabase/functions/batch-sync-evaluations/`.

---

## 1. Batch Synchronization Pipeline

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Req["POST /functions/v1/batch-sync-evaluations"] --> CORS{"Is OPTIONS?"}
    CORS -- Yes --> Return200["Return 200 OK (CORS Headers)"]
    CORS -- No --> Auth["auth.ts: verifyUser(token)"]
    
    Auth -- "Valid Teacher" --> Parse["Parse evaluations array"]
    Auth -- "Invalid / Missing" --> Err401["Return 401 Unauthorized"]
    
    Parse --> Validate["Validate score ranges & rubric JSON"]
    Validate --> Upsert["Bulk upsert student_submissions using supabaseAdmin"]
    Upsert --> ReturnSuccess["Return 200 OK ({ updatedCount, results })"]
    Upsert -- Failure --> ReturnErr["Catch error & return 500 Internal Error"]
```

---

## 2. Interface Contracts & Data Invariants

### Request Payload Schema:
```typescript
interface BatchEvaluationPayload {
  class_id: string;
  evaluations: Array<{
    submission_id: string;
    score: number;
    rubric_breakdown: Record<string, number>;
    feedback?: string;
    private_teacher_notes?: string;
    status: 'Evaluated' | 'Graded';
  }>;
}
```

### Security & Invariants:
- Uses `supabaseAdmin` client to commit verified evaluations.
- Verifies that the requesting teacher is the authorized owner of the associated `class_id` before committing updates to prevent unauthorized cross-tenant modifications.
