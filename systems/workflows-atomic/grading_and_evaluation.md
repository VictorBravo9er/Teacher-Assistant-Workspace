# Atomic Workflows: Grading, Evaluation & Gradebook Sync

This document details the discrete atomic tasks governing manual teacher grade review, AI diagnostic diff inspection, grade publication, running GPA recomputations, and submission deletions.

---

## ATOM-GRD-01: Fetch AI Diagnostic Breakdown

### 1. Trigger
- **Event**: Teacher clicks on an **"Evaluated"** badge in [`GradebookMatrix.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/GradebookMatrix.tsx) or clicks "Review AI Diff" in [`SubmissionGradingModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/SubmissionGradingModal.tsx).

### 2. Preconditions
- Teacher owns the active class.
- The submission has reached `status = 'Evaluated'` or `status = 'Graded'`.

### 3. Execution Pipeline
1. UI invokes the public gateway RPC function:
   ```sql
   SELECT * FROM public.get_submission_ai_diagnostic(:submissionId);
   ```
2. Stored Procedure logic:
   - Evaluates `auth.uid() = classes.user_id` to enforce RLS.
   - Joins `public.student_submissions` with `ai.submission_evaluations`.
   - Returns structured JSON payload:
     ```json
     {
       "submission_id": "e4f5a6b7-8c9d-0e1f-2a3b-4c5d6e7f8a9b",
       "score": 92.5,
       "max_score": 100.0,
       "grade": "A (93%)",
       "feedback": "Strong analytical reasoning and clear mathematical derivations.",
       "private_teacher_notes": "Student showed mastery in kinematics, minor notation issue in step 3.",
       "rubric_breakdown": [
         { "criterionName": "Conceptual Accuracy", "score": 48.0, "maxScore": 50.0, "comment": "Formulas applied correctly." },
         { "criterionName": "Work Shown", "score": 44.5, "maxScore": 50.0, "comment": "Derivations clear." }
       ],
       "rationale": "High score earned across all criteria.",
       "status": "completed"
     }
     ```

### 4. Conclusion & UI Re-render
- [`AIDiagnosticDiffModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/AIDiagnosticDiffModal.tsx) opens displaying the side-by-side comparison of student work, AI rubric scores, feedback drafts, and internal teacher diagnostic notes.

---

## ATOM-GRD-02: Publish Final Student Grade

### 1. Trigger
- **Event**: Teacher reviews the scores and feedback in [`SubmissionGradingModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/SubmissionGradingModal.tsx) or [`AIDiagnosticDiffModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/AIDiagnosticDiffModal.tsx) and clicks **"Publish Grade"**.

### 2. Input Parameters
```typescript
interface PublishGradePayload {
  submissionId: string;
  score: number;
  feedback?: string;
  status: 'Graded';
}
```

### 3. Execution Pipeline
1. Client calls [`studentService.gradeSubmission()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts):
   ```sql
   UPDATE public.student_submissions
   SET score = :score,
       feedback = :feedback,
       status = 'Graded',
       updated_at = timezone('utc'::text, now())
   WHERE id = :submissionId AND class_id = :classId
   RETURNING *;
   ```
2. Automatically triggers `ATOM-GRD-03` (`trg_sync_student_scores`).

### 4. Postconditions & Conclusion
- Submission row is finalized with `status = 'Graded'`.
- Running student grade metrics in `public.class_students` are recalculated.
- Modal closes with success notification.
- In `GradebookMatrix.tsx`, the cell badge turns green displaying the published score (e.g. `92.5/100`).

---

## ATOM-GRD-03: Atomic Gradebook Recalculation

### 1. Trigger
- **Event**: PostgreSQL trigger `trg_sync_student_scores` executes on `AFTER INSERT OR UPDATE OF score, status OR DELETE ON public.student_submissions`.

### 2. Execution Pipeline
1. Trigger function `public.sync_student_class_scores()`:
   ```sql
   -- 1. Compute weighted percentage across all scored submissions for student
   SELECT AVG((score / NULLIF(max_score, 0)) * 100)
   INTO v_avg_score
   FROM public.student_submissions
   WHERE class_id = v_class_id AND student_id = v_student_id AND score IS NOT NULL;

   -- 2. Determine letter grade and tier
   IF v_avg_score >= 90 THEN v_grade := 'A'; v_tier := 'Advanced';
   ELSIF v_avg_score >= 80 THEN v_grade := 'B'; v_tier := 'Proficient';
   ELSIF v_avg_score >= 70 THEN v_grade := 'C'; v_tier := 'Developing';
   ELSIF v_avg_score IS NOT NULL THEN v_grade := 'D'; v_tier := 'Critical Support';
   ELSE v_grade := 'N/A'; v_tier := 'Unassessed';
   END IF;

   -- 3. Atomically update class_students
   UPDATE public.class_students
   SET current_score = ROUND(v_avg_score, 2),
       current_grade = v_grade,
       performance_tier = v_tier,
       updated_at = timezone('utc'::text, now())
   WHERE class_id = v_class_id AND student_id = v_student_id;
   ```

### 3. Conclusion
- Relational integrity guaranteed at the database engine level.
- Any UI screen reading `public.class_students` displays authoritative, perfectly synchronized averages without manual client math.

---

## ATOM-GRD-04: Batch Evaluation Synchronization

### 1. Trigger
- **Event**: Teacher edits multiple student grades or applies a class-wide rubric adjustment in the gradebook and clicks **"Save All Changes"**.

### 2. Execution Pipeline
1. Client calls Edge Function [`batch-sync-evaluations`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/batch-sync-evaluations):
   ```http
   POST /functions/v1/batch-sync-evaluations
   Payload: {
     class_id: string,
     updates: Array<{ submission_id: string, score: number, feedback?: string, rubric_breakdown?: any[] }>
   }
   ```
2. Edge Function executes an atomic database transaction updating all submissions and recording revised rubric allocations in `ai.submission_evaluations`.
3. Database trigger recalculates running student averages across all affected students.

### 3. Conclusion
- All gradebook cells update simultaneously with a confirmation toast: `"Synced N evaluations successfully"`.

---

## ATOM-GRD-05: Atomic Submission Deletion

### 1. Trigger
- **Event**: Teacher deletes an invalid or duplicate submission.

### 2. Execution Pipeline
1. UI invokes atomic stored procedure:
   ```sql
   SELECT public.delete_submission_atomic(:submissionId);
   ```
2. Stored Procedure logic:
   - Removes row from `public.student_submissions` (cascading to `ai.submission_evaluations`).
   - Re-triggers `trg_sync_student_scores` to recalculate student GPA without the deleted score.
   - Returns array of storage paths: `deleted_paths text[]`.
3. Storage Cleanup:
   - Client or backend deletes the files from the `student-submissions` bucket:
     ```typescript
     await supabase.storage.from('student-submissions').remove(deletedPaths);
     ```

### 3. Conclusion
- Submission row and physical storage files are purged.
- Student GPA updates automatically.
- Gradebook cell reverts to unsubmitted state.
