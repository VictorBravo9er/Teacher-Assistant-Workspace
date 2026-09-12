# Teach&Learn — Master Project Roadmap & Milestone Tracker

## 🎯 Primary Goal: Document-Aware Vector RAG, Automated Rubric Grading & Student Submission Pipeline

This master tracker combines the completed **Frontend Teacher Experience & Submissions Suite** with the upcoming **Backend Vector RAG, Autonomous Evaluation & Streaming Infrastructure**.

---

## 🎨 Part I: Frontend Teacher Suite & Interactive Workflow (Completed)

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

### 🤖 Phase 3: AI Pedagogical Diagnostics & Chat Experience
- [x] **3.1 AI Auto-Grading & Diagnostic Review UI (`AIDiagnosticDiffModal.tsx`)**
  - "Diagnose with AI" action in submission grading modal generating suggested rubric scores, gap analyses, and feedback drafts.
  - Interactive "AI Review Diff" modal with checkboxes to selectively accept, tweak via sliders, or reject AI recommendations before saving.
- [x] **3.2 Chat UI Enhancements & Session Export (`RAGClass.tsx`)**
  - Copy individual assistant messages to clipboard with confirmation indicators.
  - Export chat sessions as formatted Markdown files.
  - Quick pedagogical prompt chips and multi-type session initialization modal.

---

### 📊 Phase 4: Class Gradebook, Analytics & Export Hub
- [x] **4.1 Class Gradebook Matrix (`GradebookMatrix.tsx`)**
  - Full tabular grid of all enrolled students vs. scored materials/assignments.
  - Interactive cells opening direct submission review modals.
  - Real-time search, performance tier filtering (`High`, `Average`, `At Risk`), multi-column sorting (Name, Roll, Score, Attendance), and one-click CSV export.
- [x] **4.2 One-Click Parent Briefing & Report Card Generator (`ReportCardModal.tsx`)**
  - Printable and exportable student progress report cards with performance badges, submission summaries, and attendance records.
  - Editable personalized parent briefing notes with browser print formatting.

---

## ⚡ Part II: Backend Vector RAG, Agentic Evaluation & Streaming (Upcoming)

> **Architectural Standard**: The Python FastAPI backend will **not** include the `supabase-py` SDK. All database queries, file downloads, and agent tooling will communicate with Supabase strictly via **PostgREST REST API**, **Storage REST API**, and **dedicated Deno Edge Functions** using async HTTP (`httpx`).

### 🧠 Phase 5: Document Ingestion, Chunking & Vector RAG (`pgvector`)
- [ ] **5.1 Backend Document Extraction & Embedding Pipeline (via Edge Function & REST)**
  - Dedicated Deno Edge Function (`extract-material-text`) to extract text from stored PDFs/docs in Supabase Storage.
  - Python backend fetches clean text chunks via REST, generates vector embeddings, and stores them in PostgreSQL `pgvector`.
- [ ] **5.2 Contextual Material Retrieval in `/api/chat`**
  - Update `ChatService` to perform similarity searches against vectorized class materials based on active scope.
  - Ground LLM prompts in relevant syllabus excerpts, student portfolios, and rubric criteria fetched via REST / Edge Functions.

---

### 🤖 Phase 6: Autonomous Rubric Evaluation Backend Endpoint & Event Triggers
- [x] **6.1 Dedicated Auto-Grading Endpoint (`/api/grade`)**
  - FastAPI endpoint (`/api/grade`) to autonomously evaluate raw student submission text against `materials.rubric_criteria`.
  - Return structured rubric breakdowns (`RubricBreakdownItem`), scores, strength summaries, and pedagogical notes directly to the frontend diff review modal.
  - Implemented `EvaluatorService` and `OntologyService` in backend with strict Pydantic v2 schemas.
- [x] **6.2 Automated AI Evaluation Triggers for Materials & Submissions Pipeline & Hybrid AI Schema**
  - **Hybrid AI Schema & Storage (`schema/schema-ai.sql`)**: Dedicated non-exposed `ai` schema holding material/submission vector embeddings (`pgvector`), ontological knowledge graph (`ontology_concepts`, `ontology_relationships`, `ontology_misconceptions`), material-concept bridges, and student mastery state tracking.
  - **Material Ingestion/Update Trigger**: `trg_material_ai_analysis` automatically dispatches webhooks to `trigger-material-analysis` Edge Function to execute syllabus alignment, prerequisite gap checks, and sample question generation.
  - **Submission Ingestion/Update Trigger**: `trg_submission_ai_eval` automatically dispatches webhooks to `trigger-submission-evaluation` Edge Function to pre-compute rubric evaluations in `ai.submission_evaluations`.
  - **Public Gateway RPCs**: `get_submission_ai_diagnostic`, `get_material_ai_insights`, `get_student_concept_gaps`, and `get_class_concept_matrix` provide authorized, sanitized UI access with strict `auth.uid()` checks.

---

### 🚀 Phase 7: Real-Time Streaming & LangGraph Persistence
- [ ] **7.1 Server-Sent Events (SSE) Streaming**
  - Refactor `/api/chat` from blocking JSON to SSE streaming for instant token-by-token streaming in the chat UI.
- [ ] **7.2 LangGraph PostgreSQL Checkpointing**
  - Connect LangGraph conversation checkpoints (`schema/schema-langgraph.sql`) for robust multi-turn thread persistence.

