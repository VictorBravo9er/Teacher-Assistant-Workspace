# Project Rules & Guidelines — Teach&Learn Workspace

Welcome to **Teach&Learn**, an AI-powered full-stack workspace for educators to manage classes, track student portfolios, build repeatable curriculum templates, evaluate rubric criteria, and perform pedagogical gap analyses via LangGraph/RAG assistants.

---

## 1. Cascading & Hierarchical Rules Structure

This workspace uses a **hierarchical rules architecture**. This root document defines the universal engineering principles, container security requirements, and commit conventions that apply everywhere. Subsystems specialize these rules in their own scoped `AGENTS.md` files:

- **Frontend (Vite / React 18 / TypeScript / Tailwind)**: [`frontend/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/AGENTS.md)
- **Backend (Python 3.13 / FastAPI / LangGraph / uv)**: [`backend/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/AGENTS.md)
- **Database & Schemas (PostgreSQL / Supabase / RLS)**: [`schema/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/AGENTS.md)
- **Supabase Edge Functions (Deno / TypeScript)**: [`supabase/functions/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/AGENTS.md)

---

## 2. Universal Engineering & Design Principles

1. **Single Responsibility Principle (SRP)**:
   - Every module, class, function, and React component must have one, and only one, clear reason to change.
   - Decouple UI rendering, state management, API transport, and domain validation cleanly.
2. **Don't Repeat Yourself (DRY)**:
   - Every piece of knowledge, business logic, or data schema must have a single authoritative representation.
   - Reuse shared utility functions, types, and components rather than duplicating logic across files.
3. **Minimize Accidental & Conceptual Complexity**:
   - Optimize for **minimum mental overhead and architectural friction**.
   - Prefer straightforward, explicit code over layers of unnecessary indirection or premature abstraction.
4. **Type Safety & Schema-First Validation**:
   - **Backend**: Strict static typing with Python 3.13+, Pydantic v2 data models, and zero warnings from BasedPyright / Ruff.
   - **Frontend**: Strict TypeScript (`strict: true`), explicit interface definitions, and no `any` types.
5. **Preserve Working Functionality**:
   - Never remove or regress existing features when adding new capabilities.
   - Preserve all existing code comments, docstrings, and architectural patterns.
6. **Verification Before Completion**:
   - Always run the relevant linters, typecheckers, or build commands before declaring any task finished:
     - Frontend: `npm run build` / TypeScript verification.
     - Backend: `uv run poe lint` / `ruff check .` / `basedpyright .`.

---

## 3. Codebase Simplification & Structural Size Reduction

All changes must adhere to the following simplification guidelines:

### A. Abstraction & Layering
- **Remove Unnecessary Abstractions**: Eliminate classes, functions, or services that merely forward calls without adding logic.
- **Collapse Trivial Helpers**: Do not create single-use 2-line helper functions if direct inlined usage is clearer.
- **Reduce Architectural Layers**: Avoid deep multi-tier call chains when direct calls are sufficient.
- **Prefer Composition Over Inheritance**: Use modular composition to avoid rigid class hierarchies.
- **Leverage Framework Conventions**: Use built-in framework features (FastAPI dependency injection, React contexts/hooks, Vite plugins) instead of hand-rolling custom wheels.

### B. State, Flow & Data-Driven Logic
- **Eliminate Maintained & Redundant State**: Always prefer **derived state** over maintaining and synchronizing multiple state variables.
- **Eliminate State Synchronization**: Rely on a single source of truth to remove desynchronization bugs.
- **Declarative Operations Over Imperative Loops**: Use functional primitives (`.map()`, `.filter()`, `.reduce()`, list comprehensions) over manual accumulator loops with mutation.
- **Prefer Data-Driven Logic Over Branching**: Replace long `if/else` or `switch` chains with lookup tables, dictionaries, or strategy maps.
- **Push Work to the Appropriate Layer**: Offload sorting, filtering, aggregations, constraints, and pagination to the database (SQL/PostgreSQL) rather than pulling raw datasets into application memory.

