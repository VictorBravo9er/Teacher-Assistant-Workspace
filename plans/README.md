# Teach&Learn — LMS Architectural Remediation & Implementation Plans

Welcome to the modular implementation planning and execution directory for **Teach&Learn LMS**. 

Following the AI/RAG decoupling (tag `ui/lms-only-development`), this directory divides all identified bugs, schema discrepancies, unpersisted forms, and architectural gaps into discrete, reviewable engineering plans and tracks their live implementation progress.

---

## 📊 Live Remediation Progress Dashboard

| Metric | Current Status |
| :--- | :--- |
| **Total Plans** | **15 Plans** (Phase 0 through Phase 7) |
| **Plans Completed** | **15 / 15** (`100%`) |
| **Plans In Progress** | **0 / 15** (`0%`) |
| **Plans Pending Execution** | **0 / 15** (`0%`) |
| **Current Execution Target** | **All Remediation Plans Successfully Implemented & Verified** |
| **System Readiness** | Pure LMS mode active; AI decoupled; Phase 0–7 100% complete; role routing, student portal, announcements, calendar, notification engine, containerization, optimistic mutations, and blocking progress bars fully operational. |

---

## Plan Directory & Execution Dependency Graph

The remediation is organized into independent yet logically sequenced plan files:

```mermaid
flowchart TD
    subgraph Day 0: Observability & Developer Tooling
        P00["00: Full-Stack Logging, Tooling & Mock Data Purge<br/>(FE/BE loggers, _verify_enum_tooltips.py, purge mockChat.ts)"]
        P001["00.1: Client-Side Institute & Geographic Search<br/>(Cached directory & cascading State/District/City)"]
    end

    subgraph Foundation: Schema & Runtime Integrity
        P01["01: Database Schema Alignment<br/>(Portfolio columns, content_type 'Text' & migration)"]
        P02["02: Universal Enum Safety & UI Mapping<br/>(Dynamic dropdowns & pedagogical tooltips)"]
        P03["03: Class Archiving Lifecycle<br/>(isArchived property consistency)"]
    end

    subgraph Core Teacher Suite Persistence
        P04["04: Teacher Profile & Preferences<br/>(auth.users.user_metadata binding)"]
        P05["05: Student Roster & Portfolio<br/>(Full contact & custom field persistence)"]
        P06["06: Submissions Preview & Classroom Polish<br/>(Native 'Text' & text:// preview, institute edit)"]
    end

    subgraph Architecture: Student Experience
        P07["07: Student Portal & Self-Submission<br/>(Role routing & student views)"]
    end

    subgraph Future Enhancements
        P08["08: Extended LMS Modules<br/>(Announcements & Academic Calendar)"]
        P085["08.5: Universal Notifications Engine<br/>(Resend Batch & Bounce Alerts)"]
    end

    subgraph Phase 5: Containerization & Infrastructure Observability
        P09["09: Docker Containerization & Infrastructure Observability<br/>(Logger path fix, volume bind mounts, X-Request-ID proxying)"]
    end

    subgraph Phase 6: Granular Revalidation & Optimistic Roster
        P10["10: Multi-Component TTL & Granular Revalidation<br/>(Component stale list RPC)"]
        P11["11: Optimistic Student Roster & Background Invites<br/>(Instant card insert, loading animation overlay, non-blocking)"]
        P12["12: Frontend-Wide Optimistic Mutations & Blocking Progress<br/>(Attendance, Announcements, Grading, Archive/Rename & Upload Progress)"]
    end

    P00 -.-> P01
    P00 -.-> P02
    P00 -.-> P03
    P00 -.-> P09
    P001 -.-> P06
    P01 --> P05
    P01 --> P02
    P01 --> P06
    P03 --> P06
    P04 --> P06
    P04 -.-> P07
    P05 --> P07
    P05 --> P11
    P06 --> P07
    P07 --> P08
    P08 --> P085
    P085 -.-> P09
    P09 -.-> P10
    P10 -.-> P11
    P11 --> P12
```

---

## Master Implementation & Progress Tracker

