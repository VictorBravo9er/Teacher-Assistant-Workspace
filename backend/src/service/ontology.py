from __future__ import annotations

import json
from typing import Any, Literal

from src.lib.db import execute, fetch_all, fetch_one
from src.lib.logger import eval_logger
from src.types.ai import (
    CheckAnswerableResult,
    MaterialConceptMapping,
    OntologyConcept,
    OntologyMisconception,
    OntologyRelationship,
    StudentConceptMastery,
)


class OntologyService:
    """Service for managing the pedagogical knowledge graph, OKF v0.2 concepts, CTE traversal, and student mastery state."""

    @staticmethod
    def format_concept_node(concept: OntologyConcept) -> dict[str, Any]:
        """Convert concept model to database insertion dictionary with OKF v0.2 envelope."""
        return {
            "subject": concept.subject,
            "code": concept.code,
            "name": concept.name,
            "description": concept.description,
            "bloom_level": concept.bloom_level,
            "parent_concept_id": concept.parent_concept_id,
            "okf_type": concept.okf_type,
            "status": concept.status,
            "verified_by": concept.verified_by,
            "stale_after": concept.stale_after,
            "tags": concept.tags,
            "metadata": concept.metadata,
        }

    @staticmethod
    def format_relationship_edge(rel: OntologyRelationship) -> dict[str, Any]:
        """Convert relationship edge model to database insertion dictionary."""
        return {
            "source_concept_id": rel.source_concept_id,
            "target_concept_id": rel.target_concept_id,
            "relationship_type": rel.relationship_type,
            "weight": rel.weight,
            "metadata": rel.metadata,
        }

    @staticmethod
    def format_student_mastery(mastery: StudentConceptMastery) -> dict[str, Any]:
        """Convert student concept mastery model to database insertion dictionary."""
        return {
            "class_id": mastery.class_id,
            "student_id": mastery.student_id,
            "concept_id": mastery.concept_id,
            "mastery_score": mastery.mastery_score,
            "confidence": mastery.confidence,
            "status": mastery.status,
            "evidence_submission_ids": mastery.evidence_submission_ids,
        }

    @staticmethod
    def determine_mastery_status(score: float) -> str:
        """Determine pedagogical mastery category from numeric score."""
        if score >= 0.85:
            return "mastered"
        if score >= 0.65:
            return "practicing"
        return "gap_detected"

    @classmethod
    async def check_answerable(
        cls, class_id: str, query_terms: list[str]
    ) -> CheckAnswerableResult:
        """Call the pre-query soft-warning gate ai.check_answerable."""
        sql = "SELECT * FROM ai.check_answerable(%s::uuid, %s::text[])"
        terms_clean = [t.strip().lower() for t in query_terms if t.strip()]
        if not terms_clean:
            terms_clean = ["general"]

        row = await fetch_one(sql, (class_id, terms_clean))
        if not row:
            return CheckAnswerableResult(
                is_answerable=True,
                status_flag="VERIFIED",
                coverage_score=1.0,
                matched_concept_count=1,
                missing_terms=[],
                requires_confirmation=False,
                caveat_message=None,
            )

        raw_flag = str(row.get("status_flag") or "VERIFIED")
        status_flag: Literal["VERIFIED", "INCOMPLETE_WARNING"] = (
            "INCOMPLETE_WARNING" if raw_flag == "INCOMPLETE_WARNING" else "VERIFIED"
        )

        return CheckAnswerableResult(
            is_answerable=bool(row.get("is_answerable", True)),
            status_flag=status_flag,
            coverage_score=float(row.get("coverage_score", 1.0)),
            matched_concept_count=int(row.get("matched_concept_count", 0)),
            missing_terms=list(row.get("missing_terms", [])),
            requires_confirmation=bool(row.get("requires_confirmation", False)),
            caveat_message=row.get("caveat_message"),
        )

    @classmethod
    async def get_prerequisite_graph_cte(
        cls, concept_ids: list[str], max_depth: int = 3
    ) -> list[dict[str, Any]]:
        """Retrieve prerequisite dependencies and parent concepts using PostgreSQL recursive CTE (<10ms)."""
        if not concept_ids:
            return []

        sql = """
        WITH RECURSIVE prereq_tree AS (
            SELECT
                r.source_concept_id,
                r.target_concept_id,
                r.relationship_type,
                r.weight,
                1 AS depth,
                ARRAY[r.source_concept_id, r.target_concept_id] AS path
            FROM ai.ontology_relationships r
            WHERE r.target_concept_id = ANY(%s::uuid[])

            UNION ALL

            SELECT
                r.source_concept_id,
                r.target_concept_id,
                r.relationship_type,
                r.weight,
                pt.depth + 1,
                pt.path || r.source_concept_id
            FROM ai.ontology_relationships r
            JOIN prereq_tree pt ON r.target_concept_id = pt.source_concept_id
            WHERE pt.depth < %s AND NOT (r.source_concept_id = ANY(pt.path))
        )
        SELECT DISTINCT
            pt.depth,
            pt.relationship_type,
            c.id AS concept_id,
            c.name AS concept_name,
            c.code,
            c.bloom_level,
            c.description
        FROM prereq_tree pt
        JOIN ai.ontology_concepts c ON c.id = pt.source_concept_id
        ORDER BY pt.depth ASC;
        """
        rows = await fetch_all(sql, (concept_ids, max_depth))
        return rows

    @classmethod
    async def upsert_concept(cls, concept: OntologyConcept) -> str:
        """Insert or update a concept in ai.ontology_concepts with OKF v0.2 envelopes."""
        sql = """
        INSERT INTO ai.ontology_concepts (
            subject, code, name, description, bloom_level,
            parent_concept_id, okf_type, status, verified_by, stale_after, tags, metadata
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            bloom_level = EXCLUDED.bloom_level,
            okf_type = EXCLUDED.okf_type,
            status = EXCLUDED.status,
            tags = EXCLUDED.tags,
            metadata = EXCLUDED.metadata
        RETURNING id;
        """
        row = await fetch_one(
            sql,
            (
                concept.subject,
                concept.code,
                concept.name,
                concept.description,
                concept.bloom_level,
                concept.parent_concept_id,
                concept.okf_type,
                concept.status,
                concept.verified_by,
                concept.stale_after,
                concept.tags,
                json.dumps(concept.metadata),
            ),
        )
        return str(row["id"]) if row else ""

    @classmethod
    async def upsert_relationship(cls, rel: OntologyRelationship) -> str:
        """Insert a relationship edge enforcing the closed vocabulary constraint."""
        sql = """
        INSERT INTO ai.ontology_relationships (
            source_concept_id, target_concept_id, relationship_type, weight, metadata
        ) VALUES (
            %s, %s, %s, %s, %s::jsonb
        )
        RETURNING id;
        """
        row = await fetch_one(
            sql,
            (
                rel.source_concept_id,
                rel.target_concept_id,
                rel.relationship_type,
                rel.weight,
                json.dumps(rel.metadata),
            ),
        )
        return str(row["id"]) if row else ""

    @classmethod
    async def link_material_to_concepts(
        cls, mappings: list[MaterialConceptMapping]
    ) -> None:
        """Link material sections or tree nodes to ontology concepts."""
        for m in mappings:
            sql = """
            INSERT INTO ai.material_concept_mappings (
                material_id, concept_id, tree_node_id, page_number,
                relationship, relevance_score, confidence, evidence_excerpt, verified_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            );
            """
            _ = await execute(
                sql,
                (
                    m.material_id,
                    m.concept_id,
                    m.tree_node_id,
                    m.page_number,
                    m.relationship,
                    m.relevance_score,
                    m.confidence,
                    m.evidence_excerpt,
                    m.verified_by,
                ),
            )

    @classmethod
    async def update_student_mastery(cls, mastery: StudentConceptMastery) -> None:
        """Upsert dynamic concept mastery for a student in a class."""
        sql = """
        INSERT INTO ai.student_concept_mastery (
            class_id, student_id, concept_id, mastery_score,
            confidence, status, evidence_submission_ids, last_evaluated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (class_id, student_id, concept_id) DO UPDATE SET
            mastery_score = EXCLUDED.mastery_score,
            confidence = EXCLUDED.confidence,
            status = EXCLUDED.status,
            evidence_submission_ids = EXCLUDED.evidence_submission_ids,
            last_evaluated_at = NOW();
        """
        _ = await execute(
            sql,
            (
                mastery.class_id,
                mastery.student_id,
                mastery.concept_id,
                mastery.mastery_score,
                mastery.confidence,
                mastery.status,
                mastery.evidence_submission_ids,
            ),
        )

    @classmethod
    async def propose_misconception(cls, misc: OntologyMisconception) -> str:
        """Insert a proposed pedagogical misconception detected during grading or dreaming."""
        eval_logger.info(
            "Proposing misconception for class_id=%s, concept_id=%s: %s",
            misc.class_id,
            misc.concept_id,
            misc.error_pattern,
        )
        sql = """
        INSERT INTO ai.ontology_misconceptions (
            class_id, concept_id, prerequisite_concept_id, name,
            error_pattern, remediation_strategy, severity, status,
            confidence, evidence_submission_ids, surfaced_in_gradebook
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        RETURNING id;
        """
        row = await fetch_one(
            sql,
            (
                misc.class_id,
                misc.concept_id,
                misc.prerequisite_concept_id,
                misc.name,
                misc.error_pattern,
                misc.remediation_strategy,
                misc.severity,
                misc.status,
                misc.confidence,
                misc.evidence_submission_ids,
                misc.surfaced_in_gradebook,
            ),
        )
        return str(row["id"]) if row else ""

    @classmethod
    async def get_proposed_misconceptions(
        cls, class_id: str | None = None
    ) -> list[OntologyMisconception]:
        """Fetch proposed misconceptions for teacher Gradebook Matrix review."""
        if class_id:
            sql = "SELECT * FROM ai.ontology_misconceptions WHERE class_id = %s AND status = 'proposed' ORDER BY created_at DESC"
            rows = await fetch_all(sql, (class_id,))
        else:
            sql = "SELECT * FROM ai.ontology_misconceptions WHERE status = 'proposed' ORDER BY created_at DESC"
            rows = await fetch_all(sql)

        result: list[OntologyMisconception] = []
        for r in rows:
            result.append(
                OntologyMisconception(
                    id=str(r["id"]),
                    class_id=str(r["class_id"]) if r.get("class_id") else None,
                    concept_id=str(r["concept_id"]),
                    prerequisite_concept_id=str(r["prerequisite_concept_id"])
                    if r.get("prerequisite_concept_id")
                    else None,
                    name=r.get("name"),
                    error_pattern=r["error_pattern"],
                    remediation_strategy=r["remediation_strategy"],
                    severity=r.get("severity", "Moderate"),
                    status=r.get("status", "proposed"),
                    confidence=float(r.get("confidence", 0.8)),
                    evidence_submission_ids=[
                        str(eid) for eid in (r.get("evidence_submission_ids") or [])
                    ],
                    surfaced_in_gradebook=bool(r.get("surfaced_in_gradebook", True)),
                    teacher_reviewer_id=str(r["teacher_reviewer_id"])
                    if r.get("teacher_reviewer_id")
                    else None,
                    teacher_reviewed_at=r.get("teacher_reviewed_at"),
                    created_at=r.get("created_at"),
                )
            )
        return result

    @classmethod
    async def review_misconception(
        cls, misconception_id: str, status: str, reviewer_id: str | None = None
    ) -> None:
        """Teacher review of proposed misconception: confirm or dismiss."""
        eval_logger.info(
            "Reviewing misconception id=%s: status=%s, reviewer=%s",
            misconception_id,
            status,
            reviewer_id,
        )
        sql = """
        UPDATE ai.ontology_misconceptions
        SET status = %s,
            teacher_reviewer_id = %s,
            teacher_reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = %s
        """
        _ = await execute(sql, (status, reviewer_id, misconception_id))

    @classmethod
    async def find_concepts_by_names(
        cls, names: list[str], subject: str | None = None
    ) -> list[dict[str, Any]]:
        """Find ontology concepts matching given names."""
        if not names:
            return []
        sql = "SELECT id, name, subject, code, bloom_level, description FROM ai.ontology_concepts WHERE name = ANY(%s)"
        rows = await fetch_all(sql, (names,))
        return rows
