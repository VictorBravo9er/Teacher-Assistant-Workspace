-- ==========================================
-- Supabase EduRAG Assistant Database Schema
-- ==========================================

-- ==========================================
-- 7. Institutes Table
-- ==========================================

-- Enable Trigram extension for fuzzy search (handling spelling mistakes)
-- 1) Ensure the target schema exists
create schema if not exists extensions;
CREATE SCHEMA IF NOT EXISTS langgraph;

-- 2) Move the extension definition to that schema
-- Note: this will require dropping/recreating the extension.
create extension IF NOT EXISTS pg_trgm with schema extensions;
-- Enable the pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto" with schema extensions;



CREATE TABLE IF NOT EXISTS public.institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT,
    district TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add district column if the table was created before we added it
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS district TEXT;

-- Enable RLS
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE (even unauthenticated users on the signup page) to search/read the list of institutes
DROP POLICY IF EXISTS "Public can view institutes" ON public.institutes;
CREATE POLICY "Public can view institutes"
ON public.institutes FOR SELECT
USING (true);

-- Allow authenticated users to insert new institutes
DROP POLICY IF EXISTS "Authenticated users can insert institutes" ON public.institutes;
CREATE POLICY "Authenticated users can insert institutes"
ON public.institutes FOR INSERT
WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- ==========================================
-- FUZZY SEARCH FUNCTION
-- ==========================================
-- This function allows the frontend to search for institutes
-- using trigram similarity, which naturally handles spelling mistakes.
CREATE OR REPLACE FUNCTION search_institutes(search_term TEXT)
RETURNS SETOF public.institutes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  -- If search term is empty, just return some recent ones or nothing
  IF trim(search_term) = '' THEN
    RETURN QUERY SELECT * FROM public.institutes ORDER BY created_at DESC LIMIT 5;
  ELSE
    RETURN QUERY
      SELECT *
      FROM public.institutes
      WHERE
        -- Check if a substring is similar (word_similarity > 0.1) to name, city, state, or district
        word_similarity(search_term, name) > 0.1 OR
        word_similarity(search_term, city) > 0.1 OR
        word_similarity(search_term, district) > 0.1 OR
        word_similarity(search_term, state) > 0.1
      ORDER BY
        -- Order by the greatest substring similarity across the fields
        GREATEST(
          word_similarity(search_term, name),
          word_similarity(search_term, city),
          word_similarity(search_term, district),
          word_similarity(search_term, state)
        ) DESC
      LIMIT 5;
  END IF;
END;
$$;

-- ==========================================
-- FIELD AUTOCOMPLETE FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION search_districts(search_term TEXT)
RETURNS TABLE(result TEXT)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT district FROM public.institutes
  WHERE district IS NOT NULL AND district != ''
  AND word_similarity(search_term, district) > 0.1
  GROUP BY district
  ORDER BY word_similarity(search_term, district) DESC
  LIMIT 5;
$$;

CREATE OR REPLACE FUNCTION search_cities(search_term TEXT)
RETURNS TABLE(result TEXT)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT city FROM public.institutes
  WHERE city IS NOT NULL AND city != ''
  AND word_similarity(search_term, city) > 0.1
  GROUP BY city
  ORDER BY word_similarity(search_term, city) DESC
  LIMIT 5;
$$;

CREATE OR REPLACE FUNCTION search_states(search_term TEXT)
RETURNS TABLE(result TEXT)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT state FROM public.institutes
  WHERE state IS NOT NULL AND state != ''
  AND word_similarity(search_term, state) > 0.1
  GROUP BY state
  ORDER BY word_similarity(search_term, state) DESC
  LIMIT 5;
$$;

CREATE OR REPLACE FUNCTION search_countries(search_term TEXT)
RETURNS TABLE(result TEXT)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT country FROM public.institutes
  WHERE country IS NOT NULL AND country != ''
  AND word_similarity(search_term, country) > 0.1
  GROUP BY country
  ORDER BY word_similarity(search_term, country) DESC
  LIMIT 5;
$$;


