# Plan 12: Frontend-Wide Optimistic Mutations & Blocking Progress Indicators

> **Status**: ✅ **COMPLETED & VERIFIED**  
> **Target Subsystems**: `frontend/src/types/` (`main.ts`), `frontend/src/components/shared/` (`CustomDialogs.tsx`), `frontend/src/features/students/`, `frontend/src/features/classroom/`, `frontend/src/features/student-portal/`, `frontend/src/hooks/` (`useClassOperations.ts`), `frontend/src/views/` (`ClassApp.tsx`, `StudentApp.tsx`, `AuthPage.tsx`), `frontend/src/features/account/` (`AccountModals.tsx`)

---

## 1. Context & Architectural Evolution

Following the optimistic student roster invitation pattern introduced in [Plan 11](./11-optimistic-student-invite.md), an architectural audit identified two distinct classes of asynchronous user actions across the frontend:

1. **Metadata, Scoring, Attendance & Text Mutations (Optimistic Candidates)**:
   - Operations such as logging daily cohort attendance, posting classroom announcements (which also trigger Resend email batches), grading student submissions with rubrics, adding/removing instructions, archiving/renaming classes, removing students, and turning in text/URL assignments previously blocked the UI for 1–4 seconds waiting for network round-trips.
   - These operations have small payloads and deterministic client-side state transitions, making them ideal for **0ms Optimistic UI Updates + Background Promise Resolution + Snapshot Rollback**.

2. **Binary File Transfers & Cryptographic Credential Mutations (Blocking Candidates)**:
   - Uploading multi-megabyte PDFs/images to Supabase Storage or updating user authentication passwords requires actual byte transfer or cryptographic session exchange before completion can be guaranteed.
   - For these operations, instant optimistic closure would risk data loss if the user closes the tab mid-transfer. Instead, these flows require an explicit **Blocking Progress Bar Overlay** that communicates active progress (`15% -> 92% -> 100%`), displays file/operation metadata, and prevents premature modal dismissal.

---

## 2. Core Architectural Objectives

### 2.1 Optimistic Mutations with Snapshot Rollback
- **Daily Attendance Logger (`AttendanceManagerModal.tsx`)**: Immediately computes updated attendance rates, updates the roster, and closes the modal in 0ms while `studentService.bulkLogAttendance` executes in the background. Restores the pre-save student snapshot on failure.
- **Class Announcements & Email Broadcasts (`ClassDetails.tsx`)**: Immediately prepends new announcements with an `isPending` `"Publishing..."` indicator and resets the compose form while database creation and Resend batch notifications run asynchronously. Restores draft text and evicts the temporary card on error.
- **Rubric Grading & Rapid Scoring (`SubmissionGradingModal.tsx` & `StudentRegister.tsx`)**: Immediately applies rubric scores, recalculates student averages/tiers, and closes the grading modal at 0ms while persisting review and student records in the background.
- **Student Assignment Turn-In (`StudentApp.tsx` & `StudentTurnInModal.tsx`)**: Immediately merges submitted work into local state to flip the assignment status badge to `"Submitted"` without waiting for a 4-query reload waterfall. Text-only turn-ins execute optimistically in the background.
- **Classroom Instructions, Archiving, Renaming & Material Unlinking (`useClassOperations.ts`)**: Uses a synchronized `classesRef` to apply instant optimistic mutations for adding/deleting instructions, archiving/renaming classes, unlinking materials, and creating URL materials, with automatic rollback on error.
- **Student Removal (`StudentRegister.tsx`)**: Immediately removes expelled students from the roster and restores them if `removeStudentFromClass` fails.

### 2.2 Blocking Progress Bar & Wait Guards
- **Upgraded `LoadingOverlay` (`CustomDialogs.tsx`)**: Supports `showProgressBar`, `subMessage`, and smooth asymptotic progress tracking (`15% -> 92%`) with a caution banner advising the user not to close the window.
- **Binary File Uploads (`useClassOperations.ts`, `StudentTurnInModal.tsx`, `StudentSubmissionUploadModal.tsx`)**: Displays file name, byte size, and an animated progress bar while locking modal dismissal until storage upload completes.
- **Account Password Updates (`AuthPage.tsx`, `StudentApp.tsx`, `AccountModals.tsx`)**: Renders a security encryption progress bar and disables modal/page exit while `supabase.auth.updateUser` is in flight.

---

## 3. Verification Matrix

1. **Type Safety & Production Build**:
   - `npm run build` in `frontend/` (0 TypeScript errors, clean Vite production bundle).
   - `uv run poe lint` in `backend/` (0 Ruff / BasedPyright warnings).
2. **Functional Flows**:
   - Attendance, Announcements, Rubric Grading, Class Archive/Rename, and Text/URL Submissions complete in 0ms with background persistence and rollback safety.
   - Binary File Uploads and Password Updates display blocking progress bars and prevent premature dismissal.
