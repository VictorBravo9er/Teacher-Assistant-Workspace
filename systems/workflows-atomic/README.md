# Atomic Workflows Directory (`systems/workflows-atomic/`)

This directory provides atomic, single-responsibility operational specifications for every discrete task in the **Teach&Learn** platform.

Unlike high-level user journey flows, each **Atomic Workflow** defines a strictly isolated task from its **Trigger** to its final **Conclusion**, detailing exact preconditions, input parameters, execution steps, database/storage side effects, error boundaries, postconditions, and UI re-renders.

> [!IMPORTANT]
> **Asynchronous AI Decoupling**: In accordance with the platform architecture, event-driven AI processing (such as automated material syllabus analysis or autonomous submission evaluation) is defined as **independent, decoupled atomic workflows** triggered by database webhooks, isolated from the user-facing upload actions that preceded them.

---

## 🗺️ Atomic Workflows Taxonomy

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    subgraph UserTriggered["User-Triggered Client Workflows"]
        TC["Templates & Classes (templates_and_classes.md)"]
        MAT["Materials Management (materials_management.md)"]
        STU["Students & Attendance (students_and_attendance.md)"]
        SUB["Student Submissions (submissions_turnin.md)"]
        GRD["Teacher Grading & Review (grading_and_evaluation.md)"]
        COP["RAG Copilot & Visualizer (rag_copilot.md)"]
        INS["Instructions & Rubrics (instructions_and_rubrics.md)"]
    end

    subgraph SystemTriggered["Event-Driven Asynchronous AI Workflows"]
        AIM["AI Material Analysis (ai_material_analysis.md)"]
        AIS["AI Submission Grading (ai_submission_grading.md)"]
        TRG["Database Score Sync Trigger (trg_sync_student_scores)"]
    end

    MAT -.->|pg_net DB Webhook| AIM
    SUB -.->|pg_net DB Webhook| AIS
    AIS -.->|Status Update| TRG
    GRD -.->|Publish Grade| TRG
```

---

## 📚 Atomic Workflows Catalog

| Category / Document | Workflow ID | Workflow Name | Trigger Type |
| :--- | :--- | :--- | :--- |
| [**`templates_and_classes.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/templates_and_classes.md) | `ATOM-TC-01`<br>`ATOM-TC-02`<br>`ATOM-TC-03`<br>`ATOM-TC-04`<br>`ATOM-TC-05`<br>`ATOM-TC-06` | • Create Curriculum Template<br>• Update Curriculum Template<br>• Delete Curriculum Template<br>• Instantiate Class from Template<br>• Create Blank Class<br>• Update Class Settings & Schedule | User UI Form<br>User UI Form<br>User UI Action<br>User Modal Action<br>User Modal Action<br>User Settings Tab |
| [**`materials_management.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/materials_management.md) | `ATOM-MAT-01`<br>`ATOM-MAT-02`<br>`ATOM-MAT-03`<br>`ATOM-MAT-04`<br>`ATOM-MAT-05` | • Upload & Link File Material<br>• Add Link / Plaintext Material<br>• Resolve Material Signed URL for Preview<br>• Unlink Material from Class<br>• Atomic Hard Delete Material | User File Upload<br>User Form Action<br>User Preview Click<br>User Unlink Action<br>User Delete Confirmation |
| [**`ai_material_analysis.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/ai_material_analysis.md) | `ATOM-AIM-01` | • **Event-Driven Material Syllabus & Prerequisite Gap Analysis** | **Database Webhook** (`trg_material_ai_analysis` via `pg_net`) |
| [**`students_and_attendance.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/students_and_attendance.md) | `ATOM-STU-01`<br>`ATOM-STU-02`<br>`ATOM-STU-03`<br>`ATOM-STU-04`<br>`ATOM-STU-05` | • Direct Student Enrollment<br>• Student Invitation Token Issuance<br>• Daily Roll-Call Attendance Batch Logging<br>• Aggregate Attendance Rate Recalculation<br>• Generate Student Report Card | User Add Student Form<br>User Invite Modal<br>User Attendance Modal<br>Internal State Trigger<br>User Export Click |
| [**`submissions_turnin.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/submissions_turnin.md) | `ATOM-SUB-01` | • **Student Assignment Submission Upload & Turn-In** | User Turn-In Action |
| [**`ai_submission_grading.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/ai_submission_grading.md) | `ATOM-AIS-01` | • **Event-Driven Autonomous Submission Evaluation & Rubric Grading** | **Database Webhook** (`trg_submission_ai_eval` via `pg_net`) |
| [**`grading_and_evaluation.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/grading_and_evaluation.md) | `ATOM-GRD-01`<br>`ATOM-GRD-02`<br>`ATOM-GRD-03`<br>`ATOM-GRD-04`<br>`ATOM-GRD-05` | • Fetch AI Diagnostic Breakdown<br>• Publish Final Student Grade<br>• Atomic Gradebook Recalculation<br>• Batch Evaluation Synchronization<br>• Atomic Submission Deletion | User Evaluated Chip Click<br>User Publish Grade Button<br>Database Trigger (`trg_sync_student_scores`)<br>User Batch Save Button<br>User Delete Submission Action |
| [**`rag_copilot.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/rag_copilot.md) | `ATOM-RAG-01`<br>`ATOM-RAG-02`<br>`ATOM-RAG-03`<br>`ATOM-RAG-04` | • Dispatch AI Copilot Query<br>• Mount Dynamic Visualization Widget<br>• Persist Chat Session History<br>• Switch / Load Historical Session | User Chat Form Submit<br>LLM Response Payload Parse<br>Stream Completion Event<br>User Session Select |
| [**`instructions_and_rubrics.md`**](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/workflows-atomic/instructions_and_rubrics.md) | `ATOM-INS-01`<br>`ATOM-INS-02`<br>`ATOM-INS-03` | • Create Assistant System Persona / Policy<br>• Build & Save Custom Rubric<br>• Attach Rubric to Class Assignment | User Instruction Form<br>User Rubric Builder Save<br>User Assignment Edit |

---

## 🔬 Anatomy of an Atomic Workflow Specification

Every atomic task in this directory is systematically documented with the following sections:

1. **Workflow Identifier & Name**: Standardized tag (e.g. `ATOM-MAT-01`) and descriptive title.
2. **Trigger**: The exact event (user click, form submit, system webhook, database trigger) initiating execution.
3. **Preconditions**: Auth state, active class selection, role requirements, and database constraints.
4. **Input Parameters / Payload**: Detailed schema of arguments passed into the task.
5. **Execution Pipeline**: Step-by-step trace covering client service calls, storage operations, SQL DDL/DML, and external services.
6. **Error Handling & Rollbacks**: Failure modes, network retry policies, and transaction abort boundaries.
7. **Postconditions**: Exact database table state, storage blobs created, and cache invalidations.
8. **Conclusion & Re-render**: Terminal outcome, visible UI notification, and component state updates.
