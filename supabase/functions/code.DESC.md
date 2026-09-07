# Supabase Edge Functions — `supabase/functions/`

This directory contains Deno-based serverless Edge Functions for secure document text extraction, batch evaluation synchronization, signed storage URL generation, student invitations, and AI context assembly.

---

## 📁 Directory Files & Functions

- [`AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/AGENTS.md): Coding rules, CORS requirements, error handling guidelines, and authentication verification practices for Deno Edge Functions.

### Subordinate Function Endpoints:
- [`_shared/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared): Reusable Deno modules (CORS headers, JWT auth verification, environment variables, Supabase admin client).
- [`batch-sync-evaluations/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/batch-sync-evaluations): Batch updates student submission grades, feedback, and rubric score breakdowns.
- [`extract-material-text/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/extract-material-text): Extracts raw textual content from uploaded PDFs and documents in Supabase Storage.
- [`get-class-agent-context/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-class-agent-context): Compiles classroom metadata, materials, instructions, and student portfolios into a consolidated context payload for AI agents.
- [`get-material-url/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-material-url): Validates user access permissions and generates short-lived signed URLs for private learning materials.
- [`invite-student/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/invite-student): Enrolls students and generates secure class invitation tokens.
- [`trigger-submission-evaluation/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-submission-evaluation): Receives DB webhooks on student submission turn-in, extracts work text, sets `ai.submission_evaluations` to processing, and calls backend `/api/grade`.
- [`trigger-material-analysis/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/trigger-material-analysis): Receives DB webhooks on material upload/update, extracts document text, sets `ai.material_insights` to processing, and calls backend `/api/materials/analyze`.

---

For execution models, CORS preflight standards, and security patterns, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/code.ARCH.md).
