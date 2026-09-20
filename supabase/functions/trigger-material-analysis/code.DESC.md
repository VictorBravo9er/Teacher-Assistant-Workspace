# Trigger Material Analysis — `supabase/functions/trigger-material-analysis/`

This directory contains the event-driven Deno Edge Function responsible for processing new or modified learning materials, extracting text from curriculum documents, setting analysis status to `processing`, and invoking the FastAPI backend route `POST /api/materials/analyze`.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-material-analysis/index.ts): Edge function entrypoint that handles `OPTIONS` CORS preflight, validates auth (JWT or service-role token), merges canonical and class-private custom content/rubrics, extracts document text, flags `ai.material_insights` as `processing`, and calls the backend analysis service.

---

## 💡 Role in the Application

Enables automated pedagogical indexing, prerequisite gap detection, and syllabus alignment mapping whenever learning resources are created or refreshed.

For processing stages, payload structures, and error management, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-material-analysis/code.ARCH.md).
