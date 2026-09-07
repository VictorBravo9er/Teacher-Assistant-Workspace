# Supabase Subsystem Architecture

This document details the Supabase edge runtime architecture, function isolation, and secret management across `supabase/`.

---

## 1. Supabase Edge Runtime Architecture

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Client["Client / FastAPI Backend"] --> APIReq["Edge Function Request (/functions/v1/<name>)"]
    
    subgraph DenoRuntime["Supabase Edge Runtime (Deno / V8 Engine)"]
        Preflight{"HTTP Method"}
        Preflight -- "OPTIONS" --> CORS["Handle CORS Preflight (200 OK)"]
        Preflight -- "POST / GET" --> AuthCheck["Verify JWT via auth.ts"]
        
        AuthCheck -- "Valid User / Service Role" --> Handler["Function Business Logic (index.ts)"]
        AuthCheck -- "Invalid / Missing Token" --> Unauthorized["401 Unauthorized"]
        
        Handler --> PostgREST["Supabase PostgREST / Storage API"]
        Handler --> Response["JSON Response (jsonResponse())"]
    end

    APIReq --> Preflight
```

---

## 2. Security & Runtime Invariants

1. **Deno V8 Isolate Security**:
   Each Edge Function executes in an isolated V8 sandbox with zero persistence between independent invocations.
2. **Environment Separation**:
   Functions access runtime secrets via `Deno.env.get()` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`), avoiding committed secrets.
