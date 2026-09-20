# Trigger Submission Evaluation — `supabase/functions/trigger-submission-evaluation/`

This directory contains the event-driven Deno Edge Function responsible for intercepting new student submissions, assembling assignment context, setting evaluation status to `processing`, and delegating AI scoring to the FastAPI backend.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-submission-evaluation/index.ts): Edge function entrypoint that handles `OPTIONS` CORS preflight, verifies caller auth (via JWT or service-role token from `pg_net`), extracts raw text from submission files in Supabase Storage or inline text, updates `ai.submission_evaluations` status to `processing`, and calls the backend AI scoring route `POST /api/grade`.

---

## 💡 Role in the Application

Serves as the decoupled bridge between asynchronous database submission events and backend LLM grading services, ensuring non-blocking execution and resilient error reporting.

For event triggers, payload contracts, and error recovery sequences, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-submission-evaluation/code.ARCH.md).
