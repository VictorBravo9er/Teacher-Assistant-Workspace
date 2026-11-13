from __future__ import annotations

import json
import os
from typing import Any
import uuid

from src.lib.db import execute, fetch_all, fetch_one
from src.lib.llm import get_openrouter_llm, parse_llm_response
from src.lib.logger import eval_logger, measure_async
from src.types.ai import (
    ConsolidationRequest,
    ConsolidationResponse,
    OntologyMisconception,
)


class ConsolidationService:
    """Daily anti-drift verification, graph linkage auditing, and autonomous Misconception Dreaming engine."""

    @classmethod
    async def audit_graph_integrity(
        cls, run_id: str | None = None
    ) -> tuple[int, int, dict[str, Any]]:
        """Audit ontology graph for orphaned nodes and cyclic dependencies."""
        eval_logger.info("Auditing ontology graph integrity (run_id=%s)", run_id)

        # 1. Find orphaned concept nodes (0 incoming and 0 outgoing edges)
        orphan_sql = """
        SELECT c.id, c.name, c.subject
        FROM ai.ontology_concepts c
        LEFT JOIN ai.ontology_relationships r_out ON c.id = r_out.source_concept_id
        LEFT JOIN ai.ontology_relationships r_in ON c.id = r_in.target_concept_id
        WHERE r_out.id IS NULL AND r_in.id IS NULL
        LIMIT 50;
        """
        orphans = await fetch_all(orphan_sql)
        orphaned_count = len(orphans)

        # 2. Detect cyclic prerequisite pairs (A -> B and B -> A)
        cycle_sql = """
        SELECT r1.id AS r1_id, r2.id AS r2_id, r1.source_concept_id, r1.target_concept_id
        FROM ai.ontology_relationships r1
        JOIN ai.ontology_relationships r2
          ON r1.source_concept_id = r2.target_concept_id
         AND r1.target_concept_id = r2.source_concept_id
        WHERE r1.relationship_type = 'prerequisite_of'
          AND r2.relationship_type = 'prerequisite_of'
          AND r1.id < r2.id;
        """
        cycles = await fetch_all(cycle_sql)
        cycles_resolved = 0

        # Auto-resolve simple 2-node cycles by removing duplicate inverse edge
        for cyc in cycles:
            del_sql = "DELETE FROM ai.ontology_relationships WHERE id = %s"
            _ = await execute(del_sql, (cyc["r2_id"],))
            cycles_resolved += 1

        lint_report: dict[str, Any] = {
            "orphaned_concepts": [
                {"id": str(o["id"]), "name": o["name"], "subject": o["subject"]}
                for o in orphans
            ],
            "cycles_detected": len(cycles),
            "cycles_resolved": cycles_resolved,
            "status": "clean" if (orphaned_count == 0 and len(cycles) == 0) else "audited",
        }

        # If run_id is supplied, log individual reports into ai.knowledge_lint_reports
        if run_id:
            for o in orphans[:10]:
                report_sql = """
                INSERT INTO ai.knowledge_lint_reports (
                    run_id, issue_type, severity, target_concept_id, details, resolved
                ) VALUES (
                    %s, 'orphan_concept', 'warning', %s, %s::jsonb, false
                );
                """
                detail_json = json.dumps({"name": o["name"], "subject": o["subject"]})
                _ = await execute(report_sql, (run_id, str(o["id"]), detail_json))

            for cyc in cycles[:10]:
                report_sql = """
                INSERT INTO ai.knowledge_lint_reports (
                    run_id, issue_type, severity, target_concept_id, details, resolved
                ) VALUES (
                    %s, 'prerequisite_cycle', 'warning', %s, %s::jsonb, true
                );
                """
                detail_json = json.dumps({"source": str(cyc["source_concept_id"]), "target": str(cyc["target_concept_id"])})
                _ = await execute(report_sql, (run_id, str(cyc["source_concept_id"]), detail_json))

        return orphaned_count, cycles_resolved, lint_report

    @classmethod
    async def dream_misconceptions(
        cls, class_id: str | None, model: str
    ) -> list[OntologyMisconception]:
        """Synthesize cross-submission error patterns into proposed misconceptions."""
        eval_logger.info("Executing autonomous Misconception Dreaming cycle")
        api_key_str = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key_str:
            eval_logger.warning("OPENROUTER_API_KEY missing, skipping Misconception Dreaming")
            return []

        # Query recent submission evaluations
        if class_id:
            evals_sql = """
            SELECT e.id, e.submission_id, e.suggested_score, e.suggested_feedback, e.suggested_rubric_breakdown, e.suggested_teacher_notes, s.class_id
            FROM ai.submission_evaluations e
            JOIN public.student_submissions s ON s.id = e.submission_id
            WHERE s.class_id = %s
            ORDER BY e.created_at DESC
            LIMIT 20;
            """
            eval_rows = await fetch_all(evals_sql, (class_id,))
        else:
            evals_sql = """
            SELECT e.id, e.submission_id, e.suggested_score, e.suggested_feedback, e.suggested_rubric_breakdown, e.suggested_teacher_notes, s.class_id
            FROM ai.submission_evaluations e
            JOIN public.student_submissions s ON s.id = e.submission_id
            ORDER BY e.created_at DESC
            LIMIT 30;
            """
            eval_rows = await fetch_all(evals_sql)

        if len(eval_rows) < 2:
            eval_logger.info("Insufficient submission evaluations for dreaming cycle (need >= 2)")
            return []

        evidence_summaries: list[str] = []
        submission_ids: list[str] = []
        for r in eval_rows:
            submission_ids.append(str(r["submission_id"]))
            feedback = r.get("suggested_feedback") or ""
            notes = r.get("suggested_teacher_notes") or ""
            evidence_summaries.append(f"- Sub ID {r['submission_id']}: Feedback='{feedback[:100]}', Notes='{notes[:100]}'")

        dreaming_prompt = f"""You are the Didactiq Pedagogical Dreaming Agent.
Analyze these student submission evaluation excerpts to synthesize 1 or 2 high-leverage conceptual misconceptions that multiple students are experiencing:

EVALUATION EXCERPTS:
{chr(10).join(evidence_summaries[:15])}

Return strictly JSON matching this structure:
{{
  "proposed_misconceptions": [
    {{
      "name": "Concise Descriptive Name of Misconception",
      "error_pattern": "Specific systematic error pattern or confusion observed in work",
      "remediation_strategy": "Actionable, targeted pedagogical remediation strategy",
      "severity": "Low" | "Moderate" | "High",
      "confidence": 0.85
    }}
  ]
}}
"""
        try:
            llm = get_openrouter_llm(model, api_key_str)
            response = await measure_async(
                eval_logger,
                "dream_misconceptions_llm",
                lambda: llm.ainvoke(dreaming_prompt),
            )
            parsed = parse_llm_response(str(response.content))
            proposals = parsed.get("proposed_misconceptions")
            if not isinstance(proposals, list):
                return []
        except Exception as exc:
            eval_logger.error("Misconception dreaming LLM invocation failed: %s", exc)
            return []

        # Find a fallback anchor concept in ontology_concepts
        anchor_row = await fetch_one("SELECT id FROM ai.ontology_concepts LIMIT 1")
        concept_id = str(anchor_row["id"]) if anchor_row else None
        if not concept_id:
            return []

        created_misconceptions: list[OntologyMisconception] = []
        from src.service.ontology import OntologyService

        for p in proposals:
            if isinstance(p, dict):
                misc = OntologyMisconception(
                    class_id=class_id,
                    concept_id=concept_id,
                    name=str(p.get("name", "Emerging Misconception")),
                    error_pattern=str(p.get("error_pattern", "Systematic conceptual misapplication")),
                    remediation_strategy=str(p.get("remediation_strategy", "Targeted guided practice")),
                    severity=str(p.get("severity", "Moderate")),
                    status="proposed",
                    confidence=float(p.get("confidence", 0.8)),
                    evidence_submission_ids=submission_ids[:5],
                    surfaced_in_gradebook=True,
                )
                _ = await OntologyService.propose_misconception(misc)
                created_misconceptions.append(misc)

        return created_misconceptions

    @classmethod
    async def run_daily_consolidation(
        cls, req: ConsolidationRequest, model: str
    ) -> ConsolidationResponse:
        """Execute complete daily consolidation run: integrity audit + dreaming."""
        eval_logger.info(
            "Starting consolidation run: class_id=%s, run_type=%s",
            req.class_id,
            req.run_type,
        )

        run_id = str(uuid.uuid4())

        tier = "f3_nightly" if req.run_type in ("daily", "f3_nightly") else "f2_batch"

        # 1. Initialize consolidation run record in ai.consolidation_runs
        init_sql = """
        INSERT INTO ai.consolidation_runs (
            id, started_at, status, frequency_tier, drift_detected
        ) VALUES (
            %s, NOW(), 'running', %s, false
        );
        """
        _ = await execute(init_sql, (run_id, tier))

        # 2. Audit graph integrity and link reports to run_id
        orphans, cycles_resolved, lint_report = await cls.audit_graph_integrity(run_id)

        # 3. Dream misconceptions
        dreamed_misconceptions = await cls.dream_misconceptions(req.class_id, model)

        drift_detected = orphans > 0 or cycles_resolved > 0
        summary = (
            f"Consolidation complete: {orphans} orphaned nodes checked, {cycles_resolved} cycles resolved, "
            f"{len(dreamed_misconceptions)} misconceptions synthesized."
        )

        metrics = {
            "summary": summary,
            "lint_report": lint_report,
            "class_id": req.class_id,
        }

        # 4. Update consolidation run record
        update_sql = """
        UPDATE ai.consolidation_runs
        SET completed_at = NOW(),
            status = 'completed',
            drift_detected = %s,
            broken_linkages_repaired = %s,
            concepts_audited = %s,
            hypotheses_generated = %s,
            lint_issues_detected = %s,
            metrics = %s::jsonb
        WHERE id = %s;
        """
        _ = await execute(
            update_sql,
            (
                drift_detected,
                cycles_resolved,
                orphans,
                len(dreamed_misconceptions),
                orphans + cycles_resolved,
                json.dumps(metrics),
                run_id,
            ),
        )

        return ConsolidationResponse(
            run_id=run_id,
            status="completed",
            drift_detected=drift_detected,
            orphaned_nodes_found=orphans,
            cycles_resolved=cycles_resolved,
            misconceptions_synthesized=len(dreamed_misconceptions),
            summary=summary,
            lint_report=lint_report,
        )
