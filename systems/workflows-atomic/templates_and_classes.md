# Atomic Workflows: Templates & Classes

This document details the discrete atomic tasks governing the creation, configuration, and instantiation of curriculum templates and classrooms.

---

## ATOM-TC-01: Create Curriculum Template

### 1. Trigger
- **Event**: The teacher completes the template authoring form in [`ClassApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/ClassApp.tsx) and clicks **"Save Template"**.

### 2. Preconditions
- User is authenticated with an active Supabase session (`auth.uid() IS NOT NULL`).
- Template title is non-empty (`name.trim().length > 0`).

### 3. Input Parameters
```typescript
interface CreateTemplatePayload {
  name: string;
  description?: string;
  subject?: string;
  teachingStyle?: string[]; // Enum: 'Lecture', 'Socratic Method', 'Interactive', etc.
  assessmentPreferences?: string[]; // Enum: 'Multiple Choice', 'Short Answer', 'Essays', etc.
  instructions?: Array<{
    title: string;
    type: string; // 'System Persona', 'Grading Rubric', etc.
    content: string;
    whenToApply?: string;
  }>;
  materialsPreset?: Array<{
    name: string;
    category: string; // 'Study Material', 'Assignment', etc.
    content?: any[];
    dueAt?: string;
    maxScore?: number;
    rubricCriteria?: any[];
  }>;
}
```

### 4. Execution Pipeline
1. **Client Invocation**: UI calls [`templateService.createTemplate(payload)`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/templateService.ts#L42-L154).
2. **Session Verification**: Service verifies `supabase.auth.getUser()`.
3. **Insert Template Record**:
   ```sql
   INSERT INTO public.templates (user_id, name, description, subject, teaching_style, assessment_preferences)
   VALUES (auth.uid(), :name, :description, :subject, :teaching_style, :assessment_preferences)
   RETURNING id, name, description, subject, teaching_style, assessment_preferences;
   ```
4. **Insert & Link Preset Instructions**:
   - For each instruction in `payload.instructions`:
     ```sql
     INSERT INTO public.instructions (user_id, title, type, content, when_to_apply)
     VALUES (auth.uid(), :title, :type, :content, :when_to_apply)
     RETURNING id;
     
     INSERT INTO public.template_instructions (template_id, instruction_id)
     VALUES (:template_id, :instruction_id);
     ```
5. **Insert & Link Preset Materials**:
   - For each material in `payload.materialsPreset`:
     ```sql
     INSERT INTO public.materials (user_id, name, category, content, rubric_criteria)
     VALUES (auth.uid(), :name, :category, :content, :rubric_criteria)
     RETURNING id;

     INSERT INTO public.template_materials (template_id, material_id)
     VALUES (:template_id, :material_id);
     ```

### 5. Error Handling & Rollbacks
- If any database operation fails, the promise rejects with a PostgREST error.
- UI catches the error and surfaces a toast alert: `"Failed to create template: <error_message>"`.

### 6. Postconditions
- A new row exists in `public.templates`.
- Associated rows exist in `public.template_instructions` and `public.template_materials`.

### 7. Conclusion & Re-render
- The resolved `Template` object is returned to [`useWorkspaceData`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useWorkspaceData.ts).
- `setTemplates(prev => [...prev, newTemplate])` appends the template.
- The Template Library grid re-renders immediately displaying the new blueprint card.

---

## ATOM-TC-02: Update Curriculum Template

### 1. Trigger
- **Event**: The teacher modifies template metadata or instructions and clicks **"Update Template"**.

### 2. Preconditions
- User owns the template (`auth.uid() = templates.user_id`).
- `template_id` is a valid UUID.

### 3. Execution Pipeline
1. UI calls `templateService.updateTemplate(id, payload)`.
2. Supabase executes:
   ```sql
   UPDATE public.templates
   SET name = :name,
       description = :description,
       subject = :subject,
       teaching_style = :teaching_style,
       assessment_preferences = :assessment_preferences,
       updated_at = timezone('utc'::text, now())
   WHERE id = :id AND user_id = auth.uid()
   RETURNING *;
   ```
3. Updates `templates` state in `useWorkspaceData`.

### 4. Postconditions & Conclusion
- Database row is updated.
- Existing classes created previously from this template remain untouched (preserving class history).
- UI confirms update with a success toast.

---

## ATOM-TC-03: Delete Curriculum Template

### 1. Trigger
- **Event**: Teacher confirms deletion in the template delete confirmation dialog.

### 2. Execution Pipeline
1. UI calls `templateService.deleteTemplate(id)`.
2. Database execution:
   ```sql
   DELETE FROM public.templates WHERE id = :id AND user_id = auth.uid();
   ```
3. Foreign key cascading automatically cleans up `template_materials` and `template_instructions` junction rows. Global materials and instructions in `public.materials` and `public.instructions` are preserved.
4. UI removes the template from `templates` state array.

---

## ATOM-TC-04: Instantiate Class from Template

### 1. Trigger
- **Event**: Teacher selects a template blueprint in [`CreateClassModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/CreateClassModal.tsx) and submits the modal.

