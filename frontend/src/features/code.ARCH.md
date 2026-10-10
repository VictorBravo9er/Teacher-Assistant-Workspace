# Feature Architecture & Domain Boundaries

This document details the domain breakdown and cross-feature interaction patterns in `frontend/src/features/`.

---

## 1. Feature Interaction & Data Flow Architecture

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    ClassApp["views/ClassApp.tsx (Teacher Shell)"]
    StudentApp["views/StudentApp.tsx (Student Shell)"]
    
    subgraph Features["Feature Modules"]
        Classroom["classroom/ (ClassDetails, GradebookMatrix, RubricBuilder)"]
        Students["students/ (StudentRegister, SubmissionGrading, Attendance)"]
        StudentPortal["student-portal/ (StudentTurnInModal)"]
        Calendar["calendar/ (CalendarView)"]
        AI["ai-assistant/ (RAGClass, AIDiagnosticDiffModal, Visualizer)"]
        Account["account/ (AccountModals)"]
    end

    ClassApp --> Classroom
    ClassApp --> Students
    ClassApp --> Calendar
    ClassApp --> AI
    ClassApp --> Account

    StudentApp --> StudentPortal
    StudentApp --> Calendar

    Classroom -.->|Grading Modal Trigger| Students
    Students -.->|AI Diagnostic Request| AI
    AI -.->|Apply Suggested Scores| Students
```

---

## 2. Core Domain Invariants

1. **Feature Encapsulation**: Each feature folder contains self-contained modals, forms, and view panels that interact with shared state via hooks (`useClassOperations`, `useAIChat`, `useWorkspaceData`).
2. **Modal Portals & State Lift**: Complex sub-flows (e.g. AI-assisted grading) lift state to `ClassApp.tsx` or `useClassOperations.ts` to ensure consistent data persistence across classroom views.
