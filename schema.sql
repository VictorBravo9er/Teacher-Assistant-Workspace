-- ==========================================
-- Supabase EduRAG Assistant Database Schema
-- ==========================================

-- Enable the pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 7. Institutes Table
-- ==========================================

-- Enable Trigram extension for fuzzy search (handling spelling mistakes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- FUZZY SEARCH FUNCTION
-- ==========================================
-- This function allows the frontend to search for institutes
-- using trigram similarity, which naturally handles spelling mistakes.
CREATE OR REPLACE FUNCTION search_institutes(search_term TEXT)
RETURNS SETOF public.institutes AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FIELD AUTOCOMPLETE FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION search_districts(search_term TEXT)
RETURNS TABLE(result TEXT) AS $$
  SELECT district FROM public.institutes
  WHERE district IS NOT NULL AND district != '' 
  AND word_similarity(search_term, district) > 0.1
  GROUP BY district
  ORDER BY word_similarity(search_term, district) DESC
  LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_cities(search_term TEXT)
RETURNS TABLE(result TEXT) AS $$
  SELECT city FROM public.institutes
  WHERE city IS NOT NULL AND city != '' 
  AND word_similarity(search_term, city) > 0.1
  GROUP BY city
  ORDER BY word_similarity(search_term, city) DESC
  LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_states(search_term TEXT)
RETURNS TABLE(result TEXT) AS $$
  SELECT state FROM public.institutes
  WHERE state IS NOT NULL AND state != '' 
  AND word_similarity(search_term, state) > 0.1
  GROUP BY state
  ORDER BY word_similarity(search_term, state) DESC
  LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_countries(search_term TEXT)
RETURNS TABLE(result TEXT) AS $$
  SELECT country FROM public.institutes
  WHERE country IS NOT NULL AND country != '' 
  AND word_similarity(search_term, country) > 0.1
  GROUP BY country
  ORDER BY word_similarity(search_term, country) DESC
  LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;


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
CREATE POLICY "Users can only view their own classes" ON public.classes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own classes" ON public.classes;
CREATE POLICY "Users can only insert their own classes" ON public.classes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own classes" ON public.classes;
CREATE POLICY "Users can only update their own classes" ON public.classes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own classes" ON public.classes;
CREATE POLICY "Users can only delete their own classes" ON public.classes FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 2. Templates Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE POLICY "Users can only view their own templates" ON public.templates FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own templates" ON public.templates;
CREATE POLICY "Users can only insert their own templates" ON public.templates FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own templates" ON public.templates;
CREATE POLICY "Users can only update their own templates" ON public.templates FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own templates" ON public.templates;
CREATE POLICY "Users can only delete their own templates" ON public.templates FOR DELETE USING (auth.uid() = user_id);

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
CREATE POLICY "Users can only view their own students" ON public.students FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own students" ON public.students;
CREATE POLICY "Users can only insert their own students" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own students" ON public.students;
CREATE POLICY "Users can only update their own students" ON public.students FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own students" ON public.students;
CREATE POLICY "Users can only delete their own students" ON public.students FOR DELETE USING (auth.uid() = user_id);

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
        AND classes.user_id = auth.uid()
    )
);

-- ==========================================
-- 5. Materials Table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    size TEXT,
    tags TEXT[],
    storage_path TEXT, 
    version_history JSONB DEFAULT '[]'::jsonb,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own materials" ON public.materials;
CREATE POLICY "Users can only view their own materials" ON public.materials FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own materials" ON public.materials;
CREATE POLICY "Users can only insert their own materials" ON public.materials FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own materials" ON public.materials;
CREATE POLICY "Users can only update their own materials" ON public.materials FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own materials" ON public.materials;
CREATE POLICY "Users can only delete their own materials" ON public.materials FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 6. Instructions Table (Rubrics/Prompts)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.instructions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT, 
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only view their own instructions" ON public.instructions;
CREATE POLICY "Users can only view their own instructions" ON public.instructions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own instructions" ON public.instructions;
CREATE POLICY "Users can only insert their own instructions" ON public.instructions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own instructions" ON public.instructions;
CREATE POLICY "Users can only update their own instructions" ON public.instructions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own instructions" ON public.instructions;
CREATE POLICY "Users can only delete their own instructions" ON public.instructions FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- Optional: Create Storage Bucket for Materials
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', false) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Users can view their own storage objects" ON storage.objects;
CREATE POLICY "Users can view their own storage objects" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'materials' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can insert their own storage objects" ON storage.objects;
CREATE POLICY "Users can insert their own storage objects" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'materials' AND auth.uid() = owner);

