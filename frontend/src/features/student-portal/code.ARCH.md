# Student Portal Feature Architecture

This document describes the component data flow and storage integration for student self-submission in `frontend/src/features/student-portal/`.

---

## 1. Submission Flow Architecture

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Student["Enrolled Student (StudentApp.tsx)"] --> Click["Click 'Turn In' / 'Resubmit'"]
    Click --> Modal["StudentTurnInModal.tsx"]
    Modal --> Choice{"Submission Mode"}
    Choice -- File Attachment --> Storage["Upload to storage: student-submissions/{materialId}/{contentItemId}"]
    Choice -- Written Response --> Payload["Native Text JSON (type: 'Text', path: '')"]
    Storage --> Service["studentPortalService.submitAssignment"]
    Payload --> Service
    Service --> DB["Upsert public.student_submissions (status: 'Submitted')"]
    Service -. Best Effort .-> Notify["Supabase Edge Function: notify-submission"]
```

---

## 2. Invariants

- **Storage Paths**: Files are uploaded to `student-submissions/{material_id}/{content_item_id}`.
- **Text Shape**: Clean `type: 'Text'`, `path: ''`, text in `value` field. No `text://` synthetic prefixes.
- **Row-Level Security**: Inserts and updates restricted to the authenticated student where `student_id = auth.uid()`.
