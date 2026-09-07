# Workflows Architecture & Execution Invariants

This document outlines the architectural patterns, state transition rules, and cross-subsystem orchestration contracts for all workflows documented in `systems/workflows/`.

---

## 1. Universal Workflow Execution Architecture

All operations across the Teach&Learn platform adhere to a deterministic 5-stage pipeline:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    Stage1["1. UI State Trigger (React Views / Modals)"] --> Stage2["2. Service Orchestration (frontend/src/services)"]
    Stage2 --> Stage3["3. Persistence & RLS (PostgreSQL & Storage)"]
    Stage3 --> Stage4["4. Asynchronous Edge / AI Processing (Deno & FastAPI)"]
    Stage4 --> Stage5["5. Atomic Sync & UI Re-render (Triggers & Hooks)"]
```

### Invariant Rules:
1. **Never Bypass the Service Layer**:
   - UI components must never execute direct database queries or raw fetch calls; all actions must route through typed methods in `frontend/src/services/`.
2. **Optimistic Rendering with Transaction Safety**:
   - UI state updates optimistically where appropriate, rolling back gracefully if database mutations fail.
3. **Decoupled Asynchronous Processing**:
   - Compute-heavy tasks (document text extraction, vector embedding, LLM grading) execute asynchronously via database webhooks (`pg_net`) and Edge Functions, avoiding client blocking.
4. **Single Source of Truth for Scores**:
   - Grade averages and performance tiers are never calculated manually in client memory for persistence; they are atomically computed by database trigger `trg_sync_student_scores`.

---

## 2. Cross-Subsystem Communication Matrix

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    subgraph Frontend["Client UI & Hooks"]
        Views["React Views & Modals"]
        Hooks["Custom Hooks (useClassOperations, useWorkspaceData)"]
        Services["Domain Services Layer"]
        Views --> Hooks
        Hooks --> Services
    end

    subgraph Edge["Serverless Edge Layer"]
        EdgeFns["Deno Edge Functions"]
    end

    subgraph Backend["FastAPI Backend Layer"]
        FastAPISvc["FastAPI /api/* Endpoints"]
        Evaluator["EvaluatorService & ChatService"]
        FastAPISvc --> Evaluator
    end

    subgraph Database["Database & Storage"]
        Postgres[("PostgreSQL (public, ai, langgraph)")]
        Storage[("Supabase Storage Buckets")]
        Triggers["DB Triggers (pg_net)"]
        Postgres --> Triggers
    end

    Services -->|PostgREST + RLS| Postgres
    Services -->|Signed Uploads| Storage
    Services -->|REST Invocations| FastAPISvc
    Services -->|Function Invocations| EdgeFns

    Triggers -->|Async Webhook Dispatch| EdgeFns
    EdgeFns -->|HTTP Forwarding| FastAPISvc
    EdgeFns -->|Blob Processing| Storage
    EdgeFns -->|Status Updates| Postgres
    FastAPISvc -->|RPC & Checkpointer| Postgres
```

---

## 3. Workflow Maintenance Contract

Whenever a workflow is modified in application code:
1. The corresponding `.md` file in `systems/workflows/` **must be updated** to reflect new parameters, status transitions, or RPC calls.
2. Sequence diagrams must accurately represent the latest invocation order and error-handling steps.
