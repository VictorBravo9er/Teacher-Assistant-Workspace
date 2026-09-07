# Knowledge Store Directory Architecture (`knowledge_store/`)

## 1. Architectural Purpose & Boundaries

The `knowledge_store/` directory contains system design specifications, data models, algorithm definitions, and implementation guides for the **Teach&Learn Knowledge Store Subsystem**.

It serves as the technical blueprint for:
1. **Curriculum & Materials Store**: Structural tree representation, vector chunking, and ontological concept mapping of educational materials.
2. **Student Submissions & Mastery Store**: Normalization, rubric criteria auto-evaluation, error taxonomy mapping, and running mastery matrices for student submissions.
3. **Hybrid RAG & Retrieval Engine**: Tree traversal (PageIndex-style), dense vector retrieval (`pgvector`), and ontological graph querying (GraphRAG-style) for conversational and diagnostic assistant tools.

---

## 2. Invariants & Rules
- All designs must align with the hierarchical architectural constraints specified in the root [`AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/AGENTS.md), [`backend/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/AGENTS.md), and [`schema/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/AGENTS.md).
- Security boundaries must strictly maintain the separation between the public PostgREST API and the private `ai` schema.
- All database interactions from backend services must use async HTTP / PostgREST REST APIs or direct PostgreSQL connections with RLS/Security Definer enforcement.
