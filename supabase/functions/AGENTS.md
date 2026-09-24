# Supabase Edge Functions Rules — Deno / TypeScript

Inherits from root `/AGENTS.md`. Functions live in `supabase/functions/<name>/index.ts`; shared utilities in `supabase/functions/_shared/` (`cors.ts`, `supabaseAdmin.ts`).

- **Docs-First Inspection**: Before reading any `index.ts`, read `systems/edge_functions.md` and `supabase/functions/code.DESC.md` + `supabase/functions/code.ARCH.md`.
- **Pre-Completion Sync**: Update `systems/edge_functions.md`, affected `systems/workflows[-atomic]/*.md`, and `supabase/functions/code.ARCH.md` / `code.DESC.md` when modifying functions.
- **Runtime Invariants**:
  1. Handle `OPTIONS` preflight first using `corsHeaders` and return responses via `jsonResponse` from `../_shared/cors.ts`.
  2. Validate user JWTs via `supabaseClient.auth.getUser(token)`; reserve `SUPABASE_SERVICE_ROLE_KEY` strictly for server-side RLS bypass.
  3. Read secrets via `Deno.env.get(...)` and keep ESM/Deno imports minimal to minimize cold starts.
