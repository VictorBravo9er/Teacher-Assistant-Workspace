# Plan 02: Universal Database Enum Safety & Dynamic UI Mapping

## 1. Problem Statement & Root Cause
In Teach&Learn, several React UI components contain hardcoded strings and option arrays for fields that are backed by strict PostgreSQL `ENUM` types. This has led to severe runtime crashes, data loss, and constraint violations whenever a teacher submits a form.

### The Forensic Audit of UI Enum Crashes:

| UI Component | Field | UI Hardcoded Values | PostgreSQL `ENUM` in `schema-db.sql` | Runtime Impact |
| :--- | :--- | :--- | :--- | :--- |
| [`ClassDetails.tsx:L692`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx#L692) | Guideline Type (`instruction_type`) | `'criteria'`, `'marking'`, `'preference'`, `'global'` | `'System Persona'`, `'Grading Rubric'`, `'Lesson Plan Guideline'`, `'Material Generation Rule'`, `'Student Interaction Rule'`, `'Assessment Creation Rule'`, `'Content Filtering Rule'`, `'General Policy'` | **FATAL CRASH**: PostgreSQL rejects `INSERT INTO instructions` with constraint violation `invalid input value for enum public.instruction_type: "criteria"`. |
| [`ClassDetails.tsx:L327`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx#L327) | Instructor Style (`teaching_style[]`) | `['Socratic', 'Lecture', 'Project-Based', 'Flipped Classroom', 'Discussion', 'Montessori', 'Direct Instruction']` | `'Lecture'`, `'Socratic Method'`, `'Interactive'`, `'Project-Based'`, `'Flipped Classroom'`, `'Discussion-Based'`, `'Hands-On'` | **FATAL CRASH**: Selecting `'Montessori'`, `'Direct Instruction'`, or `'Discussion'` throws `invalid input value for enum public.teaching_style: "Montessori"` on class update. |
| [`ClassDetails.tsx:L362`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx#L362) | Assessment Preferences (`assessment_preference[]`) | `['Formative', 'Summative', 'Peer Review', 'Self Assessment', 'Portfolio', 'Criteria-based', 'Multiple Choice']` | `'Multiple Choice'`, `'Short Answer'`, `'Essays'`, `'Presentations'`, `'Single Project'`, `'Group Projects'`, `'Oral Exams'`, `'Peer Review'` | **FATAL CRASH**: Selecting `'Formative'`, `'Summative'`, or `'Portfolio'` throws `invalid input value for enum public.assessment_preference: "Formative"`. |
| [`ClassDetails.tsx:L474`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx#L474) | Resource Category (`content_category`) | Hardcoded `<option>` strings (`'Study Material'`, `'Note'`, `'Assigned Book'`, etc.) | Matches today, but is brittle: any future addition/removal in PostgreSQL breaks the form. | **DRIFT RISK**: Hardcoded literals bypass schema evolution. |
| [`SubmissionGradingModal.tsx:L444`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/SubmissionGradingModal.tsx#L444) | Submission Status (`submission_status`) | Hardcoded `<option>` strings (`'Assigned'`, `'Submitted'`, `'Evaluated'`, `'Graded'`) | `'Assigned'`, `'Pending'`, `'Submitted'`, `'Evaluated'`, `'Graded'` | **OMISSION**: `'Pending'` status is missing from dropdown; `'Graded'` has hardcoded text label. |
| [`StudentSubmissionUploadModal.tsx:L100`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentSubmissionUploadModal.tsx#L100) | Content Type (`content_type`) | `type: 'File' as any` with pseudo-path `text://${itemId}` | `'File'`, `'URL'` (Missing `'Text'`) | **OMISSION / CASCADE CRASH**: Omission of `'Text'` in PostgreSQL forced developers to coerce `type: 'File' as any` with fake `text://` URIs, which crashes Supabase Storage downloads in `MaterialPreviewModal.tsx`. Fixed by adding `'Text'` in Plan 01 and regenerating `db.ts`. |

---

## 2. Canonical Architectural Pattern: Auto-Generated Enums
The repository **already possesses the ideal design pattern** demonstrated in [`CreateClassModal.tsx:L346-L350`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/CreateClassModal.tsx#L346-L350) for `institute_type`:

```tsx
// Canonical Pattern from CreateClassModal.tsx
import { Constants } from '@/types/db';

<select value={newInstType} onChange={(e) => setNewInstType(e.target.value)}>
  {Constants.public.Enums.institute_type.map((i_type) => (
    <option key={i_type} value={i_type}>
      {i_type}
    </option>
  ))}
</select>
```

We will standardize this architectural pattern across **all** UI components where database enums are involved.

```
PostgreSQL Schema (Single Source of Truth)
           │
           │  (uv run python scripts/_generate_types.py)
           ▼
frontend/src/types/db.ts
  ├── Database['public']['Enums'][EnumName]    (Strict compile-time union)
  └── Constants.public.Enums[EnumName]         (Runtime string array)
           │
           ├──► frontend/src/types/main.ts (Strict domain types)
           └──► All UI Form Controls & MultiSelects (Dynamic mapping)
```

---

## 3. Implementation Steps

### Step 3.1: Strict Typing in [`frontend/src/types/main.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/main.ts)
Replace loose `string` or `string[]` types with strict generated enum types:
```typescript
import type { Database } from './db';

// Enums exported directly from database contracts
export type InstructionType = Database['public']['Enums']['instruction_type'];
export type TeachingStyle = Database['public']['Enums']['teaching_style'];
export type AssessmentPreference = Database['public']['Enums']['assessment_preference'];
export type ContentCategory = Database['public']['Enums']['content_category'];
export type AttendanceStatus = Database['public']['Enums']['attendance_status'];
export type SubmissionStatus = Database['public']['Enums']['submission_status'];
export type ExperienceLevel = Database['public']['Enums']['experience_level'];
export type InstituteType = Database['public']['Enums']['institute_type'];

export interface Instruction {
  id: string;
  title: string;
  type: InstructionType; // Strict DB enum
  content: string;
  whenToApply?: string;
  isArchived?: boolean;
}

export interface ClassModel {
  // ...
  teachingStyle: TeachingStyle[]; // Strict DB enum array
  assessmentPreferences: AssessmentPreference[]; // Strict DB enum array
  experienceLevel?: ExperienceLevel; // Strict DB enum
}
```

### Step 3.2: Universal Enum Label Formatter Utility
Create `frontend/src/utils/enumFormatters.ts`:
```typescript
/**
 * Gracefully formats any PostgreSQL enum string for UI display.
 * Handles snake_case, PascalCase, and Title Case strings cleanly.
 */
export function formatEnumLabel(enumValue: string): string {
  if (!enumValue) return '';
  return enumValue
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
```

### Step 3.3: Refactor [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx)
1. **Import `Constants`**:
   ```typescript
   import { Constants } from '@/types/db';
   import type { InstructionType, TeachingStyle, AssessmentPreference, ContentCategory, ExperienceLevel } from '@/types/main';
   import { formatEnumLabel } from '@/utils/enumFormatters';
   ```

2. **Fix Guideline Creation Dropdown (L692)**:
   ```tsx
   <select
     value={newPromptType}
     onChange={(e) => setNewPromptType(e.target.value as InstructionType)}
     className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-secondary cursor-pointer"
   >
     {Constants.public.Enums.instruction_type.map((typeOption) => (
       <option key={typeOption} value={typeOption}>
         {formatEnumLabel(typeOption)}
       </option>
     ))}
   </select>
   ```

3. **Fix Instructor Style MultiSelect (L327)**:
   ```tsx
   <MultiSelect
     options={[...Constants.public.Enums.teaching_style]}
     selectedValues={classItem.teachingStyle}
     onChange={(values) => onUpdateClass(classItem.id, { teachingStyle: values as TeachingStyle[] })}
     placeholder="Select teaching styles"
   />
   ```

4. **Fix Assessment Preferences MultiSelect (L362)**:
   ```tsx
   <MultiSelect
     options={[...Constants.public.Enums.assessment_preference]}
     selectedValues={classItem.assessmentPreferences}
     onChange={(values) => onUpdateClass(classItem.id, { assessmentPreferences: values as AssessmentPreference[] })}
     placeholder="Select assessment preferences"
   />
   ```

5. **Fix Resource Category Dropdown (L474)**:
   ```tsx
   <select
     value={newCategory}
     onChange={(e) => setNewCategory(e.target.value as ContentCategory)}
     className="w-full bg-elevated border border-border-color rounded-lg p-2 text-xs text-primary-text focus:outline-none focus:border-primary cursor-pointer"
   >
     {Constants.public.Enums.content_category.map((cat) => (
       <option key={cat} value={cat}>
         {formatEnumLabel(cat)}
       </option>
     ))}
   </select>
   ```

6. **Fix Experience Scale Dropdown in Edit Mode (L347)**:
   When `isEditMode` is active, render an editable `<select>` mapping over `Constants.public.Enums.experience_level`.

### Step 3.4: Refactor [`SubmissionGradingModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/SubmissionGradingModal.tsx)
Replace hardcoded status options (L444):
```tsx
<select
  value={status}
  onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
  className="bg-surface border border-border-color rounded-xl px-3 py-1.5 text-xs text-primary font-semibold outline-none focus:border-primary cursor-pointer shadow-sm"
>
  {Constants.public.Enums.submission_status.map((statusOpt) => (
    <option key={statusOpt} value={statusOpt}>
      {formatEnumLabel(statusOpt)}
    </option>
  ))}
</select>
```

### Step 3.5: Graceful Pedagogical Tooltips Dictionary ([`frontend/src/utils/enumTooltips.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/utils/enumTooltips.ts))
Create a type-safe tooltip utility using a key-value dictionary with graceful fallback:
```typescript
/**
 * Pedagogical descriptions for educational terms in forms and badges.
 * Uses key-value matching with graceful fallback so new database enums
 * never break the build or UI.
 */
const ENUM_TOOLTIPS: Partial<Record<string, string>> = {
  // Teaching Styles
  'Lecture': 'Traditional educator-led presentation delivering structured foundational knowledge.',
  'Socratic Method': 'Inquiry-driven questioning encouraging students to formulate answers through reasoned dialogue.',
  'Interactive': 'Active learning through real-time group discussions, polls, and collaborative exercises.',
  'Project-Based': 'Hands-on investigation where students acquire knowledge by executing sustained, real-world tasks.',
  'Flipped Classroom': 'Direct instruction delivered at home, reserving class time for guided application.',
  'Discussion-Based': 'Facilitated open forums exploring diverse perspectives and collaborative problem-solving.',
  'Hands-On': 'Experiential learning focused on tactile exercises, experiments, and physical prototypes.',

  // Instruction Types
  'System Persona': 'Defines the overarching demeanor, tone, and pedagogical role of the AI assistant for this class.',
  'Grading Rubric': 'Specifies scoring criteria, point weightings, and qualitative assessment benchmarks.',
  'Lesson Plan Guideline': 'Directs how curriculum units, sequencing, and pacing guides should be structured.',
  'Material Generation Rule': 'Enforces guidelines for generating worksheets, reading passages, and laboratory handouts.',
  'Student Interaction Rule': 'Regulates how the AI or instructor interacts with students during remedial dialogue.',
  'Assessment Creation Rule': 'Sets rules for crafting quizzes, midterm papers, and multiple-choice questions.',
  'Content Filtering Rule': 'Enforces classroom safety policies, content guardrails, and age-appropriate topic boundaries.',
  'General Policy': 'General classroom operating procedure or instructional standard not covered elsewhere.',

  // Assessment Preferences
  'Multiple Choice': 'Objective evaluations using closed response selections for rapid factual recall.',
  'Short Answer': 'Brief open-ended responses evaluating conceptual comprehension in 1-3 sentences.',
  'Essays': 'Extended written analyses evaluating critical thinking, thesis defense, and synthesis.',
  'Presentations': 'Live or recorded oral demonstrations showcasing verbal articulation and mastery.',
  'Single Project': 'Comprehensive individual capstone projects assessing multi-week cumulative mastery.',
  'Group Projects': 'Collaborative team assignments evaluating teamwork, division of labor, and shared output.',
  'Oral Exams': 'Direct spoken question-and-answer examinations assessing immediate recall and reasoning.',
  'Peer Review': 'Structured collaborative critiques where students evaluate peer work against a rubric.',
};

export function getEnumTooltip(enumValue?: string): string {
  if (!enumValue) return '';
  return ENUM_TOOLTIPS[enumValue] || '';
}
```

UI Integration in [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx):
1. **Teaching Style & Assessment Badges**:
   ```tsx
   {classItem.teachingStyle.map(ts => (
     <span
       key={ts}
       title={getEnumTooltip(ts)}
       className="cursor-help px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full border border-primary/20"
     >
       {ts}
     </span>
   ))}
   ```
2. **Guideline Type Callout**: Under the `<select>`, render:
   ```tsx
   {getEnumTooltip(newPromptType) && (
     <p className="text-[11px] text-muted-text italic mt-1 bg-surface/50 p-2 rounded border border-border-color/50">
       💡 {getEnumTooltip(newPromptType)}
     </p>
   )}
   ```

---

## 4. Verification Plan

### Automated Verification:
- Run `npm run build` in `frontend/` to confirm:
  - Zero TypeScript compile errors.
  - All form controls strictly accept valid enum literals.

### Manual Verification:
1. **Class Details Guidelines**:
   - Open a class, go to **AI Custom Instructions & Guidelines**.
   - Create a guideline with type "Lesson Plan Guideline". Verify HTTP 200/201 response.
2. **Teaching Styles & Assessment Preferences**:
   - Open class settings, toggle **Edit Mode**.
   - Select "Socratic Method", "Project-Based", and "Flipped Classroom".
   - Select "Single Project" and "Peer Review".
   - Save the class.
   - Verify PostgreSQL accepts the array payload without enum constraint errors.
3. **Submission Grading**:
   - Open a student submission grading modal.
   - Verify all 5 statuses ("Assigned", "Pending", "Submitted", "Evaluated", "Graded") appear dynamically in the dropdown.
   - Change status to "Evaluated" and save. Verify status updates in the database.

---

## 5. Downstream Dependencies
- **Affects**: `ClassDetails.tsx`, `CreateClassModal.tsx`, `SubmissionGradingModal.tsx`, `useClassOperations.ts`.
- **Completely resolves**: D5 and runtime constraint crashes during class updates.
