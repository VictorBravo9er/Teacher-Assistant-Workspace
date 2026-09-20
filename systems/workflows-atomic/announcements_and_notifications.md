# Atomic Workflows: Announcements & Notifications

This document details the discrete atomic operational specifications governing class announcements, multi-recipient email broadcasts, and delivery status tracking.

---

## ATOM-NOTIF-01: Post Class Announcement

### 1. Trigger
- **Event**: Teacher fills out the announcement composer in [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx) (Announcements tab) and submits the form.

### 2. Input Parameters
```typescript
interface CreateAnnouncementInput {
  classId: string;
  title: string;
  content: string;
  is_pinned?: boolean;
  notify_parents?: boolean;
}
```

### 3. Execution Pipeline
1. UI calls [`announcementService.createAnnouncement()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/announcementService.ts).
2. PostgREST executes:
   ```sql
   INSERT INTO public.announcements (class_id, author_id, title, content, is_pinned)
   VALUES (:classId, auth.uid(), :title, :content, :is_pinned)
   RETURNING *;
   ```
3. If `notify_parents` is true, calls `notificationService.notifyAnnouncement({ announcement_id, class_id, notify_parents })`.
4. Edge Function `notify-announcement` dispatches email batch via Resend API and records initial logs with `status = 'queued'`.

### 4. Conclusion & Re-render
- New announcement item prepends to the local `announcements` list.
- Success toast confirms posting and email queue status.

---

## ATOM-NOTIF-02: Delete Class Announcement

### 1. Trigger
- **Event**: Teacher clicks the trash icon on an announcement card in [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx).

### 2. Input Parameters
```typescript
interface DeleteAnnouncementInput {
  announcementId: string;
}
```

### 3. Execution Pipeline
1. UI calls [`announcementService.deleteAnnouncement(id)`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/announcementService.ts).
2. PostgREST executes:
   ```sql
   DELETE FROM public.announcements WHERE id = :announcementId;
   ```
   *(Cascades to any related entries in `notification_logs` via `ON DELETE CASCADE`)*.

### 4. Conclusion & Re-render
- Announcement is removed from active state feed and database.
- Toast confirms `"Announcement removed."`.

---

## ATOM-NOTIF-03: Dispatch Material Published/Updated Email Alert

### 1. Trigger
- **Event**: Material is published or its due date is updated by a teacher.

### 2. Input Parameters
```typescript
interface NotifyMaterialInput {
  material_id: string;
  class_id: string;
  event_type: 'published' | 'updated';
  notify_parents?: boolean;
}
```

### 3. Execution Pipeline
1. Frontend calls [`notificationService.notifyMaterial()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/notificationService.ts).
2. Edge Function `notify-material` fetches material metadata, compiles recipient list from `public.class_students`, and posts to `https://api.resend.com/emails/batch`.
3. Inserts records into `public.notification_logs` with `notification_type = 'material_published' | 'material_updated'`.

### 4. Conclusion
- Batch queued in Resend; students receive personalized notification emails.

---

## ATOM-NOTIF-04: Process Resend Inbound Delivery Webhook

### 1. Trigger
- **Event**: Resend sends an HTTP POST event to `/functions/v1/resend-webhook`.

### 2. Execution Pipeline
1. Extracts `resend_email_id` and event `type`.
2. On `email.delivered`:
   ```sql
   UPDATE public.notification_logs
   SET status = 'delivered', updated_at = now()
   WHERE resend_email_id = :resendEmailId;
   ```
3. On `email.bounced` or `email.failed`:
   - Updates `status = 'bounced'` and captures bounce error message.
   - Queries class instructor's email via `auth.admin.getUserById()`.
   - Sends an automated alert email to the instructor.

### 3. Conclusion
- Delivery dashboard accuracy maintained and teacher immediately alerted of invalid contacts.
