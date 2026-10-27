-- ============================================================================
-- Teach&Learn: AI Schema Row Level Security (RLS) Policies
-- Timestamp: 20260915120200
-- ============================================================================

-- 1. Enable RLS on Private 'ai' Schema Tables
ALTER TABLE ai.material_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.submission_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ontology_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ontology_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.ontology_misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.material_concept_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.student_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.material_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.submission_evaluations ENABLE ROW LEVEL SECURITY;

-- 2. Material Embeddings RLS
CREATE POLICY "Teacher can manage their material embeddings"
ON ai.material_embeddings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = material_embeddings.material_id AND m.user_id = (SELECT auth.uid())
    )
);

-- 3. Submission Embeddings RLS
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

-- 4. Ontology Concepts & Graph RLS (Read-only for authenticated, manageable by teachers)
CREATE POLICY "Authenticated users can view ontology concepts"
ON ai.ontology_concepts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view ontology relationships"
ON ai.ontology_relationships FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view ontology misconceptions"
ON ai.ontology_misconceptions FOR SELECT TO authenticated USING (true);

-- 5. Material Concept Mappings RLS
CREATE POLICY "Users can access material concept mappings"
ON ai.material_concept_mappings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = material_concept_mappings.material_id AND m.user_id = (SELECT auth.uid())
    )
);

-- 6. Student Mastery RLS
CREATE POLICY "Users can access student concept mastery"
ON ai.student_concept_mastery FOR ALL TO authenticated
USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = student_concept_mastery.class_id AND c.user_id = (SELECT auth.uid())
    )
);

-- 7. Material Insights RLS
CREATE POLICY "Teacher can manage material insights"
ON ai.material_insights FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.materials m
        WHERE m.id = material_insights.material_id AND m.user_id = (SELECT auth.uid())
    )
);

-- 8. Submission Evaluations RLS
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
