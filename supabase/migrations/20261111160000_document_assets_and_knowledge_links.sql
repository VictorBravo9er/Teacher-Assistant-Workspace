-- ============================================================================
-- Didactiq: Self-Contained AI Schema Visual Knowledge Assets & Concept Links
-- Timestamp: 20261111160000
-- Schema: ai (self-contained knowledge storage; no Storage buckets or cross-schema FKs)
-- ============================================================================

-- 1. Create ai.document_assets in AI Knowledge Graph Schema
-- Stores extracted illustrations, diagrams, charts, tables, and scans purely inside `ai`:
-- - Descriptive textual form (`description`, `alt_text`, `ocr_text`) when content reduces cleanly to text/Markdown
-- - And/or actual image data (`image_base64` TEXT or `image_bytes` BYTEA) when visually qualified for preservation
-- Foreign keys stay strictly inside `ai` (`ai.ontology_concepts`, `ai.material_trees`, `ai.material_insights`, `ai.submission_evaluations`).
CREATE TABLE IF NOT EXISTS ai.document_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_material_id UUID,
    source_submission_id UUID,
    material_tree_id UUID REFERENCES ai.material_trees(id) ON DELETE CASCADE,
    material_insight_id UUID REFERENCES ai.material_insights(material_id) ON DELETE CASCADE,
    submission_evaluation_id UUID REFERENCES ai.submission_evaluations(id) ON DELETE CASCADE,
    concept_id UUID REFERENCES ai.ontology_concepts(id) ON DELETE SET NULL,
    content_item_id TEXT,
    tree_node_id TEXT,
    page_number INTEGER,
    title TEXT,
    asset_type TEXT NOT NULL DEFAULT 'illustration'
        CHECK (asset_type IN ('diagram', 'chart', 'illustration', 'equation', 'table_image', 'text_scan', 'photo', 'other')),
    representation_mode TEXT NOT NULL DEFAULT 'hybrid'
        CHECK (representation_mode IN ('description_only', 'base64_only', 'binary_only', 'hybrid')),
    retain_image_data BOOLEAN NOT NULL DEFAULT TRUE,
    retention_reason TEXT,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    byte_size INTEGER,
    width INTEGER,
    height INTEGER,
    checksum_sha256 TEXT,
    description TEXT,
    alt_text TEXT,
    ocr_text TEXT,
    image_base64 TEXT,
    image_bytes BYTEA,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_document_assets_source CHECK (
        source_material_id IS NOT NULL
        OR source_submission_id IS NOT NULL
        OR material_tree_id IS NOT NULL
        OR material_insight_id IS NOT NULL
        OR submission_evaluation_id IS NOT NULL
        OR concept_id IS NOT NULL
    ),
    CONSTRAINT chk_document_assets_representation CHECK (
        description IS NOT NULL
        OR alt_text IS NOT NULL
        OR ocr_text IS NOT NULL
        OR image_base64 IS NOT NULL
        OR image_bytes IS NOT NULL
    )
);

-- Indexes on all intra-ai foreign keys, provenance IDs, and lookup paths
CREATE INDEX IF NOT EXISTS idx_ai_doc_assets_source_material_id
    ON ai.document_assets(source_material_id) WHERE source_material_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_doc_assets_source_submission_id
    ON ai.document_assets(source_submission_id) WHERE source_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_doc_assets_material_tree_id
    ON ai.document_assets(material_tree_id) WHERE material_tree_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_doc_assets_material_insight_id
    ON ai.document_assets(material_insight_id) WHERE material_insight_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_doc_assets_sub_eval_id
    ON ai.document_assets(submission_evaluation_id) WHERE submission_evaluation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_doc_assets_concept_id
    ON ai.document_assets(concept_id) WHERE concept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_doc_assets_tree_node_id
    ON ai.document_assets(tree_node_id) WHERE tree_node_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_doc_assets_material_checksum
    ON ai.document_assets(source_material_id, COALESCE(content_item_id, ''), checksum_sha256)
    WHERE source_material_id IS NOT NULL AND checksum_sha256 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_doc_assets_submission_checksum
    ON ai.document_assets(source_submission_id, COALESCE(content_item_id, ''), checksum_sha256)
    WHERE source_submission_id IS NOT NULL AND checksum_sha256 IS NOT NULL;

