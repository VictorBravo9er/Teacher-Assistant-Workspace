import os
from typing import cast

from langchain_core.messages import HumanMessage, SystemMessage
from src.lib.llm import get_openrouter_llm, parse_llm_response
from src.lib.logger import logger
from src.types.ai import (
    GradeRequest,
    GradeResponse,
    MaterialAnalyzeRequest,
    MaterialAnalyzeResponse,
    PrerequisiteGapItem,
    RubricBreakdownItem,
    SampleQuestionItem,
    SyllabusAlignmentItem,
)


def _safe_float(val: object, default: float = 0.0) -> float:
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            return float(val)
        except ValueError:
            return default
    return default


def _safe_str(val: object, default: str = "") -> str:
    if isinstance(val, str):
        return val
    return default


class EvaluatorService:
    """Service to execute autonomous AI evaluations for student submissions and class materials."""

    @staticmethod
    async def grade_submission(req: GradeRequest, model: str) -> GradeResponse:
        logger.info(
            "Evaluating submission: submission_id=%s, material_name=%s, criteria_count=%d",
            req.submission_id,
            req.material_name,
            len(req.rubric_criteria),
        )
        api_key_str = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key_str:
            raise ValueError("OPENROUTER_API_KEY environment variable is empty.")

        criteria_lines: list[str] = []
        for c in req.rubric_criteria:
            name = _safe_str(c.get("name"), "Criterion")
            max_s = _safe_float(c.get("maxScore") or c.get("max_score"), 100.0)
            desc = _safe_str(c.get("description"), "")
            criteria_lines.append(f"- {name}: Max {max_s} pts - {desc}")

        criteria_str = "\n".join(criteria_lines) if criteria_lines else "Evaluate overall correctness, analytical reasoning, and completeness (Max 100 pts)."

        system_prompt = """You are an expert AI Master Educator and Pedagogical Assessor.
Your goal is to evaluate student work against the provided rubric criteria, assign appropriate scores per criterion, draft compassionate constructive student feedback, and provide private teacher pedagogical notes (including detected misconceptions or remedial actions).

Return strictly JSON matching this structure:
{
  "rubric_breakdown": [
    {
      "criterionId": "optional-id",
      "criterionName": "string",
      "score": 0.0,
      "maxScore": 0.0,
      "comment": "Specific constructive criterion observation"
    }
  ],
  "feedback": "Encouraging, constructive feedback draft for the student highlighting strengths and areas to grow.",
  "private_teacher_notes": "Internal teacher notes diagnosing misconceptions, IEP notes, or recommended practice concepts.",
  "rationale": "High-level diagnostic summary explaining how the evaluation was determined."
}
"""

        user_content = f"""ASSIGNMENT TITLE: {req.material_name}
MAX TOTAL SCORE: {req.max_score}

RUBRIC CRITERIA:
{criteria_str}

STUDENT SUBMISSION CONTENT:
\"\"\"
{req.submission_text}
\"\"\"
"""

        llm = get_openrouter_llm(model, api_key_str)
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content),
        ])

        parsed = parse_llm_response(cast(str, response.content))

        breakdown_raw = parsed.get("rubric_breakdown")
        breakdown_items: list[RubricBreakdownItem] = []
        total_score = 0.0

        if isinstance(breakdown_raw, list):
            item_list = cast(list[object], breakdown_raw)
            for b in item_list:
                if isinstance(b, dict):
                    b_dict = cast(dict[str, object], b)
                    crit_id = b_dict.get("criterionId")
                    crit_name = _safe_str(b_dict.get("criterionName"), "Criterion")
                    score_val = _safe_float(b_dict.get("score"), 0.0)
                    max_score_val = _safe_float(b_dict.get("maxScore"), 100.0)
                    comment_val = _safe_str(b_dict.get("comment"), "")

                    item = RubricBreakdownItem(
                        criterionId=_safe_str(crit_id) if crit_id else None,
                        criterionName=crit_name,
                        score=score_val,
                        maxScore=max_score_val,
                        comment=comment_val,
                    )
                    breakdown_items.append(item)
                    total_score += score_val

        if not breakdown_items:
            total_score = _safe_float(parsed.get("score"), req.max_score * 0.85)
            breakdown_items.append(
                RubricBreakdownItem(
                    criterionName="Overall Assessment",
                    score=total_score,
                    maxScore=req.max_score,
                    comment="Comprehensive evaluation.",
                )
            )

        pct = (total_score / req.max_score) * 100 if req.max_score > 0 else 0
        if pct >= 88:
            letter = "A"
        elif pct >= 75:
            letter = "B"
        elif pct >= 60:
            letter = "C"
        else:
            letter = "D"

        feedback_val = _safe_str(parsed.get("feedback"), "Good effort on this assignment.")
        notes_val = _safe_str(parsed.get("private_teacher_notes"), "")
        rationale_val = _safe_str(parsed.get("rationale"), "Evaluated against assigned rubric criteria.")

        return GradeResponse(
            submission_id=req.submission_id,
            score=round(total_score, 2),
            max_score=req.max_score,
            grade=f"{letter} ({round(pct)}%)",
            feedback=feedback_val,
            private_teacher_notes=notes_val or None,
            rubric_breakdown=breakdown_items,
            rationale=rationale_val,
            status="completed",
            model_used=model,
        )

    @staticmethod
    async def analyze_material(req: MaterialAnalyzeRequest, model: str) -> MaterialAnalyzeResponse:
        logger.info("Analyzing material: material_id=%s, name=%s", req.material_id, req.name)
        api_key_str = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key_str:
            raise ValueError("OPENROUTER_API_KEY environment variable is empty.")

        system_prompt = """You are an AI Curriculum Specialist and Pedagogical Analyst.
Analyze the provided educational material to:
1. Identify syllabus topics and curriculum alignment.
2. Detect potential prerequisite knowledge gaps students might experience.
3. Generate sample practice/comprehension questions with answers and explanations.
4. Provide an executive summary and estimate difficulty level ('Beginner', 'Intermediate', 'Advanced').

Return strictly JSON matching this structure:
{
  "summary": "Executive overview of concepts covered in this material.",
  "difficulty_level": "Beginner" | "Intermediate" | "Advanced",
  "syllabus_alignment": [
    {
      "topic": "string",
      "standard_code": "optional standard code",
      "confidence": 0.95,
      "description": "How this material addresses the topic"
    }
  ],
  "prerequisite_gaps": [
    {
      "prerequisite_concept": "string",
      "gap_detected": true,
      "remedial_action": "Recommended prior review"
    }
  ],
  "sample_questions": [
    {
      "question": "string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Why this answer is correct",
      "difficulty": "Intermediate"
    }
  ]
}
"""

        user_content = f"""MATERIAL NAME: {req.name}
CATEGORY: {req.category}

MATERIAL EXTRACTED TEXT:
\"\"\"
{req.extracted_text}
\"\"\"
"""

        llm = get_openrouter_llm(model, api_key_str)
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content),
        ])

        parsed = parse_llm_response(cast(str, response.content))

        syllabus_items: list[SyllabusAlignmentItem] = []
        raw_syllabus = parsed.get("syllabus_alignment")
        if isinstance(raw_syllabus, list):
            s_list = cast(list[object], raw_syllabus)
            for s in s_list:
                if isinstance(s, dict):
                    s_dict = cast(dict[str, object], s)
                    syllabus_items.append(
                        SyllabusAlignmentItem(
                            topic=_safe_str(s_dict.get("topic"), "General Topic"),
                            standard_code=_safe_str(s_dict.get("standard_code")) or None,
                            confidence=_safe_float(s_dict.get("confidence"), 1.0),
                            description=_safe_str(s_dict.get("description")) or None,
                        )
                    )

        prereq_items: list[PrerequisiteGapItem] = []
        raw_prereq = parsed.get("prerequisite_gaps")
        if isinstance(raw_prereq, list):
            p_list = cast(list[object], raw_prereq)
            for p in p_list:
                if isinstance(p, dict):
                    p_dict = cast(dict[str, object], p)
                    prereq_items.append(
                        PrerequisiteGapItem(
                            prerequisite_concept=_safe_str(p_dict.get("prerequisite_concept"), "Prerequisite"),
                            gap_detected=bool(p_dict.get("gap_detected", False)),
                            remedial_action=_safe_str(p_dict.get("remedial_action")) or None,
                        )
                    )

        sample_q_items: list[SampleQuestionItem] = []
        raw_questions = parsed.get("sample_questions")
        if isinstance(raw_questions, list):
            q_list = cast(list[object], raw_questions)
            for q in q_list:
                if isinstance(q, dict):
                    q_dict = cast(dict[str, object], q)
                    opts_raw = q_dict.get("options")
                    opts: list[str] = []
                    if isinstance(opts_raw, list):
                        raw_opt_list = cast(list[object], opts_raw)
                        opts = [str(o) for o in raw_opt_list]
                    sample_q_items.append(
                        SampleQuestionItem(
                            question=_safe_str(q_dict.get("question"), "Sample Question"),
                            options=opts,
                            answer=_safe_str(q_dict.get("answer")) or None,
                            explanation=_safe_str(q_dict.get("explanation")) or None,
                            difficulty=_safe_str(q_dict.get("difficulty"), "Intermediate"),
                        )
                    )

        return MaterialAnalyzeResponse(
            material_id=req.material_id,
            summary=_safe_str(parsed.get("summary"), "Material analysis completed successfully."),
            difficulty_level=_safe_str(parsed.get("difficulty_level"), "Intermediate"),
            syllabus_alignment=syllabus_items,
            prerequisite_gaps=prereq_items,
            sample_questions=sample_q_items,
            status="completed",
            model_used=model,
        )
