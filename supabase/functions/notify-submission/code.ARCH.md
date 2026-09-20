# Notify Submission Architecture

This document details the teacher alert pipeline, authorization model, and delivery tracking for `supabase/functions/notify-submission/`.

---

## 1. Submission Notification Pipeline

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Req["POST /functions/v1/notify-submission"] --> CORS{"Is OPTIONS?"}
    CORS -- Yes --> Ret200["Return 200 OK"]
    CORS -- No --> AuthCheck{"Has Authorization Header?"}
    
    AuthCheck -- No --> Err401["Return 401 Unauthorized"]
    AuthCheck -- Yes --> Parse["Parse submission_id, class_id"]
    
    Parse --> FetchSub["Fetch student_submissions and material name"]
    FetchSub --> FetchClass["Fetch class details and teacher user_id"]
    
    FetchClass --> FetchTeacher["Lookup teacher email via auth.admin.getUserById(user_id)"]
    FetchTeacher --> SendResend{"Is RESEND_API_KEY set?"}
    
    SendResend -- Yes --> PostEmail["POST api.resend.com/emails"]
    SendResend -- No --> LogAudit
    
    PostEmail --> LogAudit["Insert into public.notification_logs (status='queued', recipient_type='teacher')"]
    LogAudit --> Done["Return 200 OK"]
```

---

## 2. Interface Contracts & Invariants

### Invocation Payload:
```typescript
interface NotifySubmissionPayload {
  submission_id: string;
  class_id: string;
}
```

### Security & Invariants:
- **Teacher Email Resolution**: Teacher email is retrieved using `adminSupabase.auth.admin.getUserById(classItem.user_id)`, keeping teacher emails private from student clients.
- **Audit Entity**: Written with `notification_type = 'submission_turned_in'`, linking `submission_id`, `class_id`, and `material_id`.
