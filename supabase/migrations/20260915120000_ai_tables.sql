-- ============================================================================
-- Teach&Learn: AI & Ontological Knowledge Graph Tables and Indexes
-- Timestamp: 20260915120000
-- Schema: ai
-- ============================================================================

-- 1. Vector Stores (Dense Semantic Embeddings for Materials & Submissions)
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

-- 2. Ontological Knowledge Graph (Pedagogical Concepts, Hierarchy & Graph Edges)
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

CREATE TABLE IF NOT EXISTS ai.ontology_misconceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
    error_pattern TEXT NOT NULL,                          -- e.g. 'Treats (a+b)^2 as a^2 + b^2'
    remediation_strategy TEXT NOT NULL,                   -- e.g. 'Use geometric area model with 4 distinct sub-quadrants'
    severity TEXT DEFAULT 'Moderate',                     -- 'Minor', 'Moderate', 'Critical'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_miscon_concept ON ai.ontology_misconceptions(concept_id);

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

-- 3. AI Processing & Diagnostic Caches
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
