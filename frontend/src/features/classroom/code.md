# Classroom Management Feature Module — `src/features/classroom/`

This directory provides components for configuring classes, managing learning materials, building rubrics, and visualizing the complete class gradebook.

---

## 📁 Directory Files

- [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx): The central classroom configuration tab panel. Houses:
  - **Class Profile Tab**: Form for subject, academic year, semester, teaching style, assessment preferences, and special notes.
  - **Materials Repository Tab**: Curriculum materials list with 3-mode creation builder (`File Upload` with dropzone, `Web URL` for external links, and `Notes & Text` for rich syllabus notes), explicit Graded Assessment controls (`to_be_scored`, `due_at`, `max_score`), type-specific indicators (`File`, `Link`, `Text`), and preview triggers.
  - **Class Guidelines Tab**: Curriculum guidelines, rubric rules, and marking instructions manager.
  - **Announcements Tab**: Notice board composer for posting, pinning, and deleting class announcements with optional batch email notifications to students and parents.
  - **Calendar Tab**: Integrated view embedding [`CalendarView`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/calendar/CalendarView.tsx) to map assignment due dates, attendance dates, and notices into a schedule.
- [`CreateClassModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/CreateClassModal.tsx): Multi-step modal for creating new classes with institute autocomplete, custom institute registration, optional base curriculum template selection, and material duplication strategy (Fork/Independent Copies vs Shared Reference).
- [`GradebookMatrix.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/GradebookMatrix.tsx): Comprehensive tabular gradebook grid mapping enrolled students against all assigned materials, with performance tier filtering (`High`, `Average`, `At Risk`), search, multi-column sorting, and CSV export.
- [`MaterialPreviewModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/MaterialPreviewModal.tsx): In-app document and media previewer supporting embedded PDFs, images, external URLs, and secure signed URLs retrieved from `get-material-url`.
- [`RubricBuilderModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/RubricBuilderModal.tsx): Visual grading criteria builder for assignments and exams, supporting weight scoring, criteria descriptions, presets, and Public (Base) vs Class-Private (Augmented) criterion scoping with interactive badges.

---

## Architecture & Data Flow

### 1. Classroom State Architecture & Tab Management

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    ClassApp["ClassApp.tsx (Active Class Context)"] --> ClassDetails["ClassDetails.tsx"]
    
    subgraph Tabs["Active Tab State"]
        Profile["Profile Tab (Editing & Metadata)"]
        Materials["Materials Tab (Repository List)"]
        Instructions["Guidelines Tab (Class Guidelines & Rubric Rules)"]
        Announcements["Announcements Tab (Notice Feed & Resend Triggers)"]
        Calendar["Calendar Tab (Aggregated Schedule)"]
    end

    ClassDetails --> Tabs
    Materials --> PreviewModal["MaterialPreviewModal.tsx (Signed URLs)"]
    Materials --> RubricBuilder["RubricBuilderModal.tsx (Criteria Weighting)"]
    Announcements --> NotifyService["notificationService (notify-announcement)"]
    
    ClassApp --> Gradebook["GradebookMatrix.tsx"]
    Gradebook --> SubmissionGrading["SubmissionGradingModal (Cell Click)"]
```

---

### 2. Component Design & Mathematical Invariants

1. **Grading Criteria Builder Computation (`RubricBuilderModal.tsx`)**:
   - Maintains an array of `RubricCriterion` objects (`{ id, name, description, maxScore, weight }`).
   - Dynamically computes `totalMaxScore = sum(criteria.map(c => c.maxScore))` and displays scoring weights in real-time.
2. **Gradebook Matrix Virtualization & Filtering (`GradebookMatrix.tsx`)**:
   - Derives composite student grades by aggregating all `student_submissions` for the active class.
   - Computes weighted overall percentage and maps students to performance tiers (`High: >=85%`, `Average: 65-84%`, `At Risk: <65%`).
   - Offers client-side CSV generation with UTF-8 BOM encoding for direct spreadsheet import.
3. **Secure File Streaming (`MaterialPreviewModal.tsx`)**:
   - For private bucket files, calls the `get-material-url` Edge Function with `{ class_id, material_id, content_item_id }` to retrieve a short-lived signed URL, avoiding public asset exposure.
4. **0ms Optimistic Announcements & Resend Broadcasts (`ClassDetails.tsx`)**:
   - Posting an announcement immediately prepends a `temp-ann-*` card (`isPending: true`, rendering an animated `"Publishing..."` badge) to the feed and clears the composer in `0ms`.
   - `announcementService.createAnnouncement()` and `notificationService.notifyAnnouncement()` execute in the background; if insertion fails, `temp-ann-*` is evicted and the teacher's draft title/content are restored to the composer.
   - Deleting an announcement filters it out of the feed in `0ms` and restores the snapshot if `announcementService.deleteAnnouncement()` fails.
5. **Profile Tab Edit/Save/Cancel Controls & Always-Visible Materials/Guidelines CRUD (`ClassDetails.tsx`)**:
   - `isEditMode` in `ClassDetails.tsx` governs **only** the **Class Profile** tab (`class-details-tab-profile`).
   - The Edit, Save, and Cancel controls (`class-profile-edit-button`, `class-profile-save-button`, `class-profile-cancel-button`) are located directly inside the **Class Profile** tab header, completely isolating profile configuration from upper view navigation.
   - Profile inputs (`instituteName`, `subject`, `semester`, `academicYear`, `experienceLevel`, `specialNotes`) and badge wrappers (`teachingStyle`, `assessmentPreferences`) maintain a fixed box model (`border rounded-md px-1.5 py-1` / `min-h-[38px]`) in both view and edit modes, swapping only border color and background with `transition-colors` to guarantee zero layout shifts and prevent cursor focus in view mode (`disabled={!isEditMode}`).
   - Add, edit, rubric-builder, and delete controls in the **Materials** tab (`materials-upload-file-button`, `Trash2` remove button) and **Class Guidelines** tab (`instructions-new-guideline-button`, `Trash2` delete button) are always visible and accessible without requiring Edit Mode.
6. **Multi-Mode Material Ingestion & Database Constraint Compliance (`ClassDetails.tsx`)**:
   - Materials creation supports 3 explicit ingestion modes:
     - `File`: uploads to `class-materials` at `/{teacher_user_id}/{material_id}/{content_item_id}`, recording `size_bytes` and `mime_type`.
     - `URL`: sets `path = url`, `type = 'URL'` without physical storage allocation.
     - `Text`: sets `path = ''`, `value = textContent`, `type = 'Text'` conforming to `valid_content_shape` (`validate_content_array`).
   - Graded assessment parameters strictly enforce the database check constraint `to_be_scored = false OR (due_at IS NOT NULL AND max_score IS NOT NULL)` prior to dispatch, requiring both `dueAt` and `maxScore` when `toBeScored` is true.
   - Forwards `notifyOnCreateMaterial` to `onAddMaterial` (`useClassOperations.handleAddMaterialInClass`) so student email notifications (`notify-material`) are triggered only after the `public.materials` row (`newMat.id`) is committed.
   - Dynamic size and type derivation (`classService.mapDbRowToClassModel`): Derives human-readable size (`MB`/`KB`/chars) and material type from `content[0]` rather than referencing non-existent table columns.
