# Teach&Learn Documentation

Welcome to the Teach&Learn platform documentation repository. This directory houses architectural specifications, operational plans, system designs, and visual diagrams for the entire workspace.

---

## 📚 Documentation Sections

| Section | Description | Key Documents |
| :--- | :--- | :--- |
| [**`systems/`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/README.md) | **System Architecture & Workflows**<br>Comprehensive technical macro-dossier covering backend services, frontend architecture, database & storage, AI evaluation pipelines, edge functions, and deployment topology. | • [`database_and_storage.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/database_and_storage.md)<br>• [`ai_and_ontology_subsystem.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/ai_and_ontology_subsystem.md)<br>• [`backend_service.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/backend_service.md)<br>• [`frontend_architecture.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/frontend_architecture.md)<br>• [`edge_functions.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/edge_functions.md)<br>• [`workflows/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/workflows/README.md) |
| [**`plans/`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/plans/README.md) | **Implementation & Verification Plans**<br>Detailed step-by-step engineering plans, checkpoints, and verification audits for completed features and platform milestones. | • [`01-database-schema-alignment.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/plans/01-database-schema-alignment.md)<br>• [`07-student-portal-architecture.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/plans/07-student-portal-architecture.md)<br>• [`08-extended-lms-modules.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/plans/08-extended-lms-modules.md)<br>• [`08.5-classroom-notifications-resend.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/plans/08.5-classroom-notifications-resend.md)<br>• [`10-local-storage-ttl-revalidation.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/plans/10-local-storage-ttl-revalidation.md) |
| [**`knowledge_store/`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/README.md) | **Knowledge Store & RAG Architecture**<br>Design specifications for curriculum tree indexing, student submission stores, ontological concept mastery, and RAG copilot retrieval pipelines. | • [`materials_store.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/materials_store.md)<br>• [`submissions_store.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/submissions_store.md)<br>• [`retrieval_and_rag.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/retrieval_and_rag.md)<br>• [`implementation_roadmap.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/implementation_roadmap.md) |
| [**`lms-ui-component-architecture.drawio`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/lms-ui-component-architecture.drawio) | **UI Architecture Diagram**<br>Visual component hierarchy and interface flow diagram. | Open with Draw.io / Diagrams.net |

---

## 🛠️ Workspace Automation & Makefile Reference

The workspace includes a root [`Makefile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/Makefile) to streamline quality gates, database operations, and development servers:

| Target | Description | Equivalent Underlying Command |
| :--- | :--- | :--- |
| **`make check`** | Run full workspace quality gate | `make lint-backend && make lint-frontend && make lint-docs` |
| **`make lint-backend`** | Verify Python types & formatting | `cd backend && uv run poe lint` |
| **`make lint-frontend`** | Verify TypeScript types & contracts | `cd frontend && pnpm run lint` |
| **`make build-frontend`** | Compile production Vite bundle | `cd frontend && pnpm run build` |
| **`make lint-docs`** | Audit 100% `code.md` micro-doc coverage | `python scripts/verify_doc_coverage.py all` |
| **`make db-setup`** | Initialize database (safe, applies migrations & types) | `uv run --project backend python scripts/db_setup.py` |
| **`make db-reset`** | Full destructive teardown, re-migration & setup | `uv run --project backend python scripts/db_setup.py --reset` |
| **`make migrate-status`** | View applied vs. pending SQL migrations | `python scripts/migrate.py --status` |
| **`make migrate`** | Apply migrations via Supabase CLI | `python scripts/migrate.py` |
| **`make types`** | Regenerate TS & Python DB contracts | `python scripts/_generate_types.py` |
| **`make deploy-functions`** | Deploy modified Supabase Edge Functions | `python scripts/deploy_edge_functions.py` |
| **`make dev-backend`** | Start FastAPI backend server | `cd backend && uv run poe run-dev` |
| **`make dev-frontend`** | Start Vite frontend dev server | `cd frontend && pnpm run dev` |
| **`make docker-dev`** | Boot rootless multi-container dev stack | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` |
| **`make docker-prod`** | Boot background production stack | `docker compose up --build -d` |
