# Frontend Architecture & Component Subsystem

The **Frontend Subsystem** is a Single-Page Application (SPA) built with **React 19**, **TypeScript** (strict mode), **Vite**, and **Tailwind CSS**. It provides an intuitive workspace for educators to manage classes, construct curriculum rubrics, review student work with AI-assisted grading, and visualize learning analytics.

---

## 1. Directory Structure & Layering

```
frontend/src/
├── main.tsx                    # React root entrypoint mounting App with AuthProvider
├── App.tsx                     # Top-level view routing (LandingPage -> AuthPage -> ClassApp / StudentApp)
├── index.css                   # Global Tailwind directives, scrollbars, and design system variables
├── views/                      # Primary full-screen view containers
│   ├── LandingPage.tsx         # Public marketing, feature overview, and login entry
│   ├── AuthPage.tsx            # Supabase Auth login, signup, and password recovery forms
│   ├── ClassApp.tsx            # Master educator workspace with sidebar navigation
│   └── StudentApp.tsx          # Dedicated student portal (course selector, coursework, turn-in, grades)
├── features/                   # Domain-driven feature modules
│   ├── classroom/              # Class detail tabs, materials, instructions, gradebook, rubrics
│   ├── students/               # Student roster, attendance manager, report cards, submission grading
│   ├── student-portal/         # Student self-service interactions (StudentTurnInModal)
│   ├── calendar/               # Academic schedule & milestone calendar (CalendarView)
│   ├── ai-assistant/           # Interactive RAG copilot, AI diagnostic review diffs, visualizer widgets
│   └── account/                # User profile, institute configuration, and workspace settings
├── components/                 # Three-tier reusable UI components
│   ├── layout/                 # High-level workspace layout (Sidebar, CommandPalette)
│   ├── shared/                 # Composite components (BrandLogo, CustomDialogs, MultiSelect, InstituteAutocompleteField, InteractiveGradingSimulator)
│   └── ui/                     # Atomic primitives (Button, Badge, Card, Input, Modal, barrel index)
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
│   ├── studentPortalService.ts # Student portal data access (enrolled classes, assignments, turn-in)
│   ├── materialService.ts      # Curriculum resources, blob uploads, and text extraction
│   ├── announcementService.ts  # Announcement notices CRUD and pinning
│   ├── notificationService.ts  # Notification dispatch via Resend Edge Functions & audit logs
│   ├── instructionService.ts   # System personas, guidelines, and rubrics
│   ├── templateService.ts      # Curriculum template instantiation
│   ├── instituteService.ts     # Educational institute directory with 1-hr TTL client cache
│   └── chatService.ts          # Backend /api/chat communication client
├── lib/                        # Shared utility libraries
│   ├── supabase.ts             # Initialized Supabase client instance
│   ├── storage.ts              # LocalStorage cache wrapper (secureStorage) and upload helpers
│   ├── studentCalculations.ts  # Gradebook statistics, GPA conversions, and tier logic
│   ├── logger.ts               # Namespaced colored console logging with performance timers
│   └── themeStyles.ts          # Dynamic Tailwind style mapping utilities
├── data/                       # Static reference datasets
│   └── geography.ts            # Indian states, union territories, and districts reference data
└── types/                      # Domain and schema type definitions
    ├── main.ts                 # Application domain models, interfaces, and unions
    └── db.ts                   # Read-only auto-generated Supabase PostgreSQL database types
```

---

## 2. Top-Level State Flow & View Routing

