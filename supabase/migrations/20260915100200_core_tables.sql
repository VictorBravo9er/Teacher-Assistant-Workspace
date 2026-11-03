-- ============================================================================
-- Teach&Learn: Core Baseline Tables and Indexes
-- Timestamp: 20260915100200
-- ============================================================================

-- 1. Helper Validation Functions
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

-- 2. Core Tables
CREATE TABLE IF NOT EXISTS public.institutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type public.institute_type NOT NULL,
    city TEXT,
    district TEXT,
    state TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
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

-- 3. Baseline Foreign Key Indexes
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
