# Edge Functions Architecture & Invocation Lifecycle

This document details the shared execution lifecycle, CORS handling, and authentication protocols for functions in `supabase/functions/`.

---

## 1. Edge Function Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Client as Browser / Backend Service
    participant EdgeFunc as Deno Edge Function (index.ts)
    participant Shared as _shared/ (auth.ts & cors.ts)
    participant Supabase as Supabase Admin Client

    Client->>EdgeFunc: HTTP Request (POST / GET)
    alt req.method == "OPTIONS"
        EdgeFunc->>Shared: corsHeaders
        EdgeFunc-->>Client: 200 OK (OPTIONS Preflight Handled)
    else Method Allowed
        EdgeFunc->>Shared: verifyAuth(req) / getUser(token)
        alt Unauthorized
            Shared-->>Client: 401 Unauthorized (jsonResponse)
        else Authorized
            EdgeFunc->>Supabase: Execute DB / Storage Operations
            Supabase-->>EdgeFunc: Return DB Records
            EdgeFunc-->>Client: 200 OK (jsonResponse(data))
        end
    end
```

---

## 2. Shared Protocol Invariants

1. **Standardized CORS Handling**:
   Every edge function immediately intercepts `OPTIONS` requests, returning standard CORS headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: ...`).
2. **Unified Response Formatting**:
   Responses are returned using `jsonResponse(payload, statusCode)` from `_shared/cors.ts` with explicit `Content-Type: application/json` headers.
3. **Strict Error Guarding**:
   Handlers wrap domain logic in top-level `try/catch` blocks, returning structured JSON `{ error: string }` on failure rather than plain text error traces.
