# Trigger Material Analysis Architecture

This document details the analysis pipeline, content merging, and backend orchestration for `supabase/functions/trigger-material-analysis/`.

---

## 1. Material Analysis Pipeline

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Req["DB Trigger / REST POST"] --> CORS{"OPTIONS Preflight?"}
    CORS -- Yes --> OK200["Return 200 OK"]
    CORS -- No --> Auth["verifyCallerAuth()"]
    
    Auth -- Unauthorized --> Err401["Return 401 Unauthorized"]
    Auth -- Authorized --> FetchMat["Fetch material by material_id"]
    
    FetchMat --> CheckCustom{"Is class_id provided?"}
    CheckCustom -- Yes --> MergeCustom["Fetch & merge custom_content and custom_rubric_criteria from class_materials"]
    CheckCustom -- No --> SkipCustom["Use canonical material content"]
    
    MergeCustom --> Extract["Extract document text (Storage PDF/DOCX or text://)"]
    SkipCustom --> Extract
    
    Extract --> MarkProc["Set ai.material_insights to 'processing'"]
    MarkProc --> CallBE["POST ${BACKEND_API_URL}/api/materials/analyze"]
    
    CallBE -- Success --> SaveInsights["Persist syllabus alignment, prerequisite gaps, and sample questions in ai.material_insights"]
    CallBE -- Failure --> MarkErr["Update ai.material_insights status='error'"]
    SaveInsights --> Return200["Return 200 OK ({ status: 'analyzed' })"]
    MarkErr --> ReturnErr["Return 502 / 500 Structured Error"]
```

---

## 2. Interface Contracts & Invariants

### Invocation Payload:
```typescript
interface MaterialAnalysisTriggerPayload {
  material_id: string;
  class_id?: string;
}
```

### Backend Forwarding Payload (`POST /api/materials/analyze`):
```typescript
interface BackendMaterialAnalyzePayload {
  material_text: string;
  material_name: string;
  category: string;
  tags?: string[];
  rubric_criteria?: Array<any>;
}
```

### Invariants:
- **Class-Scoped Customization Preservation**: If invoked with a `class_id`, class-private content overlays and modified rubric criteria are merged into the payload without mutating the canonical template material.
- **Asynchronous Safe Return**: Failures during LLM analysis preserve existing insights and flag `status = 'error'` with descriptive error logs.
