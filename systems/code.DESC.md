# Subsystems Documentation Directory — `systems/`

This directory contains the central, in-depth architectural and operational documentation for all underlying subsystems comprising the **Teach&Learn** platform.

---

## 📁 Directory Files

- [`README.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/README.md): Master subsystem index, high-level block diagrams, cross-subsystem interaction flows, and navigational directory map.
- [`database_and_storage.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/database_and_storage.md): In-depth documentation of the PostgreSQL relational schema (`public`), custom domain ENUMs, Row Level Security (RLS) policies, score recalculation triggers (`trg_sync_student_scores`), atomic deletion RPCs, and Supabase Storage bucket architectures (`class-materials`, `student-submissions`).
- [`ai_and_ontology_subsystem.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/ai_and_ontology_subsystem.md): Detailed specifications for the private `ai` schema, dense vector search (`pgvector` HNSW indexes), ontological knowledge graph, autonomous grading pipeline (`/api/grade`), material syllabus analysis (`/api/materials/analyze`), and interactive RAG chat with dynamic visualization outputs (`/api/chat`).
- [`backend_service.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/backend_service.md): Architecture of the FastAPI asynchronous Python 3.13 service, covering endpoint contracts, LangChain OpenRouter integrations, prompt serialization, JSON parsers, LangGraph persistent checkpointing, and Pydantic v2 data models.
- [`edge_functions.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/edge_functions.md): Serverless Deno Edge Functions catalog, detailing asynchronous database webhook processing, document text extraction, signed URL security gates, student invitations, and batch grading synchronization.
- [`frontend_architecture.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/frontend_architecture.md): Single-Page Application (SPA) design in React 18, Vite, TypeScript, and Tailwind CSS, detailing view navigation, feature modules (`classroom`, `students`, `ai-assistant`, `account`), custom React hooks, and domain API service layers.
- [`devops_and_deployment.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/devops_and_deployment.md): Multi-container Docker Compose orchestration, rootless container security (`USER 1000:1000`), immutable production file permissions, alternative single-container hosting strategy (`alternative-host/`), database automation scripts, and environment variable cascading.

### 🔄 Subordinate Workflows Directories:
- [`workflows/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows): End-to-end, start-to-finish operational workflows (template creation & class instantiation, material upload & AI gap analysis, student enrollment & attendance tracking, submission & autonomous AI grading, interactive RAG copilot queries, and rubric authoring).
- [`workflows-atomic/`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic): Fine-grained atomic task specifications from trigger to conclusion, isolating asynchronous event-driven AI pipelines as decoupled standalone workflows.

---

## 🎯 Purpose & Audience

The files in this directory serve as the authoritative engineering documentation for developers, contributors, and AI assistants maintaining, extending, or auditing the Teach&Learn platform.

For architectural patterns, structural design rules, and cross-subsystem contracts, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/code.ARCH.md).
