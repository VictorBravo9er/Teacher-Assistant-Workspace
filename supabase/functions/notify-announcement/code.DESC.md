# Notify Announcement Function — `supabase/functions/notify-announcement/`

This directory contains the Edge Function responsible for dispatching class announcement email notifications to enrolled students and optional parent contacts via the Resend Batch API, with full delivery audit logging in `public.notification_logs`.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/notify-announcement/index.ts): Deno serverless entrypoint that handles `OPTIONS` CORS preflight, verifies `Authorization` header, retrieves announcement and classroom data, queries enrolled student and parent contacts, formats HTML email templates, dispatches batch emails via Resend (`POST https://api.resend.com/emails/batch`), and records audit records in `public.notification_logs`.

---

## 💡 Role in the Application

Keeps students and families informed of urgent classroom updates, schedule shifts, and administrative notices while maintaining delivery tracking for teachers.

For dispatch flow, batch constraints, and data contracts, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/notify-announcement/code.ARCH.md).
