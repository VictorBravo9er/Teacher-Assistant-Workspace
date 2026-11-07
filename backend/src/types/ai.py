from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Rubric & Scoring Schemas
# ---------------------------------------------------------------------------


class RubricCriterion(BaseModel):
    id: str | None = None
    name: str = "Criterion"
    description: str | None = None
    maxScore: float = Field(default=100.0, ge=0)


class RubricBreakdownItem(BaseModel):
    criterionId: str | None = None
    criterionName: str = "Criterion"
    score: float = Field(default=0.0, ge=0)
    maxScore: float = Field(default=100.0, ge=0)
    comment: str = ""


# ---------------------------------------------------------------------------
# Submission Auto-Evaluation Schemas (Phase 6.1 / Step 6.2)
# ---------------------------------------------------------------------------


class GradeRequest(BaseModel):
    submission_id: str
    class_id: str | None = None
    student_id: str | None = None
    material_id: str | None = None
    material_name: str = "Student Assignment"
    max_score: float = 100.0
    rubric_criteria: list[dict[str, str | float | int | None]] = Field(default_factory=list)
    submission_text: str = ""


class GradeResponse(BaseModel):
    submission_id: str
    score: float
    max_score: float
    grade: str
    feedback: str
    private_teacher_notes: str | None = None
    rubric_breakdown: list[RubricBreakdownItem] = Field(default_factory=list)
    rationale: str
    status: str = "completed"
    model_used: str | None = None
    detected_misconceptions: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Material Ingestion & Syllabus Alignment Schemas (Step 6.2)
# ---------------------------------------------------------------------------


class SyllabusAlignmentItem(BaseModel):
    topic: str
    standard_code: str | None = None
    confidence: float = Field(default=1.0, ge=0, le=1)
    description: str | None = None


class PrerequisiteGapItem(BaseModel):
    prerequisite_concept: str
    gap_detected: bool = False
    remedial_action: str | None = None


class SampleQuestionItem(BaseModel):
    question: str
    options: list[str] = Field(default_factory=list)
    answer: str | None = None
    explanation: str | None = None
    difficulty: str = "Intermediate"


class MaterialAnalyzeRequest(BaseModel):
    material_id: str
    name: str
    category: str = "Study Material"
    rubric_criteria: list[dict[str, str | float | int | None]] = Field(default_factory=list)
    extracted_text: str = ""
    page_count: int = 1
    class_id: str | None = None


class MaterialAnalyzeResponse(BaseModel):
    material_id: str
    summary: str
    difficulty_level: str = "Intermediate"
    syllabus_alignment: list[SyllabusAlignmentItem] = Field(default_factory=list)
    prerequisite_gaps: list[PrerequisiteGapItem] = Field(default_factory=list)
    sample_questions: list[SampleQuestionItem] = Field(default_factory=list)
    status: str = "completed"
    model_used: str | None = None
    tree_indexed: bool = False
    tree_total_nodes: int = 0


# ---------------------------------------------------------------------------
# Hierarchical Tree Index Schemas (PageIndex / RAPTOR inspired)
# ---------------------------------------------------------------------------


class TreeNode(BaseModel):
    node_id: str
    title: str
    page_start: int = 1
    page_end: int = 1
    summary: str
    key_concepts: list[str] = Field(default_factory=list)
    children: list[TreeNode] = Field(default_factory=list)


class MaterialTree(BaseModel):
    id: str | None = None
    material_id: str
    root_node: dict[str, Any] | TreeNode
    total_nodes: int = 1
    max_depth: int = 1
    page_count: int = 1
    status: str = "completed"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MaterialTreeRequest(BaseModel):
    material_id: str
    force_rebuild: bool = False


class MaterialTreeResponse(BaseModel):
    material_id: str
    tree: MaterialTree | None = None
    cached: bool = True
    status: str = "completed"