### 2. Preconditions
- Template exists and user is authenticated.
- Class name and target institute are specified.

### 3. Input Parameters
```typescript
interface CreateClassFromTemplatePayload {
  instituteId: string;
  templateId: string;
  name: string;
  academicYear?: string;
  semester?: string;
  schedule?: string;
  specialNotes?: string;
}
```

### 4. Execution Pipeline
1. **Fetch Blueprint**: Service fetches template metadata, bundled `template_instructions`, and `template_materials`.
2. **Insert Class Record**:
   ```sql
   INSERT INTO public.classes (
     institute_id, user_id, name, subject, academic_year, semester,
     teaching_style, experience_level, assessment_preferences, schedule, special_notes
   ) VALUES (
     :instituteId, auth.uid(), :name, :template.subject, :academicYear, :semester,
     :template.teaching_style, :template.experience_level, :template.assessment_preferences, :schedule, :specialNotes
   ) RETURNING id;
   ```
3. **Batch Clone Instructions to Class**:
   - For each instruction attached to the template:
     ```sql
     INSERT INTO public.class_instructions (class_id, instruction_id, order_index)
     VALUES (:new_class_id, :instruction_id, :index);
     ```
4. **Batch Clone Materials to Class**:
   - For each material attached to the template:
     ```sql
     INSERT INTO public.class_materials (class_id, material_id, order_index)
     VALUES (:new_class_id, :material_id, :index);
     ```

### 5. Postconditions & Conclusion
- New classroom record created in `public.classes`.
- Materials and rubrics are linked into `public.class_materials` and `public.class_instructions`.
- [`useWorkspaceData`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useWorkspaceData.ts) sets `activeClassId = new_class_id`.
- Modal closes and the viewport transitions to the newly populated Class Details view.

---

## ATOM-TC-05: Create Blank Class

### 1. Trigger
- **Event**: Teacher selects "Blank Class" in [`CreateClassModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/CreateClassModal.tsx) and clicks **"Create Class"**.

### 2. Execution Pipeline
1. Service inserts directly into `public.classes` with teacher-provided subject, name, and settings without cloning template junctions.
2. `useWorkspaceData` adds the empty class to `classes` list and switches the active context.
3. UI presents an empty Materials and Instructions tab ready for manual content addition.

---

## ATOM-TC-06: Update Class Settings & Schedule

### 1. Trigger
- **Event**: Teacher edits schedule, syllabus description, or teaching style in class settings and clicks **"Save Changes"**.

### 2. Execution Pipeline
1. Service calls `classService.updateClass(classId, settingsPayload)`.
2. Supabase executes `UPDATE public.classes SET ... WHERE id = :classId AND user_id = auth.uid()`.
3. `useWorkspaceData` updates the active class record in memory.
4. UI displays an updated syllabus overview and badges.
