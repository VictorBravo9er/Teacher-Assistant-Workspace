# Shared Domain Components — `src/components/shared/`

This directory provides composite domain-aware form controls, autocompletion fields, multi-select pickers, brand graphics, and customized confirmation dialogs.

---

## 📁 Directory Files

- [`BrandLogo.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/BrandLogo.tsx): SVG-based brand logo component rendering the Teach&Learn emblem and wordmark with customizable size, typography styles, and theme variants.
- [`CustomDialogs.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/CustomDialogs.tsx): Declarative modal dialogs for confirming destructive actions (e.g. class or template deletions) and rendering informative error/success alerts.
- [`InstituteAutocompleteField.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/InstituteAutocompleteField.tsx): High-performance client-side autocomplete component searching cached educational institutes with multi-token fuzzy matching and keyboard navigation.
- [`InteractiveGradingSimulator.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/InteractiveGradingSimulator.tsx): 3D isometric interactive CSS/React animated simulator modeling the end-to-end pedagogical evaluation workflow (document ingestion, laser OCR scanning, rubric diff calculation, misconception alerts, and teacher-in-the-loop approval).
- [`MultiSelect.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/MultiSelect.tsx): Tag-based multi-selection dropdown component used for selecting teaching styles, assessment preferences, and curriculum tags.

---

## 💡 Role in the Application

These components encapsulate repetitive form logic, search filtering, and confirmation modals across class creation, settings, and student roster views.

For component interfaces, autocomplete contracts, and dropdown state flow, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/code.ARCH.md).
