# Student Invitation Function — `supabase/functions/invite-student/`

This directory contains the Edge Function for enrolling students into classes and generating secure invitation tokens.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/invite-student/index.ts): Deno serverless function entrypoint that handles `OPTIONS` CORS preflight, verifies that the caller owns the specified class, registers or matches the student in `students`, inserts a membership link in `class_students`, and dispatches the student onboarding invitation email via Supabase Auth's configured SMTP (`inviteUserByEmail` / `auth.resend`) using the project's custom Supabase email template.

---

## 💡 Role in the Application

Facilitates secure student onboarding and roster enrollment, ensuring that only verified class instructors can enroll students or issue invitations. Onboarding invitations are sent directly through Supabase Auth SMTP with `full_name`, `class_name`, `teacher_name`, and `teacher_email` metadata injected for the Supabase email template.

For enrollment flows, payload schemas, and security checks, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/invite-student/code.ARCH.md).
