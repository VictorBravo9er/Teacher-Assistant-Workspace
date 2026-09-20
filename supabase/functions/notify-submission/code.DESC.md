# Notify Submission Function — `supabase/functions/notify-submission/`

This directory contains the Edge Function responsible for notifying course instructors via email whenever a student turns in an assignment, logging the event in `public.notification_logs`.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/notify-submission/index.ts): Deno serverless entrypoint that handles `OPTIONS` CORS preflight, validates caller authorization, queries submission and assignment details, retrieves the class teacher's email from `auth.admin.getUserById()`, dispatches an email via Resend (`POST https://api.resend.com/emails`), and writes an audit record to `public.notification_logs`.

---

## 💡 Role in the Application

Provides real-time alert notifications for teachers when assignments are turned in, ensuring timely reviews and fast turnaround times.

For data flows, security constraints, and error handling, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/notify-submission/code.ARCH.md).
