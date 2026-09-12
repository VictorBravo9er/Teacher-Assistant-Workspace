from src.types.ai import (
    OntologyConcept,
    OntologyRelationship,
    StudentConceptMastery,
)


class OntologyService:
    """Service for managing the pedagogical knowledge graph, concept mappings, and student mastery state in the 'ai' schema."""

    @staticmethod
    def format_concept_node(concept: OntologyConcept) -> dict[str, str | int | float | bool | None | dict[str, str | int | float | bool]]:
        """Convert concept model to database insertion dictionary."""
        return {
            "subject": concept.subject,
            "code": concept.code,
            "name": concept.name,
            "description": concept.description,
            "bloom_level": concept.bloom_level,
            "parent_concept_id": concept.parent_concept_id,
            "metadata": concept.metadata,
        }

    @staticmethod
    def format_relationship_edge(rel: OntologyRelationship) -> dict[str, str | int | float | bool | dict[str, str | int | float | bool]]:
        """Convert relationship edge model to database insertion dictionary."""
        return {
            "source_concept_id": rel.source_concept_id,
            "target_concept_id": rel.target_concept_id,
            "relationship_type": rel.relationship_type,
            "weight": rel.weight,
            "metadata": rel.metadata,
        }

    @staticmethod
    def format_student_mastery(mastery: StudentConceptMastery) -> dict[str, str | float | list[str]]:
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
