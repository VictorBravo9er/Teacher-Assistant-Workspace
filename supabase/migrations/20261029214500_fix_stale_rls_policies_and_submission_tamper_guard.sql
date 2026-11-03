-- ============================================================================
-- Migration 008: Fix Stale RLS Policies and Submission Tamper Guard
-- Timestamp: 20261029214500
--
-- 1. Drops stale recursive policies from 20260915100400_core_rls_policies.sql
--    that remained active after is_class_teacher() helper was introduced.
-- 2. Migrates class_materials, class_instructions, announcements, and
--    notification_logs to use is_class_teacher() for optimal performance.
-- 3. Adds trg_guard_student_submission_tamper trigger to prevent student
--    sessions from mutating score, grade, feedback, or private notes.
-- ============================================================================

-- 1. Clean up stale policies causing RLS infinite recursion on classes lookups
DROP POLICY IF EXISTS "Users can access class_students via class ownership" ON public.class_students;
DROP POLICY IF EXISTS "Users can access student_submissions via class ownership" ON public.student_submissions;
DROP POLICY IF EXISTS "Users can access attendance via class ownership" ON public.attendance_records;

-- 2. Modernize class junction and ancillary table policies to use is_class_teacher()
DROP POLICY IF EXISTS "Users can access class_materials via class ownership" ON public.class_materials;
DROP POLICY IF EXISTS "Users can access class_materials" ON public.class_materials;
CREATE POLICY "Users can access class_materials"
    ON public.class_materials FOR ALL
    USING (
        public.is_class_teacher(class_id)
        OR EXISTS (
            SELECT 1 FROM public.class_students cs
            WHERE cs.class_id = class_materials.class_id AND cs.student_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can access class_instructions via class ownership" ON public.class_instructions;
DROP POLICY IF EXISTS "Users can access class_instructions" ON public.class_instructions;
CREATE POLICY "Users can access class_instructions"
    ON public.class_instructions FOR ALL
    USING (
        public.is_class_teacher(class_id)
        OR EXISTS (
            SELECT 1 FROM public.class_students cs
            WHERE cs.class_id = class_instructions.class_id AND cs.student_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Teachers manage class announcements" ON public.announcements;
CREATE POLICY "Teachers manage class announcements"
    ON public.announcements FOR ALL
    USING (
        public.is_class_teacher(class_id)
    );

DROP POLICY IF EXISTS "Teachers view notification logs for their classes" ON public.notification_logs;
CREATE POLICY "Teachers view notification logs for their classes"
    ON public.notification_logs FOR ALL
    USING (
        public.is_class_teacher(class_id)
    );

-- 3. Student Submission Tamper Guard
CREATE OR REPLACE FUNCTION public.guard_student_submission_tamper()
RETURNS trigger AS $$
BEGIN
  -- If executed in an authenticated user context and the caller is not the class teacher:
  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.is_class_teacher(NEW.class_id) THEN
    -- Check if student is trying to alter grade fields on update
    IF TG_OP = 'UPDATE' THEN
      IF (NEW.score IS DISTINCT FROM OLD.score) OR
         (NEW.grade IS DISTINCT FROM OLD.grade) OR
         (NEW.feedback IS DISTINCT FROM OLD.feedback) OR
         (NEW.private_teacher_notes IS DISTINCT FROM OLD.private_teacher_notes) OR
         (NEW.rubric_breakdown IS DISTINCT FROM OLD.rubric_breakdown) THEN
        RAISE EXCEPTION 'Access denied: Students are not permitted to modify score, grade, or feedback fields.'
          USING ERRCODE = '42501';
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      IF NEW.score IS NOT NULL OR NEW.grade IS NOT NULL OR NEW.feedback IS NOT NULL OR NEW.private_teacher_notes IS NOT NULL THEN
        RAISE EXCEPTION 'Access denied: Cannot supply score or feedback when submitting work.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.guard_student_submission_tamper() IS 
'Security guard trigger preventing student sessions from tampering with submission grades, scores, or instructor feedback.';

DROP TRIGGER IF EXISTS trg_guard_student_submission_tamper ON public.student_submissions;
CREATE TRIGGER trg_guard_student_submission_tamper
BEFORE INSERT OR UPDATE ON public.student_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_student_submission_tamper();
