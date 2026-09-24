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
1. **0ms Optimistic Insertion**:
   - UI creates a temporary `Announcement` (`id: "temp-ann-" + Date.now()`, `isPending: true`), prepends it to `announcements` with a `"Publishing..."` badge, and clears the composer inputs in `0ms`.
2. **Background Database Persistence**:
   - UI calls [`announcementService.createAnnouncement()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/announcementService.ts) in the background (`INSERT INTO public.announcements`).
   - Replaces `temp-ann-*` with the persisted row (`isPending: false`).
3. **Background Email Broadcast**:
   - If `notify_parents` is true, calls `notificationService.notifyAnnouncement({ announcement_id, class_id, notify_parents })` in the background.
4. **Snapshot Rollback & Draft Restoration**:
   - If `createAnnouncement` fails, evicts `temp-ann-*` and restores `newAnnouncementTitle`, `newAnnouncementContent`, and `isAnnouncementPinned` to the composer.

### 4. Conclusion & Re-render
- New announcement item renders in `0ms` and transitions from `"Publishing..."` to active once persisted.
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
1. **0ms Optimistic Removal**:
   - Captures `previousAnnouncements = announcements` and immediately filters `announcementId` out of the local feed (`0ms`).
2. **Background Deletion & Rollback**:
   - UI calls [`announcementService.deleteAnnouncement(id)`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/announcementService.ts) (`DELETE FROM public.announcements WHERE id = :announcementId`).
   - If the deletion fails, restores `previousAnnouncements` and shows an error toast.

### 4. Conclusion & Re-render
- Announcement is removed in `0ms` with automatic snapshot restoration on error.

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
