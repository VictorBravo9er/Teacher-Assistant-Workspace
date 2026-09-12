# Supabase Edge Functions Rules — Deno / TypeScript

This document defines the rules, conventions, and operational practices for **Supabase Edge Functions** located in `supabase/functions/`. These rules cascade from and specialize the universal workspace principles defined in the root [`/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/AGENTS.md).

---

## 1. Directory Structure & Organization

Each Edge Function must reside in its own subdirectory with an `index.ts` entry point:

```
supabase/functions/
├── _shared/                     # Shared utilities, CORS headers, auth helpers, types
│   ├── cors.ts                  # Standard CORS headers and jsonResponse helper
│   └── supabaseAdmin.ts         # Service role Supabase client initialization
├── batch-sync-evaluations/
│   └── index.ts
├── extract-material-text/
│   └── index.ts
├── get-class-agent-context/
│   └── index.ts
├── get-material-url/
│   └── index.ts
└── invite-student/
    └── index.ts
```

---

## 2. Request Handling, CORS & HTTP Methods

1. **Handle OPTIONS Preflight**: Every function accepting browser requests must handle the HTTP `OPTIONS` method immediately and return standard CORS headers:
   ```ts
   import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

   Deno.serve(async (req) => {
     if (req.method === "OPTIONS") {
       return new Response("ok", { headers: corsHeaders });
     }
     // ...
   });
   ```
2. **Standardized Responses**: Use the shared `jsonResponse` helper for JSON responses with appropriate HTTP status codes (`200`, `400`, `401`, `403`, `404`, `500`).

---

## 3. Authentication & Security

1. **Auth Token Verification**:
   - For user-invoked functions, parse and verify the caller's JWT token from the `Authorization` header (`req.headers.get("Authorization")`).
   - Use `supabaseClient.auth.getUser(token)` to validate user identity.
2. **Service Role Keys**:
   - Only use `SUPABASE_SERVICE_ROLE_KEY` for administrative actions that bypass RLS where strictly required and authorized.
   - Never expose or return service role keys to clients.
3. **Environment Secrets**:
   - Access secrets via `Deno.env.get("SECRET_NAME")`.
   - Never commit `.env` or raw secret strings to version control.

---

## 4. Performance & Hygiene

1. **Lightweight Imports**: Use modern ESM/Deno imports (`npm:<package>`, `jsr:<package>`, or `esm.sh`) and avoid bloated dependencies to maintain fast cold-start performance.
2. **Structured Error Handling**: Wrap request processing in `try/catch` blocks and return informative, structured JSON error payloads:
   ```ts
   try {
     // ...
   } catch (error) {
     return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
   }
   ```
3. **Documentation**:
   - Maintain the directory-level [`code.DESC.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/code.DESC.md) and [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/code.ARCH.md) whenever edge functions are added or updated.