-- ==========================================
-- 1. Classes Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.classes (
    institute_id UUID REFERENCES public.institutes(id),
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    academic_year TEXT,
    semester TEXT,
    subject TEXT,
    teacher_name TEXT,
    teaching_style TEXT,
    experience_level TEXT,
    special_notes TEXT,
    assessment_preferences TEXT,
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own classes" ON public.classes;
CREATE POLICY "Users can only view their own classes" ON public.classes FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own classes" ON public.classes;
CREATE POLICY "Users can only insert their own classes" ON public.classes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own classes" ON public.classes;
CREATE POLICY "Users can only update their own classes" ON public.classes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own classes" ON public.classes;
CREATE POLICY "Users can only delete their own classes" ON public.classes FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 2. Templates Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institute_id UUID REFERENCES public.institutes(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    teaching_style TEXT,
    materials_preset JSONB DEFAULT '[]'::jsonb,
    instructions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own templates" ON public.templates;
CREATE POLICY "Users can only view their own templates" ON public.templates FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own templates" ON public.templates;
CREATE POLICY "Users can only insert their own templates" ON public.templates FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own templates" ON public.templates;
CREATE POLICY "Users can only update their own templates" ON public.templates FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own templates" ON public.templates;
CREATE POLICY "Users can only delete their own templates" ON public.templates FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 3. Students Table (Global Roster per Teacher)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    learning_style TEXT, -- 'Visual', 'Auditory', 'Kinesthetic'
    strengths TEXT[],
    weaknesses TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own students" ON public.students;
CREATE POLICY "Users can only view their own students" ON public.students FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own students" ON public.students;
CREATE POLICY "Users can only insert their own students" ON public.students FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own students" ON public.students;
CREATE POLICY "Users can only update their own students" ON public.students FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own students" ON public.students;
CREATE POLICY "Users can only delete their own students" ON public.students FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 4. Class_Students (Junction & Course-Specific Data)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.class_students (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    performance_tier TEXT, -- 'High', 'Average', 'At Risk' (Class specific)
    grades JSONB DEFAULT '[]'::jsonb,
    attendance JSONB DEFAULT '{}'::jsonb,
    behavioral_notes TEXT,
    PRIMARY KEY (class_id, student_id)
);

ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
-- Using class's user_id for security policy via implicit join
DROP POLICY IF EXISTS "Users can access class_students via class ownership" ON public.class_students;
CREATE POLICY "Users can access class_students via class ownership"
ON public.class_students
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_students.class_id
        AND classes.user_id =  (SELECT auth.uid())
    )
);

-- ==========================================
-- 5. Materials Table (Central Repository)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'study_material', -- 'study_material', 'note', 'assigned_book', 'link', 'practical', 'assignment', 'test', 'exam'
    content_type TEXT NOT NULL DEFAULT 'file', -- 'file', 'url', 'text'
    storage_paths TEXT[],
    link_urls TEXT[],
    size TEXT,
    tags TEXT[],
    version_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own materials" ON public.materials;
CREATE POLICY "Users can only view their own materials" ON public.materials FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own materials" ON public.materials;
CREATE POLICY "Users can only insert their own materials" ON public.materials FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own materials" ON public.materials;
CREATE POLICY "Users can only update their own materials" ON public.materials FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own materials" ON public.materials;
CREATE POLICY "Users can only delete their own materials" ON public.materials FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 5a. Template_Materials Junction
-- ==========================================
CREATE TABLE IF NOT EXISTS public.template_materials (
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (template_id, material_id)
);

ALTER TABLE public.template_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access template_materials via template ownership" ON public.template_materials;
CREATE POLICY "Users can access template_materials via template ownership"
ON public.template_materials FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.templates
        WHERE templates.id = template_materials.template_id
        AND templates.user_id =  (SELECT auth.uid())
    )
);

-- ==========================================
-- 5b. Class_Materials Junction
-- ==========================================
CREATE TABLE IF NOT EXISTS public.class_materials (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (class_id, material_id)
);

ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access class_materials via class ownership" ON public.class_materials;
CREATE POLICY "Users can access class_materials via class ownership"
ON public.class_materials FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_materials.class_id
        AND classes.user_id =  (SELECT auth.uid())
    )
);

-- ==========================================
-- 6. Instructions Table (Rubrics/Prompts Central Repository)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT,
    content TEXT NOT NULL,
    when_to_apply TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own instructions" ON public.instructions;
CREATE POLICY "Users can only view their own instructions" ON public.instructions FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own instructions" ON public.instructions;
CREATE POLICY "Users can only insert their own instructions" ON public.instructions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own instructions" ON public.instructions;
CREATE POLICY "Users can only update their own instructions" ON public.instructions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own instructions" ON public.instructions;
CREATE POLICY "Users can only delete their own instructions" ON public.instructions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ==========================================
-- 6a. Template_Instructions Junction
-- ==========================================
CREATE TABLE IF NOT EXISTS public.template_instructions (
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    instruction_id UUID NOT NULL REFERENCES public.instructions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (template_id, instruction_id)
);