DROP TRIGGER IF EXISTS trg_document_assets_updated_at ON ai.document_assets;
CREATE TRIGGER trg_document_assets_updated_at
    BEFORE UPDATE ON ai.document_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Create N:M Knowledge Graph Bridge between Extracted Visual Assets & Ontology Concepts
CREATE TABLE IF NOT EXISTS ai.asset_concept_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES ai.document_assets(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'illustrates'
        CHECK (relationship IN ('illustrates', 'explains', 'derives', 'assesses', 'exemplifies')),
    relevance_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    excerpt_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_asset_concept_rel UNIQUE (asset_id, concept_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_ai_asset_map_asset_id ON ai.asset_concept_mappings(asset_id);
CREATE INDEX IF NOT EXISTS idx_ai_asset_map_concept_id ON ai.asset_concept_mappings(concept_id);

-- 3. Enable Strict Row Level Security (RLS) on New AI Schema Tables
ALTER TABLE ai.document_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.asset_concept_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers and enrolled students can view document assets" ON ai.document_assets;
DROP POLICY IF EXISTS "Owners can insert document assets" ON ai.document_assets;
DROP POLICY IF EXISTS "Owners can update document assets" ON ai.document_assets;
DROP POLICY IF EXISTS "Owners can delete document assets" ON ai.document_assets;

CREATE POLICY "Teachers and enrolled students can view document assets"
ON ai.document_assets FOR SELECT
TO authenticated
USING (
    (
        source_material_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.materials m
            LEFT JOIN public.class_materials cm ON cm.material_id = m.id
            LEFT JOIN public.class_students cs ON cs.class_id = cm.class_id
            WHERE m.id = document_assets.source_material_id
              AND (m.user_id = (SELECT auth.uid()) OR cs.student_id = (SELECT auth.uid()))
        )
    )
    OR (
        source_submission_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.student_submissions s
            JOIN public.classes c ON c.id = s.class_id
            WHERE s.id = document_assets.source_submission_id
              AND (s.student_id = (SELECT auth.uid()) OR c.user_id = (SELECT auth.uid()))
        )
    )
    OR (
        source_material_id IS NULL
        AND source_submission_id IS NULL
        AND concept_id IS NOT NULL
    )
);

CREATE POLICY "Owners can insert document assets"
ON ai.document_assets FOR INSERT
TO authenticated
WITH CHECK (
    (
        source_material_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.materials m
            WHERE m.id = document_assets.source_material_id
              AND m.user_id = (SELECT auth.uid())
        )
    )
    OR (
        source_submission_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.student_submissions s
            JOIN public.classes c ON c.id = s.class_id
            WHERE s.id = document_assets.source_submission_id
              AND (s.student_id = (SELECT auth.uid()) OR c.user_id = (SELECT auth.uid()))
        )
    )
);

CREATE POLICY "Owners can update document assets"
ON ai.document_assets FOR UPDATE
TO authenticated
USING (
    (
        source_material_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.materials m
            WHERE m.id = document_assets.source_material_id
              AND m.user_id = (SELECT auth.uid())
        )
    )
    OR (
        source_submission_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.student_submissions s
            JOIN public.classes c ON c.id = s.class_id
            WHERE s.id = document_assets.source_submission_id
              AND c.user_id = (SELECT auth.uid())
        )
    )
)
WITH CHECK (
    (
        source_material_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.materials m
            WHERE m.id = document_assets.source_material_id
              AND m.user_id = (SELECT auth.uid())
        )
    )
    OR (
        source_submission_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.student_submissions s
            JOIN public.classes c ON c.id = s.class_id
            WHERE s.id = document_assets.source_submission_id
              AND c.user_id = (SELECT auth.uid())
        )
    )
);