| Plan File | Scope & Title | Phase | Priority | Status | Progress | Verification Status | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| [**`00-enum-tooltip-audit-tooling.md`**](./00-enum-tooltip-audit-tooling.md) | Developer Tooling, Enum Verification, Full-Stack Logging & Mock Data Purge | Phase 0 | `TOOLING` | ✅ Completed | `100%` | 🟢 Verified | Foundation: establishes `./logs/` streaming, Vite HMR, and `mockChat.ts` purge. |
| [**`00.1-client-side-institute-geographic-search.md`**](./00.1-client-side-institute-geographic-search.md) | Client-Side Institute & Cascading Geographic Search | Phase 0 | `UX/PERF` | ✅ Completed | `100%` | 🟢 Verified | Replaces 5 round-trip RPCs with client cache & 780-district static hierarchy. |
| [**`01-database-schema-alignment.md`**](./01-database-schema-alignment.md) | Database Schema Alignment, Portfolio Migration & `content_type` `'Text'` | Phase 1 | `CRITICAL` | ✅ Completed | `100%` | 🟢 Verified | Adds portfolio columns to `class_students`, adds `'Text'` to enum, relaxes validator. |
| [**`02-instruction-type-enum-safety.md`**](./02-instruction-type-enum-safety.md) | Universal Database Enum Safety & Dynamic UI Mapping | Phase 1 | `CRITICAL` | ✅ Completed | `100%` | 🟢 Verified | Dynamic `Constants.public.Enums` dropdowns, multiselects, and `enumTooltips.ts`. |
| [**`03-class-archiving-lifecycle.md`**](./03-class-archiving-lifecycle.md) | Class Archiving Lifecycle & State Standardization | Phase 2 | `HIGH` | ✅ Completed | `100%` | 🟢 Verified | Standardizes `isArchived` (client) and `is_archived` (database) across hooks and sidebar. |
| [**`04-teacher-profile-preferences.md`**](./04-teacher-profile-preferences.md) | Teacher Profile & Teaching Preferences Persistence | Phase 2 | `LOW` | ✅ Completed | `100%` | 🟢 Verified | Binds settings modals to `user_metadata` and configurable `lateAttendanceWeight`. |
| [**`05-student-roster-portfolio-persistence.md`**](./05-student-roster-portfolio-persistence.md) | Student Roster & Portfolio Persistence | Phase 2 | `CRITICAL` | ✅ Completed | `100%` | 🟢 Verified | Full CRUD for contact, parent, and accommodation fields in `studentService.ts`. |
| [**`06-submissions-materials-preview.md`**](./06-submissions-materials-preview.md) | Submission Previews, Native 'Text' Uploads, Edit Mode Polish & State Hygiene | Phase 2 | `MEDIUM` | ✅ Completed | `100%` | 🟢 Verified | Polymorphic preview reader, native text turn-in, institute edit mode, report card state. |
| [**`07-student-portal-architecture.md`**](./07-student-portal-architecture.md) | Dedicated Student Portal, Student RLS Overhaul & Role-Based Routing | Phase 3 | `ARCHITECTURAL` | ✅ Completed | `100%` | 🟢 Verified | Student RLS overhaul, role router in `App.tsx`, `StudentApp.tsx`, self-turn-in modal. |
| [**`08-extended-lms-modules.md`**](./08-extended-lms-modules.md) | Extended LMS Modules: Announcements & Academic Calendar | Phase 4 | `FUTURE` | ✅ Completed | `100%` | 🟢 Verified | Class announcements schema & UI feed; interactive calendar aggregating `due_at`. |
| [**`08.5-classroom-notifications-resend.md`**](./08.5-classroom-notifications-resend.md) | Universal Classroom Notifications, Resend Delivery Engine & Bounce Tracking | Phase 4 | `FUTURE` | ✅ Completed | `100%` | 🟢 Verified | Multi-event Resend batch engine, `public.notification_logs`, bounce alerts to teacher. |
| [**`09-docker-containerization-observability.md`**](./09-docker-containerization-observability.md) | Docker Containerization, Logger Alignment & Infrastructure Observability | Phase 5 | `CRITICAL` | ✅ Completed | `100%` | 🟢 Verified | Remediates container startup crashes, binds `./logs` host volume in dev, injects `X-Request-ID`. |
| [**`10-local-storage-ttl-revalidation.md`**](./10-local-storage-ttl-revalidation.md) | Multi-Component TTL & Granular Database Revalidation Engine | Phase 6 | `HIGH` | ✅ Completed | `100%` | 🟢 Verified | Decouples TTL & modified_at, granular component stale list RPC, student role support. |
| [**`11-optimistic-student-invite.md`**](./11-optimistic-student-invite.md) | Optimistic Student Roster Enrolment & Background Invitation Flow | Phase 7 | `HIGH` | ✅ Completed | `100%` | 🟢 Verified | Instant roster card injection, loading animation overlay, non-blocking background promise. |
| [**`12-optimistic-mutations-and-blocking-progress.md`**](./12-optimistic-mutations-and-blocking-progress.md) | Frontend-Wide Optimistic Mutations & Blocking Progress Indicators | Phase 7 | `HIGH` | ✅ Completed | `100%` | 🟢 Verified | Optimistic attendance, announcements, rubric grading, class ops & blocking upload/auth progress bars. |

