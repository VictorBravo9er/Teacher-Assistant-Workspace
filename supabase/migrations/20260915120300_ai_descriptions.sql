-- ============================================================================
-- Teach&Learn: AI Schema Documentation Comments
-- Timestamp: 20260915120300
-- ============================================================================

-- 1. Schema Comment
COMMENT ON SCHEMA ai IS 'Internal, non-exposed schema for vector embeddings, ontological knowledge graphs, and AI evaluation caches.';

-- 2. Table Comments
COMMENT ON TABLE ai.material_embeddings IS 'pgvector chunks and embeddings for class materials RAG.';
COMMENT ON TABLE ai.submission_embeddings IS 'pgvector chunks and embeddings for student submissions semantic search.';
COMMENT ON TABLE ai.ontology_concepts IS 'Pedagogical knowledge graph concept nodes with Bloom taxonomy levels and semantic embeddings.';
COMMENT ON TABLE ai.ontology_relationships IS 'Directed graph edges linking prerequisite, subconcept, and reinforcement dependencies.';
COMMENT ON TABLE ai.ontology_misconceptions IS 'Known pedagogical misconception patterns and targeted remediation strategies.';
COMMENT ON TABLE ai.material_concept_mappings IS 'Hybrid bridge linking material chunks and vector embeddings to ontology concepts.';
COMMENT ON TABLE ai.student_concept_mastery IS 'Dynamic knowledge state tracking student concept mastery, confidence, and gaps.';
COMMENT ON TABLE ai.material_insights IS 'Cached syllabus alignment, prerequisite gap analyses, and sample questions for materials.';
COMMENT ON TABLE ai.submission_evaluations IS 'Pre-computed AI rubric evaluations, feedback drafts, and pedagogical notes for instant diff modals.';

-- 3. Function Comments
COMMENT ON FUNCTION public.get_submission_ai_diagnostic(UUID) IS 'Public RPC returning sanitized AI evaluation for submission diff modals with caller authorization.';
COMMENT ON FUNCTION public.get_material_ai_insights(UUID) IS 'Public RPC returning material syllabus alignment and gap reports with teacher authorization.';
COMMENT ON FUNCTION public.get_student_concept_gaps(UUID, UUID) IS 'Public RPC performing graph traversal to report unmastered concepts and remediation tips.';
COMMENT ON FUNCTION public.get_class_concept_matrix(UUID) IS 'Public RPC returning class-wide concept mastery heatmap for instructors.';
