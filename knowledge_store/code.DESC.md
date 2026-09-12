# Knowledge Store Directory Description (`knowledge_store/`)

This directory documents the comprehensive architecture, data flows, database schemas, and implementation blueprints for the **Teach&Learn Knowledge Store Subsystem**.

## Directory Contents

- **`README.md`**: Master architecture overview of the Knowledge Store, detailing the dual-layer design (Materials Hierarchy & Tree Store + Student Submissions Portfolio & Diagnostic Store), cross-subsystem integrations, and comparison with OpenKB/PageIndex/GraphRAG.
- **`materials_store.md`**: Detailed architecture and pipeline specifications for processing educational materials (syllabi, lecture notes, textbooks, rubrics), including text extraction, tree indexing (inspired by PageIndex & RAPTOR), direct context ingestion, and ontological graph construction in the private PostgreSQL `ai` schema.
- **`submissions_store.md`**: Detailed architecture and pipeline specifications for ingesting, indexing, and diagnosing student assignment submissions, code, and essays, including automated rubric evaluation, diagnostic diff workflows, and student concept mastery tracking.
- **`retrieval_and_rag.md`**: Dual-Engine query, reasoning, and retrieval engine detailing tree-traversal algorithms, recursive graph expansion, deterministic context assembly for `/api/chat`, and real-time streaming interfaces.
- **`implementation_roadmap.md`**: Phase-by-phase implementation plan, schema migrations, backend service interfaces, edge function orchestrators, and testing/verification protocols.
- **`code.DESC.md`**: High-level descriptive summary of files in this directory.
- **`code.ARCH.md`**: Technical architecture, design patterns, contracts, and system dependencies for this directory.
