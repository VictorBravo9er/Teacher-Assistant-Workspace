# Notify Material Architecture

This document details the recipient fan-out, event verb differentiation, and dispatch pipeline for `supabase/functions/notify-material/`.

---

## 1. Material Notification Sequence

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Req["POST /functions/v1/notify-material"] --> CORS{"Is OPTIONS?"}
    CORS -- Yes --> Ret200["Return 200 OK"]
    CORS -- No --> AuthCheck{"Has Authorization Header?"}
    
    AuthCheck -- No --> Err401["Return 401 Unauthorized"]
    AuthCheck -- Yes --> Parse["Parse material_id, class_id, event_type ('published' | 'updated')"]
    
    Parse --> FetchMat["Fetch material details (name, category, due_at, max_score)"]
    FetchMat --> FetchRoster["Fetch enrolled students from class_students"]
    
    FetchRoster --> FormatEmails["Format HTML templates highlighting due dates & points"]
    FormatEmails --> ResendCheck{"Is RESEND_API_KEY configured?"}
    
    ResendCheck -- Yes --> BatchPost["POST api.resend.com/emails/batch"]
    ResendCheck -- No --> LogAudit["Log audit entries to notification_logs"]
    
    BatchPost --> Correlate["Correlate returned IDs with logEntries"]
    Correlate --> LogAudit
    LogAudit --> Done["Return 200 OK ({ count, message })"]
```

---

## 2. Interface Contracts & Invariants

### Invocation Payload:
```typescript
interface NotifyMaterialPayload {
  material_id: string;
  class_id: string;
  event_type?: 'published' | 'updated';
  notify_parents?: boolean;
}
```

### Invariants:
- **Event Verb Customization**: Adjusts subject line and email headers between `"New"` vs `"Updated"` based on `event_type`.
- **Due Date Visibility**: When `due_at` is set, dates are formatted to ensure clear deadline visibility for students.
- **Audit Logging**: Every recipient generates a row in `public.notification_logs` with `notification_type` set to `'material_published'` or `'material_updated'`.
- **Teacher Reply-To Routing**: Automatically sets `reply_to` to the instructor's verified email address (retrieved from `auth.admin.getUserById(classItem.user_id)`), ensuring student queries on coursework route straight to the instructor.
