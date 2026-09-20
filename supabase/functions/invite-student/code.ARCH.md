# Student Invitation Architecture & Roster Enrollment

This document details the student invitation workflow, permission checks, and enrollment mutations in `supabase/functions/invite-student/`.

---

## 1. Invitation & Enrollment Flow

```mermaid
sequenceDiagram
    autonumber
    participant Teacher as Instructor
    participant EdgeFunc as invite-student (index.ts)
    participant Auth as auth.ts (verifyUser)
    participant DB as Postgres (students / class_students)

    Teacher->>EdgeFunc: POST /functions/v1/invite-student { class_id, email, name, roll_number }
    EdgeFunc->>Auth: Extract caller user_id
    EdgeFunc->>DB: Verify caller is owner of class_id
    alt Not Class Owner
        EdgeFunc-->>Teacher: 403 Forbidden { error: "Only class owner can invite students" }
    else Owner Verified
        EdgeFunc->>DB: Upsert student record by email
        EdgeFunc->>DB: Insert class_students link
        EdgeFunc->>EdgeFunc: Generate invite link (generateLink / inviteUserByEmail)
        EdgeFunc->>EdgeFunc: Dispatch invite email via Resend (from: signup@teach.glipse.tech, non-repliable)
        EdgeFunc-->>Teacher: 200 OK { success: true, student_id, invite_url }
    end
```

---

## 2. Invariants & Multi-Tenant Boundaries

1. **Idempotent Student Upserts**:
   If a student with the provided email already exists globally under the teacher's profile, the existing record is reused and linked to the new class via `class_students`.
2. **Owner-Only Enforcement**:
   Enforces strict teacher-class ownership validation before any record creation or enrollment mutation occurs.
3. **Sender & Non-Repliable Routing**:
   Student invitations are dispatched from `signup@teach.glipse.tech` (override via `STUDENT_INVITE_FROM_EMAIL`). The email is explicitly configured as non-repliable:
   - `reply_to` payload attribute: `no-reply@teach.glipse.tech` (override via `STUDENT_INVITE_REPLY_TO`).
   - Standard non-response headers: `Reply-To: no-reply@teach.glipse.tech`, `Auto-Submitted: auto-generated`, `X-Auto-Response-Suppress: All`.
   - Branded footer explicitly notifying the recipient that replies cannot be monitored.