class TreeTraversalContext(BaseModel):
    material_id: str
    material_name: str
    matched_nodes: list[dict[str, Any]] = Field(default_factory=list)
    selected_excerpts: list[str] = Field(default_factory=list)
    token_estimate: int = 0


# ---------------------------------------------------------------------------
# Ontological Knowledge Graph & Mastery Schemas (OKF v0.2 Envelopes)
# ---------------------------------------------------------------------------


class OntologyConcept(BaseModel):
    id: str | None = None
    subject: str
    code: str | None = None
    name: str
    description: str
    bloom_level: str = "Understand"
    parent_concept_id: str | None = None
    okf_type: Literal["concept", "framework", "schema", "rule", "standard"] = "concept"
    status: Literal["draft", "stable", "deprecated"] = "stable"
    verified_by: str | None = None
    stale_after: datetime | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OntologyRelationship(BaseModel):
    id: str | None = None
    source_concept_id: str
    target_concept_id: str
    relationship_type: Literal[
        "prerequisite_of",
        "part_of",
        "related_to",
        "generalization_of",
        "derived_from",
        "assesses",
    ] = "prerequisite_of"
    weight: float = 1.0
    metadata: dict[str, Any] = Field(default_factory=dict)


class MaterialConceptMapping(BaseModel):
    id: str | None = None
    material_id: str
    concept_id: str
    tree_node_id: str | None = None
    page_number: int | None = None
    relationship: str = "teaches"
    relevance_score: float = 1.0
    confidence: float = 1.0
    evidence_excerpt: str | None = None
    verified_by: str | None = None


class StudentConceptMastery(BaseModel):
    class_id: str
    student_id: str
    concept_id: str
    mastery_score: float = Field(ge=0, le=1)
    confidence: float = Field(default=0.8, ge=0, le=1)
    status: str = "unassessed"
    evidence_submission_ids: list[str] = Field(default_factory=list)
    last_evaluated_at: datetime | None = None


class OntologyMisconception(BaseModel):
    id: str | None = None
    class_id: str | None = None
    concept_id: str
    prerequisite_concept_id: str | None = None
    name: str | None = None
    error_pattern: str
    remediation_strategy: str
    severity: str = "Moderate"
    status: Literal["proposed", "confirmed", "dismissed"] = "proposed"
    confidence: float = 0.8
    evidence_submission_ids: list[str] = Field(default_factory=list)
    surfaced_in_gradebook: bool = True
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime | None = None


class MisconceptionReviewRequest(BaseModel):
    status: Literal["confirmed", "dismissed"]
    reviewer_id: str | None = None


# ---------------------------------------------------------------------------
# Pre-Query Soft-Warning Gate & Retrieval Schemas
# ---------------------------------------------------------------------------


class CheckAnswerableResult(BaseModel):
    is_answerable: bool
    status_flag: Literal["READY", "INCOMPLETE_WARNING", "NOT_ANSWERABLE"]
    coverage_score: float
    matched_concept_count: int
    missing_terms: list[str] = Field(default_factory=list)
    requires_confirmation: bool
    caveat_message: str | None = None


# ---------------------------------------------------------------------------
# Consolidation & Anti-Drift Schemas
# ---------------------------------------------------------------------------


class ConsolidationRun(BaseModel):
    id: str | None = None
    class_id: str | None = None
    run_type: str = "daily"
    status: str = "completed"
    drift_detected: bool = False
    orphaned_nodes_found: int = 0
    cycles_resolved: int = 0
    misconceptions_synthesized: int = 0
    summary: str | None = None
    lint_report: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None


class ConsolidationRequest(BaseModel):
    class_id: str | None = None
    run_type: str = "daily"
    force_dreaming: bool = False


class ConsolidationResponse(BaseModel):
    run_id: str
    status: str
    drift_detected: bool
    orphaned_nodes_found: int
    cycles_resolved: int
    misconceptions_synthesized: int
    summary: str
    lint_report: dict[str, Any] = Field(default_factory=dict)
