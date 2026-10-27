# Supabase Edge Functions Rules — Deno / TypeScript

Inherits from root `/AGENTS.md`. Functions: `supabase/functions/<name>/index.ts`; shared utils: `supabase/functions/_shared/`.

- **Deployment**: Deploy via `python scripts/deploy_edge_functions.py`.
- **Invariants**:
  1. Handle `OPTIONS` preflight with `corsHeaders` and respond via `jsonResponse` from `_shared/cors.ts`.
  2. Validate user JWTs with `supabaseClient.auth.getUser(token)`; use service role key strictly for server bypass.
  3. Read secrets via `Deno.env.get(...)`. Keep ESM imports lean for minimal cold starts.
