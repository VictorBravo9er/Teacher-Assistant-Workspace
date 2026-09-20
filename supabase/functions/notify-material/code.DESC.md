# Notify Material Function — `supabase/functions/notify-material/`

This directory contains the Edge Function responsible for alerting enrolled students when a new curriculum resource, study guide, or assignment is published or updated in their classroom.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/notify-material/index.ts): Deno serverless entrypoint that handles `OPTIONS` CORS preflight, verifies `Authorization` header, retrieves material properties (`category`, `due_at`, `max_score`), resolves enrolled students in `class_students`, renders personalized notification emails, dispatches via Resend Batch API, and records audit logs in `public.notification_logs`.

---

## 💡 Role in the Application

Provides instant student awareness of newly posted assignments and syllabus updates, driving timely submission turnaround.

For payload contracts, batch constraints, and delivery status tracking, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/notify-material/code.ARCH.md).
