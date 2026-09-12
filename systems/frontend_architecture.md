# Frontend Architecture & Component Subsystem

The **Frontend Subsystem** is a Single-Page Application (SPA) built with **React 18**, **TypeScript** (strict mode), **Vite**, and **Tailwind CSS**. It provides an intuitive workspace for educators to manage classes, construct curriculum rubrics, review student work with AI-assisted grading, and visualize learning analytics.

---

## 1. Directory Structure & Layering

```
frontend/src/
├── main.tsx                    # React root entrypoint mounting App with AuthProvider
├── App.tsx                     # Top-level view routing (LandingPage -> AuthPage -> ClassApp)
├── index.css                   # Global Tailwind directives, scrollbars, and design system variables
├── views/                      # Primary full-screen view containers
│   ├── LandingPage.tsx         # Public marketing, feature overview, and login entry
│   ├── AuthPage.tsx            # Supabase Auth login, signup, and password recovery forms
│   └── ClassApp.tsx            # Master application workspace with sidebar navigation
├── features/                   # Domain-driven feature modules
│   ├── classroom/              # Class detail tabs, materials, instructions, gradebook, rubrics
│   ├── students/               # Student roster, attendance manager, report cards, submission grading
│   ├── ai-assistant/           # Interactive RAG copilot, AI diagnostic review diffs, visualizer widgets
│   └── account/                # User profile, institute configuration, and workspace settings
├── hooks/                      # Custom React state and business logic hooks
│   ├── useWorkspaceData.ts     # Workspace-wide data fetching (institutes, classes, templates)
│   ├── useClassOperations.ts   # Active class CRUD mutations (materials, students, gradebook, attendance)
│   ├── useAIChat.ts            # Chat stream state, session history, and prompt orchestration
│   └── useTheme.ts             # Theme management (dark/light mode, custom color schemes)
├── contexts/                   # React context providers
│   └── AuthContext.tsx         # Supabase authentication session lifecycle
├── services/                   # Typed API service clients connecting to Supabase and FastAPI
│   ├── classService.ts         # Class, template, and enrollment queries
│   ├── studentService.ts       # Student directory, submissions, attendance, and scores
│   ├── materialService.ts      # Curriculum resources, blob uploads, and text extraction
│   ├── instructionService.ts   # System personas, guidelines, and rubrics
│   ├── templateService.ts      # Curriculum template instantiation
│   └── chatService.ts          # Backend /api/chat communication client
└── lib/                        # Shared utility libraries
    ├── supabase.ts             # Initialized Supabase client instance
    ├── storage.ts              # Storage bucket upload, download, and URL resolution helpers
    ├── studentCalculations.ts  # Gradebook statistics, GPA conversions, and tier logic
    └── themeStyles.ts          # Dynamic Tailwind style mapping utilities
```

---

## 2. Top-Level State Flow & View Routing

The application uses declarative state routing coordinated in `App.tsx` and `AuthContext.tsx`:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Init["App Launch"] --> AuthCheck{"AuthContext: Check Active Session"}
    
    AuthCheck -- "No Session" --> LandingView["LandingPage.tsx (Public Showcase)"]
    LandingView -- "Click Login / Signup" --> AuthView["AuthPage.tsx (Supabase Auth Forms)"]
    AuthView -- "Successful Login" --> ClassWorkspace["ClassApp.tsx (Main Workspace)"]
    
    AuthCheck -- "Active Session Found" --> ClassWorkspace
    
    subgraph ClassAppViews["ClassApp.tsx Navigation Modes"]
        ClassDetailsTab["Class Details (Materials & Instructions)"]
        GradebookTab["Gradebook Matrix (Submissions & Scores)"]
        StudentsTab["Student Directory (Profiles & Attendance)"]
        TemplatesTab["Curriculum Templates (Blueprint Library)"]
        AIChatDrawer["AI Copilot Drawer (RAG Assistant)"]
    end

    ClassWorkspace --> ClassDetailsTab
    ClassWorkspace --> GradebookTab
    ClassWorkspace --> StudentsTab
    ClassWorkspace --> TemplatesTab
    ClassWorkspace --> AIChatDrawer