### C. Types, Contracts & Primitives
- **Use Language & Platform Primitives**: Use built-in standard library utilities instead of pulling in micro-dependencies or rolling custom algorithms.
- **Make Invalid States Unrepresentable**: Design data types and discriminated unions so impossible combinations cannot compile.
- **Move Complexity Into Types & Schemas**: Move runtime validation boundaries to the type system and parser boundary (Pydantic / Zod).
- **Use Schemas as Executable Contracts**: Let single schema definitions power runtime validation, static typing, serialization, and API contracts simultaneously.

### D. Hygiene, Dependencies & Configuration
- **Delete Dead & Compatibility Code**: Purge obsolete feature flags, unused exports, dead dependencies, and commented-out code.
- **Minimize Configuration**: Favor convention over configuration.
- **Remove Redundant Dependencies**: Remove third-party packages that duplicate capabilities already present in the modern standard library or existing framework dependencies.

---

## 4. Containerization & Security Standards

- **Rootless Containers**:
  - Both frontend (Nginx) and backend (Uvicorn) must run under non-root users (`USER 1000:1000` or custom unprivileged user).
- **Read-Only / Immutable Code**:
  - Source code in production containers must have immutable permissions (`0555` directories, `0444` files).
- **Environment Separation**:
  - Secrets (`.env`) must never be committed to git. Use `.env.example` to document required environment variables.

---

## 5. Directory-Level Documentation Standards (`code.DESC.md` & `code.ARCH.md`)

Every directory containing application source code (such as `schema/`, `frontend/`, `backend/`, `supabase/functions/`, and their respective source subdirectories — excluding build artifacts and dependency caches like `dist/`, `node_modules/`, `.venv/`) must contain two dedicated markdown files documenting only the files residing directly within that directory (excluding subdirectories):

1. **`code.DESC.md`**:
   - High-level overview written in plain English.
   - Must provide a clear and complete understanding of what the files in the directory do, their roles, and how they fit into the application.
2. **`code.ARCH.md`**:
   - Detailed architecture, structural patterns, and implementation specifics for the files directly in that directory.
   - Details interfaces, contracts, state flow, dependencies, and internal design decisions.

> [!IMPORTANT]
> **Continuous Maintenance**: Whenever any source file in an application source directory is created, updated, or deleted, the corresponding `code.DESC.md` and `code.ARCH.md` files in that directory **must be updated** if the code changes warrant a documentation update.

---

## 6. Git & Commit Conventions

- Use the **Conventional Commits** standard for commit messages:
  - `feat: add AI diagnostic review diff modal`
  - `fix: resolve rubric score weighting calculation bug`
  - `refactor: extract attendance logging into custom hook`
  - `docs: update UI_ELEMENT_IDS.md with new modal buttons`
  - `chore: update dependencies in pyproject.toml`
- Keep commits focused, clean, and atomic.

---

## 7. Temporary Workspace & Scratch Directory (`./.scratch/`)

- **Designated Scratch Location**:
  - Whenever performing temporary analysis, unzipping archives, staging temporary scripts, or storing intermediate data, always use `./.scratch/` at the repository root.
  - Create the `./.scratch/` directory if it does not already exist.
- **Manifest Tracking (`./.scratch/items.json`)**:
  - Maintain a manifest file at `./.scratch/items.json` containing an array of tracked scratch items.
  - **On Creation**: When allocating a scratch subdirectory or file, register an object in `items.json`:
    - `id`: Unique identifier (e.g. `analysis-curriculum-20260905`).
    - `path`: Relative path inside `./.scratch/`.
    - `purpose`: Plain English description of what is using it.
    - `created_at`: ISO timestamp.
    - `created_by`: Conversation ID or task context.
    - `is_complete`: Set to `false` during active work.
    - `safe_to_delete`: Set to `false` until the asset is no longer needed.
  - **On Task Completion**: Update the item in `items.json` setting `is_complete: true` and `safe_to_delete: true` once the asset is ready for cleanup.
- **Safe Cleanup & Pruning**:
  - Before or after running scratch operations, agents can inspect `./.scratch/items.json`.
  - Any item with `safe_to_delete: true` (or completed items whose parent conversation/task has ended) may be safely removed from disk.
  - After deleting an item, remove its entry from `items.json` (or remove `./.scratch/` entirely if all items are pruned).
- **Version Control Exclusion**:
  - The `./.scratch/` directory is strictly for ephemeral operations and is excluded by `.gitignore`. Never commit contents of `./.scratch/`.


