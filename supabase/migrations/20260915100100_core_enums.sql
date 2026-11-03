-- ============================================================================
-- Teach&Learn: Core Baseline Types & Enums
-- Timestamp: 20260915100100
-- ============================================================================

DO $$ BEGIN CREATE TYPE public.content_category AS ENUM (
    'Study Material',
    'Note',
    'Assigned Book',
    'Link',
    'Practical',
    'Assignment',
    'Test',
    'Exam'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.content_type AS ENUM (
    'File',
    'URL'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.submission_status AS ENUM (
    'Assigned',
    'Pending',
    'Submitted',
    'Evaluated',
    'Graded'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.attendance_status AS ENUM (
    'Present',
    'Absent',
    'Late',
    'Excused'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.institute_type AS ENUM (
    'Primary School',
    'Middle School',
    'High School',
    'K-12',
    'College',
    'University',
    'Vocational School',
    'Tutoring Center',
    'Private Tutor',
    'Freelancer',
    'Training Agency',
    'Online Academy',
    'Homeschool Co-op',
    'Other'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.instruction_type AS ENUM (
    'System Persona',
    'Grading Rubric',
    'Lesson Plan Guideline',
    'Material Generation Rule',
    'Student Interaction Rule',
    'Assessment Creation Rule',
    'Content Filtering Rule',
    'General Policy'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.experience_level AS ENUM (
    'Beginner',
    'Intermediate',
    'Advanced',
    'Mixed'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.teaching_style AS ENUM (
    'Lecture',
    'Socratic Method',
    'Interactive',
    'Project-Based',
    'Flipped Classroom',
    'Discussion-Based',
    'Hands-On'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.assessment_preference AS ENUM (
    'Multiple Choice',
    'Short Answer',
    'Essays',
    'Presentations',
    'Single Project',
    'Group Projects',
    'Oral Exams',
    'Peer Review'
); EXCEPTION WHEN duplicate_object THEN null; END $$;
