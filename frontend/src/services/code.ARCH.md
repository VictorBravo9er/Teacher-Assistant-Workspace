# Services Architecture & Data Access Patterns

This document details the data access patterns, PostgREST query designs, and error handling strategies implemented in `frontend/src/services/`.

---

## 1. Data Access Layer & Communication Architecture

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Hooks["Custom Hooks (useClassOperations, useAIChat)"] --> Services["src/services/"]
    
    subgraph DataClients["Data Transport Endpoints"]
        SupabaseDB["Supabase PostgREST (classes, students, materials)"]
        SupabaseStorage["Supabase Storage API (bucket-materials, bucket-submissions)"]
        EdgeFuncs["Supabase Edge Functions (get-material-url, invite-student)"]
        FastAPIBackend["FastAPI Backend (POST /api/chat)"]
    end

    Services -->|classService, studentService| SupabaseDB
    Services -->|materialService, studentService| SupabaseStorage
    Services -->|materialService, studentService| EdgeFuncs
    Services -->|chatService| FastAPIBackend
```

---

## 2. Key Architecture & Error Handling Invariants

1. **Junction Table Normalization**:
   - `classService` and `templateService` handle multi-table joins (e.g. `class_materials`, `class_instructions`, `class_students`) in cohesive transactions, reconstructing flat domain objects for the UI.
2. **Defensive Storage Paths**:
   - File uploads in `materialService` follow the canonical path pattern `/{userId}/{materialId}/{contentItemId}`, matching the PostgreSQL RLS policy restrictions.
3. **FastAPI & LLM Communication (`chatService.ts`)**:
   - Dispatches requests to the FastAPI backend at `/api/chat`.
   - Propagates backend errors transparently with structured telemetry logged through `logger.ts`, surfacing actionable errors to the user via toast notifications without synthetic mock data.
4. **Client-Side Institute Directory Caching (`instituteService.ts`)**:
   - Maintains an in-memory / local storage TTL cache (`edu_institutes_directory`) with 1-hour validity.
   - Eliminates per-keystroke RPC calls to PostgreSQL by powering client-side fuzzy searching, updating synchronously when new institutes are registered.
5. **Universal Notification & Email Engine (`notificationService.ts`)**:
   - Offloads email distribution entirely to serverless Edge Functions (`notify-announcement`, `notify-material`, `notify-submission`) backed by Resend.
   - Non-blocking async invocations ensure UI responsiveness; delivery states (`sent`, `delivered`, `bounced`) are tracked in `public.notification_logs` with webhook reconciliation.
6. **Empty-Diff Short-Circuit Guards (`classService.ts` & `studentService.ts`)**:
   - Both `classService.updateClass` and `studentService.updateStudentClassData` verify `Object.keys(dbUpdates).length > 0` before calling PostgREST `.update(dbUpdates)`. Any call containing only client-side fields (`statusIndicator`) or nested collection references (`students`, `submissions`, `materials`, `ragSessions`) returns immediately as a zero-network no-op.
