# Classroom Management Feature Module — `src/features/classroom/`

This directory provides components for configuring classes, managing learning materials, building rubrics, and visualizing the complete class gradebook.

---

## 📁 Directory Files

- [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx): The central classroom configuration tab panel. Houses:
  - **Class Profile Tab**: Form for subject, academic year, semester, teaching style, assessment preferences, and special notes.
  - **Materials Repository Tab**: Curriculum materials list with upload dialogs, grading criteria badges, and preview triggers.
  - **Class Guidelines Tab**: Curriculum guidelines, rubric rules, and marking instructions manager.
- [`CreateClassModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/CreateClassModal.tsx): Multi-step modal for creating new classes with institute autocomplete, custom institute registration, optional base curriculum template selection, and material duplication strategy (Fork/Independent Copies vs Shared Reference).
- [`GradebookMatrix.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/GradebookMatrix.tsx): Comprehensive tabular gradebook grid mapping enrolled students against all assigned materials, with performance tier filtering (`High`, `Average`, `At Risk`), search, multi-column sorting, and CSV export.
- [`MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx): In-app document and media previewer supporting embedded PDFs, images, external URLs, and secure signed URLs retrieved from `get-material-url`.
- [`RubricBuilderModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/RubricBuilderModal.tsx): Visual grading criteria builder for assignments and exams, supporting weight scoring, criteria descriptions, presets, and Public (Base) vs Class-Private (Augmented) criterion scoping with interactive badges.

---

## 💡 Role in the Application

This module provides the primary workspace panels for classroom administration, rubric design, curriculum repository management, and grade evaluation.

For component contracts, tab state machines, and grade calculation architecture, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/code.ARCH.md).
