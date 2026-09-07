# Shared Domain Components — `src/components/shared/`

This directory provides composite domain-aware form controls, autocompletion fields, multi-select pickers, brand graphics, and customized confirmation dialogs.

---

## 📁 Directory Files

- [`BrandLogo.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/BrandLogo.tsx): SVG-based brand logo component rendering the Teach&Learn emblem and wordmark with customizable size, typography styles, and theme variants.
- [`CustomDialogs.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/CustomDialogs.tsx): Declarative modal dialogs for confirming destructive actions (e.g. class or template deletions) and rendering informative error/success alerts.
- [`FuzzyAutocompleteField.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/FuzzyAutocompleteField.tsx): Generic type-ahead text input supporting fuzzy matching, custom option creation, and keyboard navigation.
- [`InstituteAutocompleteField.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/InstituteAutocompleteField.tsx): Specialized autocomplete component for searching existing educational institutes from the database or initiating a new institute registration flow.
- [`MultiSelect.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/MultiSelect.tsx): Tag-based multi-selection dropdown component used for selecting teaching styles, assessment preferences, and curriculum tags.

---

## 💡 Role in the Application

These components encapsulate repetitive form logic, search filtering, and confirmation modals across class creation, settings, and student roster views.

For component interfaces, autocomplete contracts, and dropdown state flow, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/shared/code.ARCH.md).
