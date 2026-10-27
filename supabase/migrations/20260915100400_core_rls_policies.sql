-- ============================================================================
-- Teach&Learn: Core Baseline Row Level Security (RLS) Policies
-- Timestamp: 20260915100400
-- ============================================================================

-- 1. Institutes
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view institutes" ON public.institutes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert institutes" ON public.institutes FOR INSERT WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- 2. Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own classes" ON public.classes FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only insert their own classes" ON public.classes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only update their own classes" ON public.classes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only delete their own classes" ON public.classes FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 3. Templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own templates" ON public.templates FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only insert their own templates" ON public.templates FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only update their own templates" ON public.templates FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only delete their own templates" ON public.templates FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 4. Students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view students" ON public.students FOR SELECT USING (
    (SELECT auth.uid()) = id OR EXISTS (
        SELECT 1 FROM public.class_students cs 
        JOIN public.classes c ON cs.class_id = c.id 
        WHERE cs.student_id = students.id AND c.user_id = (SELECT auth.uid())
    )
);
CREATE POLICY "Students can update their own profile" ON public.students FOR UPDATE USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- 5. Class Students
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access class_students via class ownership" ON public.class_students FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = class_students.class_id AND classes.user_id = (SELECT auth.uid())
    )
);

-- 6. Materials
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own materials" ON public.materials FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only insert their own materials" ON public.materials FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only update their own materials" ON public.materials FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only delete their own materials" ON public.materials FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 7. Template Materials
ALTER TABLE public.template_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access template_materials via template ownership" ON public.template_materials FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.templates 
        WHERE templates.id = template_materials.template_id AND templates.user_id = (SELECT auth.uid())
    )
);

-- 8. Class Materials
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access class_materials via class ownership" ON public.class_materials FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = class_materials.class_id AND classes.user_id = (SELECT auth.uid())
    )
);

-- 9. Instructions
ALTER TABLE public.instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own instructions" ON public.instructions FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only insert their own instructions" ON public.instructions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only update their own instructions" ON public.instructions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only delete their own instructions" ON public.instructions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 10. Template Instructions
ALTER TABLE public.template_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access template_instructions via template ownership" ON public.template_instructions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.templates 
        WHERE templates.id = template_instructions.template_id AND templates.user_id = (SELECT auth.uid())
    )
);

-- 11. Class Instructions
ALTER TABLE public.class_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access class_instructions via class ownership" ON public.class_instructions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = class_instructions.class_id AND classes.user_id = (SELECT auth.uid())
    )
);

-- 12. Student Submissions
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access student_submissions via class ownership" ON public.student_submissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = student_submissions.class_id AND classes.user_id = (SELECT auth.uid())
    )
);

-- 13. Attendance Records
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access attendance via class ownership" ON public.attendance_records FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = attendance_records.class_id AND classes.user_id = (SELECT auth.uid())
    )
);

-- 14. Chat Sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only view their own chat sessions" ON public.chat_sessions FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only insert their own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only update their own chat sessions" ON public.chat_sessions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can only delete their own chat sessions" ON public.chat_sessions FOR DELETE USING ((SELECT auth.uid()) = user_id);