```

---

## 3. Core Feature Modules

### 3.1 Classroom Management (`features/classroom/`)
- **`ClassDetails.tsx`**: Central hub displaying class metadata, syllabus materials, active AI instructions, and quick action bars.
- **`CreateClassModal.tsx`**: Multi-step modal for creating new classes from scratch or cloning reusable templates.
- **`GradebookMatrix.tsx`**: Realtime spreadsheet-style matrix cross-referencing enrolled students against assigned materials, displaying current scores, submission badges (`Submitted`, `Evaluated`, `Graded`), and class averages.
- **`MaterialPreviewModal.tsx`**: Interactive document viewer displaying extracted content, syllabus topic tags, prerequisite gap warnings, and sample questions from the AI analysis engine.
- **`RubricBuilderModal.tsx`**: Visual rubric builder allowing teachers to construct multi-criterion rubrics with custom point weights and evaluation criteria.

---

### 3.2 Student Portfolios & Assessment (`features/students/`)
- **`StudentRegister.tsx`**: Comprehensive student directory with search, performance tier filters (`Advanced`, `Proficient`, `Developing`, `Critical Support`), and batch enrollment actions.
- **`StudentDetailModal.tsx`**: 360-degree student portfolio showing cumulative GPA, assignment history, attendance trajectory, and identified concept mastery gaps.
- **`AttendanceManagerModal.tsx`**: Fast daily roll-call modal supporting quick status marking (`Present`, `Absent`, `Late`, `Excused`) with aggregate attendance rate recalculation.
- **`ReportCardModal.tsx`**: Printable and exportable student report card generator compiling grades, attendance records, teacher comments, and AI-assisted performance summaries.
- **`SubmissionGradingModal.tsx`**: Side-by-side grading workbench allowing teachers to review student work, view AI-suggested criterion scores, adjust points, and author student feedback.

---

### 3.3 AI Assistant & Visualizer (`features/ai-assistant/`)
- **`RAGClass.tsx`**: Interactive AI Copilot sliding drawer providing conversational pedagogical assistance, lesson planning recommendations, and automated assignment drafting.
- **`AIDiagnosticDiffModal.tsx`**: Visual diff modal presenting side-by-side comparison between existing student grades and AI-recommended rubric evaluations before publishing to the gradebook.
- **`Visualizer.tsx`**: Dynamic chart and data widget renderer supporting comparative bar charts, class mastery heatmaps, student rankings, timeline trajectories, and KPI stat counters.

---

## 4. Custom React Hooks & State Management

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    subgraph CustomHooks["Custom React Hooks"]
        HookWorkspace["useWorkspaceData()"]
        HookClass["useClassOperations()"]
        HookChat["useAIChat()"]
        HookTheme["useTheme()"]
    end

    subgraph ServiceLayer["Typed Service Layer"]
        SvcClass["classService"]
        SvcStudent["studentService"]
        SvcMat["materialService"]
        SvcChat["chatService"]
    end

    subgraph BackendTargets["Remote Backends"]
        SupaPostgres[("Supabase PostgreSQL (via PostgREST)")]
        FastAPIBackend["FastAPI Backend (/api/chat, /api/grade)"]
    end

    HookWorkspace --> SvcClass
    HookClass --> SvcClass
    HookClass --> SvcStudent
    HookClass --> SvcMat
    HookChat --> SvcChat

    SvcClass --> SupaPostgres
    SvcStudent --> SupaPostgres
    SvcMat --> SupaPostgres
    SvcChat --> FastAPIBackend
```

### Hook Responsibilities:
1. **`useWorkspaceData`**:
   - Fetches and caches the user's institutes, active classes, and curriculum templates on login.
   - Manages active institute and class selection states.
2. **`useClassOperations`**:
   - Manages granular data for the active class (students roster, linked materials, class instructions, running submissions, attendance records).
   - Exposes clean mutation handlers (`handleAddMaterial`, `handleUpdateMaterial`, `handleDeleteMaterial`, `handleAddStudent`, `handleGradeSubmission`, `handleLogAttendance`) with optimistic UI updates and error rollbacks.
3. **`useAIChat`**:
   - Manages active chat thread messages, streaming state, session history switching, and contextual prompt injection.
4. **`useTheme`**:
   - Controls application light/dark theme toggles and dynamic brand styling variables.
