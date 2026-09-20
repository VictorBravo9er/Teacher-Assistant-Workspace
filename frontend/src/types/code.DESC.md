# Frontend Types & Interfaces — `src/types/`

This directory defines the authoritative TypeScript domain contracts, UI state models, and database schema interfaces for the frontend application.

---

## 📁 Directory Files

- [`main.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/main.ts): Core frontend TypeScript interfaces and union types:
  - `ClassProject`: Complete classroom entity with nested materials, instructions, students, and submissions.
  - `TeacherTemplate`: Blueprint class structures.
  - `StudentPortfolio`: Student records with grades, attendance, and parent contacts.
  - `LearningMaterial` & `ContentItem`: Mixed-media curriculum items (File, URL, Text) with size/mime metadata and grading criteria schemas.
  - `InstructionGuideline`: AI prompts and behavioral rules.
  - `StudentSubmissionRecord`: Assignment submissions with structured `rubric_breakdown` (`CriterionScoreItem[]`, `EvaluationSummary`).
  - `ChatMessage` & `DiagnosticSession`: AI conversation threads and visualizer schemas.
  - `ViewMode` & `TabType`: UI layout and tab discriminator types.
- [`db.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/db.ts): Auto-generated TypeScript definitions representing PostgreSQL `public` tables, relations, and enums, generated via the Supabase CLI (`scripts/_generate_types.py`).

---

## 💡 Role in the Application

This directory enforces zero-`any` strict type safety across components, custom hooks, and API services.

For type hierarchies, discriminated unions, and schema mapping rules, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/code.ARCH.md).
