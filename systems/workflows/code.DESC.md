# Workflows Documentation Directory — `systems/workflows/`

This directory contains in-depth, step-by-step operational flow specifications and sequence diagrams for all user and system lifecycles in the **Teach&Learn** platform.

---

## 📁 Directory Files

- [`README.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/README.md): Master workflow index, quick reference navigation matrix, and architectural principles governing platform operations.
- [`template_workflows.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/template_workflows.md): Complete lifecycle workflows for creating curriculum templates, bundling materials and rubrics, and instantiating new classes from template blueprints.
- [`material_workflows.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/material_workflows.md): Detailed workflows for uploading educational materials (files, URLs, text), asynchronous AI syllabus analysis, signed URL preview generation, and unlinking vs. atomic reference-counted deletion.
- [`student_roster_workflows.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/student_roster_workflows.md): Operational flows for student enrollment, daily roll-call attendance tracking, aggregate rate recalculation, 360 student portfolio diagnostics, and report card generation.
- [`submission_and_grading_workflows.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/submission_and_grading_workflows.md): End-to-end workflows for student assignment turn-ins, event-driven autonomous AI grading, side-by-side diagnostic diff reviews, and atomic gradebook score synchronization.
- [`rag_copilot_workflows.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/rag_copilot_workflows.md): Interactive AI Copilot workflows covering prompt context aggregation, LLM streaming, dynamic visualization widget rendering (`Visualizer.tsx`), and multi-turn session persistence.
- [`instruction_rubric_workflows.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/instruction_rubric_workflows.md): Workflows for creating system personas, configuring pedagogical guidelines, constructing visual rubrics (`RubricBuilderModal.tsx`), and enforcing multi-criterion assessments.

---

## 🎯 Purpose & Audience

The files in this directory provide complete end-to-end trace documentation for developers, engineers, and AI assistants to understand, test, and maintain user journeys and backend dataflows across the entire application stack.

For structural patterns and workflow execution contracts, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows/code.ARCH.md).
