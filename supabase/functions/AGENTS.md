# Supabase Edge Functions Rules — Deno / TypeScript

Cascades from root `/AGENTS.md`. Each function lives in `supabase/functions/<name>/index.ts`. Shared utilities in `supabase/functions/_shared/` (`cors.ts`, `supabaseAdmin.ts`).

## 1. Request Handling & CORS
Every browser-facing function must handle `OPTIONS` preflight first:
```ts
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // ...
});
```
Use `jsonResponse` helper for all JSON responses with appropriate status codes (`200/400/401/403/404/500`).

## 2. Authentication & Security
- **User functions**: Parse JWT from `Authorization` header; validate with `supabaseClient.auth.getUser(token)`.
- **Service role**: Use `SUPABASE_SERVICE_ROLE_KEY` only for admin actions that require RLS bypass. Never expose to clients.
- **Secrets**: Access via `Deno.env.get("SECRET_NAME")`. Never commit `.env` or raw secret strings.

## 3. Performance & Hygiene
- **Imports**: Use ESM/Deno imports (`npm:<pkg>`, `jsr:<pkg>`, `esm.sh`). Avoid bloated deps — cold-start cost is real.
- **Error Handling**: Wrap processing in `try/catch`; return structured JSON error payloads via `jsonResponse`.
- **Docs**: Update [`code.DESC.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/code.DESC.md) and [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/code.ARCH.md) when adding or significantly modifying edge functions.
