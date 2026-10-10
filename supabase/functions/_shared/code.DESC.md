# Edge Functions Shared Utilities — `supabase/functions/_shared/`

This directory provides shared TypeScript helper modules, CORS header configurations, authentication parsers, and Supabase client initializers for all Edge Functions.

---

## 📁 Directory Files

- [`cors.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/cors.ts): Exports standard `corsHeaders` dictionaries and the `jsonResponse(data, status)` helper function for uniform JSON HTTP responses.
- [`auth.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/auth.ts): Universal authorization helper exporting `verifyCallerAuth(req, classId?)` and `CallerAuthContext` interface, supporting both backend service role key and user JWT verification with optional class ownership/enrollment checks.
- [`env.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/env.ts): Centralized environment variable accessor retrieving `supabaseUrl`, `supabaseSecretKey`, and `supabasePublishableKey`.
- [`supabaseAdmin.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/supabaseAdmin.ts): Initializes and exports the administrative Supabase client instance `adminSupabase` using `SUPABASE_SERVICE_ROLE_KEY` for authorized backend operations that bypass RLS.
- [`supabaseClient.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/supabaseClient.ts): Exports request-scoped factory helper `getAuthClient(authHeader)` creating authenticated Supabase client instances.

---

## 💡 Role in the Application

These shared modules prevent code duplication across Edge Functions, ensuring consistent CORS headers, authentication validation, and client initialization.

For shared helper contracts, auth workflows, and client security constraints, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/_shared/code.ARCH.md).
