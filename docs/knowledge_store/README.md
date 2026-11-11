# Didactiq Knowledge Store Subsystem

The **Didactiq Knowledge Store Subsystem** is an educational knowledge compilation, indexing, and diagnostic engine designed specifically for classroom workflows. It draws architectural inspiration from **OpenKB** (compiled LLM wikis & persistent knowledge graphs), **Open Knowledge Foundation (OKF v0.2)** (standardized artifact envelopes and closed vocabularies), **PageIndex / RAPTOR** (hierarchical tree indexing for long educational documents), and **GraphRAG / LightRAG** (dual-level concept & prerequisite graphs), tailoring them directly to the needs of educators managing curriculum materials and student assignment submissions.

---

## 1. Executive Summary & Design Vision

Traditional RAG systems suffer from three major shortcomings in educational environments:
1. **Context Fragmentation**: Slicing a 60-page textbook chapter or syllabus into arbitrary 500-token chunks loses pedagogical hierarchy (e.g., chapter learning goals, formula derivations, and prerequisite chains).
2. **Ephemerality & Rediscovery**: Standard RAG rediscovers context from scratch on every question instead of maintaining a compounding understanding of a student's learning trajectory.
3. **Absence of Pedagogical Grounding**: Without an explicit ontology (Bloom's Taxonomy levels, concept prerequisite trees, error taxonomies), generic vector search cannot detect whether a student is missing foundational prerequisite concepts.

The **Didactiq Knowledge Store** bridges this gap using a **Lean Dual-Plane Knowledge Architecture** (Hierarchical Tree Index + Relational Ontological Graph, eliminating runtime vector database dependency; Phase 1–4 SQL schema and backend services implemented, while DB webhook auto-triggers, binary `markitdown`/OCR parsing, and Gradebook/Chat UI wiring remain pending):

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TB
    subgraph Ingestion["1. Dual Ingestion & Ingest Harness Pipeline"]
        MatFiles["Course Materials (Syllabi, PDFs, Notes, Rubrics)"]
        SubFiles["Student Submissions (PDFs, DOCX, Code, Essay Work)"]
        Parser["markitdown / Deno Edge Parser"]
        PrimaryHarness["Backend AI Agent Harness (Real-Time per Upload/Submit)"]
    end

    subgraph Plane1["Plane 1: Curriculum & Materials Knowledge Store"]
        TreeIndex["Hierarchical Tree Index (ai.material_trees / PageIndex)"]
        FullText["Direct Text & Section Store (public.materials.content)"]
        OntologyGraph["Ontological Knowledge Graph (ai.ontology_concepts & relationships - OKF v0.2)"]
    end

    subgraph Plane2["Plane 2: Student Submissions & Mastery Portfolio Store"]
        SubText["Direct Submission Content (raw text / storage blob)"]
        AutoEval["Rubric Auto-Grading & Diagnostic Engine (/api/grade)"]
        MasteryMatrix["Student Concept Mastery Matrix (ai.student_concept_mastery)"]
        Misconceptions["Error & Misconception Taxonomy (ai.ontology_misconceptions)"]
    end

    subgraph ConsolidationPlane["3. Background Integrity & Consolidation"]
        CronPass["Daily Cron Job Runner (/api/consolidation/run)"]
        DriftAudit["Anti-Drift Graph Linkage Audit & Repair"]
        DreamingCycle["Autonomous Misconception Dreaming"]
    end

    subgraph RuntimeSurfaces["4. Runtime AI Assistants & Frontends"]
        SoftGate["Pre-Query Soft-Warning Gate (ai.check_answerable)"]
        ChatRAG["Interactive Assistant (/api/chat + Dual-Engine RAG)"]
        DiffModal["AI Diagnostic Review Modal (AIDiagnosticDiffModal.tsx)"]
        MatrixView["Teacher Gradebook Matrix (Proposed Misconception Review)"]
        ReportCards["Parent Briefing & Report Cards (ReportCardModal.tsx)"]
    end

    MatFiles --> Parser
    SubFiles --> Parser
    Parser --> PrimaryHarness
    PrimaryHarness --> TreeIndex
    PrimaryHarness --> FullText
    PrimaryHarness --> SubText

    PrimaryHarness --> OntologyGraph
    PrimaryHarness --> AutoEval
    AutoEval --> MasteryMatrix
    AutoEval --> Misconceptions

    CronPass --> DriftAudit
    DriftAudit --> OntologyGraph
    CronPass --> DreamingCycle
    DreamingCycle --> Misconceptions

    OntologyGraph --> SoftGate
    TreeIndex --> SoftGate
    SoftGate --> ChatRAG
    MasteryMatrix --> ChatRAG
    AutoEval --> DiffModal
    Misconceptions --> MatrixView
    MasteryMatrix --> MatrixView
    MasteryMatrix --> ReportCards
```

---

## 2. Inspiration & Comparative Analysis

| Dimension | Standard Chunk-Based RAG | OpenKB (Compiled LLM Wiki) | PageIndex / RAPTOR | **Didactiq Knowledge Store (Our Implementation)** |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Data Structure** | Flat vector index (`vector(1536)`) | Interlinked Markdown files (`[[wikilinks]]`) | Recursive Tree of Abstracts / TOC Trees | **Lean Dual-Engine: PostgreSQL Private `ai` Schema + Hierarchical Tree JSONB + Relational Graph with OKF v0.2 Envelopes (Zero Vector DB Overhead)** |
| **Long Document Handling** | Fixed-size chunking with overlaps | PageIndex tree index + LLM reading | Multi-layer summarization tree | **Dual-route: Direct full-text (<20 pages) vs. Hierarchical Tree Index (≥20 pages) in `ai.material_trees`** |
| **Knowledge Evolution** | Static chunks; no cross-doc synthesis | Incremental wiki compilation on `add` | Re-clustering on corpus changes | **Dual-tier compilation: Real-time agent ingestion on submit/upload + Daily anti-drift consolidation & Misconception Dreaming cron pass** |
| **Student Longitudinal Modeling** | Not supported (treats submissions as text) | Not supported (general-purpose KB) | Not supported | **Dedicated `ai.student_concept_mastery` tracking scores, confidence, and Bloom levels over time** |
| **Error & Misconception Tracking** | None | Contradiction alerts in wiki | None | **Structured pedagogical error taxonomy in `ai.ontology_misconceptions` with remediation strategies surfaced directly in Teacher's Gradebook Matrix** |
| **Pre-Query Verification** | None (always retrieves) | File existence check | None | **`ai.check_answerable` gate returning soft warnings with caveats when processing/consolidation is incomplete** |
| **Security & Multi-Tenancy** | Custom metadata filters | Local-first file system | In-memory / library | **Strict PostgreSQL Row Level Security (RLS) + Private `ai` schema isolated from public PostgREST API** |

---

## 3. Subsystem Architecture Map

The Knowledge Store is organized across 4 detailed design documents:

1. **[`materials_store.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/materials_store.md)**:
   - File normalization & multi-modal parsing (`markitdown` + Edge Functions).
   - Hierarchical Tree Indexing algorithm (TOC extraction $\to$ node summarization $\to$ leaf binding).
   - Ontological concept extraction and prerequisite relationship generation.
   - Direct text ingestion, token budgeting, and section breadcrumb mapping (no vector chunks).
