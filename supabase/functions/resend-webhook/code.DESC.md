# Resend Webhook Function — `supabase/functions/resend-webhook/`

This directory contains the Edge Function responsible for processing incoming webhooks from Resend to track email delivery statuses, capture bounce/failure events, and notify teachers of dead-letter contact addresses.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/resend-webhook/index.ts): Deno serverless entrypoint that handles `OPTIONS` CORS preflight, extracts the event type (`email.delivered`, `email.bounced`, `email.failed`), updates the corresponding record in `public.notification_logs`, and dispatches an automated failure notice to the class teacher if an email bounces.

---

## 💡 Role in the Application

Provides real-time asynchronous delivery feedback and dead-letter detection for institutional communications, ensuring high email deliverability awareness.

For state transitions, payload formats, and automated alert flows, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/resend-webhook/code.ARCH.md).
