-- ============================================================================
-- Supabase Teach&Learn Assistant — Hybrid Vector & Ontological Knowledge Schema
-- ============================================================================
-- Schema: ai (Hidden / Non-exposed from public PostgREST API)
-- Extensions: pgvector, pgcrypto
-- ============================================================================

-- 1. Schemas & Extensions
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS net;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;


-- ============================================================================
-- 2. Vector Stores (Dense Semantic Embeddings for Materials & Submissions)
-- ============================================================================

-- 2.1 Material Document Chunks & Embeddings (for Phase 5 & 6 Vector RAG)
CREATE TABLE IF NOT EXISTS ai.material_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    token_count INTEGER,
    embedding extensions.vector(1536), -- 1536-dim standard (OpenAI/text-embedding-3-small, Gemini-compatible)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_mat_embed_material_id ON ai.material_embeddings(material_id);
CREATE INDEX IF NOT EXISTS idx_ai_mat_embed_hnsw 
ON ai.material_embeddings USING hnsw (embedding extensions.vector_cosine_ops);


-- 2.2 Submission Document Chunks & Embeddings (for Semantic Student Work Retrieval)
CREATE TABLE IF NOT EXISTS ai.submission_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    token_count INTEGER,
    embedding extensions.vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_sub_embed_submission_id ON ai.submission_embeddings(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_sub_embed_hnsw 
ON ai.submission_embeddings USING hnsw (embedding extensions.vector_cosine_ops);


-- ============================================================================
-- 3. Ontological Knowledge Graph (Pedagogical Concepts, Hierarchy & Graph Edges)
-- ============================================================================

-- 3.1 Pedagogical Concepts & Learning Standards (Graph Nodes)
CREATE TABLE IF NOT EXISTS ai.ontology_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,                                -- e.g. 'Mathematics', 'Science', 'Literature'
    code TEXT,                                            -- e.g. 'MATH-ALG-01' or 'CCSS.MATH.HSA.CED.A.1'
    name TEXT NOT NULL,                                   -- e.g. 'Quadratic Factoring by Grouping'
    description TEXT NOT NULL,                            -- Semantic definition of concept
    bloom_level TEXT DEFAULT 'Understand',                -- 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'
    parent_concept_id UUID REFERENCES ai.ontology_concepts(id) ON DELETE SET NULL, -- Taxonomic hierarchy
    embedding extensions.vector(1536),                    -- Definition vector for AI concept linking
    metadata JSONB DEFAULT '{}'::jsonb,                   -- Grade band, keywords, difficulty rating
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_concepts_subject ON ai.ontology_concepts(subject);
CREATE INDEX IF NOT EXISTS idx_ai_concepts_parent ON ai.ontology_concepts(parent_concept_id);
CREATE INDEX IF NOT EXISTS idx_ai_concepts_embedding 
ON ai.ontology_concepts USING hnsw (embedding extensions.vector_cosine_ops);


-- 3.2 Pedagogical Concept Relationships & Prerequisite Edges (Graph Edges)
CREATE TABLE IF NOT EXISTS ai.ontology_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
    target_concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,                      -- 'prerequisite_of', 'subconcept_of', 'reinforces', 'related_to'
    weight NUMERIC DEFAULT 1.0,                           -- Dependency strength (0.0 to 1.0)
    metadata JSONB DEFAULT '{}'::jsonb,                   -- e.g. { "strictness": "mandatory" | "recommended" }
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_concept_relationship UNIQUE (source_concept_id, target_concept_id, relationship_type),
    CONSTRAINT check_no_self_loops CHECK (source_concept_id <> target_concept_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_rel_source ON ai.ontology_relationships(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_ai_rel_target ON ai.ontology_relationships(target_concept_id);
CREATE INDEX IF NOT EXISTS idx_ai_rel_type ON ai.ontology_relationships(relationship_type);


-- 3.3 Common Misconceptions & Pedagogical Remediation Rules
CREATE TABLE IF NOT EXISTS ai.ontology_misconceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
    error_pattern TEXT NOT NULL,                          -- e.g. 'Treats (a+b)^2 as a^2 + b^2'
    remediation_strategy TEXT NOT NULL,                   -- e.g. 'Use geometric area model with 4 distinct sub-quadrants'
    severity TEXT DEFAULT 'Moderate',                     -- 'Minor', 'Moderate', 'Critical'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_miscon_concept ON ai.ontology_misconceptions(concept_id);


-- 3.4 Hybrid Bridge: Material Chunks to Ontological Concepts
CREATE TABLE IF NOT EXISTS ai.material_concept_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES ai.material_embeddings(id) ON DELETE SET NULL,
    relationship TEXT NOT NULL DEFAULT 'teaches',         -- 'teaches', 'assesses', 'prerequisite_for', 'mentions'
    relevance_score NUMERIC DEFAULT 1.0,                  -- AI confidence score (0.0 to 1.0)
    evidence_excerpt TEXT,                                -- Excerpt from material showing this concept
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_mat_concept_chunk UNIQUE (material_id, concept_id, chunk_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_ai_mat_map_material ON ai.material_concept_mappings(material_id);
CREATE INDEX IF NOT EXISTS idx_ai_mat_map_concept ON ai.material_concept_mappings(concept_id);
CREATE INDEX IF NOT EXISTS idx_ai_mat_map_chunk ON ai.material_concept_mappings(chunk_id);


-- 3.5 Student Dynamic Concept Mastery & Knowledge State
CREATE TABLE IF NOT EXISTS ai.student_concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
    mastery_score NUMERIC NOT NULL DEFAULT 0.0,           -- 0.00 to 1.00 (e.g. 0.85 = 85%)
    confidence NUMERIC NOT NULL DEFAULT 0.0,              -- Confidence score based on evidence sample size
    status TEXT NOT NULL DEFAULT 'unassessed',            -- 'unassessed', 'mastered', 'practicing', 'gap_detected'
    evidence_submission_ids UUID[] DEFAULT '{}',          -- Submissions contributing to this evaluation
    last_evaluated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_student_concept_mastery UNIQUE (class_id, student_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_mastery_student ON ai.student_concept_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_mastery_class ON ai.student_concept_mastery(class_id);
CREATE INDEX IF NOT EXISTS idx_ai_mastery_concept ON ai.student_concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_ai_mastery_status ON ai.student_concept_mastery(status);


-- ============================================================================
-- 4. AI Processing & Diagnostic Caches
-- ============================================================================

-- 4.1 Material AI Ingestion Insights (Syllabus Alignment, Gaps, Sample Questions)
CREATE TABLE IF NOT EXISTS ai.material_insights (
    material_id UUID PRIMARY KEY REFERENCES public.materials(id) ON DELETE CASCADE,
    syllabus_alignment JSONB DEFAULT '[]'::jsonb,         -- Array of aligned curriculum standards
    prerequisite_gaps JSONB DEFAULT '[]'::jsonb,          -- Identified prerequisite gaps
    sample_questions JSONB DEFAULT '[]'::jsonb,           -- AI generated practice questions
    summary TEXT,                                         -- Pedagogical overview
    difficulty_level TEXT,                                -- 'Beginner', 'Intermediate', 'Advanced'
    status TEXT NOT NULL DEFAULT 'pending',               -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    model_used TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai.material_insights(status);


-- 4.2 Submission Pre-Computed AI Evaluations & Diagnostic Suggestions
CREATE TABLE IF NOT EXISTS ai.submission_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL UNIQUE REFERENCES public.student_submissions(id) ON DELETE CASCADE,
    suggested_score NUMERIC,
    suggested_max_score NUMERIC,
    suggested_grade TEXT,
    suggested_feedback TEXT,
    suggested_teacher_notes TEXT,
    suggested_rubric_breakdown JSONB DEFAULT '[]'::jsonb, -- Array of RubricBreakdownItem
    rationale TEXT,                                       -- Diagnostic justification
    raw_extracted_text TEXT,                              -- Cached parsed document text
    status TEXT NOT NULL DEFAULT 'pending',               -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    model_used TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_sub_evals_submission_id ON ai.submission_evaluations(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_sub_evals_status ON ai.submission_evaluations(status);


-- ============================================================================
-- 5. Row Level Security (RLS) for Private 'ai' Schema
-- ============================================================================

ALTER TABLE ai.material_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.submission_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ontology_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ontology_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ontology_misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.material_concept_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.student_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.material_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.submission_evaluations ENABLE ROW LEVEL SECURITY;

-- 5.1 Material Embeddings RLS
CREATE POLICY "Teacher can manage their material embeddings"
ON ai.material_embeddings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = material_embeddings.material_id AND m.user_id = (SELECT auth.uid())
    )
);

-- 5.2 Submission Embeddings RLS
CREATE POLICY "Teacher or Student can access submission embeddings"
ON ai.submission_embeddings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_submissions s
        JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = submission_embeddings.submission_id
          AND (s.student_id = (SELECT auth.uid()) OR c.user_id = (SELECT auth.uid()))
    )
);

-- 5.3 Ontology Concepts & Graph RLS (Read-only for authenticated, manageable by teachers)
CREATE POLICY "Authenticated users can view ontology concepts"
ON ai.ontology_concepts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view ontology relationships"
ON ai.ontology_relationships FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view ontology misconceptions"
ON ai.ontology_misconceptions FOR SELECT TO authenticated USING (true);

-- 5.4 Material Concept Mappings RLS
CREATE POLICY "Users can access material concept mappings"
ON ai.material_concept_mappings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = material_concept_mappings.material_id AND m.user_id = (SELECT auth.uid())
    )
);

-- 5.5 Student Mastery RLS
CREATE POLICY "Users can access student concept mastery"
ON ai.student_concept_mastery FOR ALL TO authenticated
USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = student_concept_mastery.class_id AND c.user_id = (SELECT auth.uid())
    )
);