The application uses declarative state routing coordinated in `App.tsx` and `AuthContext.tsx`. Authenticated sessions are role-branched: users with role `'student'` are routed to the dedicated `StudentApp.tsx` portal, while educators (`'teacher'` or default) are routed to the full `ClassApp.tsx` workspace.

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Init["App Launch"] --> AuthCheck{"AuthContext: Check Active Session"}
    
    AuthCheck -- "No Session" --> LandingView["LandingPage.tsx (Public Showcase)"]
    LandingView -- "Click Login / Signup" --> AuthView["AuthPage.tsx (Supabase Auth Forms)"]
    
    AuthCheck -- "Active Session Found" --> RoleBranch{"User Role Check"}
    AuthView -- "Successful Login" --> RoleBranch
    
    RoleBranch -- "role === 'teacher'" --> ClassWorkspace["ClassApp.tsx (Educator Workspace)"]
    RoleBranch -- "role === 'student'" --> StudentPortal["StudentApp.tsx (Student Portal)"]
    
    subgraph ClassAppViews["ClassApp.tsx Navigation Modes"]
        ClassDetailsTab["Class Details (Materials, Instructions, Announcements)"]
        GradebookTab["Gradebook Matrix (Submissions & Scores)"]
        StudentsTab["Student Directory (Profiles & Attendance)"]
        TemplatesTab["Curriculum Templates (Blueprint Library)"]
        AIChatDrawer["AI Copilot Drawer (RAG Assistant)"]
        ClassCalendarTab["Calendar (Deadlines & Schedule)"]
    end

    subgraph StudentAppViews["StudentApp.tsx Sub-Tabs"]
        StudentAssignments["Assignments (Turn-In & Status Badges)"]
        StudentCoursework["Coursework (Files, URLs, Notes)"]
        StudentAnnouncements["Announcements (Class Feed)"]
        StudentCalendar["Calendar (Due Dates & Events)"]
        StudentGrades["Grades (Evaluations & Feedback)"]
    end

    ClassWorkspace --> ClassDetailsTab
    ClassWorkspace --> GradebookTab
    ClassWorkspace --> StudentsTab
    ClassWorkspace --> TemplatesTab
    ClassWorkspace --> AIChatDrawer
    ClassWorkspace --> ClassCalendarTab

    StudentPortal --> StudentAssignments
    StudentPortal --> StudentCoursework
    StudentPortal --> StudentAnnouncements
    StudentPortal --> StudentCalendar
    StudentPortal --> StudentGrades
