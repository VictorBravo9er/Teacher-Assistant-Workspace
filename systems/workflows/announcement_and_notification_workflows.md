# Announcement & Notification Workflows

This document outlines the end-to-end lifecycles for class announcements, broadcast email notifications via Resend, and asynchronous delivery tracking in the Teach&Learn platform.

---

## 1. Class Announcement Creation & Multi-Recipient Notification Flow

### User Journey:
1. Teacher navigates to the **Announcements** tab in `ClassDetails.tsx`.
2. Teacher fills in the title, body content, and chooses whether to pin the announcement or broadcast email notifications to students and parents (`notify_parents`).
3. **0ms Optimistic Feed Insertion**: On submission, a temporary `Announcement` card (`temp-ann-<timestamp>`, `isPending: true`, displaying an animated `"Publishing..."` badge) is immediately prepended to the local `announcements` feed and the composer inputs are cleared in `0ms`.
4. **Background Persistence & Broadcast**: `announcementService.createAnnouncement()` inserts the row into `public.announcements` in the background. Once resolved, the temporary card is replaced with the persisted row (`isPending: false`). If `notify_parents` is enabled, `notificationService.notifyAnnouncement()` triggers the `notify-announcement` Edge Function in the background.
5. **Snapshot Rollback & Draft Restoration**: If the database insert fails, the temporary card is evicted and the teacher's `newAnnouncementTitle`, `newAnnouncementContent`, and `isAnnouncementPinned` states are automatically restored so no work is lost.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as React Frontend (ClassDetails.tsx)
    participant AnnService as announcementService.ts
    participant NotifyService as notificationService.ts
    participant DB as PostgreSQL (public)
    participant Edge as Edge Function (notify-announcement)
    participant Resend as Resend Email Gateway

    Teacher->>UI: Types title, content & clicks "Post Announcement"
    UI->>UI: Prepends temp-ann-* (isPending: true, "Publishing...") & clears composer (0ms)
    UI->>AnnService: Background createAnnouncement(classId, { title, content, is_pinned })
    AnnService->>DB: INSERT INTO public.announcements
    alt Insert Succeeds
        DB-->>AnnService: Returns created Announcement row
        AnnService-->>UI: Replaces temp-ann-* with real Announcement (clears isPending)
        opt If Notifications Enabled
            UI->>NotifyService: Background notifyAnnouncement({ announcement_id, class_id, notify_parents })
            NotifyService->>Edge: POST /functions/v1/notify-announcement
            Edge->>DB: SELECT students, parent_contact FROM class_students
            Edge->>Resend: POST https://api.resend.com/emails/batch (max 100)
            Resend-->>Edge: Returns batch IDs
            Edge->>DB: INSERT INTO public.notification_logs (status='queued', resend_email_id)
            Edge-->>NotifyService: Returns { success: true, count }
            NotifyService-->>UI: Triggers success toast
        end
    else Insert Fails
        AnnService-->>UI: Rejects error
        UI->>UI: Evicts temp-ann-* & restores draft title/content to composer
        UI-->>Teacher: Displays error toast
    end
```

---

## 2. Material Publishing & Update Notification Flow

### User Journey:
1. Teacher adds a new assignment or updates the due date of existing coursework in `ClassDetails.tsx`.
2. When the material is published or updated, `notificationService.notifyMaterial()` is triggered with `event_type = 'published'` or `'updated'`.
3. The `notify-material` Edge Function retrieves material details (`due_at`, `max_score`) and class roster emails.
4. An HTML email highlighting assignment due dates and submission requirements is queued through Resend.
5. Delivery audit logs are stored in `public.notification_logs` (`notification_type = 'material_published' | 'material_updated'`).

---

## 3. Student Turn-In Alert Flow

### User Journey:
1. Student submits completed assignment files via `StudentTurnInModal.tsx` in the Student Portal.
2. `studentPortalService.submitAssignment()` creates the `student_submissions` row.
3. The client calls `notificationService.notifySubmission({ submission_id, class_id })`.
4. The `notify-submission` Edge Function resolves the class instructor's email via `auth.admin.getUserById()`.
5. An alert email is dispatched to the instructor's inbox detailing the student name, material, and submission timestamp.
6. The event is recorded in `public.notification_logs` with `notification_type = 'submission_turned_in'`.

---

## 4. Webhook Status Tracking & Bounce Escalation Flow

### User Journey:
1. Mail Transport Agents (MTAs) process the email and send webhook callbacks to `/functions/v1/resend-webhook`.
2. For delivered emails (`type = 'email.delivered'`), `notification_logs` is updated to `status = 'delivered'`.
3. For hard or soft bounces (`type = 'email.bounced' | 'email.failed'`), `notification_logs` is updated to `status = 'bounced'` with the bounce error reason.
4. The Edge Function looks up the class teacher's email address and immediately dispatches an automated alert with the recipient's name, email, and bounce reason so the teacher can correct roster records.