ALTER TABLE public.template_instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access template_instructions via template ownership" ON public.template_instructions;
CREATE POLICY "Users can access template_instructions via template ownership"
ON public.template_instructions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.templates
        WHERE templates.id = template_instructions.template_id
        AND templates.user_id =  (SELECT auth.uid())
    )
);

-- ==========================================
-- 6b. Class_Instructions Junction
-- ==========================================
CREATE TABLE IF NOT EXISTS public.class_instructions (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    instruction_id UUID NOT NULL REFERENCES public.instructions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (class_id, instruction_id)
);

ALTER TABLE public.class_instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access class_instructions via class ownership" ON public.class_instructions;
CREATE POLICY "Users can access class_instructions via class ownership"
ON public.class_instructions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_instructions.class_id
        AND classes.user_id =  (SELECT auth.uid())
    )
);

-- ==========================================
-- 7. Student_Materials (Submissions & Work Tracking per Class)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.student_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    submission_type TEXT NOT NULL DEFAULT 'assignment_submission', -- 'assignment_submission', 'lab_work', 'practical_completed', 'exam_paper'
    storage_paths TEXT[],
    submission_urls TEXT[],
    content TEXT,
    status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'pending', 'submitted', 'evaluated', 'graded'
    due_at TIMESTAMP WITH TIME ZONE,
    is_late BOOLEAN DEFAULT false,
    grade TEXT,
    score NUMERIC,
    max_score NUMERIC DEFAULT 100,
    rubric_breakdown JSONB DEFAULT '{}'::jsonb,
    feedback TEXT,
    private_teacher_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.student_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access student_materials via class ownership" ON public.student_materials;
CREATE POLICY "Users can access student_materials via class ownership"
ON public.student_materials FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = student_materials.class_id
        AND classes.user_id =  (SELECT auth.uid())
    )
);

-- ==========================================
-- Optional: Create Storage Bucket for Materials
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', false) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own storage objects" ON storage.objects;
CREATE POLICY "Users can view their own storage objects"
ON storage.objects FOR SELECT
USING (bucket_id = 'materials' AND  (SELECT auth.uid()) = owner);

DROP POLICY IF EXISTS "Users can insert their own storage objects" ON storage.objects;
CREATE POLICY "Users can insert their own storage objects"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'materials' AND  (SELECT auth.uid()) = owner);

-- ==========================================
-- 8. Attendance_Records Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- e.g., 'present', 'absent', 'late'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access attendance via class ownership" ON public.attendance_records;
CREATE POLICY "Users can access attendance via class ownership"
ON public.attendance_records FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = attendance_records.class_id
        AND classes.user_id =  (SELECT auth.uid())
    )
);

-- ==========================================
-- 9. Foreign Key & RLS Ownership Indexes
-- ==========================================
-- Essential indexes to prevent Sequential Scans on RLS checks, JOINs, and ON DELETE CASCADE operations.

-- Foreign Key & RLS Ownership Indexes
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON public.classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_institute_id ON public.classes(institute_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_institute_id ON public.templates(institute_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_instructions_user_id ON public.instructions(user_id);

-- Secondary FK Indexes on Composite Primary Key Junction Tables
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_template_materials_material_id ON public.template_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_class_materials_material_id ON public.class_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_template_instructions_instruction_id ON public.template_instructions(instruction_id);
CREATE INDEX IF NOT EXISTS idx_class_instructions_instruction_id ON public.class_instructions(instruction_id);

-- Child Table Foreign Key Indexes (prevent Seq Scan on JOIN / CASCADE)
CREATE INDEX IF NOT EXISTS idx_student_materials_class_id ON public.student_materials(class_id);
CREATE INDEX IF NOT EXISTS idx_student_materials_student_id ON public.student_materials(student_id);
CREATE INDEX IF NOT EXISTS idx_student_materials_material_id ON public.student_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_id ON public.attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);

-- ==========================================
-- 10. Chat_Sessions Table (AI Conversations)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only view their own chat sessions" ON public.chat_sessions FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only insert their own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only update their own chat sessions" ON public.chat_sessions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only delete their own chat sessions" ON public.chat_sessions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Chat System Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_class_id ON public.chat_sessions(class_id);
