# Classroom Architecture & Gradebook Data Model

This document details the tab state management, rubric construction pipelines, and grade matrix calculations in `frontend/src/features/classroom/`.

---

## 1. Classroom State Architecture & Tab Management

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    ClassApp["ClassApp.tsx (Active Class Context)"] --> ClassDetails["ClassDetails.tsx"]
    
    subgraph Tabs["Active Tab State"]
        Profile["Profile Tab (Editing & Metadata)"]
        Materials["Materials Tab (Repository List)"]
        Instructions["Guidelines Tab (Class Guidelines & Rubric Rules)"]
    end

    ClassDetails --> Tabs
    Materials --> PreviewModal["MaterialPreviewModal.tsx (Signed URLs)"]
    Materials --> RubricBuilder["RubricBuilderModal.tsx (Criteria Weighting)"]
    
    ClassApp --> Gradebook["GradebookMatrix.tsx"]
    Gradebook --> SubmissionGrading["SubmissionGradingModal (Cell Click)"]
```

---

## 2. Component Design & Mathematical Invariants

1. **Grading Criteria Builder Computation (`RubricBuilderModal.tsx`)**:
   - Maintains an array of `RubricCriterion` objects (`{ id, name, description, maxScore, weight }`).
   - Dynamically computes `totalMaxScore = sum(criteria.map(c => c.maxScore))` and displays scoring weights in real-time.
2. **Gradebook Matrix Virtualization & Filtering (`GradebookMatrix.tsx`)**:
   - Derives composite student grades by aggregating all `student_submissions` for the active class.
   - Computes weighted overall percentage and maps students to performance tiers (`High: >=85%`, `Average: 65-84%`, `At Risk: <65%`).
   - Offers client-side CSV generation with UTF-8 BOM encoding for direct spreadsheet import.
3. **Secure File Streaming (`MaterialPreviewModal.tsx`)**:
   - For private bucket files, calls the `get-material-url` Edge Function with `{ class_id, material_id, content_item_id }` to retrieve a short-lived signed URL, avoiding public asset exposure.