```

---

## 3. Core Feature Modules

### 3.1 Classroom Management (`features/classroom/`)
- **`ClassDetails.tsx`**: Central hub displaying class metadata, syllabus materials, active AI instructions, class announcements, and quick action bars. Profile Edit/Save/Cancel controls (`class-profile-edit-button`, `class-profile-save-button`, `class-profile-cancel-button`) reside directly inside the **Class Profile** tab header (`class-details-tab-profile`), while CRUD buttons for **Materials** (`materials-upload-file-button`, remove `Trash2`) and **Class Guidelines** (`instructions-new-guideline-button`, delete `Trash2`) are always visible.
- **`CreateClassModal.tsx`**: Multi-step modal for creating new classes from scratch or cloning reusable templates.
- **`GradebookMatrix.tsx`**: Realtime spreadsheet-style matrix cross-referencing enrolled students against assigned materials, displaying current scores, submission badges (`Submitted`, `Evaluated`, `Graded`), and class averages.
- **`MaterialPreviewModal.tsx`**: Interactive document viewer displaying extracted content, syllabus topic tags, prerequisite gap warnings, and sample questions from the AI analysis engine.
- **`RubricBuilderModal.tsx`**: Visual rubric builder allowing teachers to construct multi-criterion rubrics with custom point weights and evaluation criteria.

---

### 3.2 Student Portfolios & Assessment (`features/students/`)
- **`StudentRegister.tsx`**: Comprehensive student directory with search, performance tier filters (`Advanced`, `Proficient`, `Developing`, `Critical Support`), and batch enrollment actions with 0ms optimistic student invitation.
- **`StudentDetailModal.tsx`**: 360-degree student portfolio showing cumulative GPA, assignment history, attendance trajectory, identified concept mastery gaps, and a section-scoped `Edit / Save / Cancel` toggle (`student-detail-edit-dossier-button`, `student-detail-save-dossier-button`, `student-detail-cancel-dossier-button`) governing **Contact Dossier** and **Family & Guardians**.
- **`AttendanceManagerModal.tsx`**: Fast daily roll-call modal supporting quick status marking (`Present`, `Absent`, `Late`, `Excused`) with aggregate attendance rate recalculation.
- **`ReportCardModal.tsx`**: Printable and exportable student report card generator compiling grades, attendance records, teacher comments, and AI-assisted performance summaries.
- **`SubmissionGradingModal.tsx`**: Side-by-side grading workbench allowing teachers to review student work, view AI-suggested criterion scores, adjust points, and author student feedback.
- **`StudentSubmissionUploadModal.tsx`**: Teacher-assisted submission modal allowing educators to directly upload, link, or record student assignment submissions on behalf of students.

---

### 3.3 Student Portal (`features/student-portal/` & `views/StudentApp.tsx`)
- **`StudentApp.tsx`**: Master shell for authenticated student users:
  - Enrolled course selector switching between classes.
  - Course overview banner presenting instructor contact, current score, letter grade, and performance badge.
  - Pinned announcement alert banner.
  - 5 core views: `assignments` (pending/submitted work with status badges), `coursework` (reading materials and syllabus files with signed preview/download), `announcements` (course notice feed), `calendar` (assignment deadlines and class dates), and `grades` (historical grade records and teacher feedback).
  - **`StudentPasswordModal`**: Self-service security modal enabling students invited via email/magic link to set and update their account credentials with blocking encryption progress.
- **`StudentTurnInModal.tsx`**: Interactive turn-in modal allowing students to submit assignment work via direct file attachment (uploaded to `student-submissions` storage bucket), external URL link, or native written text response, with 0ms optimistic status badge reflection.

---

### 3.4 Academic Calendar (`features/calendar/`)
- **`CalendarView.tsx`**: Zero-dependency interactive monthly calendar module aggregating `materials.due_at` assignment deadlines, `attendance_records` class session dates, and published course announcements with day-inspection drawers, shared across both educator (`ClassDetails`) and student (`StudentApp`) views.

---

### 3.5 AI Assistant & Visualizer (`features/ai-assistant/`)
- **`RAGClass.tsx`**: Interactive AI Copilot sliding drawer providing conversational pedagogical assistance, lesson planning recommendations, and automated assignment drafting.
- **`AIDiagnosticDiffModal.tsx`**: Visual diff modal presenting side-by-side comparison between existing student grades and AI-recommended rubric evaluations before publishing to the gradebook.
- **`Visualizer.tsx`**: Dynamic chart and data widget renderer supporting comparative bar charts, class mastery heatmaps, student rankings, timeline trajectories, and KPI stat counters.

---

### 3.6 Reusable Component Hierarchy (`components/`)
The application defines a three-tier modular component architecture:
1. **Layout Components (`components/layout/`)**:
   - **`Sidebar.tsx`**: Collapsible left navigation rail managing class list, template shortcuts, theme toggles, and user profile drawer with double-fire guarded class renaming.
   - **`CommandPalette.tsx`**: Global spotlight modal (`Ctrl+K` / `Cmd+K`) providing instant fuzzy navigation across classes, students, materials, and quick actions.
2. **Shared Composite Components (`components/shared/`)**:
   - **`BrandLogo.tsx`**: Vector brand mark and logo typography.
   - **`CustomDialogs.tsx`**: Standardized dialog primitives including `ConfirmModal`, `AlertModal`, and `LoadingOverlay` with blocking progress bars.
   - **`InstituteAutocompleteField.tsx`**: Multi-token fuzzy search component querying institute directories backed by 1-hour client-side TTL caching.
   - **`InteractiveGradingSimulator.tsx`**: 3D interactive pedagogical simulation widget rendered on the marketing showcase.
   - **`MultiSelect.tsx`**: Accessible multi-select pill tag picker for teaching styles, assessment preferences, and categorizations.
3. **Atomic UI Primitives (`components/ui/`)**:
   - `Button.tsx`, `Badge.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx` (with portal backdrop blur and Escape listener), and barrel export `index.ts`.

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
        SvcPortal["studentPortalService"]
        SvcAnn["announcementService"]
        SvcNotif["notificationService"]
    end

    subgraph BackendTargets["Remote Backends"]
        SupaPostgres[("Supabase PostgreSQL (via PostgREST)")]
        FastAPIBackend["FastAPI Backend (/api/chat, /api/grade)"]
        EdgeFunctions["Supabase Edge Functions (Resend Email dispatches)"]
    end

    HookWorkspace --> SvcClass
    HookClass --> SvcClass
    HookClass --> SvcStudent
    HookClass --> SvcMat
    HookClass --> SvcAnn
    HookClass --> SvcNotif
    HookChat --> SvcChat

    SvcClass --> SupaPostgres
    SvcStudent --> SupaPostgres
    SvcMat --> SupaPostgres
    SvcPortal --> SupaPostgres
    SvcAnn --> SupaPostgres
    SvcChat --> FastAPIBackend
    SvcNotif --> EdgeFunctions
```

### Hook Responsibilities:
1. **`useWorkspaceData`**:
   - Fetches and caches the user's institutes, active classes, and curriculum templates on login.
   - Manages active institute and class selection states.
2. **`useClassOperations`**:
   - Manages granular data for the active class (students roster, linked materials, class instructions, running submissions, attendance records).
   - Exposes clean mutation handlers (`handleAddMaterialInClass`, `handleDeleteMaterialInClass`, `handleAddInstructionInClass`, `handleDeleteInstructionInClass`, `handleUpdateClass`) with optimistic UI updates, error rollbacks, and post-persistence `notificationService.notifyMaterial(newMat.id, wsId, 'published', false)` dispatch when `notifyStudents` is enabled.
3. **`useAIChat`**:
   - Manages active chat thread messages, streaming state, session history switching, and contextual prompt injection.
