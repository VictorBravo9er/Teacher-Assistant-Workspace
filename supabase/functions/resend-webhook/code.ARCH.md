# Resend Webhook Architecture

This document details the webhook reception pipeline, delivery status transitions, and dead-letter alert mechanics for `supabase/functions/resend-webhook/`.

---

## 1. Webhook Lifecycle

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Webhook["POST /functions/v1/resend-webhook (from Resend)"] --> CORS{"Is OPTIONS?"}
    CORS -- Yes --> Ret200["Return 200 OK"]
    CORS -- No --> Extract["Extract event type & resend_email_id"]
    
    Extract --> SwitchType{"Event Type"}
    
    SwitchType -- "email.delivered" --> MarkDelivered["Update notification_logs status='delivered'"]
    SwitchType -- "email.bounced / failed" --> MarkBounced["Update notification_logs status='bounced', error_message"]
    SwitchType -- Other --> Ack["Return 200 { received: true }"]
    
    MarkBounced --> ResolveTeacher["Lookup class teacher email via auth.admin.getUserById()"]
    ResolveTeacher --> AlertTeacher["Dispatch alert email to teacher with failed recipient details"]
    
    MarkDelivered --> Ack
    AlertTeacher --> Ack
```

---

## 2. Interface Contracts & Status Invariants

### Webhook Event Payload:
```typescript
interface ResendWebhookPayload {
  type: 'email.delivered' | 'email.bounced' | 'email.failed' | 'email.complained';
  data: {
    id?: string;
    email_id?: string;
    bounce?: {
      message?: string;
    };
  };
}
```

### Invariants:
- **Delivery Log State Transitions**:
  - `queued` $\rightarrow$ `delivered` (on successful MTA acceptance)
  - `queued` $\rightarrow$ `bounced` (on hard/soft bounce with diagnostic error message)
- **Teacher Escalation**: Upon detecting a bounce, the system alerts the classroom owner so student/parent email addresses can be corrected in `class_students`.