-- 5.6 Material Insights RLS
CREATE POLICY "Teacher can manage material insights"
ON ai.material_insights FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = material_insights.material_id AND m.user_id = (SELECT auth.uid())
    )
);

-- 5.7 Submission Evaluations RLS
CREATE POLICY "Teacher or student can access submission evaluations"
ON ai.submission_evaluations FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.student_submissions s
        JOIN public.classes c ON c.id = s.class_id
        WHERE s.id = submission_evaluations.submission_id
          AND (s.student_id = (SELECT auth.uid()) OR c.user_id = (SELECT auth.uid()))
    )
);


-- ============================================================================
-- 6. Public RPC Gateway Functions (Secure Client-Facing APIs in 'public')
-- ============================================================================

-- 6.1 Get Pre-Computed AI Diagnostic Diff for a Submission
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


-- 6.2 Get Material AI Insights (Syllabus Alignment & Gap Report)
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


-- 6.3 Get Student Pedagogical Concept Gap Report (Recursive Prerequisite Graph Traversal)
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


-- 6.4 Get Class Concept Mastery Heatmap Matrix
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


-- ============================================================================
-- 7. Event Triggers & pg_net Dispatchers (Step 6.2 Automation)
-- ============================================================================
-- NOTE: Automatic triggers on materials and submissions are commented out to decouple
-- the LMS upload workflow from AI background processing for independent development.
-- TODO: Uncomment triggers when AI / RAG services are reintegrated.

