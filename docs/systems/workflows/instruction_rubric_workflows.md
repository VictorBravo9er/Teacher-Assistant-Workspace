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
    Svc->>DB: INSERT INTO public.class_instructions (class_id, instruction_id, order_index)
    DB-->>Svc: Instruction linked confirmed
    
    Svc-->>UI: Resolves new Instruction object
    UI-->>Teacher: Instruction badge appears in Active Guidelines list
```

### Instruction Types:
- `System Persona`: Custom role definition (e.g. *"Socratic High School Physics Tutor"*).
- `Lesson Plan Guideline`: Formatting constraints for generating weekly schedules.
- `Material Generation Rule`: Standards for synthesizing practice questions and reading summaries.
- `Student Interaction Rule`: Tone and empathy standards when addressing student questions.
- `Assessment Creation Rule`: Rules for drafting quizzes and exams.
- `Content Filtering Rule`: Safety guidelines restricting topics or complexity.
- `General Policy`: Institutional or course grading policies.

---

## 2. Workflow: Building a Multi-Criterion Rubric

Teachers can visually design structured rubrics with custom point distributions.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as RubricBuilderModal.tsx
    participant Svc as instructionService / materialService
    participant DB as PostgreSQL (public)

    Teacher->>UI: Opens Rubric Builder
    Teacher->>UI: Enters Rubric Title (e.g. "Essay Analytical Rubric")
    
    loop Add Evaluation Criteria
        Teacher->>UI: Adds Criterion: Name (e.g. "Thesis Clarity"), Max Points (e.g. 25), Description
    end
    
    Teacher->>UI: Reviews total calculated points (e.g. 100 pts)
    Teacher->>UI: Clicks "Save Rubric"
    
    UI->>Svc: saveRubric(rubricPayload)
    Svc->>DB: INSERT INTO public.instructions (user_id, title, type='Grading Rubric', content JSONB)
    DB-->>Svc: Saved rubric instruction
    UI-->>Teacher: Rubric added to class repository and available for assignment linking
```

### Step-by-Step Execution Details:

1. **User Initiation**:
   - The teacher opens [`RubricBuilderModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/RubricBuilderModal.tsx).
2. **Criteria Composition**:
   - The teacher adds structured criteria rows:
     - `name`: Human-readable criterion title (e.g., *"Argumentation & Evidence"*).
     - `maxScore`: Maximum point allocation (e.g., `30.0`).
     - `description`: Detailed standard expectations.
   - The modal validates that point totals align with the desired assignment maximum score.
3. **Storage & Reuse**:
   - The rubric is stored in `public.instructions` as a `Grading Rubric` or directly embedded into `materials.rubric_criteria`.

---

## 3. Workflow: Attaching Rubrics to Assignments & Enforcing AI Assessments

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Assign["Teacher creates/edits assignment in ClassDetails.tsx"] --> AttachRubric["Attaches structured rubric to material"]
    AttachRubric --> SaveDB["Saved to materials.rubric_criteria in PostgreSQL"]
    
    StudentSubmits["Student turns in assignment"] --> TriggerEval["trigger-submission-evaluation Edge Function fires"]
    
    TriggerEval --> FetchRubric["Fetches rubric_criteria from assignment material"]
    FetchRubric --> CallBE["Invokes Backend POST /api/grade with rubric_criteria"]
    
    CallBE --> LLEval["EvaluatorService enforces:
    1. Per-criterion score assignment
    2. Specific constructive observation per criterion
    3. Aggregate letter grade computation
    4. Private teacher notes diagnosing misconceptions"]
    
    LLEval --> StoreEval["Persists rubric_breakdown in ai.submission_evaluations"]
    StoreEval --> Gradebook["Available in GradebookMatrix & AIDiagnosticDiffModal"]
```

When a student submits an assignment with an attached rubric, the automated AI evaluation engine strictly scores the submission against each defined criterion, ensuring objective, consistent, and explainable grading.