---

## Phase-by-Phase Execution Milestones

### Phase 0: Developer Tooling, Observability & Data Performance
- [x] **Plan 00**: Implement `scripts/_verify_enum_tooltips.py`, `frontend/src/lib/logger.ts`, `backend/src/lib/logger.py`, and delete `mockChat.ts`.
- [x] **Plan 00.1**: Implement `frontend/src/data/geography.ts` and `frontend/src/services/instituteService.ts`.

### Phase 1: Database Schema & Enum Runtime Integrity
- [x] **Plan 01**: Apply schema migration for portfolio columns, `content_type` `'Text'`, and regenerate types via `_generate_types.py`.
- [x] **Plan 02**: Eliminate hardcoded enum literals in `ClassDetails.tsx` and create `frontend/src/utils/enumTooltips.ts`.

### Phase 2: Core Teacher Suite Lifecycle & Portfolio Persistence
- [x] **Plan 03**: Align `isArchived` across `useClassOperations.ts`, `classService.ts`, and `Sidebar.tsx`.
- [x] **Plan 04**: Connect `AccountModals.tsx` to `AuthContext.updateUserMetadata` and wire late attendance weight.
- [x] **Plan 05**: Enable full portfolio CRUD in `studentService.ts` and unblock persistence gate in `StudentRegister.tsx`.
- [x] **Plan 06**: Implement polymorphic previews in `MaterialPreviewModal.tsx`, institute edit mode, and calculation fixes.

### Phase 3: Dedicated Student Experience & Role-Based Routing
- [x] **Plan 07**: Overhaul PostgreSQL RLS for enrolled students, implement `App.tsx` role routing, `StudentApp.tsx`, and `StudentTurnInModal.tsx`.

### Phase 4: Extended LMS Modules & Universal Notifications
- [x] **Plan 08**: Implement `public.announcements` schema, teacher composer, student notice feed, and `CalendarView.tsx`.
- [x] **Plan 08.5**: Implement `public.notification_logs`, Resend batch Edge Functions (`notify-announcement`, `notify-material`, `notify-submission`), and `resend-webhook` bounce alert handler.

### Phase 5: Containerization & Infrastructure Observability
- [x] **Plan 09**: Implement dynamic logs path in `backend/src/lib/logger.py` & `frontend/vite.config.ts`, pre-allocate `/app/logs` in Dockerfiles, bind `./logs` in compose dev configuration, inject `X-Request-ID` in Nginx, and update `.env.example`.

### Phase 6: Client Persistence & Database Synchronization
- [x] **Plan 10**: Robust Local Storage TTL & Conditional Database Revalidation Engine (`updated_at` triggers on relevant tables, `get_workspace_last_modified` RPC, TTL/modified_at separation in client cache, and lifecycle revalidation on reload/network recovery).

---

## Status Legend & Tracking Conventions

- ⏳ **Pending**: Design approved, awaiting scheduled execution.
- 🚧 **In Progress**: Code changes actively being implemented.
- 🔍 **In Review / Verification**: Code written; undergoing automated linting (`npm run build`, `basedpyright`), test suites, and manual verification.
- ✅ **Completed**: Implemented, verified, and documented with updated `code.DESC.md` and `code.ARCH.md`.

---

## Revision & Review Workflow

1. Each plan can be inspected, debated, and revised individually.
2. Once a plan is marked `Approved`, its code modifications can be executed and verified with zero side-effects on adjacent plans.
3. Every step adheres strictly to the repository's universal rules:
   - Zero modifications to generated `db.ts` or `db.py` (Rule 2.5).
   - Simplification and elimination of redundant tables or states (Rule 3).
   - Build verification (`npm run build`, `uv run poe lint`) before marking any step complete (Rule 2.7).
   - Directory-level documentation maintenance (`code.DESC.md` / `code.ARCH.md`) on file additions/edits (Rule 5).
