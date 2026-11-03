-- ============================================================================
-- Migration 005: Fix RLS Infinite Recursion on Classes and Class Students
-- Resolves circular dependency (classes <-> class_students) using a
-- SECURITY DEFINER helper function for class teacher verification.
-- ============================================================================

-- 1. Helper function that bypasses RLS on public.classes during junction lookups
CREATE OR REPLACE FUNCTION public.is_class_teacher(lookup_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = lookup_class_id AND user_id = (SELECT auth.uid())
  );
$$;

COMMENT ON FUNCTION public.is_class_teacher(UUID) IS 
'Security Definer helper to check if current user is the owner/teacher of a class without triggering RLS recursion.';

-- 2. Update public.class_students to use the helper function
DROP POLICY IF EXISTS "Users can access class_students" ON public.class_students;
CREATE POLICY "Users can access class_students"
    ON public.class_students FOR ALL
    USING (
        student_id = (SELECT auth.uid())
        OR public.is_class_teacher(class_id)
    );

-- 3. Also update student_submissions and attendance_records for consistency & optimal performance
DROP POLICY IF EXISTS "Users can access student_submissions" ON public.student_submissions;
CREATE POLICY "Users can access student_submissions"
    ON public.student_submissions FOR ALL
    USING (
        student_id = (SELECT auth.uid())
        OR public.is_class_teacher(class_id)
    );

DROP POLICY IF EXISTS "Users can access attendance" ON public.attendance_records;
CREATE POLICY "Users can access attendance"
    ON public.attendance_records FOR ALL
    USING (
        student_id = (SELECT auth.uid())
        OR public.is_class_teacher(class_id)
    );
