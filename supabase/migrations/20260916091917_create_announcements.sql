-- ============================================================================
-- Migration 003: Create Announcements Schema & RLS Policies
-- Creates public.announcements table with multi-tenant RLS for teachers and students.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index foreign keys and sorting columns for multi-tenant query performance
CREATE INDEX IF NOT EXISTS idx_announcements_class_id ON public.announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- RLS: Teachers manage announcements, enrolled students can read
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers manage class announcements" ON public.announcements;
CREATE POLICY "Teachers manage class announcements"
    ON public.announcements FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = announcements.class_id AND classes.user_id = (SELECT auth.uid())
    ));

DROP POLICY IF EXISTS "Enrolled students read class announcements" ON public.announcements;
CREATE POLICY "Enrolled students read class announcements"
    ON public.announcements FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.class_students 
        WHERE class_students.class_id = announcements.class_id AND class_students.student_id = (SELECT auth.uid())
    ));
