-- ==========================================
-- Supabase Teach&Learn Assistant Database Schema
-- ==========================================

-- ==========================================
-- 1. Schemas & Extensions
-- ==========================================
create schema if not exists extensions;
CREATE SCHEMA IF NOT EXISTS langgraph;
create extension IF NOT EXISTS pg_trgm with schema extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" with schema extensions;


-- ==========================================
-- 2. Custom Enums
-- ==========================================
DO $$ BEGIN CREATE TYPE public.content_category AS ENUM ('Study Material', 'Note', 'Assigned Book', 'Link', 'Practical', 'Assignment', 'Test', 'Exam'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.content_type AS ENUM ('File', 'URL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.submission_status AS ENUM ('Assigned', 'Pending', 'Submitted', 'Evaluated', 'Graded'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Excused'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.institute_type AS ENUM ('Primary School', 'Middle School', 'High School', 'K-12', 'College', 'University', 'Vocational School', 'Tutoring Center', 'Private Tutor', 'Freelancer', 'Training Agency', 'Online Academy', 'Homeschool Co-op', 'Other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.instruction_type AS ENUM ('System Persona', 'Grading Rubric', 'Lesson Plan Guideline', 'Material Generation Rule', 'Student Interaction Rule', 'Assessment Creation Rule', 'Content Filtering Rule', 'General Policy'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.experience_level AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Mixed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.teaching_style AS ENUM ('Lecture', 'Socratic Method', 'Interactive', 'Project-Based', 'Flipped Classroom', 'Discussion-Based', 'Hands-On'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.assessment_preference AS ENUM ('Multiple Choice', 'Short Answer', 'Essays', 'Presentations', 'Single Project', 'Group Projects', 'Oral Exams', 'Peer Review'); EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ==========================================
-- 3. Utility Functions for Table Validation
-- ==========================================
CREATE OR REPLACE FUNCTION validate_content_array(arr jsonb)
RETURNS boolean AS $$
DECLARE
    elem jsonb;
BEGIN
    IF jsonb_typeof(arr) != 'array' THEN RETURN false; END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(arr)
    LOOP
        IF NOT (
            elem ? 'id' AND jsonb_typeof(elem->'id') = 'string' AND
            elem ? 'name' AND jsonb_typeof(elem->'name') = 'string' AND
            elem ? 'type' AND (elem->>'type' = ANY (enum_range(NULL::public.content_type)::text[])) AND
            elem ? 'path' AND jsonb_typeof(elem->'path') = 'string' AND
            (NOT elem ? 'description' OR jsonb_typeof(elem->'description') = 'string')
        ) THEN
            RETURN false;
        END IF;
    END LOOP;
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ==========================================
-- 4. Table Definitions
-- ==========================================

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
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS district TEXT;

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

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.class_students (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    learning_style TEXT,
    strengths TEXT[],
    weaknesses TEXT[],
    current_score NUMERIC,
    current_grade TEXT,
    general_feedback TEXT,
    performance_tier TEXT,
    behavioral_notes TEXT,
    PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category public.content_category NOT NULL DEFAULT 'Study Material',
    content JSONB DEFAULT '[]'::jsonb,
    to_be_scored BOOLEAN DEFAULT false,
    due_at TIMESTAMP WITH TIME ZONE,
    max_score NUMERIC DEFAULT 100,
    rubric_criteria JSONB DEFAULT '[]'::jsonb,
    tags TEXT[],
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_content_shape CHECK (validate_content_array(content)),
    CONSTRAINT check_scored_requirements CHECK (to_be_scored = false OR (due_at IS NOT NULL AND max_score IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.template_materials (
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    custom_content JSONB DEFAULT NULL,
    custom_rubric_criteria JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (template_id, material_id),
    CONSTRAINT valid_tpl_custom_content_shape CHECK (custom_content IS NULL OR validate_content_array(custom_content))
);

CREATE TABLE IF NOT EXISTS public.class_materials (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    custom_content JSONB DEFAULT NULL,
    custom_rubric_criteria JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (class_id, material_id),
    CONSTRAINT valid_class_custom_content_shape CHECK (custom_content IS NULL OR validate_content_array(custom_content))
);

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

CREATE TABLE IF NOT EXISTS public.template_instructions (
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    instruction_id UUID NOT NULL REFERENCES public.instructions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (template_id, instruction_id)
);

CREATE TABLE IF NOT EXISTS public.class_instructions (
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    instruction_id UUID NOT NULL REFERENCES public.instructions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (class_id, instruction_id)
);

CREATE TABLE IF NOT EXISTS public.student_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    content JSONB DEFAULT '[]'::jsonb,
    status public.submission_status NOT NULL DEFAULT 'Assigned',
    due_at TIMESTAMP WITH TIME ZONE,
    is_late BOOLEAN DEFAULT false,
    grade TEXT,
    score NUMERIC,
    rubric_breakdown JSONB DEFAULT '{}'::jsonb,
    feedback TEXT,
    private_teacher_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_content_shape CHECK (validate_content_array(content))
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status public.attendance_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_class_student_date UNIQUE (class_id, student_id, date)
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'general',
    scope_type TEXT DEFAULT 'class',
    selected_ids TEXT[] DEFAULT '{}',
    custom_instructions TEXT DEFAULT '',
    messages JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==========================================
-- 5. Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON public.classes(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_institute_id ON public.classes(institute_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_institute_id ON public.templates(institute_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON public.materials(user_id);
CREATE INDEX IF NOT EXISTS idx_instructions_user_id ON public.instructions(user_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_template_materials_material_id ON public.template_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_class_materials_material_id ON public.class_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_template_instructions_instruction_id ON public.template_instructions(instruction_id);
CREATE INDEX IF NOT EXISTS idx_class_instructions_instruction_id ON public.class_instructions(instruction_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_class_id ON public.student_submissions(class_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_student_id ON public.student_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_material_id ON public.student_submissions(material_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_id ON public.attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_class_id ON public.chat_sessions(class_id);


-- ==========================================
-- 6. Trigger Functions & Triggers
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role') = 'student' OR (new.raw_user_meta_data->>'role') IS NULL THEN
    INSERT INTO public.students (id, name, email)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown Student'),
      new.email
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role') = 'student' OR (new.raw_user_meta_data->>'role') IS NULL THEN
    IF old.email IS DISTINCT FROM new.email OR old.raw_user_meta_data->>'full_name' IS DISTINCT FROM new.raw_user_meta_data->>'full_name' THEN
      UPDATE public.students
      SET email = new.email,
          name = COALESCE(new.raw_user_meta_data->>'full_name', name)
      WHERE id = new.id;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();

CREATE OR REPLACE FUNCTION auto_set_to_be_scored()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category IN ('Practical', 'Assignment', 'Test', 'Exam') THEN
        NEW.to_be_scored := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_set_to_be_scored ON public.materials;
CREATE TRIGGER trg_auto_set_to_be_scored
BEFORE INSERT OR UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION auto_set_to_be_scored();

CREATE OR REPLACE FUNCTION public.sync_student_class_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_id UUID;
    v_student_id UUID;
    v_avg_score NUMERIC;
    v_tier TEXT;
    v_grade TEXT;
BEGIN
    v_class_id := COALESCE(NEW.class_id, OLD.class_id);
    v_student_id := COALESCE(NEW.student_id, OLD.student_id);

    -- Calculate average percentage score across all scored submissions for this student in this class
    SELECT 
        ROUND(AVG((score / NULLIF(COALESCE(m.max_score, 100), 0)) * 100), 2)
    INTO v_avg_score
    FROM public.student_submissions s
    LEFT JOIN public.materials m ON s.material_id = m.id
    WHERE s.class_id = v_class_id
      AND s.student_id = v_student_id
      AND s.score IS NOT NULL;

    IF v_avg_score IS NULL THEN
        v_tier := 'Average';
        v_grade := NULL;
    ELSIF v_avg_score >= 88 THEN
        v_tier := 'High';
        v_grade := 'A';
    ELSIF v_avg_score >= 75 THEN
        v_tier := 'Average';
        v_grade := 'B';
    ELSIF v_avg_score >= 60 THEN
        v_tier := 'Average';
        v_grade := 'C';
    ELSE
        v_tier := 'At Risk';
        v_grade := 'D';
    END IF;

    UPDATE public.class_students
    SET current_score = v_avg_score,
        current_grade = v_grade,
        performance_tier = v_tier
    WHERE class_id = v_class_id
      AND student_id = v_student_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_scores ON public.student_submissions;
CREATE TRIGGER trg_sync_student_scores
AFTER INSERT OR UPDATE OF score, class_id, student_id OR DELETE
ON public.student_submissions
FOR EACH ROW EXECUTE FUNCTION public.sync_student_class_scores();


-- ==========================================
-- 7. Functions & RPCs
-- ==========================================
CREATE OR REPLACE FUNCTION search_institutes(search_term TEXT)
RETURNS SETOF public.institutes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
BEGIN
  IF trim(search_term) = '' THEN
    RETURN QUERY SELECT * FROM public.institutes ORDER BY created_at DESC LIMIT 5;
  ELSE
    RETURN QUERY
      SELECT * FROM public.institutes
      WHERE
        word_similarity(search_term, name) > 0.1 OR
        word_similarity(search_term, city) > 0.1 OR
        word_similarity(search_term, district) > 0.1 OR
        word_similarity(search_term, state) > 0.1
      ORDER BY
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

CREATE OR REPLACE FUNCTION search_districts(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT district FROM public.institutes WHERE district IS NOT NULL AND district != '' AND word_similarity(search_term, district) > 0.1 GROUP BY district ORDER BY word_similarity(search_term, district) DESC LIMIT 5; $$;
CREATE OR REPLACE FUNCTION search_cities(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT city FROM public.institutes WHERE city IS NOT NULL AND city != '' AND word_similarity(search_term, city) > 0.1 GROUP BY city ORDER BY word_similarity(search_term, city) DESC LIMIT 5; $$;
CREATE OR REPLACE FUNCTION search_states(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT state FROM public.institutes WHERE state IS NOT NULL AND state != '' AND word_similarity(search_term, state) > 0.1 GROUP BY state ORDER BY word_similarity(search_term, state) DESC LIMIT 5; $$;
CREATE OR REPLACE FUNCTION search_countries(search_term TEXT) RETURNS TABLE(result TEXT) LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$ SELECT country FROM public.institutes WHERE country IS NOT NULL AND country != '' AND word_similarity(search_term, country) > 0.1 GROUP BY country ORDER BY word_similarity(search_term, country) DESC LIMIT 5; $$;

CREATE OR REPLACE FUNCTION update_material_contents(p_table_name text, p_record_id uuid, p_diff_array jsonb)
RETURNS text[] LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
    v_deleted_paths text[] := ARRAY[]::text[];
    v_diff_item jsonb; v_existing_content jsonb; v_new_content jsonb := '[]'::jsonb;
    v_existing_item jsonb; v_found boolean;
BEGIN
    IF p_table_name = 'materials' THEN SELECT content INTO v_existing_content FROM public.materials WHERE id = p_record_id;
    ELSIF p_table_name = 'student_submissions' THEN SELECT content INTO v_existing_content FROM public.student_submissions WHERE id = p_record_id;
    ELSE RAISE EXCEPTION 'Invalid table name.'; END IF;

    IF v_existing_content IS NULL THEN RETURN v_deleted_paths; END IF;

    FOR v_existing_item IN SELECT * FROM jsonb_array_elements(v_existing_content) LOOP
        v_found := false;
        FOR v_diff_item IN SELECT * FROM jsonb_array_elements(p_diff_array) LOOP
            IF jsonb_typeof(v_diff_item) = 'string' AND v_diff_item#>>'{}' = v_existing_item->>'id' THEN
                v_found := true;
                IF v_existing_item->>'type' = 'File' THEN v_deleted_paths := array_append(v_deleted_paths, v_existing_item->>'path'); END IF;
                EXIT;
            END IF;
        END LOOP;
        IF NOT v_found THEN v_new_content := v_new_content || v_existing_item; END IF;
    END LOOP;

    FOR v_diff_item IN SELECT * FROM jsonb_array_elements(p_diff_array) LOOP
        IF jsonb_typeof(v_diff_item) = 'object' THEN v_new_content := v_new_content || v_diff_item; END IF;
    END LOOP;

    IF p_table_name = 'materials' THEN UPDATE public.materials SET content = v_new_content WHERE id = p_record_id;
    ELSIF p_table_name = 'student_submissions' THEN UPDATE public.student_submissions SET content = v_new_content WHERE id = p_record_id;
    END IF;
    RETURN v_deleted_paths;
END;
$$;

CREATE OR REPLACE FUNCTION add_student_to_class(
    p_class_id UUID, p_student_id UUID, p_learning_style TEXT, p_strengths TEXT[],
    p_weaknesses TEXT[], p_performance_tier TEXT, p_current_score NUMERIC,
    p_current_grade TEXT, p_general_feedback TEXT, p_behavioral_notes TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
    INSERT INTO public.class_students (class_id, student_id, performance_tier, current_score, current_grade, learning_style, strengths, weaknesses, general_feedback, behavioral_notes)
    VALUES (p_class_id, p_student_id, p_performance_tier, p_current_score, p_current_grade, p_learning_style, p_strengths, p_weaknesses, p_general_feedback, p_behavioral_notes)
    ON CONFLICT (class_id, student_id) DO UPDATE SET
        performance_tier = COALESCE(EXCLUDED.performance_tier, public.class_students.performance_tier),
        current_score = COALESCE(EXCLUDED.current_score, public.class_students.current_score),
        current_grade = COALESCE(EXCLUDED.current_grade, public.class_students.current_grade),
        learning_style = COALESCE(EXCLUDED.learning_style, public.class_students.learning_style),
        strengths = COALESCE(EXCLUDED.strengths, public.class_students.strengths),
        weaknesses = COALESCE(EXCLUDED.weaknesses, public.class_students.weaknesses),
        general_feedback = COALESCE(EXCLUDED.general_feedback, public.class_students.general_feedback),
        behavioral_notes = COALESCE(EXCLUDED.behavioral_notes, public.class_students.behavioral_notes);
    RETURN p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION unlink_material_from_class(p_class_id UUID, p_material_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    DELETE FROM public.class_materials 
    WHERE class_id = p_class_id AND material_id = p_material_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION archive_material(p_material_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE public.materials
    SET is_archived = true
    WHERE id = p_material_id;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION delete_submission_atomic(p_submission_id UUID)
RETURNS text[]
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_deleted_paths text[] := ARRAY[]::text[];
    v_item jsonb;
BEGIN
    FOR v_item IN SELECT jsonb_array_elements(content) FROM public.student_submissions WHERE id = p_submission_id LOOP
        IF v_item->>'type' = 'File' AND v_item->>'path' IS NOT NULL 
           AND NOT (v_item->>'path' LIKE 'text://%' OR v_item->>'path' LIKE 'grade://%') THEN
            v_deleted_paths := array_append(v_deleted_paths, v_item->>'path');
        END IF;
    END LOOP;

    DELETE FROM public.student_submissions WHERE id = p_submission_id;
    RETURN v_deleted_paths;
END;
$$;

CREATE OR REPLACE FUNCTION delete_material(p_material_id uuid) RETURNS text[] LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
    v_deleted_paths text[] := ARRAY[]::text[];
    v_item jsonb;
    v_submission_count int;
    v_other_ref_count int;
BEGIN
    -- 1. Guard: Check if student submissions are attached
    SELECT count(*) INTO v_submission_count FROM public.student_submissions WHERE material_id = p_material_id;
    IF v_submission_count > 0 THEN 
        RAISE EXCEPTION 'Cannot hard-delete material. There are % student submissions attached. Please archive the material or unlink it from the class instead.', v_submission_count; 
    END IF;

    -- 2. Iterate through content items and only return storage paths that are NOT referenced by any other material
    FOR v_item IN SELECT jsonb_array_elements(content) FROM public.materials WHERE id = p_material_id LOOP
        IF v_item->>'type' = 'File' AND v_item->>'path' IS NOT NULL 
           AND NOT (v_item->>'path' LIKE 'text://%' OR v_item->>'path' LIKE 'grade://%') THEN
            
            -- Check if any other material or class/template custom_content references this same storage path
            SELECT (
                (SELECT count(*) FROM public.materials m, jsonb_array_elements(m.content) elem WHERE m.id <> p_material_id AND elem->>'path' = v_item->>'path') +
                (SELECT count(*) FROM public.class_materials cm, jsonb_array_elements(cm.custom_content) elem WHERE cm.material_id <> p_material_id AND elem->>'path' = v_item->>'path') +
                (SELECT count(*) FROM public.template_materials tm, jsonb_array_elements(tm.custom_content) elem WHERE tm.material_id <> p_material_id AND elem->>'path' = v_item->>'path')
            ) INTO v_other_ref_count;

            -- Only mark for physical storage deletion if NO other material uses this file
            IF v_other_ref_count = 0 THEN
                v_deleted_paths := array_append(v_deleted_paths, v_item->>'path');
            END IF;
        END IF;
    END LOOP;

    -- 3. Delete the material record (cascades to class_materials, template_materials, and ai tables)
    DELETE FROM public.materials WHERE id = p_material_id;
    RETURN v_deleted_paths;
END;
$$;


-- ==========================================
-- 8. Row Level Security (RLS) Policies
-- ==========================================
ALTER TABLE public.institutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view institutes" ON public.institutes;
CREATE POLICY "Public can view institutes" ON public.institutes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert institutes" ON public.institutes;
CREATE POLICY "Authenticated users can insert institutes" ON public.institutes FOR INSERT WITH CHECK ((SELECT auth.role()) = 'authenticated');

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own classes" ON public.classes;
CREATE POLICY "Users can only view their own classes" ON public.classes FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own classes" ON public.classes;
CREATE POLICY "Users can only insert their own classes" ON public.classes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own classes" ON public.classes;
CREATE POLICY "Users can only update their own classes" ON public.classes FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own classes" ON public.classes;
CREATE POLICY "Users can only delete their own classes" ON public.classes FOR DELETE USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own templates" ON public.templates;
CREATE POLICY "Users can only view their own templates" ON public.templates FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own templates" ON public.templates;
CREATE POLICY "Users can only insert their own templates" ON public.templates FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own templates" ON public.templates;
CREATE POLICY "Users can only update their own templates" ON public.templates FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own templates" ON public.templates;
CREATE POLICY "Users can only delete their own templates" ON public.templates FOR DELETE USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view students" ON public.students;
CREATE POLICY "Users can view students" ON public.students FOR SELECT USING ( (SELECT auth.uid()) = id OR EXISTS ( SELECT 1 FROM public.class_students cs JOIN public.classes c ON cs.class_id = c.id WHERE cs.student_id = students.id AND c.user_id = (SELECT auth.uid()) ) );
DROP POLICY IF EXISTS "Students can update their own profile" ON public.students;
CREATE POLICY "Students can update their own profile" ON public.students FOR UPDATE USING ((SELECT auth.uid()) = id);

ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access class_students" ON public.class_students;
CREATE POLICY "Users can access class_students" ON public.class_students FOR ALL USING ( student_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM public.classes WHERE classes.id = class_students.class_id AND classes.user_id = (SELECT auth.uid()) ) );

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own materials" ON public.materials;
CREATE POLICY "Users can only view their own materials" ON public.materials FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own materials" ON public.materials;
CREATE POLICY "Users can only insert their own materials" ON public.materials FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own materials" ON public.materials;
CREATE POLICY "Users can only update their own materials" ON public.materials FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own materials" ON public.materials;
CREATE POLICY "Users can only delete their own materials" ON public.materials FOR DELETE USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.template_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access template_materials via template ownership" ON public.template_materials;
CREATE POLICY "Users can access template_materials via template ownership" ON public.template_materials FOR ALL USING ( EXISTS ( SELECT 1 FROM public.templates WHERE templates.id = template_materials.template_id AND templates.user_id = (SELECT auth.uid()) ) );

ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access class_materials via class ownership" ON public.class_materials;
CREATE POLICY "Users can access class_materials via class ownership" ON public.class_materials FOR ALL USING ( EXISTS ( SELECT 1 FROM public.classes WHERE classes.id = class_materials.class_id AND classes.user_id = (SELECT auth.uid()) ) );

ALTER TABLE public.instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own instructions" ON public.instructions;
CREATE POLICY "Users can only view their own instructions" ON public.instructions FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own instructions" ON public.instructions;
CREATE POLICY "Users can only insert their own instructions" ON public.instructions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own instructions" ON public.instructions;
CREATE POLICY "Users can only update their own instructions" ON public.instructions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own instructions" ON public.instructions;
CREATE POLICY "Users can only delete their own instructions" ON public.instructions FOR DELETE USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.template_instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access template_instructions via template ownership" ON public.template_instructions;
CREATE POLICY "Users can access template_instructions via template ownership" ON public.template_instructions FOR ALL USING ( EXISTS ( SELECT 1 FROM public.templates WHERE templates.id = template_instructions.template_id AND templates.user_id = (SELECT auth.uid()) ) );

ALTER TABLE public.class_instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access class_instructions via class ownership" ON public.class_instructions;
CREATE POLICY "Users can access class_instructions via class ownership" ON public.class_instructions FOR ALL USING ( EXISTS ( SELECT 1 FROM public.classes WHERE classes.id = class_instructions.class_id AND classes.user_id = (SELECT auth.uid()) ) );

ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access student_submissions" ON public.student_submissions;
CREATE POLICY "Users can access student_submissions" ON public.student_submissions FOR ALL USING ( student_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM public.classes WHERE classes.id = student_submissions.class_id AND classes.user_id = (SELECT auth.uid()) ) );

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access attendance" ON public.attendance_records;
CREATE POLICY "Users can access attendance" ON public.attendance_records FOR ALL USING ( student_id = (SELECT auth.uid()) OR EXISTS ( SELECT 1 FROM public.classes WHERE classes.id = attendance_records.class_id AND classes.user_id = (SELECT auth.uid()) ) );

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only view their own chat sessions" ON public.chat_sessions FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only insert their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only insert their own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only update their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only update their own chat sessions" ON public.chat_sessions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can only delete their own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can only delete their own chat sessions" ON public.chat_sessions FOR DELETE USING ((SELECT auth.uid()) = user_id);


-- ==========================================
-- 9. Comments (Documentation)
-- ==========================================
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
COMMENT ON TABLE public.student_submissions IS 'Tracks individual student assignments, submissions, grading status, and rubric breakdowns for a specific class.';
COMMENT ON TABLE public.attendance_records IS 'Daily or session-based attendance logs for students in a class.';
COMMENT ON TABLE public.chat_sessions IS 'Metadata for AI chat sessions. Note: Message history is stored in the langgraph schema.';

COMMENT ON COLUMN public.institutes.name IS 'Name of the institute.';
COMMENT ON COLUMN public.institutes.type IS 'Classifies the organization (e.g., High School, University).';
COMMENT ON COLUMN public.institutes.district IS 'School district or regional administration name.';
COMMENT ON COLUMN public.institutes.city IS 'City where the institute is located.';
COMMENT ON COLUMN public.institutes.state IS 'State/province of the institute.';
COMMENT ON COLUMN public.institutes.country IS 'Country of the institute.';

COMMENT ON COLUMN public.classes.name IS 'The title of the class (e.g., Intro to Biology).';
COMMENT ON COLUMN public.classes.academic_year IS 'The academic year (e.g., 2024-2025).';
COMMENT ON COLUMN public.classes.semester IS 'The specific term (e.g., Fall, Spring).';
COMMENT ON COLUMN public.classes.subject IS 'The general subject area (e.g., Science, Math).';
COMMENT ON COLUMN public.classes.teacher_name IS 'The display name of the teacher.';
COMMENT ON COLUMN public.classes.teaching_style IS 'Array of pedagogical approaches used in this class.';
COMMENT ON COLUMN public.classes.experience_level IS 'The intended proficiency level of the students.';
COMMENT ON COLUMN public.classes.special_notes IS 'Any specific context or accommodations for this class.';
COMMENT ON COLUMN public.classes.assessment_preferences IS 'Array of preferred evaluation methods.';
COMMENT ON COLUMN public.classes.is_archived IS 'Soft-delete flag to hide the class without losing historical data.';

COMMENT ON COLUMN public.templates.name IS 'Name of the template.';
COMMENT ON COLUMN public.templates.description IS 'Detailed description of the templates purpose.';
COMMENT ON COLUMN public.templates.subject IS 'The general subject area for the template.';
COMMENT ON COLUMN public.templates.is_archived IS 'Soft-delete flag to hide the template.';

COMMENT ON COLUMN public.students.name IS 'Full name of the student.';
COMMENT ON COLUMN public.students.email IS 'Contact email for the student.';
COMMENT ON COLUMN public.students.avatar_url IS 'URL to the students profile picture.';
COMMENT ON COLUMN public.students.is_archived IS 'Soft-delete flag for the global roster.';

COMMENT ON COLUMN public.class_students.current_score IS 'Aggregate score across all assignments in this class.';
COMMENT ON COLUMN public.class_students.current_grade IS 'Aggregate letter/formatted grade for this class.';
COMMENT ON COLUMN public.class_students.general_feedback IS 'Overall teacher feedback for the student in this class.';
COMMENT ON COLUMN public.class_students.performance_tier IS 'Class-specific evaluation of the students performance (e.g., High Performing, At Risk).';
COMMENT ON COLUMN public.class_students.behavioral_notes IS 'Class-specific notes on the students behavior.';

COMMENT ON COLUMN public.materials.name IS 'Title of the material.';
COMMENT ON COLUMN public.materials.category IS 'Broad classification of the resource.';
COMMENT ON COLUMN public.materials.content IS 'JSONB array of objects containing {id: "...", name: "...", type: "File"|"URL", path: "...", description?: "..."} to support mixed media.';
COMMENT ON COLUMN public.materials.due_at IS 'Default/template due date. Overridden by student_submissions.due_at if present.';
COMMENT ON COLUMN public.materials.max_score IS 'The maximum possible points for this material if it is an assessment.';
COMMENT ON COLUMN public.materials.rubric_criteria IS 'JSONB array of grading criteria attached directly to this material.';
COMMENT ON COLUMN public.materials.tags IS 'Searchable keywords for the material.';
COMMENT ON COLUMN public.materials.is_archived IS 'Soft-delete flag.';

COMMENT ON COLUMN public.instructions.title IS 'Name of the instruction/rubric.';
COMMENT ON COLUMN public.instructions.type IS 'Categorizes the prompt (e.g., Grading Rubric, System Persona).';
COMMENT ON COLUMN public.instructions.content IS 'The actual markdown or text prompt for the AI.';
COMMENT ON COLUMN public.instructions.when_to_apply IS 'Semantic hint used by the AI to determine when to trigger this instruction.';
COMMENT ON COLUMN public.instructions.is_archived IS 'Soft-delete flag.';

COMMENT ON COLUMN public.student_submissions.content IS 'JSONB array of objects containing {id: "...", name: "...", type: "File"|"URL", path: "...", description?: "..."} to support mixed media.';
COMMENT ON COLUMN public.student_submissions.status IS 'Lifecycle state (Assigned, Pending, Submitted, Evaluated, Graded).';
COMMENT ON COLUMN public.student_submissions.due_at IS 'Specific deadline for this submission (overrides material default).';
COMMENT ON COLUMN public.student_submissions.is_late IS 'Boolean flag automatically set if submitted past due_at.';
COMMENT ON COLUMN public.student_submissions.grade IS 'Letter or formatted grade assigned.';
COMMENT ON COLUMN public.student_submissions.score IS 'Numeric points awarded for the submission.';
COMMENT ON COLUMN public.student_submissions.rubric_breakdown IS 'JSONB object containing granular AI scoring against rubric criteria.';
COMMENT ON COLUMN public.student_submissions.feedback IS 'Public feedback visible to the student.';
COMMENT ON COLUMN public.student_submissions.private_teacher_notes IS 'Hidden notes only visible to the teacher.';
COMMENT ON COLUMN public.student_submissions.submitted_at IS 'Timestamp when the student turned in the work.';
COMMENT ON COLUMN public.student_submissions.reviewed_at IS 'Timestamp when the AI or teacher finalized grading.';

COMMENT ON COLUMN public.attendance_records.date IS 'The calendar date of the attendance record.';
COMMENT ON COLUMN public.attendance_records.status IS 'Daily attendance state (Present, Absent, etc.).';
COMMENT ON COLUMN public.attendance_records.notes IS 'Teacher notes for why the student was absent or late.';

COMMENT ON COLUMN public.chat_sessions.title IS 'Auto-generated or custom title for the AI chat session.';
COMMENT ON COLUMN public.chat_sessions.class_id IS 'Optional link to restrict the AI context to a specific class.';

COMMENT ON TYPE public.content_category IS 'Broad classification of teaching materials.';
COMMENT ON TYPE public.content_type IS 'The physical medium of the material (File upload or URL link).';
COMMENT ON TYPE public.submission_status IS 'Lifecycle state of a student submission.';
COMMENT ON TYPE public.attendance_status IS 'Standard attendance states.';
COMMENT ON TYPE public.institute_type IS 'The classification of the educational organization.';
COMMENT ON TYPE public.instruction_type IS 'Categorizes the purpose of an AI prompt or rule.';
COMMENT ON TYPE public.experience_level IS 'Target proficiency level of a class or template.';
COMMENT ON TYPE public.teaching_style IS 'Pedagogical approaches utilized in a class.';
COMMENT ON TYPE public.assessment_preference IS 'Preferred methods of evaluating students.';
