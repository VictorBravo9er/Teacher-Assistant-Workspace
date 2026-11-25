-- ============================================================================
-- Didactiq: Knowledge Store Architecture Enhancements
-- Timestamp: 20261107100000
-- ============================================================================

-- 1. Create Hierarchical Tree Index Table (PageIndex / RAPTOR Tree for >= 20 page docs)
CREATE TABLE IF NOT EXISTS ai.material_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    root_node JSONB NOT NULL,
    total_nodes INTEGER NOT NULL DEFAULT 1,
    max_depth INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_material_tree UNIQUE (material_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_mat_trees_material_id ON ai.material_trees(material_id);

-- 2. Enhance ai.ontology_concepts with OKF v0.2 Governance Fields
ALTER TABLE ai.ontology_concepts 
ADD COLUMN IF NOT EXISTS okf_type TEXT DEFAULT 'Concept',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS verified_by TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS stale_after TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Enforce Closed Vocabulary on ai.ontology_relationships
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_relationship_type'
    ) THEN
        ALTER TABLE ai.ontology_relationships 
        ADD CONSTRAINT chk_relationship_type CHECK (
            relationship_type IN (
                'prerequisite_of', 
                'subconcept_of', 
                'reinforces', 
                'remediates_misconception', 
                'assesses', 
                'supersedes',
                'related_to'
            )
        );
    END IF;
END $$;

-- 4. Enhance ai.material_concept_mappings with Provenance & Tree Leaf Binding
ALTER TABLE ai.material_concept_mappings
ADD COLUMN IF NOT EXISTS tree_node_id TEXT,
ADD COLUMN IF NOT EXISTS page_number INTEGER,
ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS verified_by TEXT DEFAULT 'machine-confirmed';