2. **[`submissions_store.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/submissions_store.md)**:
   - Student work ingestion from `student-submissions` storage bucket.
   - Autonomous rubric auto-grading pipeline and structured JSON scoring contracts.
   - Error detection matching against `ai.ontology_misconceptions`.
   - Longitudinal student concept mastery updates and gradebook synchronization.
3. **[`retrieval_and_rag.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/retrieval_and_rag.md)**:
   - Dual-Engine Retrieval Algorithm (Reasoning-based tree traversal + Recursive graph expansion).
   - Context packaging and token density optimizations for `/api/chat`.
   - Interactive visualizer widget generation (heatmaps, distributions, rankings).
4. **[`implementation_roadmap.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/knowledge_store/implementation_roadmap.md)**:
   - Incremental execution phases for tree indexing, graph ontology, and prompt assembly.
   - Database schema DDL additions and SQL trigger definitions.
   - Backend FastAPI endpoints and Deno Edge Function implementations.

---

## 4. Integration with Existing Didactiq Systems

The Knowledge Store seamlessly integrates with the existing system architecture:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    Frontend["Frontend (React 19 / Tailwind)"]
    EdgeFns["Supabase Edge Functions (Deno)"]
    Backend["Backend Service (FastAPI / uv)"]
    DB[("PostgreSQL 15+ (Supabase)")]
    Storage[("Supabase Storage (50MB Limit)")]

    Frontend -->|Signed Uploads| Storage
    Frontend -->|HTTP (/api/*)| Backend
    Frontend -->|RPC Calls| DB

    Storage -->|Blob Webhook| EdgeFns
    EdgeFns -->|HTTP Extraction & Evaluation| Backend
    Backend -->|Async DB Pool| DB
```

- **Database & Storage Subsystem** ([`docs/systems/database_and_storage.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/database_and_storage.md)): Stores raw entities in `public`, hierarchical trees and knowledge graphs in `ai`, and checkpoints in `langgraph`.
- **AI & Ontology Subsystem** ([`docs/systems/ai_and_ontology_subsystem.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/ai_and_ontology_subsystem.md)): Houses the evaluation engines and prompt serialization logic.
- **Backend Service Subsystem** ([`docs/systems/backend_service.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/backend_service.md)): Exposes `/api/chat`, `/api/grade`, `/api/materials/analyze`, `/api/materials/tree`, `/api/consolidation/run`, `GET /api/misconceptions/proposed`, and `POST /api/misconceptions/{id}/review`.
- **Edge Functions Subsystem** ([`docs/systems/edge_functions.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docs/systems/edge_functions.md)): Manages file parsing, signed URLs, and async webhook relays.
