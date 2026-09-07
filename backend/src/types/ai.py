from datetime import datetime
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
    rubric_criteria: list[dict[str, str | float | int | None]] = []
    submission_text: str = ""


class GradeResponse(BaseModel):
    submission_id: str
    score: float
    max_score: float
    grade: str
    feedback: str
    private_teacher_notes: str | None = None
    rubric_breakdown: list[RubricBreakdownItem] = []
    rationale: str
    status: str = "completed"
    model_used: str | None = None


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
    options: list[str] = []
    answer: str | None = None
    explanation: str | None = None
    difficulty: str = "Intermediate"


class MaterialAnalyzeRequest(BaseModel):
    material_id: str
    name: str
    category: str = "Study Material"
    rubric_criteria: list[dict[str, str | float | int | None]] = []
    extracted_text: str = ""


class MaterialAnalyzeResponse(BaseModel):
    material_id: str
    summary: str
    difficulty_level: str = "Intermediate"
    syllabus_alignment: list[SyllabusAlignmentItem] = []
    prerequisite_gaps: list[PrerequisiteGapItem] = []
    sample_questions: list[SampleQuestionItem] = []
    status: str = "completed"
    model_used: str | None = None


# ---------------------------------------------------------------------------
# Ontological Knowledge Graph & Mastery Schemas
# ---------------------------------------------------------------------------


class OntologyConcept(BaseModel):
    id: str | None = None
    subject: str
    code: str | None = None
    name: str
    description: str
    bloom_level: str = "Understand"
    parent_concept_id: str | None = None
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)


class OntologyRelationship(BaseModel):
    source_concept_id: str
    target_concept_id: str
    relationship_type: str = "prerequisite_of"
    weight: float = 1.0
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)


class StudentConceptMastery(BaseModel):
    class_id: str
    student_id: str
    concept_id: str
    mastery_score: float = Field(ge=0, le=1)
    confidence: float = Field(default=0.8, ge=0, le=1)
    status: str = "unassessed"
    evidence_submission_ids: list[str] = []
    last_evaluated_at: datetime | None = None
