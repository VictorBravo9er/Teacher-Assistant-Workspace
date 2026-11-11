# Didactiq — Master Project Roadmap & Milestone Tracker

## 🎯 Primary Goal: Lean Dual-Engine Knowledge Store (Trees + Concept Ontology), Automated Rubric Grading & LMS Pipeline

This master tracker combines the completed **Frontend LMS Experience & Submissions Suite** and **FastAPI Dual-Engine Knowledge Backend** with the remaining **Rich File Extraction, UI Diagnostic Wiring, Schema Snapshots & Streaming Infrastructure**.

---

## 🎨 Part I: Frontend Teacher & Student Suite (Completed Core LMS)

### 📋 Phase 1: Interactive Student Submission & Grading Suite
- [x] **1.1 Submission Review & Rubric Grading Suite (`SubmissionGradingModal.tsx`, `AIDiagnosticDiffModal.tsx`)**
  - Dedicated submission review modal allowing teachers to inspect student work (documents, text, links).
  - Interactive rubric breakdown editor with criteria score sliders, number inputs, dynamic totals, and percentage calculation.
  - Multi-channel feedback fields: public student feedback, private teacher notes, and status switcher (`Assigned` ➔ `Pending` ➔ `Submitted` ➔ `Evaluated` ➔ `Graded`).
- [x] **1.2 Student Submission Upload & Attendance Logging (`StudentSubmissionUploadModal.tsx`, `AttendanceManagerModal.tsx`)**
  - Student work upload modal enabling manual/simulated submission turn-ins with File, URL, or Text modes.
  - Bulk daily attendance manager with visual status selector (`Present`, `Absent`, `Late`, `Excused`) and attendance percentage calculations.

---

### 📄 Phase 2: Secure Material Preview & Rubric Builder
- [x] **2.1 Document & Media Preview Modal (`MaterialPreviewModal.tsx`)**
  - Integration with `get-material-url` Supabase Edge Function to retrieve temporary signed URLs for private bucket files.
  - In-app preview modal supporting embedded PDF viewing, image rendering, and external links with fullscreen mode.
- [x] **2.2 Material Rubric Builder UI (`RubricBuilderModal.tsx`)**
  - Visual rubric builder for assignment/test creation with criteria names, descriptions, max points, and automatic weight totaling.
  - Preset library for Mathematics, Analytical Writing, Science Lab Reports, and Oral Presentations.

---

### 🤖 Phase 3: AI Diagnostic Diff & Chat UI Foundation
- [x] **3.1 AI Diagnostic Review Modal (`AIDiagnosticDiffModal.tsx`)**
  - "Diagnose with AI" button in `SubmissionGradingModal.tsx` opening the interactive "AI Review Diff" modal with checkboxes and sliders before saving. *(Currently backed by a local heuristic baseline stub in `SubmissionGradingModal.tsx` pending live `POST /api/grade` / `get_submission_ai_diagnostic()` wiring.)*
- [x] **3.2 Chat UI & Session Management (`RAGClass.tsx`)**
  - Copy individual assistant messages to clipboard with confirmation indicators.
  - Export chat sessions as formatted Markdown files.
  - Quick pedagogical prompt chips, session CRUD via `chatService`, and synchronous `/api/chat` JSON integration via `useAIChat`.

---

### 📊 Phase 4: Class Gradebook, Analytics & Export Hub
- [x] **4.1 Class Gradebook Matrix (`GradebookMatrix.tsx`)**
  - Full tabular grid of all enrolled students vs. scored materials/assignments.
  - Interactive cells opening direct submission review modals.
  - Real-time search, performance tier filtering (`High`, `Average`, `At Risk`, `Unassessed`), multi-column sorting (Name, Roll, Score, Attendance), and one-click CSV export.
- [x] **4.2 One-Click Parent Briefing & Report Card Generator (`ReportCardModal.tsx`)**
  - Printable and exportable student progress report cards with performance badges, submission summaries, and attendance records.
  - Editable personalized parent briefing notes with browser print formatting.

---

## ⚡ Part II: Lean Dual-Engine AI Backend, Integrations & Streaming

> **Architectural Standard**: Direct Postgres access (`psycopg_pool` in `backend/src/lib/db.py`) powers the Dual-Engine Knowledge Store (`ai.material_trees` JSONB trees + `ai.ontology_*` relational concept graph, avoiding vector index bloat) alongside OpenRouter LLM orchestration (`ChatOpenAI`), while Supabase Auth, Storage, PostgREST, and Deno Edge Functions manage LMS state and event workers.