CREATE POLICY "Owners can delete document assets"
ON ai.document_assets FOR DELETE
TO authenticated
USING (
    (
        source_material_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.materials m
            WHERE m.id = document_assets.source_material_id
              AND m.user_id = (SELECT auth.uid())
        )
    )
    OR (
        source_submission_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.student_submissions s
            JOIN public.classes c ON c.id = s.class_id
            WHERE s.id = document_assets.source_submission_id
              AND c.user_id = (SELECT auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "Authorized users can view asset concept mappings" ON ai.asset_concept_mappings;
DROP POLICY IF EXISTS "Owners can manage asset concept mappings" ON ai.asset_concept_mappings;
DROP POLICY IF EXISTS "Owners can insert asset concept mappings" ON ai.asset_concept_mappings;
DROP POLICY IF EXISTS "Owners can delete asset concept mappings" ON ai.asset_concept_mappings;

CREATE POLICY "Authorized users can view asset concept mappings"
ON ai.asset_concept_mappings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM ai.document_assets da
        LEFT JOIN public.materials m ON m.id = da.source_material_id
        LEFT JOIN public.class_materials cm ON cm.material_id = m.id
        LEFT JOIN public.class_students cs ON cs.class_id = cm.class_id
        LEFT JOIN public.student_submissions s ON s.id = da.source_submission_id
        LEFT JOIN public.classes c ON c.id = s.class_id
        WHERE da.id = asset_concept_mappings.asset_id
          AND (
              m.user_id = (SELECT auth.uid())
              OR cs.student_id = (SELECT auth.uid())
              OR s.student_id = (SELECT auth.uid())
              OR c.user_id = (SELECT auth.uid())
              OR (da.source_material_id IS NULL AND da.source_submission_id IS NULL AND da.concept_id IS NOT NULL)
          )
    )
);

CREATE POLICY "Owners can insert asset concept mappings"
ON ai.asset_concept_mappings FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai.document_assets da
        LEFT JOIN public.materials m ON m.id = da.source_material_id
        LEFT JOIN public.student_submissions s ON s.id = da.source_submission_id
        LEFT JOIN public.classes c ON c.id = s.class_id
        WHERE da.id = asset_concept_mappings.asset_id
          AND (m.user_id = (SELECT auth.uid()) OR c.user_id = (SELECT auth.uid()))
    )
);

CREATE POLICY "Owners can delete asset concept mappings"
ON ai.asset_concept_mappings FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM ai.document_assets da
        LEFT JOIN public.materials m ON m.id = da.source_material_id
        LEFT JOIN public.student_submissions s ON s.id = da.source_submission_id
        LEFT JOIN public.classes c ON c.id = s.class_id
        WHERE da.id = asset_concept_mappings.asset_id
          AND (m.user_id = (SELECT auth.uid()) OR c.user_id = (SELECT auth.uid()))
    )
);

