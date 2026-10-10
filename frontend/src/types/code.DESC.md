# Frontend Types & Interfaces — `src/types/`

This directory defines the authoritative TypeScript domain contracts, UI state models, and database schema interfaces for the frontend application.

---

## 📁 Directory Files

- [`main.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/main.ts): Core frontend TypeScript interfaces and union types:
  - `ClassModel`: Complete classroom entity with nested materials, instructions, students, and ragSessions.
  - `Template`: Blueprint curriculum structures.
  - `Student`: Student records with grades, attendance, custom fields, and parent contacts.
  - `Material` & `ContentItem`: Mixed-media curriculum items (File, URL, Text) with size/mime metadata and grading criteria schemas.
  - `Instruction`: AI prompts, personas, and behavioral rules.
  - `StudentSubmission`: Assignment submissions with structured `rubric_breakdown` (`CriterionScoreItem[]`, `EvaluationSummary`).
  - `Message` & `RAGSession`: AI conversation threads and visualizer schemas.
  - `Announcement` & `NotificationLog`: Classroom announcements and Resend email audit records.
- [`db.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/db.ts): Auto-generated TypeScript definitions representing PostgreSQL `public` tables, relations, and enums, generated via the Supabase CLI (`scripts/_generate_types.py`).

---

## 💡 Role in the Application

This directory enforces zero-`any` strict type safety across components, custom hooks, and API services.

For type hierarchies, discriminated unions, and schema mapping rules, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/code.ARCH.md).
