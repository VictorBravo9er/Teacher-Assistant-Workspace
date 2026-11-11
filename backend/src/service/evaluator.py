from __future__ import annotations

import json
import os
from typing import cast

from langchain_core.messages import HumanMessage, SystemMessage
from src.lib.db import execute, fetch_all, fetch_one
from src.lib.llm import get_openrouter_llm, parse_llm_response
from src.lib.logger import eval_logger, measure_async
from src.service.ontology import OntologyService
from src.service.tree_indexer import TreeIndexerService
from src.types.ai import (
    GradeRequest,
    GradeResponse,
    MaterialAnalyzeRequest,
    MaterialAnalyzeResponse,
    MaterialConceptMapping,
    OntologyConcept,
    OntologyMisconception,
    PrerequisiteGapItem,
    RubricBreakdownItem,
    SampleQuestionItem,
    StudentConceptMastery,
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
        eval_logger.info(
            "Evaluating submission: submission_id=%s, material_name=%s, criteria_count=%d, text_length=%d",
            req.submission_id,
            req.material_name,
            len(req.rubric_criteria),
            len(req.submission_text),
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

        criteria_str = (
            "\n".join(criteria_lines)
            if criteria_lines
            else "Evaluate overall correctness, analytical reasoning, and completeness (Max 100 pts)."
        )

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
  "rationale": "High-level diagnostic summary explaining how the evaluation was determined.",
  "detected_misconceptions": ["Brief descriptive name of any observed student misconception"]
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
        eval_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content),
        ]
        response = await measure_async(
            eval_logger,
            f"grade_submission_llm:{req.submission_id}",
            lambda: llm.ainvoke(eval_messages),
        )

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

        feedback_val = _safe_str(
            parsed.get("feedback"), "Good effort on this assignment."
        )
        notes_val = _safe_str(parsed.get("private_teacher_notes"), "")
        rationale_val = _safe_str(
            parsed.get("rationale"), "Evaluated against assigned rubric criteria."
        )

        detected_misc_raw = parsed.get("detected_misconceptions")
        detected_misconceptions: list[str] = []
        if isinstance(detected_misc_raw, list):
            detected_misconceptions = [str(m) for m in cast(list[object], detected_misc_raw)]

        # 1. Persist evaluation into ai.submission_evaluations
        eval_sql = """
        INSERT INTO ai.submission_evaluations (
            submission_id, suggested_score, suggested_max_score, suggested_grade,
            suggested_feedback, suggested_teacher_notes, suggested_rubric_breakdown,
            rationale, status, model_used, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s,
            %s, %s, %s::jsonb,
            %s, %s, %s, NOW(), NOW()
        )
        ON CONFLICT (submission_id) DO UPDATE SET
            suggested_score = EXCLUDED.suggested_score,
            suggested_max_score = EXCLUDED.suggested_max_score,
            suggested_grade = EXCLUDED.suggested_grade,
            suggested_feedback = EXCLUDED.suggested_feedback,
            suggested_teacher_notes = EXCLUDED.suggested_teacher_notes,
            suggested_rubric_breakdown = EXCLUDED.suggested_rubric_breakdown,
            rationale = EXCLUDED.rationale,
            status = EXCLUDED.status,
            model_used = EXCLUDED.model_used,
            updated_at = NOW();
        """
        breakdown_dicts = [b.model_dump() for b in breakdown_items]
        try:
            _ = await execute(
                eval_sql,
                (
                    req.submission_id,
                    total_score,
                    req.max_score,
                    f"{letter} ({round(pct)}%)",
                    feedback_val,
                    notes_val,
                    json.dumps(breakdown_dicts),
                    rationale_val,
                    "completed",
                    model,
                ),
            )
        except Exception as exc:
            eval_logger.warning("Failed to persist submission evaluation: %s", exc)

        # 2. Update student concept mastery if student_id and class_id are provided
        if req.student_id and req.class_id:
            try:
                # Find concepts mapped to this material
                concept_sql = """
                SELECT c.id, c.name
                FROM ai.material_concept_mappings m
                JOIN ai.ontology_concepts c ON c.id = m.concept_id
                WHERE m.material_id = %s;
                """
                concept_rows = await fetch_all(concept_sql, (req.material_id,))
                mastery_ratio = max(0.0, min(1.0, total_score / req.max_score)) if req.max_score > 0 else 0.8
                mastery_status = OntologyService.determine_mastery_status(mastery_ratio)

                for crow in concept_rows:
                    cid = str(crow["id"])
                    mastery_record = StudentConceptMastery(
                        class_id=req.class_id,
                        student_id=req.student_id,
                        concept_id=cid,
                        mastery_score=mastery_ratio,
                        confidence=0.85,
                        status=mastery_status,
                        evidence_submission_ids=[req.submission_id],
                    )
                    await OntologyService.update_student_mastery(mastery_record)
            except Exception as exc:
                eval_logger.warning("Failed to update student concept mastery: %s", exc)

        # 3. If novel misconceptions detected, propose them to ai.ontology_misconceptions
        if detected_misconceptions and req.class_id:
            try:
                anchor_row = await fetch_one("SELECT id FROM ai.ontology_concepts LIMIT 1")
                anchor_cid = str(anchor_row["id"]) if anchor_row else None
                if anchor_cid:
                    for dm in detected_misconceptions[:2]:
                        misc = OntologyMisconception(
                            class_id=req.class_id,
                            concept_id=anchor_cid,
                            name=dm,
                            error_pattern=f"Detected in submission {req.submission_id}: {notes_val[:200]}",
                            remediation_strategy="Review foundational prerequisite materials and assign practice problems.",
                            severity="Moderate",
                            status="proposed",
                            confidence=0.8,
                            evidence_submission_ids=[req.submission_id],
                            surfaced_in_gradebook=True,
                        )
                        _ = await OntologyService.propose_misconception(misc)
            except Exception as exc:
                eval_logger.warning("Failed to record proposed misconception: %s", exc)

        eval_logger.info(
            "Evaluation complete: submission_id=%s, score=%.2f/%d, grade=%s, items_count=%d",
            req.submission_id,
            total_score,
            req.max_score,
            f"{letter} ({round(pct)}%)",
            len(breakdown_items),
        )

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
            detected_misconceptions=detected_misconceptions,
        )

    @staticmethod
    async def analyze_material(
        req: MaterialAnalyzeRequest, model: str
    ) -> MaterialAnalyzeResponse:
        eval_logger.info(
            "Analyzing material: material_id=%s, name=%s, category=%s, text_length=%d, pages=%d",
            req.material_id,
            req.name,
            req.category,
            len(req.extracted_text),
            req.page_count,
        )
        api_key_str = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key_str:
            raise ValueError("OPENROUTER_API_KEY environment variable is empty.")

        # PageIndex Tree Indexing Gate: documents >= 20 pages or >= 15,000 chars
        tree_indexed = False
        tree_total_nodes = 0
        if len(req.extracted_text) >= 15000 or req.page_count >= 20:
            eval_logger.info(
                "Document exceeds 15k chars / 20 pages, invoking TreeIndexerService for material_id=%s",
                req.material_id,
            )
            try:
                tree = await TreeIndexerService.build_tree_from_text(
                    material_id=req.material_id,
                    material_name=req.name,
                    text=req.extracted_text,
                    model=model,
                    api_key=api_key_str,
                )
                await TreeIndexerService.persist_tree(tree)
                tree_indexed = True
                tree_total_nodes = tree.total_nodes
            except Exception as exc:
                eval_logger.warning("Tree index generation failed: %s", exc)

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

        # Provide representative context (first 8,000 characters for analysis)
        analyzed_excerpt = req.extracted_text[:8000]
        user_content = f"""MATERIAL NAME: {req.name}
CATEGORY: {req.category}

MATERIAL EXTRACTED TEXT:
\"\"\"
{analyzed_excerpt}
\"\"\"
"""

        llm = get_openrouter_llm(model, api_key_str)
        mat_messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content),
        ]
        response = await measure_async(
            eval_logger,
            f"analyze_material_llm:{req.material_id}",
            lambda: llm.ainvoke(mat_messages),
        )

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
                            prerequisite_concept=_safe_str(
                                p_dict.get("prerequisite_concept"), "Prerequisite"
                            ),
                            gap_detected=bool(p_dict.get("gap_detected", False)),
                            remedial_action=_safe_str(p_dict.get("remedial_action"))
                            or None,
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
                            question=_safe_str(
                                q_dict.get("question"), "Sample Question"
                            ),
                            options=opts,
                            answer=_safe_str(q_dict.get("answer")) or None,
                            explanation=_safe_str(q_dict.get("explanation")) or None,
                            difficulty=_safe_str(
                                q_dict.get("difficulty"), "Intermediate"
                            ),
                        )
                    )

        summary_text = _safe_str(
            parsed.get("summary"), "Material analysis completed successfully."
        )
        difficulty_text = _safe_str(parsed.get("difficulty_level"), "Intermediate")

        # 1. Upsert concepts into ai.ontology_concepts & ai.material_concept_mappings
        try:
            concept_mappings: list[MaterialConceptMapping] = []
            for item in syllabus_items:
                c_model = OntologyConcept(
                    subject="Curriculum Topic",
                    code=item.standard_code,
                    name=item.topic,
                    description=item.description
                    or f"Topic from material '{req.name}'",
                    bloom_level="Understand",
                    okf_type="concept",
                    status="stable",
                    tags=[req.category],
                )
                cid = await OntologyService.upsert_concept(c_model)
                concept_mappings.append(
                    MaterialConceptMapping(
                        material_id=req.material_id,
                        concept_id=cid,
                        tree_node_id=None,
                        page_number=1,
                        relationship="teaches",
                        relevance_score=item.confidence,
                        confidence=item.confidence,
                        evidence_excerpt=item.description,
                    )
                )

            if concept_mappings:
                await OntologyService.link_material_to_concepts(concept_mappings)
        except Exception as exc:
            eval_logger.warning("Failed to link material concepts: %s", exc)

        # 2. Persist material insights into ai.material_insights
        insight_sql = """
        INSERT INTO ai.material_insights (
            material_id, syllabus_alignment, prerequisite_gaps, sample_questions,
            summary, difficulty_level, status, model_used, created_at, updated_at
        ) VALUES (
            %s, %s::jsonb, %s::jsonb, %s::jsonb,
            %s, %s, 'completed', %s, NOW(), NOW()
        )
        ON CONFLICT (material_id) DO UPDATE SET
            syllabus_alignment = EXCLUDED.syllabus_alignment,
            prerequisite_gaps = EXCLUDED.prerequisite_gaps,
            sample_questions = EXCLUDED.sample_questions,
            summary = EXCLUDED.summary,
            difficulty_level = EXCLUDED.difficulty_level,
            status = 'completed',
            model_used = EXCLUDED.model_used,
            updated_at = NOW();
        """
        try:
            _ = await execute(
                insight_sql,
                (
                    req.material_id,
                    json.dumps([s.model_dump() for s in syllabus_items]),
                    json.dumps([p.model_dump() for p in prereq_items]),
                    json.dumps([q.model_dump() for q in sample_q_items]),
                    summary_text,
                    difficulty_text,
                    model,
                ),
            )
        except Exception as exc:
            eval_logger.warning("Failed to persist material insights: %s", exc)

        eval_logger.info(
            "Material analysis complete: material_id=%s, syllabus_items=%d, prereq_gaps=%d, sample_questions=%d, tree_indexed=%s",
            req.material_id,
            len(syllabus_items),
            len(prereq_items),
            len(sample_q_items),
            tree_indexed,
        )

        return MaterialAnalyzeResponse(
            material_id=req.material_id,
            summary=summary_text,
            difficulty_level=difficulty_text,
            syllabus_alignment=syllabus_items,
            prerequisite_gaps=prereq_items,
            sample_questions=sample_q_items,
            status="completed",
            model_used=model,
            tree_indexed=tree_indexed,
            tree_total_nodes=tree_total_nodes,
        )
