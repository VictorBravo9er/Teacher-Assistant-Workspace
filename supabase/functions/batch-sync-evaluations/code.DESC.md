# Batch Sync Evaluations Function — `supabase/functions/batch-sync-evaluations/`

This directory contains the Edge Function for executing atomic batch synchronization of student assignment evaluations, rubric score breakdowns, and qualitative feedback records.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/batch-sync-evaluations/index.ts): Deno serverless function entrypoint that handles `OPTIONS` CORS preflight requests, authenticates the calling teacher, validates the incoming batch array of submission evaluations (`submission_id`, `score`, `rubric_breakdown`, `feedback`, `private_notes`, `status`), and commits updates atomically to PostgreSQL.

---

## 💡 Role in the Application

Enables high-throughput auto-grading and bulk evaluation updates from AI background jobs or manual batch grading sessions with transactional integrity.

For payload contracts, transaction models, and database synchronization flow, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/batch-sync-evaluations/code.ARCH.md).
