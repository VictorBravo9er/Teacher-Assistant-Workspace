


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE TYPE "public"."assessment_preference" AS ENUM (
    'Multiple Choice',
    'Short Answer',
    'Essays',
    'Presentations',
    'Single Project',
    'Group Projects',
    'Oral Exams',
    'Peer Review'
);


ALTER TYPE "public"."assessment_preference" OWNER TO "postgres";


COMMENT ON TYPE "public"."assessment_preference" IS 'Preferred methods of evaluating students.';



CREATE TYPE "public"."attendance_status" AS ENUM (
    'Present',
    'Absent',
    'Late',
    'Excused'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."attendance_status" IS 'Standard attendance states.';



CREATE TYPE "public"."content_category" AS ENUM (
    'Study Material',
    'Note',
    'Assigned Book',
    'Link',
    'Practical',
    'Assignment',
    'Test',
    'Exam'
);


ALTER TYPE "public"."content_category" OWNER TO "postgres";


COMMENT ON TYPE "public"."content_category" IS 'Broad classification of teaching materials.';



CREATE TYPE "public"."content_type" AS ENUM (
    'File',
    'URL',
    'Text'
);


ALTER TYPE "public"."content_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."content_type" IS 'The physical medium of the material (File upload, URL link, or Text body).';



CREATE TYPE "public"."experience_level" AS ENUM (
    'Beginner',
    'Intermediate',
    'Advanced',
    'Mixed'
);


ALTER TYPE "public"."experience_level" OWNER TO "postgres";


COMMENT ON TYPE "public"."experience_level" IS 'Target proficiency level of a class or template.';



CREATE TYPE "public"."institute_type" AS ENUM (
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
);


ALTER TYPE "public"."institute_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."institute_type" IS 'The classification of the educational organization.';



CREATE TYPE "public"."instruction_type" AS ENUM (
    'System Persona',
    'Grading Rubric',
    'Lesson Plan Guideline',
    'Material Generation Rule',
    'Student Interaction Rule',
    'Assessment Creation Rule',
    'Content Filtering Rule',
    'General Policy'
);


ALTER TYPE "public"."instruction_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."instruction_type" IS 'Categorizes the purpose of an AI prompt or rule.';



CREATE TYPE "public"."submission_status" AS ENUM (
    'Assigned',
    'Pending',
    'Submitted',
    'Evaluated',
    'Graded'
);


ALTER TYPE "public"."submission_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."submission_status" IS 'Lifecycle state of a student submission.';



CREATE TYPE "public"."teaching_style" AS ENUM (
    'Lecture',
    'Socratic Method',
    'Interactive',
    'Project-Based',
    'Flipped Classroom',
    'Discussion-Based',
    'Hands-On'
);


ALTER TYPE "public"."teaching_style" OWNER TO "postgres";


COMMENT ON TYPE "public"."teaching_style" IS 'Pedagogical approaches utilized in a class.';



CREATE OR REPLACE FUNCTION "public"."add_student_to_class"("p_class_id" "uuid", "p_student_id" "uuid", "p_learning_style" "text", "p_strengths" "text"[], "p_weaknesses" "text"[], "p_performance_tier" "text", "p_current_score" numeric, "p_current_grade" "text", "p_general_feedback" "text", "p_behavioral_notes" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."add_student_to_class"("p_class_id" "uuid", "p_student_id" "uuid", "p_learning_style" "text", "p_strengths" "text"[], "p_weaknesses" "text"[], "p_performance_tier" "text", "p_current_score" numeric, "p_current_grade" "text", "p_general_feedback" "text", "p_behavioral_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_material"("p_material_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.materials
    SET is_archived = true
    WHERE id = p_material_id;
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."archive_material"("p_material_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_set_to_be_scored"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.category IN ('Practical', 'Assignment', 'Test', 'Exam') THEN
        NEW.to_be_scored := true;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_set_to_be_scored"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_workspace_modifications"("p_client_timestamps" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_wiped BOOLEAN := false;
    v_accessible_class_ids UUID[];
    v_c_id UUID;
    v_server_timestamps jsonb := '{}'::jsonb;
    v_stale_components jsonb := '[]'::jsonb;
    v_classes_max TIMESTAMPTZ;
    v_templates_max TIMESTAMPTZ;
    v_students_max TIMESTAMPTZ;
    v_materials_max TIMESTAMPTZ;
    v_instructions_max TIMESTAMPTZ;
    v_classes_count INT;
    v_templates_count INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'stale_components', jsonb_build_array(),
            'server_timestamps', '{}'::jsonb,
            'is_wiped', true
        );
    END IF;

    -- Collect accessible classes for teacher OR student
    -- Teacher: classes owned by user
    -- Student: classes student is enrolled in
    SELECT COALESCE(array_agg(DISTINCT id), ARRAY[]::UUID[])
    INTO v_accessible_class_ids
    FROM (
        SELECT id FROM public.classes WHERE user_id = v_user_id
        UNION
        SELECT class_id AS id FROM public.class_students WHERE student_id = v_user_id
    ) t;

    -- Check if user data exists at all
    SELECT COUNT(*) INTO v_classes_count FROM unnest(v_accessible_class_ids);
    SELECT COUNT(*) INTO v_templates_count FROM public.templates WHERE user_id = v_user_id;

    IF v_classes_count = 0 AND v_templates_count = 0 THEN
        -- The workspace is empty or wiped in DB
        -- If client provided any cached keys, flag everything as wiped and stale so client purges cache
        v_is_wiped := true;
        IF p_client_timestamps IS NOT NULL AND p_client_timestamps <> '{}'::jsonb THEN
            SELECT jsonb_agg(key) INTO v_stale_components FROM jsonb_object_keys(p_client_timestamps) key;
        END IF;
        RETURN jsonb_build_object(
            'stale_components', COALESCE(v_stale_components, '[]'::jsonb),
            'server_timestamps', '{}'::jsonb,
            'is_wiped', true
        );
    END IF;

    -- 1. classes_meta
    SELECT MAX(c.updated_at)
    INTO v_classes_max
    FROM public.classes c
    WHERE c.id = ANY(v_accessible_class_ids);

    IF v_classes_max IS NOT NULL THEN
        v_server_timestamps := jsonb_set(
            v_server_timestamps, 
            '{classes_meta}', 
            to_jsonb(to_char(v_classes_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
        );
    END IF;

    -- 2. templates (for teachers)
    SELECT MAX(t.updated_at)
    INTO v_templates_max
    FROM public.templates t
    WHERE t.user_id = v_user_id;

    IF v_templates_max IS NOT NULL THEN
        v_server_timestamps := jsonb_set(
            v_server_timestamps, 
            '{templates}', 
            to_jsonb(to_char(v_templates_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
        );
    END IF;

    -- 3. Per-class components for accessible classes
    FOREACH v_c_id IN ARRAY v_accessible_class_ids LOOP
        -- class_students:<class_id>
        SELECT GREATEST(
            (SELECT MAX(cs.updated_at) FROM public.class_students cs WHERE cs.class_id = v_c_id),
            (SELECT MAX(s.updated_at) FROM public.students s WHERE s.id IN (SELECT cs2.student_id FROM public.class_students cs2 WHERE cs2.class_id = v_c_id)),
            (SELECT MAX(ar.updated_at) FROM public.attendance_records ar WHERE ar.class_id = v_c_id),
            (SELECT MAX(sub.updated_at) FROM public.student_submissions sub WHERE sub.class_id = v_c_id)
        ) INTO v_students_max;

        IF v_students_max IS NOT NULL THEN
            v_server_timestamps := jsonb_set(
                v_server_timestamps,
                ARRAY['class_students:' || v_c_id::text],
                to_jsonb(to_char(v_students_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
            );
        END IF;

        -- class_materials:<class_id>
        SELECT GREATEST(
            (SELECT MAX(cm.updated_at) FROM public.class_materials cm WHERE cm.class_id = v_c_id),
            (SELECT MAX(m.updated_at) FROM public.materials m WHERE m.id IN (SELECT cm2.material_id FROM public.class_materials cm2 WHERE cm2.class_id = v_c_id))
        ) INTO v_materials_max;

        IF v_materials_max IS NOT NULL THEN
            v_server_timestamps := jsonb_set(
                v_server_timestamps,
                ARRAY['class_materials:' || v_c_id::text],
                to_jsonb(to_char(v_materials_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
            );
        END IF;

        -- class_instructions:<class_id>
        SELECT GREATEST(
            (SELECT MAX(ci.updated_at) FROM public.class_instructions ci WHERE ci.class_id = v_c_id),
            (SELECT MAX(i.updated_at) FROM public.instructions i WHERE i.id IN (SELECT ci2.instruction_id FROM public.class_instructions ci2 WHERE ci2.class_id = v_c_id))
        ) INTO v_instructions_max;

        IF v_instructions_max IS NOT NULL THEN
            v_server_timestamps := jsonb_set(
                v_server_timestamps,
                ARRAY['class_instructions:' || v_c_id::text],
                to_jsonb(to_char(v_instructions_max, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
            );
        END IF;
    END LOOP;

    -- Detailed key-by-key comparison:
    -- A component is stale if:
    -- 1. Client has a key that is NOT in server_timestamps (e.g. deleted or no longer accessible)
    -- 2. Client timestamp is NULL or empty or older than server timestamp
    -- 3. Server has a component that client does not have cached yet
    SELECT COALESCE(jsonb_agg(comp_key), '[]'::jsonb)
    INTO v_stale_components
    FROM (
        SELECT key AS comp_key
        FROM jsonb_each_text(p_client_timestamps)
        WHERE (
            NOT (v_server_timestamps ? key)
            OR
            value IS NULL
            OR
            value = ''
            OR
            (CASE 
                WHEN value ~ '^\d{4}-\d{2}-\d{2}' THEN value::timestamptz 
                ELSE '1970-01-01T00:00:00Z'::timestamptz 
             END) < (v_server_timestamps->>key)::timestamptz
        )
        UNION
        SELECT key AS comp_key
        FROM jsonb_each_text(v_server_timestamps)
        WHERE NOT (p_client_timestamps ? key)
    ) comp_diff;

    RETURN jsonb_build_object(
        'stale_components', v_stale_components,
        'server_timestamps', v_server_timestamps,
        'is_wiped', false
    );
END;
$$;


ALTER FUNCTION "public"."check_workspace_modifications"("p_client_timestamps" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_material"("p_material_id" "uuid") RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_deleted_paths text[] := ARRAY[]::text[];
    v_item jsonb;
    v_submission_count int;
    v_other_ref_count int;
BEGIN
    SELECT count(*) INTO v_submission_count FROM public.student_submissions WHERE material_id = p_material_id;
    IF v_submission_count > 0 THEN 
        RAISE EXCEPTION 'Cannot hard-delete material. There are % student submissions attached. Please archive the material or unlink it from the class instead.', v_submission_count; 
    END IF;

    FOR v_item IN SELECT jsonb_array_elements(content) FROM public.materials WHERE id = p_material_id LOOP
        IF v_item->>'type' = 'File' AND v_item->>'path' IS NOT NULL 
           AND NOT (v_item->>'path' LIKE 'text://%' OR v_item->>'path' LIKE 'grade://%') THEN
            
            SELECT (
                (SELECT count(*) FROM public.materials m, jsonb_array_elements(m.content) elem WHERE m.id <> p_material_id AND elem->>'path' = v_item->>'path') +
                (SELECT count(*) FROM public.class_materials cm, jsonb_array_elements(cm.custom_content) elem WHERE cm.material_id <> p_material_id AND elem->>'path' = v_item->>'path') +
                (SELECT count(*) FROM public.template_materials tm, jsonb_array_elements(tm.custom_content) elem WHERE tm.material_id <> p_material_id AND elem->>'path' = v_item->>'path')
            ) INTO v_other_ref_count;

            IF v_other_ref_count = 0 THEN
                v_deleted_paths := array_append(v_deleted_paths, v_item->>'path');
            END IF;
        END IF;
    END LOOP;

    DELETE FROM public.materials WHERE id = p_material_id;
    RETURN v_deleted_paths;
END;
$$;


ALTER FUNCTION "public"."delete_material"("p_material_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_submission_atomic"("p_submission_id" "uuid") RETURNS "text"[]
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."delete_submission_atomic"("p_submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_class_concept_matrix"("p_class_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ai', 'extensions'
    AS $$
DECLARE
    v_class RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_class FROM public.classes WHERE id = p_class_id;
    IF NOT FOUND OR v_class.user_id <> (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. You must be the class instructor.' USING ERRCODE = '42501';
    END IF;

    WITH class_concepts AS (
        SELECT 
            c.id AS concept_id,
            c.name AS concept_name,
            c.subject,
            c.bloom_level,
            ROUND(AVG(COALESCE(scm.mastery_score, 0.0)) * 100, 1) AS avg_mastery_pct,
            COUNT(CASE WHEN scm.status = 'gap_detected' THEN 1 END) AS students_with_gap,
            COUNT(scm.student_id) AS total_assessed
        FROM ai.ontology_concepts c
        JOIN ai.material_concept_mappings mcm ON mcm.concept_id = c.id
        JOIN public.class_materials cm ON cm.material_id = mcm.material_id AND cm.class_id = p_class_id
        LEFT JOIN ai.student_concept_mastery scm ON scm.concept_id = c.id AND scm.class_id = p_class_id
        GROUP BY c.id, c.name, c.subject, c.bloom_level
    )
    SELECT jsonb_build_object(
        'class_id', p_class_id,
        'concepts', COALESCE(jsonb_agg(to_jsonb(cc)), '[]'::jsonb)
    )
    INTO v_result
    FROM class_concepts cc;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_class_concept_matrix"("p_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_class_concept_matrix"("p_class_id" "uuid") IS 'Public RPC returning class-wide concept mastery heatmap for instructors.';



CREATE OR REPLACE FUNCTION "public"."get_material_ai_insights"("p_material_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ai', 'extensions'
    AS $$
DECLARE
    v_insights RECORD;
    v_material RECORD;
BEGIN
    SELECT * INTO v_material FROM public.materials WHERE id = p_material_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material not found.' USING ERRCODE = '42501';
    END IF;

    -- Verify teacher ownership
    IF v_material.user_id <> (SELECT auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. You must be the material owner.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_insights FROM ai.material_insights WHERE material_id = p_material_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'pending',
            'has_insights', false
        );
    END IF;

    RETURN jsonb_build_object(
        'material_id', v_insights.material_id,
        'status', v_insights.status,
        'has_insights', (v_insights.status = 'completed'),
        'syllabus_alignment', COALESCE(v_insights.syllabus_alignment, '[]'::jsonb),
        'prerequisite_gaps', COALESCE(v_insights.prerequisite_gaps, '[]'::jsonb),
        'sample_questions', COALESCE(v_insights.sample_questions, '[]'::jsonb),
        'summary', v_insights.summary,
        'difficulty_level', v_insights.difficulty_level,
        'model_used', v_insights.model_used,
        'updated_at', v_insights.updated_at
    );
END;
$$;


ALTER FUNCTION "public"."get_material_ai_insights"("p_material_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_material_ai_insights"("p_material_id" "uuid") IS 'Public RPC returning material syllabus alignment and gap reports with teacher authorization.';



CREATE OR REPLACE FUNCTION "public"."get_student_concept_gaps"("p_class_id" "uuid", "p_student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ai', 'extensions'
    AS $$
DECLARE
    v_class RECORD;
    v_is_authorized BOOLEAN := false;
    v_result JSONB;
BEGIN
    SELECT * INTO v_class FROM public.classes WHERE id = p_class_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Class not found.' USING ERRCODE = '42501';
    END IF;

    IF v_class.user_id = (SELECT auth.uid()) OR p_student_id = (SELECT auth.uid()) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
    END IF;

    WITH mastery_summary AS (
        SELECT 
            c.id AS concept_id,
            c.name AS concept_name,
            c.subject,
            c.bloom_level,
            COALESCE(m.mastery_score, 0.0) AS mastery_score,
            COALESCE(m.confidence, 0.0) AS confidence,
            COALESCE(m.status, 'unassessed') AS status,
            m.last_evaluated_at
        FROM ai.ontology_concepts c
        LEFT JOIN ai.student_concept_mastery m 
            ON m.concept_id = c.id 
           AND m.class_id = p_class_id 
           AND m.student_id = p_student_id
    ),
    concept_gaps AS (
        SELECT 
            ms.*,
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'error_pattern', mis.error_pattern,
                        'remediation_strategy', mis.remediation_strategy,
                        'severity', mis.severity
                    )
                ) FILTER (WHERE mis.id IS NOT NULL),
                '[]'::jsonb
            ) AS misconceptions
        FROM mastery_summary ms
        LEFT JOIN ai.ontology_misconceptions mis ON mis.concept_id = ms.concept_id
        WHERE ms.status = 'gap_detected' OR ms.mastery_score < 0.70
        GROUP BY ms.concept_id, ms.concept_name, ms.subject, ms.bloom_level, ms.mastery_score, ms.confidence, ms.status, ms.last_evaluated_at
    )
    SELECT jsonb_build_object(
        'student_id', p_student_id,
        'class_id', p_class_id,
        'total_gaps', (SELECT count(*) FROM concept_gaps),
        'gaps', COALESCE(jsonb_agg(to_jsonb(cg)), '[]'::jsonb)
    )
    INTO v_result
    FROM concept_gaps cg;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_student_concept_gaps"("p_class_id" "uuid", "p_student_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_concept_gaps"("p_class_id" "uuid", "p_student_id" "uuid") IS 'Public RPC performing graph traversal to report unmastered concepts and remediation tips.';



CREATE OR REPLACE FUNCTION "public"."get_submission_ai_diagnostic"("p_submission_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'ai', 'extensions'
    AS $$
DECLARE
    v_eval RECORD;
    v_sub RECORD;
    v_is_teacher BOOLEAN := false;
    v_is_student BOOLEAN := false;
BEGIN
    -- Verify submission existence and caller ownership
    SELECT s.*, c.user_id AS teacher_id
    INTO v_sub
    FROM public.student_submissions s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = p_submission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Submission not found or unauthorized.' USING ERRCODE = '42501';
    END IF;

    IF v_sub.teacher_id = (SELECT auth.uid()) THEN
        v_is_teacher := true;
    ELSIF v_sub.student_id = (SELECT auth.uid()) THEN
        v_is_student := true;
    ELSE
        RAISE EXCEPTION 'Access denied. You do not have permission to view this submission.' USING ERRCODE = '42501';
    END IF;

    -- Fetch AI evaluation record
    SELECT * INTO v_eval FROM ai.submission_evaluations WHERE submission_id = p_submission_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'not_evaluated',
            'has_suggestion', false
        );
    END IF;

    -- Construct sanitized payload (hide private teacher notes from students)
    RETURN jsonb_build_object(
        'id', v_eval.id,
        'submission_id', v_eval.submission_id,
        'status', v_eval.status,
        'has_suggestion', (v_eval.status = 'completed'),
        'suggested_score', v_eval.suggested_score,
        'suggested_max_score', v_eval.suggested_max_score,
        'suggested_grade', v_eval.suggested_grade,
        'suggested_feedback', v_eval.suggested_feedback,
        'suggested_teacher_notes', CASE WHEN v_is_teacher THEN v_eval.suggested_teacher_notes ELSE NULL END,
        'suggested_rubric_breakdown', COALESCE(v_eval.suggested_rubric_breakdown, '[]'::jsonb),
        'rationale', v_eval.rationale,
        'model_used', v_eval.model_used,
        'updated_at', v_eval.updated_at
    );
END;
$$;


ALTER FUNCTION "public"."get_submission_ai_diagnostic"("p_submission_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_submission_ai_diagnostic"("p_submission_id" "uuid") IS 'Public RPC returning sanitized AI evaluation for submission diff modals with caller authorization.';



CREATE OR REPLACE FUNCTION "public"."get_workspace_last_modified"("p_client_timestamps" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN public.check_workspace_modifications(p_client_timestamps);
END;
$$;


ALTER FUNCTION "public"."get_workspace_last_modified"("p_client_timestamps" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_class_material_ai_analysis_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_edge_base TEXT;
    v_service_key TEXT;
    v_teacher_id UUID;
BEGIN
    -- Only trigger if custom_content or custom_rubric_criteria was added/updated
    IF (TG_OP = 'INSERT' AND (NEW.custom_content IS NOT NULL OR NEW.custom_rubric_criteria IS NOT NULL)) OR
       (TG_OP = 'UPDATE' AND (OLD.custom_content IS DISTINCT FROM NEW.custom_content OR OLD.custom_rubric_criteria IS DISTINCT FROM NEW.custom_rubric_criteria)) THEN
        
        -- Resolve teacher user_id from class
        SELECT user_id INTO v_teacher_id FROM public.classes WHERE id = NEW.class_id;

        -- Dispatch asynchronous webhook via pg_net if configured
        BEGIN
            v_edge_base := current_setting('app.settings.edge_function_base_url', true);
            v_service_key := current_setting('app.settings.service_role_key', true);

            IF v_edge_base IS NOT NULL AND v_service_key IS NOT NULL THEN
                PERFORM net.http_post(
                    url := v_edge_base || '/trigger-material-analysis',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || v_service_key
                    ),
                    body := jsonb_build_object(
                        'material_id', NEW.material_id,
                        'class_id', NEW.class_id,
                        'user_id', v_teacher_id
                    )
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
            
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_class_material_ai_analysis_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_material_ai_analysis_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_edge_base TEXT;
    v_service_key TEXT;
BEGIN
    -- Only trigger if content or rubric_criteria was added/updated
    IF (TG_OP = 'INSERT') OR
       (TG_OP = 'UPDATE' AND (OLD.content IS DISTINCT FROM NEW.content OR OLD.rubric_criteria IS DISTINCT FROM NEW.rubric_criteria)) THEN
        
        -- Insert or reset pending insight record in hidden ai schema
        INSERT INTO ai.material_insights (material_id, status, updated_at)
        VALUES (NEW.id, 'pending', timezone('utc'::text, now()))
        ON CONFLICT (material_id) DO UPDATE
        SET status = 'pending',
            error_message = NULL,
            updated_at = timezone('utc'::text, now());

        -- Dispatch asynchronous webhook via pg_net if configured
        BEGIN
            v_edge_base := current_setting('app.settings.edge_function_base_url', true);
            v_service_key := current_setting('app.settings.service_role_key', true);

            IF v_edge_base IS NOT NULL AND v_service_key IS NOT NULL THEN
                PERFORM net.http_post(
                    url := v_edge_base || '/trigger-material-analysis',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || v_service_key
                    ),
                    body := jsonb_build_object(
                        'material_id', NEW.id,
                        'user_id', NEW.user_id
                    )
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
            
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_material_ai_analysis_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_submission_ai_eval_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_edge_base TEXT;
    v_service_key TEXT;
BEGIN
    -- Only trigger if status is 'Submitted' AND (is new OR content/status changed)
    IF (TG_OP = 'INSERT' AND NEW.status = 'Submitted') OR
       (TG_OP = 'UPDATE' AND NEW.status = 'Submitted' AND (OLD.status IS DISTINCT FROM 'Submitted' OR OLD.content IS DISTINCT FROM NEW.content)) THEN
        
        -- Insert or reset pending evaluation record in hidden ai schema
        INSERT INTO ai.submission_evaluations (submission_id, status, updated_at)
        VALUES (NEW.id, 'pending', timezone('utc'::text, now()))
        ON CONFLICT (submission_id) DO UPDATE
        SET status = 'pending',
            error_message = NULL,
            updated_at = timezone('utc'::text, now());

        -- Dispatch asynchronous webhook via pg_net if configured
        BEGIN
            v_edge_base := current_setting('app.settings.edge_function_base_url', true);
            v_service_key := current_setting('app.settings.service_role_key', true);

            IF v_edge_base IS NOT NULL AND v_service_key IS NOT NULL THEN
                PERFORM net.http_post(
                    url := v_edge_base || '/trigger-submission-evaluation',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'Authorization', 'Bearer ' || v_service_key
                    ),
                    body := jsonb_build_object(
                        'submission_id', NEW.id,
                        'class_id', NEW.class_id,
                        'material_id', NEW.material_id,
                        'student_id', NEW.student_id
                    )
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Non-blocking failure; edge function or backend poller will process pending rows
            NULL;
        END;
            
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_submission_ai_eval_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_teacher"("lookup_class_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = lookup_class_id AND user_id = (SELECT auth.uid())
  );
$$;


ALTER FUNCTION "public"."is_class_teacher"("lookup_class_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_class_teacher"("lookup_class_id" "uuid") IS 'Security Definer helper to check if current user is the owner/teacher of a class without triggering RLS recursion.';



CREATE OR REPLACE FUNCTION "public"."search_cities"("search_term" "text") RETURNS TABLE("result" "text")
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$ SELECT city FROM public.institutes WHERE city IS NOT NULL AND city != '' AND word_similarity(search_term, city) > 0.1 GROUP BY city ORDER BY word_similarity(search_term, city) DESC LIMIT 5; $$;


ALTER FUNCTION "public"."search_cities"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_countries"("search_term" "text") RETURNS TABLE("result" "text")
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$ SELECT country FROM public.institutes WHERE country IS NOT NULL AND country != '' AND word_similarity(search_term, country) > 0.1 GROUP BY country ORDER BY word_similarity(search_term, country) DESC LIMIT 5; $$;


ALTER FUNCTION "public"."search_countries"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_districts"("search_term" "text") RETURNS TABLE("result" "text")
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$ SELECT district FROM public.institutes WHERE district IS NOT NULL AND district != '' AND word_similarity(search_term, district) > 0.1 GROUP BY district ORDER BY word_similarity(search_term, district) DESC LIMIT 5; $$;


ALTER FUNCTION "public"."search_districts"("search_term" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."institutes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."institute_type" NOT NULL,
    "city" "text",
    "district" "text",
    "state" "text",
    "country" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."institutes" OWNER TO "postgres";


COMMENT ON TABLE "public"."institutes" IS 'Represents educational organizations or individual teaching entities.';



COMMENT ON COLUMN "public"."institutes"."name" IS 'Name of the institute.';



COMMENT ON COLUMN "public"."institutes"."type" IS 'Classifies the organization (e.g., High School, University).';



COMMENT ON COLUMN "public"."institutes"."city" IS 'City where the institute is located.';



COMMENT ON COLUMN "public"."institutes"."district" IS 'School district or regional administration name.';



COMMENT ON COLUMN "public"."institutes"."state" IS 'State/province of the institute.';



COMMENT ON COLUMN "public"."institutes"."country" IS 'Country of the institute.';



CREATE OR REPLACE FUNCTION "public"."search_institutes"("search_term" "text") RETURNS SETOF "public"."institutes"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'extensions'
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


ALTER FUNCTION "public"."search_institutes"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_states"("search_term" "text") RETURNS TABLE("result" "text")
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'extensions'
    AS $$ SELECT state FROM public.institutes WHERE state IS NOT NULL AND state != '' AND word_similarity(search_term, state) > 0.1 GROUP BY state ORDER BY word_similarity(search_term, state) DESC LIMIT 5; $$;


ALTER FUNCTION "public"."search_states"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_student_class_scores"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."sync_student_class_scores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlink_material_from_class"("p_class_id" "uuid", "p_material_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM public.class_materials 
    WHERE class_id = p_class_id AND material_id = p_material_id;
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."unlink_material_from_class"("p_class_id" "uuid", "p_material_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_material_contents"("p_table_name" "text", "p_record_id" "uuid", "p_diff_array" "jsonb") RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."update_material_contents"("p_table_name" "text", "p_record_id" "uuid", "p_diff_array" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_content_array"("arr" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_content_array"("arr" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "status" "public"."attendance_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."attendance_records" IS 'Daily or session-based attendance logs for students in a class.';



COMMENT ON COLUMN "public"."attendance_records"."date" IS 'The calendar date of the attendance record.';



COMMENT ON COLUMN "public"."attendance_records"."status" IS 'Daily attendance state (Present, Absent, etc.).';



COMMENT ON COLUMN "public"."attendance_records"."notes" IS 'Teacher notes for why the student was absent or late.';



CREATE TABLE IF NOT EXISTS "public"."chat_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" DEFAULT 'New Chat'::"text" NOT NULL,
    "class_id" "uuid",
    "type" "text" DEFAULT 'general'::"text",
    "scope_type" "text" DEFAULT 'class'::"text",
    "selected_ids" "text"[] DEFAULT '{}'::"text"[],
    "custom_instructions" "text" DEFAULT ''::"text",
    "messages" "jsonb" DEFAULT '[]'::"jsonb",
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."chat_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_sessions" IS 'Metadata for AI chat sessions. Note: Message history is stored in the langgraph schema.';



COMMENT ON COLUMN "public"."chat_sessions"."title" IS 'Auto-generated or custom title for the AI chat session.';



COMMENT ON COLUMN "public"."chat_sessions"."class_id" IS 'Optional link to restrict the AI context to a specific class.';



CREATE TABLE IF NOT EXISTS "public"."class_instructions" (
    "class_id" "uuid" NOT NULL,
    "instruction_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."class_instructions" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_instructions" IS 'Junction linking AI instructions to a specific class context.';



CREATE TABLE IF NOT EXISTS "public"."class_materials" (
    "class_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "custom_content" "jsonb",
    "custom_rubric_criteria" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "valid_class_custom_content_shape" CHECK ((("custom_content" IS NULL) OR "public"."validate_content_array"("custom_content")))
);


ALTER TABLE "public"."class_materials" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_materials" IS 'Junction linking materials to a specific class.';



CREATE TABLE IF NOT EXISTS "public"."class_students" (
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "learning_style" "text",
    "strengths" "text"[],
    "weaknesses" "text"[],
    "current_score" numeric,
    "current_grade" "text",
    "general_feedback" "text",
    "performance_tier" "text",
    "behavioral_notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "parent_notes" "text",
    "custom_fields" "jsonb" DEFAULT '[]'::"jsonb",
    "roll_number" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."class_students" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_students" IS 'Junction table linking students to specific classes, tracking class-specific performance and notes.';



COMMENT ON COLUMN "public"."class_students"."current_score" IS 'Aggregate score across all assignments in this class.';



COMMENT ON COLUMN "public"."class_students"."current_grade" IS 'Aggregate letter/formatted grade for this class.';



COMMENT ON COLUMN "public"."class_students"."general_feedback" IS 'Overall teacher feedback for the student in this class.';



COMMENT ON COLUMN "public"."class_students"."performance_tier" IS 'Class-specific evaluation of the students performance (e.g., High Performing, At Risk).';



COMMENT ON COLUMN "public"."class_students"."behavioral_notes" IS 'Class-specific notes on the students behavior.';



COMMENT ON COLUMN "public"."class_students"."parent_notes" IS 'Private teacher observations and notes regarding parent communications.';



COMMENT ON COLUMN "public"."class_students"."custom_fields" IS 'Custom key-value accommodations and IEP tags configured by the teacher.';



CREATE TABLE IF NOT EXISTS "public"."classes" (
    "institute_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "academic_year" "text",
    "semester" "text",
    "subject" "text",
    "teacher_name" "text",
    "teaching_style" "public"."teaching_style"[],
    "experience_level" "public"."experience_level",
    "special_notes" "text",
    "assessment_preferences" "public"."assessment_preference"[],
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


COMMENT ON TABLE "public"."classes" IS 'Core entity representing a specific course or class taught by a user.';



COMMENT ON COLUMN "public"."classes"."name" IS 'The title of the class (e.g., Intro to Biology).';



COMMENT ON COLUMN "public"."classes"."academic_year" IS 'The academic year (e.g., 2024-2025).';



COMMENT ON COLUMN "public"."classes"."semester" IS 'The specific term (e.g., Fall, Spring).';



COMMENT ON COLUMN "public"."classes"."subject" IS 'The general subject area (e.g., Science, Math).';



COMMENT ON COLUMN "public"."classes"."teacher_name" IS 'The display name of the teacher.';



COMMENT ON COLUMN "public"."classes"."teaching_style" IS 'Array of pedagogical approaches used in this class.';



COMMENT ON COLUMN "public"."classes"."experience_level" IS 'The intended proficiency level of the students.';



COMMENT ON COLUMN "public"."classes"."special_notes" IS 'Any specific context or accommodations for this class.';



COMMENT ON COLUMN "public"."classes"."assessment_preferences" IS 'Array of preferred evaluation methods.';



COMMENT ON COLUMN "public"."classes"."is_archived" IS 'Soft-delete flag to hide the class without losing historical data.';



CREATE TABLE IF NOT EXISTS "public"."instructions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "type" "public"."instruction_type" DEFAULT 'General Policy'::"public"."instruction_type" NOT NULL,
    "content" "text" NOT NULL,
    "when_to_apply" "text",
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."instructions" OWNER TO "postgres";


COMMENT ON TABLE "public"."instructions" IS 'Central repository of AI prompts, rubrics, and rules created by the teacher.';



COMMENT ON COLUMN "public"."instructions"."title" IS 'Name of the instruction/rubric.';



COMMENT ON COLUMN "public"."instructions"."type" IS 'Categorizes the prompt (e.g., Grading Rubric, System Persona).';



COMMENT ON COLUMN "public"."instructions"."content" IS 'The actual markdown or text prompt for the AI.';



COMMENT ON COLUMN "public"."instructions"."when_to_apply" IS 'Semantic hint used by the AI to determine when to trigger this instruction.';



COMMENT ON COLUMN "public"."instructions"."is_archived" IS 'Soft-delete flag.';



CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "public"."content_category" DEFAULT 'Study Material'::"public"."content_category" NOT NULL,
    "content" "jsonb" DEFAULT '[]'::"jsonb",
    "to_be_scored" boolean DEFAULT false,
    "due_at" timestamp with time zone,
    "max_score" numeric DEFAULT 100,
    "rubric_criteria" "jsonb" DEFAULT '[]'::"jsonb",
    "tags" "text"[],
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "check_scored_requirements" CHECK ((("to_be_scored" = false) OR (("due_at" IS NOT NULL) AND ("max_score" IS NOT NULL)))),
    CONSTRAINT "valid_content_shape" CHECK ("public"."validate_content_array"("content"))
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


COMMENT ON TABLE "public"."materials" IS 'Central repository of all teaching resources (files, links, tests) uploaded by the user.';



COMMENT ON COLUMN "public"."materials"."name" IS 'Title of the material.';



COMMENT ON COLUMN "public"."materials"."category" IS 'Broad classification of the resource.';



COMMENT ON COLUMN "public"."materials"."content" IS 'JSONB array of objects containing {id: "...", name: "...", type: "File"|"URL", path: "...", description?: "..."} to support mixed media.';



COMMENT ON COLUMN "public"."materials"."due_at" IS 'Default/template due date. Overridden by student_submissions.due_at if present.';



COMMENT ON COLUMN "public"."materials"."max_score" IS 'The maximum possible points for this material if it is an assessment.';



COMMENT ON COLUMN "public"."materials"."rubric_criteria" IS 'JSONB array of grading criteria attached directly to this material.';



COMMENT ON COLUMN "public"."materials"."tags" IS 'Searchable keywords for the material.';



COMMENT ON COLUMN "public"."materials"."is_archived" IS 'Soft-delete flag.';



CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "announcement_id" "uuid",
    "material_id" "uuid",
    "submission_id" "uuid",
    "notification_type" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "recipient_type" "text" NOT NULL,
    "student_id" "uuid",
    "resend_email_id" "text",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_logs_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['announcement'::"text", 'material_published'::"text", 'material_updated'::"text", 'submission_turned_in'::"text"]))),
    CONSTRAINT "notification_logs_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['student'::"text", 'parent'::"text", 'teacher'::"text"]))),
    CONSTRAINT "notification_logs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'delivered'::"text", 'bounced'::"text", 'failed'::"text", 'complained'::"text"])))
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "material_id" "uuid",
    "content" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "public"."submission_status" DEFAULT 'Assigned'::"public"."submission_status" NOT NULL,
    "due_at" timestamp with time zone,
    "is_late" boolean DEFAULT false,
    "grade" "text",
    "score" numeric,
    "rubric_breakdown" "jsonb" DEFAULT '{}'::"jsonb",
    "feedback" "text",
    "private_teacher_notes" "text",
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "valid_content_shape" CHECK ("public"."validate_content_array"("content"))
);


ALTER TABLE "public"."student_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_submissions" IS 'Tracks individual student assignments, submissions, grading status, and rubric breakdowns for a specific class.';



COMMENT ON COLUMN "public"."student_submissions"."content" IS 'JSONB array of objects containing {id: "...", name: "...", type: "File"|"URL", path: "...", description?: "..."} to support mixed media.';



COMMENT ON COLUMN "public"."student_submissions"."status" IS 'Lifecycle state (Assigned, Pending, Submitted, Evaluated, Graded).';



COMMENT ON COLUMN "public"."student_submissions"."due_at" IS 'Specific deadline for this submission (overrides material default).';



COMMENT ON COLUMN "public"."student_submissions"."is_late" IS 'Boolean flag automatically set if submitted past due_at.';



COMMENT ON COLUMN "public"."student_submissions"."grade" IS 'Letter or formatted grade assigned.';



COMMENT ON COLUMN "public"."student_submissions"."score" IS 'Numeric points awarded for the submission.';



COMMENT ON COLUMN "public"."student_submissions"."rubric_breakdown" IS 'JSONB object containing granular AI scoring against rubric criteria.';



COMMENT ON COLUMN "public"."student_submissions"."feedback" IS 'Public feedback visible to the student.';



COMMENT ON COLUMN "public"."student_submissions"."private_teacher_notes" IS 'Hidden notes only visible to the teacher.';



COMMENT ON COLUMN "public"."student_submissions"."submitted_at" IS 'Timestamp when the student turned in the work.';



COMMENT ON COLUMN "public"."student_submissions"."reviewed_at" IS 'Timestamp when the AI or teacher finalized grading.';



CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "avatar_url" "text",
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "phone" "text",
    "address" "text",
    "parent_name" "text",
    "parent_contact" "text"
);


ALTER TABLE "public"."students" OWNER TO "postgres";


COMMENT ON TABLE "public"."students" IS 'Global roster of students managed by a teacher across all their classes.';



COMMENT ON COLUMN "public"."students"."name" IS 'Full name of the student.';



COMMENT ON COLUMN "public"."students"."email" IS 'Contact email for the student.';



COMMENT ON COLUMN "public"."students"."avatar_url" IS 'URL to the students profile picture.';



COMMENT ON COLUMN "public"."students"."is_archived" IS 'Soft-delete flag for the global roster.';



CREATE TABLE IF NOT EXISTS "public"."template_instructions" (
    "template_id" "uuid" NOT NULL,
    "instruction_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."template_instructions" OWNER TO "postgres";


COMMENT ON TABLE "public"."template_instructions" IS 'Junction linking AI instructions to a template.';



CREATE TABLE IF NOT EXISTS "public"."template_materials" (
    "template_id" "uuid" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "custom_content" "jsonb",
    "custom_rubric_criteria" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "valid_tpl_custom_content_shape" CHECK ((("custom_content" IS NULL) OR "public"."validate_content_array"("custom_content")))
);


ALTER TABLE "public"."template_materials" OWNER TO "postgres";


COMMENT ON TABLE "public"."template_materials" IS 'Junction linking materials to a template.';



CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "institute_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "subject" "text",
    "teaching_style" "public"."teaching_style"[],
    "experience_level" "public"."experience_level",
    "assessment_preferences" "public"."assessment_preference"[],
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."templates" IS 'Blueprints created by teachers to quickly scaffold new classes with preset configurations and materials.';



COMMENT ON COLUMN "public"."templates"."name" IS 'Name of the template.';



COMMENT ON COLUMN "public"."templates"."description" IS 'Detailed description of the templates purpose.';



COMMENT ON COLUMN "public"."templates"."subject" IS 'The general subject area for the template.';



COMMENT ON COLUMN "public"."templates"."is_archived" IS 'Soft-delete flag to hide the template.';



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_instructions"
    ADD CONSTRAINT "class_instructions_pkey" PRIMARY KEY ("class_id", "instruction_id");



ALTER TABLE ONLY "public"."class_materials"
    ADD CONSTRAINT "class_materials_pkey" PRIMARY KEY ("class_id", "material_id");



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_pkey" PRIMARY KEY ("class_id", "student_id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."institutes"
    ADD CONSTRAINT "institutes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructions"
    ADD CONSTRAINT "instructions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_submissions"
    ADD CONSTRAINT "student_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_instructions"
    ADD CONSTRAINT "template_instructions_pkey" PRIMARY KEY ("template_id", "instruction_id");



ALTER TABLE ONLY "public"."template_materials"
    ADD CONSTRAINT "template_materials_pkey" PRIMARY KEY ("template_id", "material_id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "unique_class_student_date" UNIQUE ("class_id", "student_id", "date");



CREATE INDEX "idx_announcements_class_id" ON "public"."announcements" USING "btree" ("class_id");



CREATE INDEX "idx_announcements_created_at" ON "public"."announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_attendance_records_class_id" ON "public"."attendance_records" USING "btree" ("class_id");



CREATE INDEX "idx_attendance_records_student_id" ON "public"."attendance_records" USING "btree" ("student_id");



CREATE INDEX "idx_chat_sessions_class_id" ON "public"."chat_sessions" USING "btree" ("class_id");



CREATE INDEX "idx_chat_sessions_user_id" ON "public"."chat_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_class_instructions_instruction_id" ON "public"."class_instructions" USING "btree" ("instruction_id");



CREATE INDEX "idx_class_materials_material_id" ON "public"."class_materials" USING "btree" ("material_id");



CREATE INDEX "idx_class_students_student_id" ON "public"."class_students" USING "btree" ("student_id");



CREATE INDEX "idx_classes_institute_id" ON "public"."classes" USING "btree" ("institute_id");



CREATE INDEX "idx_classes_user_id" ON "public"."classes" USING "btree" ("user_id");



CREATE INDEX "idx_instructions_user_id" ON "public"."instructions" USING "btree" ("user_id");



CREATE INDEX "idx_materials_user_id" ON "public"."materials" USING "btree" ("user_id");



CREATE INDEX "idx_notification_logs_announcement_id" ON "public"."notification_logs" USING "btree" ("announcement_id");



CREATE INDEX "idx_notification_logs_class_id" ON "public"."notification_logs" USING "btree" ("class_id");



CREATE INDEX "idx_notification_logs_material_id" ON "public"."notification_logs" USING "btree" ("material_id");



CREATE INDEX "idx_notification_logs_resend_email_id" ON "public"."notification_logs" USING "btree" ("resend_email_id");



CREATE INDEX "idx_notification_logs_submission_id" ON "public"."notification_logs" USING "btree" ("submission_id");



CREATE INDEX "idx_student_submissions_class_id" ON "public"."student_submissions" USING "btree" ("class_id");



CREATE INDEX "idx_student_submissions_material_id" ON "public"."student_submissions" USING "btree" ("material_id");



CREATE INDEX "idx_student_submissions_student_id" ON "public"."student_submissions" USING "btree" ("student_id");



CREATE INDEX "idx_template_instructions_instruction_id" ON "public"."template_instructions" USING "btree" ("instruction_id");



CREATE INDEX "idx_template_materials_material_id" ON "public"."template_materials" USING "btree" ("material_id");



CREATE INDEX "idx_templates_institute_id" ON "public"."templates" USING "btree" ("institute_id");



CREATE INDEX "idx_templates_user_id" ON "public"."templates" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_attendance_records_updated_at" BEFORE UPDATE ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_auto_set_to_be_scored" BEFORE INSERT OR UPDATE ON "public"."materials" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_to_be_scored"();



CREATE OR REPLACE TRIGGER "trg_chat_sessions_updated_at" BEFORE UPDATE ON "public"."chat_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_class_instructions_updated_at" BEFORE UPDATE ON "public"."class_instructions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_class_materials_updated_at" BEFORE UPDATE ON "public"."class_materials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_class_students_updated_at" BEFORE UPDATE ON "public"."class_students" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_classes_updated_at" BEFORE UPDATE ON "public"."classes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_instructions_updated_at" BEFORE UPDATE ON "public"."instructions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_materials_updated_at" BEFORE UPDATE ON "public"."materials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notification_logs_updated_at" BEFORE UPDATE ON "public"."notification_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_student_submissions_updated_at" BEFORE UPDATE ON "public"."student_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_students_updated_at" BEFORE UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_student_scores" AFTER INSERT OR DELETE OR UPDATE OF "score", "class_id", "student_id" ON "public"."student_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_student_class_scores"();



CREATE OR REPLACE TRIGGER "trg_template_instructions_updated_at" BEFORE UPDATE ON "public"."template_instructions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_template_materials_updated_at" BEFORE UPDATE ON "public"."template_materials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_instructions"
    ADD CONSTRAINT "class_instructions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_instructions"
    ADD CONSTRAINT "class_instructions_instruction_id_fkey" FOREIGN KEY ("instruction_id") REFERENCES "public"."instructions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_materials"
    ADD CONSTRAINT "class_materials_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_materials"
    ADD CONSTRAINT "class_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_students"
    ADD CONSTRAINT "class_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instructions"
    ADD CONSTRAINT "instructions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_submissions"
    ADD CONSTRAINT "student_submissions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_submissions"
    ADD CONSTRAINT "student_submissions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_submissions"
    ADD CONSTRAINT "student_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_instructions"
    ADD CONSTRAINT "template_instructions_instruction_id_fkey" FOREIGN KEY ("instruction_id") REFERENCES "public"."instructions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_instructions"
    ADD CONSTRAINT "template_instructions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_materials"
    ADD CONSTRAINT "template_materials_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_materials"
    ADD CONSTRAINT "template_materials_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can insert institutes" ON "public"."institutes" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enrolled students read class announcements" ON "public"."announcements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."class_students"
  WHERE (("class_students"."class_id" = "announcements"."class_id") AND ("class_students"."student_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Public can view institutes" ON "public"."institutes" FOR SELECT USING (true);



CREATE POLICY "Students and enrolled class teachers can update student profile" ON "public"."students" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR (EXISTS ( SELECT 1
   FROM ("public"."class_students" "cs"
     JOIN "public"."classes" "c" ON (("cs"."class_id" = "c"."id")))
  WHERE (("cs"."student_id" = "students"."id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "id") OR (EXISTS ( SELECT 1
   FROM ("public"."class_students" "cs"
     JOIN "public"."classes" "c" ON (("cs"."class_id" = "c"."id")))
  WHERE (("cs"."student_id" = "students"."id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Teachers manage class announcements" ON "public"."announcements" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "announcements"."class_id") AND ("classes"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Teachers view notification logs for their classes" ON "public"."notification_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "notification_logs"."class_id") AND ("classes"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can access attendance" ON "public"."attendance_records" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_class_teacher"("class_id")));



CREATE POLICY "Users can access attendance via class ownership" ON "public"."attendance_records" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "attendance_records"."class_id") AND ("classes"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can access class_instructions" ON "public"."class_instructions" USING (((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "class_instructions"."class_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."class_students" "cs"
  WHERE (("cs"."class_id" = "class_instructions"."class_id") AND ("cs"."student_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can access class_materials" ON "public"."class_materials" USING (((EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "class_materials"."class_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM "public"."class_students" "cs"
  WHERE (("cs"."class_id" = "class_materials"."class_id") AND ("cs"."student_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can access class_students" ON "public"."class_students" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_class_teacher"("class_id")));



CREATE POLICY "Users can access class_students via class ownership" ON "public"."class_students" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "class_students"."class_id") AND ("classes"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can access student_submissions" ON "public"."student_submissions" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_class_teacher"("class_id")));



CREATE POLICY "Users can access student_submissions via class ownership" ON "public"."student_submissions" USING ((EXISTS ( SELECT 1
   FROM "public"."classes"
  WHERE (("classes"."id" = "student_submissions"."class_id") AND ("classes"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can access template_instructions via template ownership" ON "public"."template_instructions" USING ((EXISTS ( SELECT 1
   FROM "public"."templates"
  WHERE (("templates"."id" = "template_instructions"."template_id") AND ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can access template_materials via template ownership" ON "public"."template_materials" USING ((EXISTS ( SELECT 1
   FROM "public"."templates"
  WHERE (("templates"."id" = "template_materials"."template_id") AND ("templates"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can only delete their own chat sessions" ON "public"."chat_sessions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only delete their own classes" ON "public"."classes" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only delete their own instructions" ON "public"."instructions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only delete their own materials" ON "public"."materials" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only delete their own templates" ON "public"."templates" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only insert their own chat sessions" ON "public"."chat_sessions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only insert their own classes" ON "public"."classes" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only insert their own instructions" ON "public"."instructions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only insert their own materials" ON "public"."materials" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only insert their own templates" ON "public"."templates" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only update their own chat sessions" ON "public"."chat_sessions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only update their own classes" ON "public"."classes" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only update their own instructions" ON "public"."instructions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only update their own materials" ON "public"."materials" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only update their own templates" ON "public"."templates" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only view their own chat sessions" ON "public"."chat_sessions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can only view their own templates" ON "public"."templates" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view classes" ON "public"."classes" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."class_students" "cs"
  WHERE (("cs"."class_id" = "classes"."id") AND ("cs"."student_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view instructions" ON "public"."instructions" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM ("public"."class_instructions" "ci"
     JOIN "public"."class_students" "cs" ON (("cs"."class_id" = "ci"."class_id")))
  WHERE (("ci"."instruction_id" = "instructions"."id") AND ("cs"."student_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view materials" ON "public"."materials" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM ("public"."class_materials" "cm"
     JOIN "public"."class_students" "cs" ON (("cs"."class_id" = "cm"."class_id")))
  WHERE (("cm"."material_id" = "materials"."id") AND ("cs"."student_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can view students" ON "public"."students" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") = "id") OR (EXISTS ( SELECT 1
   FROM ("public"."class_students" "cs"
     JOIN "public"."classes" "c" ON (("cs"."class_id" = "c"."id")))
  WHERE (("cs"."student_id" = "students"."id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_instructions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."institutes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."instructions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_instructions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_student_to_class"("p_class_id" "uuid", "p_student_id" "uuid", "p_learning_style" "text", "p_strengths" "text"[], "p_weaknesses" "text"[], "p_performance_tier" "text", "p_current_score" numeric, "p_current_grade" "text", "p_general_feedback" "text", "p_behavioral_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_student_to_class"("p_class_id" "uuid", "p_student_id" "uuid", "p_learning_style" "text", "p_strengths" "text"[], "p_weaknesses" "text"[], "p_performance_tier" "text", "p_current_score" numeric, "p_current_grade" "text", "p_general_feedback" "text", "p_behavioral_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_student_to_class"("p_class_id" "uuid", "p_student_id" "uuid", "p_learning_style" "text", "p_strengths" "text"[], "p_weaknesses" "text"[], "p_performance_tier" "text", "p_current_score" numeric, "p_current_grade" "text", "p_general_feedback" "text", "p_behavioral_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_material"("p_material_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_material"("p_material_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_material"("p_material_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_set_to_be_scored"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_set_to_be_scored"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_set_to_be_scored"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_workspace_modifications"("p_client_timestamps" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."check_workspace_modifications"("p_client_timestamps" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_workspace_modifications"("p_client_timestamps" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_material"("p_material_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_material"("p_material_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_material"("p_material_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_submission_atomic"("p_submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_submission_atomic"("p_submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_submission_atomic"("p_submission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_concept_matrix"("p_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_concept_matrix"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_concept_matrix"("p_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_material_ai_insights"("p_material_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_material_ai_insights"("p_material_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_material_ai_insights"("p_material_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_student_concept_gaps"("p_class_id" "uuid", "p_student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_student_concept_gaps"("p_class_id" "uuid", "p_student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_concept_gaps"("p_class_id" "uuid", "p_student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_submission_ai_diagnostic"("p_submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_submission_ai_diagnostic"("p_submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_submission_ai_diagnostic"("p_submission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_workspace_last_modified"("p_client_timestamps" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_workspace_last_modified"("p_client_timestamps" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_workspace_last_modified"("p_client_timestamps" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_class_material_ai_analysis_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_class_material_ai_analysis_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_class_material_ai_analysis_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_material_ai_analysis_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_material_ai_analysis_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_material_ai_analysis_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_submission_ai_eval_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_submission_ai_eval_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_submission_ai_eval_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_class_teacher"("lookup_class_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_class_teacher"("lookup_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_teacher"("lookup_class_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_cities"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_cities"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_cities"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_countries"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_countries"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_countries"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_districts"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_districts"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_districts"("search_term" "text") TO "service_role";



GRANT ALL ON TABLE "public"."institutes" TO "anon";
GRANT ALL ON TABLE "public"."institutes" TO "authenticated";
GRANT ALL ON TABLE "public"."institutes" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_institutes"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_institutes"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_institutes"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_states"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_states"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_states"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_student_class_scores"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_student_class_scores"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_student_class_scores"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlink_material_from_class"("p_class_id" "uuid", "p_material_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unlink_material_from_class"("p_class_id" "uuid", "p_material_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlink_material_from_class"("p_class_id" "uuid", "p_material_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_material_contents"("p_table_name" "text", "p_record_id" "uuid", "p_diff_array" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_material_contents"("p_table_name" "text", "p_record_id" "uuid", "p_diff_array" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_material_contents"("p_table_name" "text", "p_record_id" "uuid", "p_diff_array" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_content_array"("arr" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_content_array"("arr" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_content_array"("arr" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."class_instructions" TO "anon";
GRANT ALL ON TABLE "public"."class_instructions" TO "authenticated";
GRANT ALL ON TABLE "public"."class_instructions" TO "service_role";



GRANT ALL ON TABLE "public"."class_materials" TO "anon";
GRANT ALL ON TABLE "public"."class_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."class_materials" TO "service_role";



GRANT ALL ON TABLE "public"."class_students" TO "anon";
GRANT ALL ON TABLE "public"."class_students" TO "authenticated";
GRANT ALL ON TABLE "public"."class_students" TO "service_role";



GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON TABLE "public"."instructions" TO "anon";
GRANT ALL ON TABLE "public"."instructions" TO "authenticated";
GRANT ALL ON TABLE "public"."instructions" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT ALL ON TABLE "public"."student_submissions" TO "anon";
GRANT ALL ON TABLE "public"."student_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."student_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT ALL ON TABLE "public"."template_instructions" TO "anon";
GRANT ALL ON TABLE "public"."template_instructions" TO "authenticated";
GRANT ALL ON TABLE "public"."template_instructions" TO "service_role";



GRANT ALL ON TABLE "public"."template_materials" TO "anon";
GRANT ALL ON TABLE "public"."template_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."template_materials" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




