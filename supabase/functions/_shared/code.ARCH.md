# Shared Utilities Architecture & Security Boundaries

This document details the shared authentication architecture, client creation patterns, and CORS mechanisms in `supabase/functions/_shared/`.

---

## 1. Authentication & Client Initialization Architecture

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Req["Incoming Deno Request"] --> CallerAuth["auth.ts: verifyCallerAuth(req, classId?)"]
    CallerAuth --> AuthCheck{"isAuthorized?"}
    
    AuthCheck -- No --> Unauth["Return 401 Unauthorized / Error"]
    AuthCheck -- Yes --> RoleCheck{"isServiceRole?"}
    
    RoleCheck -- Yes --> AdminClient["adminSupabase (SUPABASE_SERVICE_ROLE_KEY)"]
    RoleCheck -- No --> UserClient["getAuthClient(authHeader) (User JWT)"]
```

---

## 2. Key Design & Security Invariants

1. **Service Role Isolation (`supabaseAdmin.ts`)**:
   - `SUPABASE_SERVICE_ROLE_KEY` is loaded strictly inside serverless edge runtime memory and is never passed in client response bodies or exposed to frontend callers.
2. **CORS Protocol Uniformity (`cors.ts`)**:
   - `jsonResponse(data, status)` automatically injects `corsHeaders` along with standard `application/json` content-type headers, preventing missing-CORS edge errors on 4xx/5xx responses.
3. **Environment Defensive Guards (`env.ts`)**:
   - Validates the existence of critical keys on runtime startup and raises clear exceptions if required configuration variables are missing.
