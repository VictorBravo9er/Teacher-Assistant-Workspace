# Backend Types & Schemas — `src/types/`

This directory defines the authoritative data models, Pydantic v2 validation contracts, and database schema representations for the backend service.

---

## 📁 Directory Files

- [`schemas.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/types/schemas.py): Core Pydantic v2 data models defining the chat and classroom API contract (`Message`, `Material`, `Instruction`, `Student`, `StudentGrade`, `AnalysisConfig`, `ChatPayload`).
- [`ai.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/types/ai.py): Strict Pydantic v2 models for autonomous rubric evaluation (`GradeRequest`, `GradeResponse`, `RubricBreakdownItem`), material syllabus ingestion analysis (`MaterialAnalyzeRequest`, `MaterialAnalyzeResponse`, `SyllabusAlignmentItem`, `PrerequisiteGapItem`, `SampleQuestionItem`), and ontological knowledge graph representations (`OntologyConcept`, `OntologyRelationship`, `StudentConceptMastery`).
- [`db.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/types/db.py): Auto-generated Python TypedDict contracts mirroring the PostgreSQL `public` database tables (`classes`, `students`, `materials`, `instructions`, `student_submissions`, etc.), produced via the Supabase CLI.

---

## 💡 Role in the Application

This directory establishes strict static typing boundaries across the backend, ensuring zero-warning Pyright validation and runtime request validation.

For model schemas, inheritance structures, and database mapping details, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/types/code.ARCH.md).