-- 4. Public Security-Definer Gateway RPC for Extracted Visual Knowledge Assets
CREATE OR REPLACE FUNCTION public.get_document_assets(
    p_material_id UUID DEFAULT NULL,
    p_submission_id UUID DEFAULT NULL,
    p_concept_id UUID DEFAULT NULL,
    p_include_inline_data BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ai, extensions
AS $$
DECLARE
    v_uid UUID := (SELECT auth.uid());
    v_assets JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF p_material_id IS NULL AND p_submission_id IS NULL AND p_concept_id IS NULL THEN
        RAISE EXCEPTION 'Specify at least one filter: p_material_id, p_submission_id, or p_concept_id.'
            USING ERRCODE = '22023';
    END IF;

    IF p_material_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.materials m
            LEFT JOIN public.class_materials cm ON cm.material_id = m.id
            LEFT JOIN public.class_students cs ON cs.class_id = cm.class_id
            WHERE m.id = p_material_id
              AND (m.user_id = v_uid OR cs.student_id = v_uid)
        ) THEN
            RAISE EXCEPTION 'Access denied or material not found.' USING ERRCODE = '42501';
        END IF;
    END IF;

    IF p_submission_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.student_submissions s
            JOIN public.classes c ON c.id = s.class_id
            WHERE s.id = p_submission_id
              AND (s.student_id = v_uid OR c.user_id = v_uid)
        ) THEN
            RAISE EXCEPTION 'Access denied or submission not found.' USING ERRCODE = '42501';
        END IF;
    END IF;

    WITH authorized_assets AS (
        SELECT
            da.id,
            da.source_material_id,
            da.source_submission_id,
            da.material_tree_id,
            da.material_insight_id,
            da.submission_evaluation_id,
            da.concept_id,
            da.content_item_id,
            da.tree_node_id,
            da.page_number,
            da.title,
            da.asset_type,
            da.representation_mode,
            da.retain_image_data,
            da.retention_reason,
            da.mime_type,
            da.byte_size,
            da.width,
            da.height,
            da.checksum_sha256,
            da.description,
            da.alt_text,
            da.ocr_text,
            CASE WHEN p_include_inline_data THEN da.image_base64 ELSE NULL END AS image_base64,
            (da.image_bytes IS NOT NULL OR da.image_base64 IS NOT NULL) AS has_inline_data,
            da.metadata,
            da.created_at,
            da.updated_at,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'concept_id', c.id,
                            'concept_name', c.name,
                            'subject', c.subject,
                            'relationship', acm.relationship,
                            'relevance_score', acm.relevance_score,
                            'excerpt_context', acm.excerpt_context
                        )
                    )
                    FROM ai.asset_concept_mappings acm
                    JOIN ai.ontology_concepts c ON c.id = acm.concept_id
                    WHERE acm.asset_id = da.id
                ),
                '[]'::jsonb
            ) AS linked_concepts
        FROM ai.document_assets da
        WHERE (p_material_id IS NULL OR da.source_material_id = p_material_id)
          AND (p_submission_id IS NULL OR da.source_submission_id = p_submission_id)
          AND (
              p_concept_id IS NULL
              OR da.concept_id = p_concept_id
              OR EXISTS (
                  SELECT 1 FROM ai.asset_concept_mappings acm2
                  WHERE acm2.asset_id = da.id AND acm2.concept_id = p_concept_id
              )
          )
          AND (
              (
                  da.source_material_id IS NOT NULL
                  AND EXISTS (
                      SELECT 1
                      FROM public.materials m
                      LEFT JOIN public.class_materials cm ON cm.material_id = m.id
                      LEFT JOIN public.class_students cs ON cs.class_id = cm.class_id
                      WHERE m.id = da.source_material_id
                        AND (m.user_id = v_uid OR cs.student_id = v_uid)
                  )
              )
              OR (
                  da.source_submission_id IS NOT NULL
                  AND EXISTS (
                      SELECT 1
                      FROM public.student_submissions s
                      JOIN public.classes c ON c.id = s.class_id
                      WHERE s.id = da.source_submission_id
                        AND (s.student_id = v_uid OR c.user_id = v_uid)
                  )
              )
              OR (
                  da.source_material_id IS NULL
                  AND da.source_submission_id IS NULL
                  AND da.concept_id IS NOT NULL
              )
          )
        ORDER BY COALESCE(da.page_number, 1) ASC, da.created_at ASC
    )
    SELECT jsonb_build_object(
        'count', (SELECT count(*) FROM authorized_assets),
        'assets', COALESCE(jsonb_agg(to_jsonb(aa)), '[]'::jsonb)
    )
    INTO v_assets
    FROM authorized_assets aa;

    RETURN v_assets;
END;
$$;

REVOKE ALL ON FUNCTION public.get_document_assets(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_document_assets(UUID, UUID, UUID, BOOLEAN) TO authenticated;

-- 5. Schema Comments
COMMENT ON TABLE ai.document_assets IS 'Self-contained AI schema store for extracted illustrations, diagrams, charts, tables, and scans in descriptive text and/or inline base64/binary forms, linked to ai.ontology_concepts and ai knowledge artifacts without Storage bucket dependencies.';
COMMENT ON TABLE ai.asset_concept_mappings IS 'Many-to-many knowledge graph links binding extracted visual assets to ai.ontology_concepts nodes.';
COMMENT ON FUNCTION public.get_document_assets(UUID, UUID, UUID, BOOLEAN) IS 'Authorized security-definer gateway returning extracted visual knowledge assets from ai.document_assets.';