-- 5. Enhance ai.ontology_misconceptions with Direct Gradebook Surfacing
ALTER TABLE ai.ontology_misconceptions
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS prerequisite_concept_id UUID REFERENCES ai.ontology_concepts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Pedagogical Misconception',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'proposed',
ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS evidence_submission_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS surfaced_in_gradebook BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS teacher_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS teacher_reviewer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_misconception_status'
    ) THEN
        ALTER TABLE ai.ontology_misconceptions
        ADD CONSTRAINT chk_misconception_status CHECK (status IN ('proposed', 'confirmed', 'dismissed'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_misconceptions_gradebook 
ON ai.ontology_misconceptions(class_id, status) WHERE surfaced_in_gradebook = TRUE;

CREATE INDEX IF NOT EXISTS idx_misconceptions_concept 
ON ai.ontology_misconceptions(concept_id);

CREATE INDEX IF NOT EXISTS idx_misconceptions_class_id
ON ai.ontology_misconceptions(class_id);

-- 6. Create Tracking Table for Daily Consolidation & Anti-Drift Runs
CREATE TABLE IF NOT EXISTS ai.consolidation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    frequency_tier TEXT NOT NULL DEFAULT 'f3_nightly' CHECK (frequency_tier IN ('f2_batch', 'f3_nightly')),
    drift_detected BOOLEAN DEFAULT FALSE,
    broken_linkages_repaired INTEGER DEFAULT 0,
    missing_links_added INTEGER DEFAULT 0,
    concepts_audited INTEGER DEFAULT 0,
    hypotheses_generated INTEGER DEFAULT 0,
    lint_issues_detected INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '{}'::jsonb
);

-- 7. Create Staging Scratchpad for Real-Time In-Session Processing
CREATE TABLE IF NOT EXISTS ai.staging_scratchpad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    raw_note TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_staging_scratchpad_unprocessed 
ON ai.staging_scratchpad(class_id) WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_staging_scratchpad_teacher 
ON ai.staging_scratchpad(teacher_id);

-- 8. Create Automated Knowledge Linter Report Table
CREATE TABLE IF NOT EXISTS ai.knowledge_lint_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES ai.consolidation_runs(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL CHECK (issue_type IN ('orphan_concept', 'contradiction', 'prerequisite_cycle', 'stale_standard')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    target_concept_id UUID REFERENCES ai.ontology_concepts(id) ON DELETE SET NULL,
    details JSONB NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_knowledge_lint_run_id ON ai.knowledge_lint_reports(run_id);

-- 9. Row Level Security Policies for New Tables
ALTER TABLE ai.material_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.consolidation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.staging_scratchpad ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.knowledge_lint_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can manage material trees"
ON ai.material_trees FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = material_trees.material_id AND m.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Student can view material trees in enrolled classes"
ON ai.material_trees FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.class_materials cm
        JOIN public.class_students cs ON cs.class_id = cm.class_id
        WHERE cm.material_id = material_trees.material_id AND cs.student_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Teacher can manage staging scratchpad"
ON ai.staging_scratchpad FOR ALL TO authenticated
USING (teacher_id = (SELECT auth.uid()))
WITH CHECK (teacher_id = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can access consolidation runs"
ON ai.consolidation_runs FOR ALL TO authenticated
USING (true);

CREATE POLICY "Authenticated users can access knowledge lint reports"
ON ai.knowledge_lint_reports FOR ALL TO authenticated
USING (true);

-- Allow teachers to manage ontology concepts and misconceptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Teacher can manage ontology concepts' AND tablename = 'ontology_concepts' AND schemaname = 'ai'
    ) THEN
        CREATE POLICY "Teacher can manage ontology concepts"
        ON ai.ontology_concepts FOR ALL TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Teacher can manage ontology relationships' AND tablename = 'ontology_relationships' AND schemaname = 'ai'
    ) THEN
        CREATE POLICY "Teacher can manage ontology relationships"
        ON ai.ontology_relationships FOR ALL TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Teacher can manage ontology misconceptions' AND tablename = 'ontology_misconceptions' AND schemaname = 'ai'
    ) THEN
        CREATE POLICY "Teacher can manage ontology misconceptions"
        ON ai.ontology_misconceptions FOR ALL TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 10. Pre-Query Coverage Evaluation Function with Soft-Warning Caveat UX
CREATE OR REPLACE FUNCTION ai.check_answerable(
    p_class_id UUID,
    p_query_terms TEXT[]
)
RETURNS TABLE (
    is_answerable BOOLEAN,
    status_flag TEXT,
    coverage_score FLOAT,
    matched_concept_count INTEGER,
    missing_terms TEXT[],
    requires_confirmation BOOLEAN,
    caveat_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ai, public
AS $$
DECLARE
    v_total_terms INTEGER := array_length(p_query_terms, 1);
    v_matched INTEGER := 0;
    v_score FLOAT := 0.0;
    v_status TEXT := 'VERIFIED';
    v_req_confirm BOOLEAN := FALSE;
    v_caveat TEXT := NULL;
    v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF v_total_terms IS NULL OR v_total_terms = 0 THEN
        RETURN QUERY SELECT TRUE, 'VERIFIED', 1.0::FLOAT, 0, ARRAY[]::TEXT[], FALSE, NULL::TEXT;
        RETURN;
    END IF;

    -- Count matched concepts in this class's subject
    SELECT COUNT(DISTINCT c.id)
    INTO v_matched
    FROM ai.ontology_concepts c
    JOIN public.classes cl ON cl.id = p_class_id
    WHERE c.subject = cl.subject
      AND c.name ILIKE ANY (SELECT '%' || t || '%' FROM unnest(p_query_terms) t);

    -- Find unmapped terms
    SELECT ARRAY(
        SELECT t FROM unnest(p_query_terms) t
        WHERE NOT EXISTS (
            SELECT 1 FROM ai.ontology_concepts c
            JOIN public.classes cl ON cl.id = p_class_id
            WHERE c.subject = cl.subject AND c.name ILIKE '%' || t || '%'
        )
    ) INTO v_missing;

    v_score := (v_matched::FLOAT / v_total_terms::FLOAT);
    IF v_score > 1.0 THEN v_score := 1.0; END IF;

    -- Determine soft-warning threshold (0.4)
    IF v_score < 0.4 THEN
        v_status := 'INCOMPLETE_WARNING';
        v_req_confirm := TRUE;
        v_caveat := 'Processing and consolidation of course materials for this topic is incomplete. Insights might not be comprehensive. Do you still want to continue?';
    END IF;

    RETURN QUERY 
    SELECT 
        TRUE, -- Never hard-fail; always return soft caveat
        v_status,
        v_score,
        v_matched,
        v_missing,
        v_req_confirm,
        v_caveat;
END;
$$;
