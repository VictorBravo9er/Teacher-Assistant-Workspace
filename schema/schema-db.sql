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



-- ==========================================
-- Custom Enums
-- ==========================================
DO $$ BEGIN
    CREATE TYPE public.material_category AS ENUM ('Study Material', 'Note', 'Assigned Book', 'Link', 'Practical', 'Assignment', 'Test', 'Exam');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.material_content_type AS ENUM ('File', 'URL', 'Text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.submission_type AS ENUM ('Assignment Submission', 'Lab Work', 'Practical Completed', 'Exam Paper');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.submission_status AS ENUM ('Assigned', 'Pending', 'Submitted', 'Evaluated', 'Graded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Excused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.institute_type AS ENUM ('Primary School', 'Middle School', 'High School', 'K-12', 'College', 'University', 'Vocational School', 'Tutoring Center', 'Private Tutor', 'Freelancer', 'Training Agency', 'Online Academy', 'Homeschool Co-op', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.instruction_type AS ENUM ('System Persona', 'Grading Rubric', 'Lesson Plan Guideline', 'Material Generation Rule', 'Student Interaction Rule', 'Assessment Creation Rule', 'Content Filtering Rule', 'General Policy');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.experience_level AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Mixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.teaching_style AS ENUM ('Lecture', 'Socratic Method', 'Interactive', 'Project-Based', 'Flipped Classroom', 'Discussion-Based', 'Hands-On');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.assessment_preference AS ENUM ('Multiple Choice', 'Short Answer', 'Essays', 'Presentations', 'Single Project', 'Group Projects', 'Oral Exams', 'Peer Review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type public.institute_type,
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
    teaching_style public.teaching_style[],
    experience_level public.experience_level,
    special_notes TEXT,
    assessment_preferences public.assessment_preference[],
    is_archived BOOLEAN DEFAULT false,
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
    teaching_style public.teaching_style[],
    experience_level public.experience_level,
    assessment_preferences public.assessment_preference[],
    is_archived BOOLEAN DEFAULT false,
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
    is_archived BOOLEAN DEFAULT false,
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
    category public.material_category NOT NULL DEFAULT 'Study Material',
    content_type public.material_content_type NOT NULL DEFAULT 'File',
    storage_paths TEXT[],
    link_urls TEXT[],
    size TEXT,
    tags TEXT[],
    version_history JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT false,
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
    type public.instruction_type NOT NULL DEFAULT 'General Policy',
    content TEXT NOT NULL,
    when_to_apply TEXT,
    is_archived BOOLEAN DEFAULT false,
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
    submission_type public.submission_type NOT NULL DEFAULT 'Assignment Submission',
    storage_paths TEXT[],
    submission_urls TEXT[],
    content TEXT,
    status public.submission_status NOT NULL DEFAULT 'Assigned',
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
    status public.attendance_status NOT NULL,
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

-- ==========================================
-- 11. Schema Documentation (Comments)
-- ==========================================

-- Table Comments
COMMENT ON TABLE public.institutes IS 'Represents educational organizations or individual teaching entities.';
COMMENT ON TABLE public.classes IS 'Core entity representing a specific course or class taught by a user.';
COMMENT ON TABLE public.templates IS 'Blueprints created by teachers to quickly scaffold new classes with preset configurations and materials.';
COMMENT ON TABLE public.students IS 'Global roster of students managed by a teacher across all their classes.';
COMMENT ON TABLE public.class_students IS 'Junction table linking students to specific classes, tracking class-specific performance and notes.';
COMMENT ON TABLE public.materials IS 'Central repository of all teaching resources (files, links, tests) uploaded by the user.';
COMMENT ON TABLE public.template_materials IS 'Junction linking materials to a template.';
COMMENT ON TABLE public.class_materials IS 'Junction linking materials to a specific class.';
COMMENT ON TABLE public.instructions IS 'Central repository of AI prompts, rubrics, and rules created by the teacher.';
COMMENT ON TABLE public.template_instructions IS 'Junction linking AI instructions to a template.';
COMMENT ON TABLE public.class_instructions IS 'Junction linking AI instructions to a specific class context.';
COMMENT ON TABLE public.student_materials IS 'Tracks individual student assignments, submissions, grading status, and rubric breakdowns for a specific class.';
COMMENT ON TABLE public.attendance_records IS 'Daily or session-based attendance logs for students in a class.';
COMMENT ON TABLE public.chat_sessions IS 'Metadata for AI chat sessions. Note: Message history is stored in the langgraph schema.';

-- Column Comments
COMMENT ON COLUMN public.institutes.type IS 'Classifies the organization (e.g., High School, University).';
COMMENT ON COLUMN public.institutes.district IS 'School district or regional administration name.';

COMMENT ON COLUMN public.classes.academic_year IS 'The academic year (e.g., 2024-2025).';
COMMENT ON COLUMN public.classes.semester IS 'The specific term (e.g., Fall, Spring).';
COMMENT ON COLUMN public.classes.teaching_style IS 'Array of pedagogical approaches used in this class.';
COMMENT ON COLUMN public.classes.experience_level IS 'The intended proficiency level of the students.';
COMMENT ON COLUMN public.classes.assessment_preferences IS 'Array of preferred evaluation methods.';
COMMENT ON COLUMN public.classes.is_archived IS 'Soft-delete flag to hide the class without losing historical data.';

COMMENT ON COLUMN public.templates.is_archived IS 'Soft-delete flag to hide the template.';

COMMENT ON COLUMN public.students.learning_style IS 'The students primary learning modality (e.g., Visual, Auditory).';
COMMENT ON COLUMN public.students.strengths IS 'Free-form tags describing what the student excels at.';
COMMENT ON COLUMN public.students.weaknesses IS 'Free-form tags describing areas where the student struggles.';
COMMENT ON COLUMN public.students.is_archived IS 'Soft-delete flag for the global roster.';

COMMENT ON COLUMN public.class_students.performance_tier IS 'Class-specific evaluation of the students performance (e.g., High Performing, At Risk).';
COMMENT ON COLUMN public.class_students.behavioral_notes IS 'Class-specific notes on the students behavior.';

COMMENT ON COLUMN public.materials.category IS 'Broad classification of the resource.';
COMMENT ON COLUMN public.materials.content_type IS 'The physical medium (File, URL, Text).';
COMMENT ON COLUMN public.materials.storage_paths IS 'Array of Supabase Storage bucket paths if files were uploaded.';
COMMENT ON COLUMN public.materials.link_urls IS 'Array of external web links if applicable.';
COMMENT ON COLUMN public.materials.version_history IS 'JSONB array tracking previous versions of the material.';
COMMENT ON COLUMN public.materials.is_archived IS 'Soft-delete flag.';

COMMENT ON COLUMN public.instructions.type IS 'Categorizes the prompt (e.g., Grading Rubric, System Persona).';
COMMENT ON COLUMN public.instructions.when_to_apply IS 'Semantic hint used by the AI to determine when to trigger this instruction.';
COMMENT ON COLUMN public.instructions.is_archived IS 'Soft-delete flag.';

COMMENT ON COLUMN public.student_materials.submission_type IS 'The nature of the students submitted work.';
COMMENT ON COLUMN public.student_materials.status IS 'Lifecycle state (Assigned, Pending, Submitted, Evaluated, Graded).';
COMMENT ON COLUMN public.student_materials.rubric_breakdown IS 'JSONB object containing granular AI scoring against rubric criteria.';
COMMENT ON COLUMN public.student_materials.feedback IS 'Public feedback visible to the student.';
COMMENT ON COLUMN public.student_materials.private_teacher_notes IS 'Hidden notes only visible to the teacher.';

COMMENT ON COLUMN public.attendance_records.status IS 'Daily attendance state (Present, Absent, etc.).';

COMMENT ON COLUMN public.chat_sessions.title IS 'Auto-generated or custom title for the AI chat session.';
COMMENT ON COLUMN public.chat_sessions.class_id IS 'Optional link to restrict the AI context to a specific class.';

-- Enum Comments
COMMENT ON TYPE public.material_category IS 'Broad classification of teaching materials.';
COMMENT ON TYPE public.material_content_type IS 'The physical medium of the material (File upload, URL link, or raw Text).';
COMMENT ON TYPE public.submission_type IS 'The nature of the work the student is submitting.';
COMMENT ON TYPE public.submission_status IS 'Lifecycle state of a student submission.';
COMMENT ON TYPE public.attendance_status IS 'Standard attendance states.';
COMMENT ON TYPE public.institute_type IS 'The classification of the educational organization.';
COMMENT ON TYPE public.instruction_type IS 'Categorizes the purpose of an AI prompt or rule.';
COMMENT ON TYPE public.experience_level IS 'Target proficiency level of a class or template.';
COMMENT ON TYPE public.teaching_style IS 'Pedagogical approaches utilized in a class.';
COMMENT ON TYPE public.assessment_preference IS 'Preferred methods of evaluating students.';
