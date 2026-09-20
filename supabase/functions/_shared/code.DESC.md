# Edge Functions Shared Utilities — `supabase/functions/_shared/`

This directory provides shared TypeScript helper modules, CORS header configurations, authentication parsers, and Supabase client initializers for all Edge Functions.

---

## 📁 Directory Files

- [`cors.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/cors.ts): Exports standard `corsHeaders` dictionaries and the `jsonResponse(data, status)` helper function for uniform JSON HTTP responses.
- [`auth.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/auth.ts): Authentication utility functions to extract JWT bearer tokens from request headers and verify user identities against `supabase.auth.getUser()`.
- [`env.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/env.ts): Centralized environment variable accessor retrieving `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` with defensive error checking.
- [`supabaseAdmin.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/supabaseAdmin.ts): Initializes and exports the administrative Supabase client using the `SUPABASE_SERVICE_ROLE_KEY` for authorized backend operations that bypass RLS.
- [`supabaseClient.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/supabaseClient.ts): Initializes and exports standard user-scoped Supabase client instances.

---

## 💡 Role in the Application

These shared modules prevent code duplication across Edge Functions, ensuring consistent CORS headers, authentication validation, and client initialization.

For shared helper contracts, auth workflows, and client security constraints, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/code.ARCH.md).
