-- Migration: 001_add_class_student_portfolio_fields.sql
-- Description: Add missing student portfolio/contact columns to class_students,
--              extend content_type enum with 'Text', and relax validate_content_array.

-- 1. Extend content_type enum with 'Text'
ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'Text';

-- 2. Add portfolio columns to public.class_students
ALTER TABLE public.class_students
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS parent_name TEXT,
    ADD COLUMN IF NOT EXISTS parent_contact TEXT,
    ADD COLUMN IF NOT EXISTS parent_notes TEXT,
    ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS roll_number TEXT;

COMMENT ON COLUMN public.class_students.custom_fields IS 'Custom key-value accommodations and IEP tags configured by the teacher.';
COMMENT ON COLUMN public.class_students.parent_notes IS 'Private teacher observations and notes regarding parent communications.';

-- 3. Relax validate_content_array to make 'path' optional when type = 'Text'
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
            (
                (elem->>'type' = 'Text') OR 
                (elem ? 'path' AND jsonb_typeof(elem->'path') = 'string')
            ) AND
            (NOT elem ? 'description' OR jsonb_typeof(elem->'description') = 'string')
        ) THEN
            RETURN false;
        END IF;
    END LOOP;
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