4. **`useTheme`**:
   - Controls application light/dark theme toggles and dynamic brand styling variables.

---

## 5. Optimistic Mutations & Blocking Progress Indicators (Plans 11 & 12)

The frontend splits data mutations into two deterministic UX patterns based on payload determinism and browser-originated stream dependencies:

### 5.1 Optimistic UI + Background Promise + Snapshot Rollback (0ms Perceived Latency)
For deterministic metadata, roster, grading, attendance, and broadcast operations:
- **Ref-Synchronized State (`classItemRef` & `classesRef`)**: Mutable React refs in `StudentRegister.tsx` and `useClassOperations.ts` track the latest state across concurrent background promises, preventing stale closure overwrites when multiple rapid actions fire simultaneously.
- **Pending Visual Badges (`isPending?: boolean`)**: Temporary entries (`temp-invite-*`, `temp-ann-*`, `temp-inst-*`, `temp-mat-*`) render immediately with subtle status pills (`"Inviting..."`, `"Publishing..."`, `"Syncing..."`, `"Adding..."`) while the Edge Function or PostgREST call resolves in the background.
- **Snapshot Rollback**: Every background promise captures a pre-mutation state snapshot (`previousState`) and restores it automatically alongside an error toast (`showToast(..., 'error')`) if the network request fails.
- **Applied Flows**:
  1. Student Enrollment & Invitation (`StudentRegister.tsx`)
  2. Daily Attendance Bulk Logger (`AttendanceManagerModal.tsx`)
  3. Class Announcements & Resend Broadcasts (`ClassDetails.tsx`)
  4. Rubric Grading & Rapid Scoring (`SubmissionGradingModal.tsx` & `StudentRegister.tsx`)
  5. Student Portal Turn-In State Reflection (`StudentApp.tsx`, Text/URL submissions in `StudentTurnInModal.tsx` & `StudentSubmissionUploadModal.tsx`)
  6. Prompting Rubrics / Instructions Add & Delete (`useClassOperations.ts`)
  7. Class Archiving, Renaming, Material Unlinking & URL Material Addition (`useClassOperations.ts`)
  8. Student Expulsion / Removal (`StudentRegister.tsx`)

### 5.2 Blocking Progress Bars & Wait Notices (`@[Quote]` Non-Optimistic Flows)
For operations where browser cancellation or premature tab closure corrupts state or aborts active byte streams:
- **Binary File Uploads** (`ClassApp.tsx` via `CustomDialogs.tsx`, `StudentTurnInModal.tsx`, `StudentSubmissionUploadModal.tsx`):
  - Displays an asymptotic progress bar (`15% → 92% → 100%`) with formatted file size (`MB`/`KB`), disables backdrop/Escape dismissal (`!isSubmitting`), and displays an explicit warning not to close or refresh the browser window while uploading to Supabase Storage.
- **Account Password Updates & Sensitive Authentication** (`AuthPage.tsx`, `StudentApp.tsx`, `AccountModals.tsx`):
  - Renders an indeterminate security progress bar (`"Encrypting credentials and refreshing session tokens — please wait..."`) and locks form inputs until Supabase Auth finishes rotating session tokens.

### 5.3 Decoupled Local State Sync vs. Database Persistence & Buffered Dossier Editing
- **Column-Filtered Class Updates (`useClassOperations.handleUpdateClass` & `classService.updateClass`)**:
  - `handleUpdateClass` checks whether `updatedFields` includes any persisted `public.classes` columns before calling `classService.updateClass`, and `classService.updateClass` short-circuits immediately when `Object.keys(dbUpdates).length === 0`. Synchronizing child collections (`students`, `materials`, `instructions`, `ragSessions`) in local React state dispatches **zero** `UPDATE public.classes` queries.
- **Buffered Student Dossier Drafts (`StudentDetailModal.tsx` & `StudentRegister.tsx`)**:
  - Contact Dossier and Family/Guardian fields (`phone`, `address`, `parentName`, `parentContact`, `parentNotes`, `statusIndicator`) are buffered in local `dossierDraft` state and persisted once via the **Save Dossier** button (`student-detail-save-dossier-button`).
  - `handleUpdateStudentDetails` forwards only `updatedFields` to `studentService.updateStudentClassData`, which short-circuits when `dbUpdates` is empty, preventing submission list updates (`{ submissions }`) from firing redundant `UPDATE public.class_students` queries.
  - Inline class renaming in `Sidebar.tsx` guards `handleSaveRename` with `renameCommittedRef` and a dirty check (`trimmed !== ws.name`) to prevent `Enter` + `onBlur` double-firing and skip unchanged class names.