### 🧠 Phase 5: Hierarchical Trees, Concept Ontology & Document Extraction
- [x] **5.1 Dual-Engine Knowledge Schema & Services (`TreeIndexerService`, `OntologyService`, `ChatService`, `ConsolidationService`)**
  - `ai.material_trees` JSONB hierarchical section index + `POST /api/materials/tree` + `TreeIndexerService.traverse_tree()`.
  - `ai.ontology_concepts` (OKF v0.2), `ai.ontology_relationships` (`chk_relationship_type`), `ai.material_concept_mappings`, `ai.ontology_misconceptions`, `ai.student_concept_mastery`, `ai.consolidation_runs`, `ai.knowledge_lint_reports`, `ai.staging_scratchpad`, and `ai.check_answerable()`.
  - Dual-Engine retrieval in `POST /api/chat` + daily graph integrity & Misconception Dreaming in `POST /api/consolidation/run`.
- [x] **5.2 Rich Binary & Scanned Material Extraction (`_shared/documentExtractor.ts`, `_shared/assetPersistence.ts`)**
  - Upgraded `extract-material-text`, `trigger-material-analysis`, and `trigger-submission-evaluation` with pure-Deno binary PDF (`unpdf`), OOXML (`fflate` DOCX/PPTX/XLSX), HTML/CSV/SVG Markdown normalization, native `Text` `value`, `page_count`/`class_id` forwarding, OpenRouter Vision discernment/OCR, and self-contained `ai.document_assets` knowledge graph visual storage (textual description and/or inline `image_base64` with zero Storage bucket dependencies; *(deployed automatically via `.github/workflows/cd.yml` when merged to `main`)*).
- [ ] **5.3 Frontend Soft-Warning & `class_id` Copilot Wiring**
  - Pass explicit `class_id` and surface the interactive `ai.check_answerable` confirmation retry (`confirmed_soft_warning: true`) inside `useAIChat.ts` / `RAGClass.tsx`.

---

### 🤖 Phase 6: Autonomous Evaluation Triggers, Schema Alignment & Frontend AI Wiring
- [x] **6.1 Dedicated FastAPI AI Endpoints & Public Gateway RPCs**
  - FastAPI endpoints live: `/api/chat`, `/api/grade`, `/api/materials/analyze`, `/api/materials/tree`, `/api/consolidation/run`, `/api/misconceptions/proposed`, `/api/misconceptions/{misconception_id}/review`.
  - Public Gateway RPCs deployed: `get_submission_ai_diagnostic`, `get_material_ai_insights`, `get_student_concept_gaps`, `get_class_concept_matrix`.
- [ ] **6.2 Frontend AI Component Integrations**
  - Wire `"Diagnose with AI"` in `SubmissionGradingModal.tsx` to `POST /api/grade` / `get_submission_ai_diagnostic()`.
  - Surface `GET /api/misconceptions/proposed` & `POST /api/misconceptions/{id}/review` badges inside `GradebookMatrix.tsx`.
  - Surface `get_student_concept_gaps()` in `StudentDetailModal.tsx` and `get_material_ai_insights()` in `MaterialPreviewModal.tsx`.
- [x] **6.3 Backend/SQL Alignment & Schema Snapshot Refresh**
  - Aligned `evaluator.py` `eval_sql` placeholder/parameter count, `ontology.py`/`ai.py` column names (`teacher_reviewer_id`, `teacher_reviewed_at`) and enums (`chk_relationship_type`, `check_answerable` `'VERIFIED' | 'INCOMPLETE_WARNING'`).
  - Regenerated `supabase/schemas/schema.ai.sql` (`make db-dump-schema`) and verified generated DB types (`make types`).
- [ ] **6.4 Remaining Calibration, DB Triggers & Token Enforcement**
  - Upgrade `OntologyService.update_student_mastery()` to smoothed EMA ($\alpha = 0.35$) calibration and add dynamic token budget enforcement.
  - Re-enable commented-out `trg_material_ai_analysis` / `trg_submission_ai_eval` triggers once edge/backend secrets are active.

---

### 🚀 Phase 7: Real-Time Streaming, LangGraph Persistence & Test Suite
- [ ] **7.1 Server-Sent Events (SSE) Streaming & Turn Persistence**
  - Refactor `/api/chat` from blocking JSON to SSE streaming for live token delivery in `RAGClass.tsx`, and persist every message turn via `chatService.updateSession()`.
- [ ] **7.2 LangGraph PostgreSQL Checkpointing & Automated Backend Tests**
  - Wire `langgraph` schema checkpoints (`supabase/schemas/schema.langgraph.sql`) into `/api/chat` multi-turn execution and implement backend pytest suites (`backend/tests/`).

