-- ============================================================================
-- Migration 004: Create Notification Logs Schema & RLS Policies
-- Creates public.notification_logs table for Resend batch dispatches and delivery tracking.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (
        notification_type IN ('announcement', 'material_published', 'material_updated', 'submission_turned_in')
    ),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('student', 'parent', 'teacher')),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    resend_email_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'delivered', 'bounced', 'failed', 'complained')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index foreign keys and search columns for multi-tenant query performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_class_id ON public.notification_logs(class_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_announcement_id ON public.notification_logs(announcement_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_material_id ON public.notification_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_submission_id ON public.notification_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_resend_email_id ON public.notification_logs(resend_email_id);

-- RLS: Teachers can view and manage notification logs for their classes
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers view notification logs for their classes" ON public.notification_logs;
CREATE POLICY "Teachers view notification logs for their classes"
    ON public.notification_logs FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = notification_logs.class_id AND classes.user_id = (SELECT auth.uid())
    ));
