# Student Invitation Function — `supabase/functions/invite-student/`

This directory contains the Edge Function for enrolling students into classes and generating secure invitation tokens.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/invite-student/index.ts): Deno serverless function entrypoint that handles `OPTIONS` CORS preflight, verifies that the caller owns the specified class, registers or matches the student in `students`, inserts a membership link in `class_students`, and dispatches a branded student onboarding invitation email via Resend with the sender `signup@teach.glipse.tech` and explicitly non-repliable headers (`Reply-To: no-reply@teach.glipse.tech`, `Auto-Submitted: auto-generated`).

---

## 💡 Role in the Application

Facilitates secure student onboarding and roster enrollment, ensuring that only verified class instructors can enroll students or issue invitations. Onboarding invitations are sent from `signup@teach.glipse.tech` with non-repliable metadata to prevent unmonitored mailbox replies.

For enrollment flows, payload schemas, and security checks, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/invite-student/code.ARCH.md).
