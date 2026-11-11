# Instruction & Rubric Authoring Workflows

This document details the start-to-finish workflows for configuring assistant personas, setting instructional guidelines, building multi-criterion evaluation rubrics, and attaching rubrics to assignments.

---

## 1. Workflow: Creating & Applying System Personas and Guidelines

Teachers can customize the AI assistant's persona, tone, pedagogical rules, and content filters for each class or across templates.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as ClassDetails.tsx (Instructions Tab)
    participant Svc as instructionService
    participant DB as PostgreSQL (public)

    Teacher->>UI: Clicks "Add Instruction"
    Teacher->>UI: Fills Title, Instruction Type, Content, and When to Apply
    Teacher->>UI: Submits Form
    
    UI->>Svc: addInstructionToClass(classId, instructionPayload)
    Svc->>DB: INSERT INTO public.instructions (user_id, title, type, content, when_to_apply) RETURNING id
    Svc->>DB: INSERT INTO public.class_instructions (class_id, instruction_id)
    DB-->>Svc: Instruction linked confirmed
    
    Svc-->>UI: Resolves new Instruction object
    UI-->>Teacher: Instruction badge appears in Active Guidelines list
```

### Instruction Types:
- `System Persona`: Custom role definition (e.g. *"Socratic High School Physics Tutor"*).
- `Grading Rubric`: Explicit grading policy or scoring guidelines stored as class instructions.
- `Lesson Plan Guideline`: Formatting constraints for generating weekly schedules.
- `Material Generation Rule`: Standards for synthesizing practice questions and reading summaries.
- `Student Interaction Rule`: Tone and empathy standards when addressing student questions.
- `Assessment Creation Rule`: Rules for drafting quizzes and exams.
- `Content Filtering Rule`: Safety guidelines restricting topics or complexity.
- `General Policy`: Institutional or course grading policies.

---

## 2. Workflow: Building a Multi-Criterion Material Rubric

Teachers can visually construct structured per-assignment rubrics with Public (Base) vs. Class-Private (`isPrivate`) criterion scoping and custom point totals.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as RubricBuilderModal.tsx
    participant Svc as materialService
    participant DB as PostgreSQL (public)

    Teacher->>UI: Opens Rubric Builder on a graded material
    Teacher->>UI: Loads preset or adds custom criteria
    
    loop Add Evaluation Criteria
        Teacher->>UI: Sets Criterion Name, Max Points, Description & Public/Private scope
    end
    
    Teacher->>UI: Reviews total calculated points (sum of criteria maxScore)
    Teacher->>UI: Clicks "Save Grading Criteria"
    
    UI->>Svc: updateMaterialRubric(materialId, criteria, totalMaxScore, classId)
    Svc->>DB: UPDATE public.materials SET rubric_criteria = ?, max_score = ?
    opt When isPrivate criteria exist & classId is set
        Svc->>DB: UPDATE public.class_materials SET custom_rubric_criteria = ?
    end
    DB-->>Svc: Rubric criteria persisted
    UI-->>Teacher: Material updates with configured rubric breakdown
```

### Step-by-Step Execution Details:

1. **User Initiation**:
   - The teacher opens [`RubricBuilderModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/RubricBuilderModal.tsx) from a material card.
2. **Criteria Composition**:
   - The teacher adds structured criteria rows (or selects presets like Mathematics, Analytical Writing, Science Lab Reports, or Oral Presentation):
     - `name`: Human-readable criterion title (e.g., *"Argumentation & Evidence"*).
     - `maxScore`: Maximum point allocation (e.g., `30`).
     - `description`: Detailed standard expectations.
     - `isPrivate`: Flags class-only criteria saved to `class_materials.custom_rubric_criteria`.
   - Dynamically computes `totalMaxScore = sum(criteria.map(c => c.maxScore))`.
3. **Storage & Reuse**:
   - Persists public criteria and total `max_score` directly to `public.materials.rubric_criteria`, and optional class-private criteria to `public.class_materials.custom_rubric_criteria` via [`materialService.updateMaterialRubric()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/materialService.ts).

---

## 3. Workflow: Attaching Rubrics to Assignments & Enforcing AI Assessments

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Assign["Teacher creates/edits assignment in ClassDetails.tsx"] --> AttachRubric["Configures criteria in RubricBuilderModal"]
    AttachRubric --> SaveDB["Saved to materials.rubric_criteria / class_materials.custom_rubric_criteria"]
    
    StudentSubmits["Student turns in assignment"] -.->|"Planned pg_net trigger (currently commented out)"| TriggerEval["trigger-submission-evaluation Edge Function"]
    
    TriggerEval --> FetchRubric["Fetches rubric_criteria from assignment material"]
    FetchRubric --> CallBE["Invokes Backend POST /api/grade with rubric_criteria"]
    
    CallBE --> LLEval["EvaluatorService enforces:<br/>1. Per-criterion score assignment<br/>2. Specific constructive observation per criterion<br/>3. Aggregate letter grade computation<br/>4. Private teacher notes diagnosing misconceptions"]
    
    LLEval --> StoreEval["Persists rubric_breakdown in ai.submission_evaluations"]
    StoreEval --> Gradebook["Available in GradebookMatrix & AIDiagnosticDiffModal"]
```

When a student submits an assignment with an attached rubric, the automated AI evaluation engine strictly scores the submission against each defined criterion, ensuring objective, consistent, and explainable grading.
