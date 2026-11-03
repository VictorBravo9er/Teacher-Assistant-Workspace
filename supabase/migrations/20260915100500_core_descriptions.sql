-- ============================================================================
-- Teach&Learn: Core Baseline Documentation Comments
-- Timestamp: 20260915100500
-- ============================================================================

-- 1. Table Comments
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

-- 2. Column Comments
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

-- 3. Enum Type Comments
COMMENT ON TYPE public.content_category IS 'Broad classification of teaching materials.';
COMMENT ON TYPE public.content_type IS 'The physical medium of the material (File upload, URL link, or Text body).';
COMMENT ON TYPE public.submission_status IS 'Lifecycle state of a student submission.';
COMMENT ON TYPE public.attendance_status IS 'Standard attendance states.';
COMMENT ON TYPE public.institute_type IS 'The classification of the educational organization.';
COMMENT ON TYPE public.instruction_type IS 'Categorizes the purpose of an AI prompt or rule.';
COMMENT ON TYPE public.experience_level IS 'Target proficiency level of a class or template.';
COMMENT ON TYPE public.teaching_style IS 'Pedagogical approaches utilized in a class.';
COMMENT ON TYPE public.assessment_preference IS 'Preferred methods of evaluating students.';
