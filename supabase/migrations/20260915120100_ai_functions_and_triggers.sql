-- ============================================================================
-- Teach&Learn: AI Functions, RPC Gateways, and Event Triggers
-- Timestamp: 20260915120100
-- ============================================================================

-- 1. Public RPC Gateway Functions (Secure Client-Facing APIs in 'public')

-- 1.1 Get Pre-Computed AI Diagnostic Diff for a Submission
CREATE OR REPLACE FUNCTION public.get_submission_ai_diagnostic(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ai, extensions
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

-- 1.2 Get Material AI Insights (Syllabus Alignment & Gap Report)
CREATE OR REPLACE FUNCTION public.get_material_ai_insights(p_material_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ai, extensions
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

-- 1.3 Get Student Pedagogical Concept Gap Report (Recursive Prerequisite Graph Traversal)
CREATE OR REPLACE FUNCTION public.get_student_concept_gaps(p_class_id UUID, p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ai, extensions
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

-- 1.4 Get Class Concept Mastery Heatmap Matrix
CREATE OR REPLACE FUNCTION public.get_class_concept_matrix(p_class_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ai, extensions
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

-- 2. Event Triggers & pg_net Dispatchers
-- NOTE: Automatic triggers on materials and submissions are commented out to decouple
-- the LMS upload workflow from AI background processing for independent development.
-- TODO: Uncomment triggers when AI / RAG services are reintegrated.

-- 2.1 Submission Evaluation Trigger Handler
CREATE OR REPLACE FUNCTION public.handle_submission_ai_eval_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS trg_submission_ai_eval ON public.student_submissions;
-- TODO: Uncomment when AI / RAG services are reintegrated
-- CREATE TRIGGER trg_submission_ai_eval
-- AFTER INSERT OR UPDATE OF status, content
-- ON public.student_submissions
-- FOR EACH ROW EXECUTE FUNCTION public.handle_submission_ai_eval_trigger();

-- 2.2 Material Ingestion Trigger Handler
CREATE OR REPLACE FUNCTION public.handle_material_ai_analysis_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS trg_material_ai_analysis ON public.materials;
-- TODO: Uncomment when AI / RAG services are reintegrated
-- CREATE TRIGGER trg_material_ai_analysis
-- AFTER INSERT OR UPDATE OF content, rubric_criteria
-- ON public.materials
-- FOR EACH ROW EXECUTE FUNCTION public.handle_material_ai_analysis_trigger();

-- 2.3 Class-Private Material Ingestion Trigger Handler
CREATE OR REPLACE FUNCTION public.handle_class_material_ai_analysis_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS trg_class_material_ai_analysis ON public.class_materials;
-- TODO: Uncomment when AI / RAG services are reintegrated
-- CREATE TRIGGER trg_class_material_ai_analysis
-- AFTER INSERT OR UPDATE OF custom_content, custom_rubric_criteria
-- ON public.class_materials
-- FOR EACH ROW EXECUTE FUNCTION public.handle_class_material_ai_analysis_trigger();
