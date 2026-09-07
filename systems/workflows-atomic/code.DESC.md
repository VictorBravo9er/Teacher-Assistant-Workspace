# Atomic Workflows Directory — `systems/workflows-atomic/`

This directory contains fine-grained, single-responsibility operational specifications for every discrete atomic task and event-driven pipeline in the **Teach&Learn** platform.

---

## 📁 Directory Files

- [`README.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/README.md): Master taxonomy, atomic workflow catalog, and architectural principles governing atomic task isolation.
- [`templates_and_classes.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/templates_and_classes.md): Atomic tasks for template creation, editing, deletion, class instantiation from template blueprints, blank class creation, and schedule updates (`ATOM-TC-01` through `ATOM-TC-06`).
- [`materials_management.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/materials_management.md): Atomic tasks for binary material upload, link/text creation, signed preview URL resolution, class unlinking, and atomic reference-counted deletion (`ATOM-MAT-01` through `ATOM-MAT-05`).
- [`ai_material_analysis.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/ai_material_analysis.md): Dedicated event-driven atomic workflow for asynchronous AI syllabus analysis, prerequisite gap detection, and ontology mapping triggered by database webhooks (`ATOM-AIM-01`).
- [`students_and_attendance.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/students_and_attendance.md): Atomic tasks for direct student enrollment, invitation token issuance, daily roll-call attendance logging, automated rate recomputation, and report card generation (`ATOM-STU-01` through `ATOM-STU-06`).
- [`submissions_turnin.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/submissions_turnin.md): Dedicated atomic task for student assignment turn-in, storage blob persistence, and database submission creation (`ATOM-SUB-01`).
- [`ai_submission_grading.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/ai_submission_grading.md): Dedicated event-driven atomic workflow for autonomous AI submission grading, rubric scoring, and misconception diagnosis triggered by database webhooks (`ATOM-AIS-01`).
- [`grading_and_evaluation.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/grading_and_evaluation.md): Atomic tasks for fetching AI diagnostics, teacher grade publishing, atomic trigger-based GPA recomputation, batch evaluation sync, and atomic submission deletion (`ATOM-GRD-01` through `ATOM-GRD-05`).
- [`rag_copilot.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/rag_copilot.md): Atomic tasks for dispatching AI copilot prompts, mounting dynamic visualization widgets (`Visualizer.tsx`), persisting multi-turn chat sessions, and switching historical threads (`ATOM-RAG-01` through `ATOM-RAG-04`).
- [`instructions_and_rubrics.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/instructions_and_rubrics.md): Atomic tasks for creating system personas, designing multi-criterion rubrics (`RubricBuilderModal.tsx`), and attaching rubrics to assignments (`ATOM-INS-01` through `ATOM-INS-03`).

---

## 🎯 Purpose & Audience

These specifications provide unambiguous, step-by-step trace models for developers, QA engineers, and automated agents auditing or modifying the exact trigger-to-conclusion lifecycle of any feature in Teach&Learn.

For architectural patterns, state isolation, and idempotency guarantees, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/code.ARCH.md).
