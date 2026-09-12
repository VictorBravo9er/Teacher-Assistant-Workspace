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
3. **Resilient LLM Communication (`chatService.ts`)**:
   - Dispatches requests to the FastAPI backend at `http://localhost:8090/api/chat`.
   - Catches connection refusals or timeouts and seamlessly falls back to `mockChat.ts`, allowing teachers to explore UI capabilities even during backend maintenance.
