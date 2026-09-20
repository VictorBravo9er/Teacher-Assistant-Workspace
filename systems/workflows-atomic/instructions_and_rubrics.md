# Atomic Workflows: Instructions & Rubrics

This document details the discrete atomic tasks governing the creation and assignment of assistant personas, pedagogical policies, and multi-criterion evaluation rubrics.

---

## ATOM-INS-01: Create Assistant System Persona / Policy

### 1. Trigger
- **Event**: Teacher fills the instruction form in [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx) (Instructions tab) and clicks **"Save Instruction"**.

### 2. Input Parameters
```typescript
interface CreateInstructionPayload {
  classId: string;
  title: string;
  type: InstructionType; // 'System Persona', 'Lesson Plan Guideline', 'Content Filtering Rule', etc.
  content: string;
  whenToApply?: string;
}
```

### 3. Execution Pipeline
1. UI calls [`instructionService.addInstructionToClass()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/instructionService.ts).
2. Inserts instruction entity:
   ```sql
   INSERT INTO public.instructions (user_id, title, type, content, when_to_apply)
   VALUES (auth.uid(), :title, :type, :content, :whenToApply)
   RETURNING id;
   ```
3. Links instruction to class with auto-incremented order index:
   ```sql
   INSERT INTO public.class_instructions (class_id, instruction_id, order_index)
   VALUES (:classId, :instructionId, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM public.class_instructions WHERE class_id = :classId));
   ```

### 4. Conclusion & Re-render
- The instruction is saved in the database and appended to the active class's instructions list.
- Subsequent copilot queries (`ATOM-RAG-01`) automatically inject this active rule into the LLM system prompt context.

---

## ATOM-INS-02: Build & Save Custom Rubric

### 1. Trigger
- **Event**: Teacher designs evaluation criteria in [`RubricBuilderModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/RubricBuilderModal.tsx) and clicks **"Save Rubric"**.

### 2. Input Parameters
```typescript
interface RubricCriteriaItem {
  id?: string;
  name: string; // e.g. "Conceptual Understanding"
  maxScore: number; // e.g. 50
  description?: string; // Standard expectations
}

interface SaveRubricPayload {
  title: string;
  rubricCriteria: RubricCriteriaItem[];
}
```

### 3. Execution Pipeline
1. Validates that criteria sum equals desired assignment total points.
2. Inserts record into `public.instructions` as a `Grading Rubric`:
   ```sql
   INSERT INTO public.instructions (user_id, title, type, content)
   VALUES (auth.uid(), :title, 'Grading Rubric', :rubricCriteriaJSONB)
   RETURNING *;
   ```

### 4. Conclusion
- The rubric is saved to the teacher's reusable rubric repository and is immediately selectable when creating or editing assignments.

---

## ATOM-INS-03: Attach Rubric to Class Assignment

### 1. Trigger
- **Event**: Teacher selects a rubric when creating or editing an assignment in `ClassDetails.tsx` and saves the assignment.

### 2. Execution Pipeline
1. Attaches the criteria directly to `materials.rubric_criteria` or `class_materials.custom_rubric_criteria`:
   ```sql
   UPDATE public.materials
   SET rubric_criteria = :rubricCriteriaJSONB,
       updated_at = timezone('utc'::text, now())
   WHERE id = :materialId AND user_id = auth.uid();
   ```
2. If class-specific rubric customization was applied:
   ```sql
   UPDATE public.class_materials
   SET custom_rubric_criteria = :customCriteriaJSONB
   WHERE class_id = :classId AND material_id = :materialId;
   ```

### 3. Postconditions & Conclusion
- The assignment is explicitly configured with multi-criterion scoring criteria.
- When any student turns in work for this assignment (`ATOM-SUB-01`), the subsequent automated AI evaluation (`ATOM-AIS-01`) evaluates and scores the submission strictly against these defined criteria.