-- 7.1 Submission Evaluation Trigger Handler
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


-- 7.2 Material Ingestion Trigger Handler
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


-- 7.3 Class-Private Material Ingestion Trigger Handler
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



-- ============================================================================
-- 8. Documentation Comments
-- ============================================================================
COMMENT ON SCHEMA ai IS 'Internal, non-exposed schema for vector embeddings, ontological knowledge graphs, and AI evaluation caches.';
COMMENT ON TABLE ai.material_embeddings IS 'pgvector chunks and embeddings for class materials RAG.';
COMMENT ON TABLE ai.submission_embeddings IS 'pgvector chunks and embeddings for student submissions semantic search.';
COMMENT ON TABLE ai.ontology_concepts IS 'Pedagogical knowledge graph concept nodes with Bloom taxonomy levels and semantic embeddings.';
COMMENT ON TABLE ai.ontology_relationships IS 'Directed graph edges linking prerequisite, subconcept, and reinforcement dependencies.';
COMMENT ON TABLE ai.ontology_misconceptions IS 'Known pedagogical misconception patterns and targeted remediation strategies.';
COMMENT ON TABLE ai.material_concept_mappings IS 'Hybrid bridge linking material chunks and vector embeddings to ontology concepts.';
COMMENT ON TABLE ai.student_concept_mastery IS 'Dynamic knowledge state tracking student concept mastery, confidence, and gaps.';
COMMENT ON TABLE ai.material_insights IS 'Cached syllabus alignment, prerequisite gap analyses, and sample questions for materials.';
COMMENT ON TABLE ai.submission_evaluations IS 'Pre-computed AI rubric evaluations, feedback drafts, and pedagogical notes for instant diff modals.';

COMMENT ON FUNCTION public.get_submission_ai_diagnostic(UUID) IS 'Public RPC returning sanitized AI evaluation for submission diff modals with caller authorization.';
COMMENT ON FUNCTION public.get_material_ai_insights(UUID) IS 'Public RPC returning material syllabus alignment and gap reports with teacher authorization.';
COMMENT ON FUNCTION public.get_student_concept_gaps(UUID, UUID) IS 'Public RPC performing graph traversal to report unmastered concepts and remediation tips.';
COMMENT ON FUNCTION public.get_class_concept_matrix(UUID) IS 'Public RPC returning class-wide concept mastery heatmap for instructors.';
