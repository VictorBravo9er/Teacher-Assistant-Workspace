# Classroom Agent Context Function — `supabase/functions/get-class-agent-context/`

This directory contains the Edge Function that queries, joins, and aggregates full classroom metadata, learning materials, instructional rubrics, and student portfolios into a structured context object for AI assistants.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-class-agent-context/index.ts): Deno serverless function entrypoint that handles `OPTIONS` CORS preflight, authenticates the caller, queries relational tables (`classes`, `class_materials`, `class_instructions`, `class_students`, `student_submissions`), and returns an aggregated context payload.

---

## 💡 Role in the Application

Provides an optimized server-side context aggregation endpoint, reducing multiple round-trip client requests into a single atomic query for AI prompt preparation.

For data aggregation schemas, join algorithms, and response models, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-class-agent-context/code.ARCH.md).
