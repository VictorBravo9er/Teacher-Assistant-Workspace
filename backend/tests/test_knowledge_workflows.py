"""Interactive (# %%) & pytest suite for Knowledge Store & AI service workflows.

Covers TreeIndexerService, OntologyService, EvaluatorService, ConsolidationService,
and ChatService in both Offline (stateful in-memory DB + Fake LLM) and Live E2E modes.

Run interactively cell-by-cell in VS Code/Jupyter, directly via:
    uv run python tests/test_knowledge_workflows.py
or via pytest:
    uv run pytest tests/test_knowledge_workflows.py
    uv run pytest tests/test_knowledge_workflows.py --live
"""

# %% [1] Imports & Environment Configuration
from __future__ import annotations

import asyncio
import os
from pathlib import Path
import sys
import uuid

_BASE_DIR = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
_BACKEND_DIR = next(
    (p for p in (_BASE_DIR, *_BASE_DIR.parents, _BASE_DIR / "backend") if (p / "src" / "main.py").exists()),
    _BASE_DIR.parent,
)
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import pytest

from tests._harness import (
    FakeOpenRouterLLM,
    MockDBState,
    get_test_config,
    is_postgres_reachable,
    live_db_sandbox,
    offline_runtime,
    print_environment_banner,
    run_interactive_cell,
    run_interactive_suite,
    sample_chat_payload,
    sample_grade_request,
    sample_long_curriculum_markdown,
    sample_material_analyze_request,
)
from src.service.chat import ChatService, _extract_query_terms
from src.service.consolidation import ConsolidationService
from src.service.evaluator import EvaluatorService
from src.service.ontology import OntologyService
from src.service.tree_indexer import TreeIndexerService
from src.types.ai import (
    ConsolidationRequest,
    GradeRequest,
    MaterialAnalyzeRequest,
    MaterialConceptMapping,
    OntologyConcept,
    OntologyRelationship,
    StudentConceptMastery,
)
from src.types.schemas import ChatPayload

CONFIG = print_environment_banner("Knowledge Store Workflows Suite")


# %% [2] TreeIndexerService: Section Parsing, LLM Tree Build, Heuristic Fallback & Traversal
async def test_tree_indexer_workflow() -> None:
    """Verify PageIndex hierarchical tree construction, fallback, persistence, and traversal."""
    # Pure parsing helpers
    assert TreeIndexerService._estimate_pages(5000) == 2
    assert TreeIndexerService._estimate_pages(100) == 1

    plain_long_text = "Chemical kinetics studies reaction velocity. " * 140  # > 4000 chars, no headings
    fallback_sections = TreeIndexerService._extract_markdown_sections(plain_long_text)
    assert len(fallback_sections) >= 2
    assert fallback_sections[0]["title"] == "Part 1"

    md_text = sample_long_curriculum_markdown(min_chars=16000)
    md_sections = TreeIndexerService._extract_markdown_sections(md_text)
    assert len(md_sections) >= 3

    mat_id = str(uuid.uuid4())
    async with offline_runtime() as rt:
        tree = await TreeIndexerService.build_tree_from_text(
            material_id=mat_id,
            material_name="AP Chemistry Kinetics",
            text=md_text,
            model="google/gemini-2.5-flash",
            api_key="test-key",
        )
        assert tree.total_nodes == len(md_sections) + 1
        assert tree.max_depth == 2
        assert tree.page_count >= 6
        assert len(rt.llm.recorded_prompts) == 1

        await TreeIndexerService.persist_tree(tree)
        loaded = await TreeIndexerService.get_tree(mat_id)
        assert loaded is not None
        assert loaded.material_id == mat_id
        assert loaded.total_nodes == tree.total_nodes

        traversal = await TreeIndexerService.traverse_tree(mat_id, ["rate", "laws"])
        assert len(traversal.selected_excerpts) >= 1
        assert traversal.token_estimate > 0
        assert any("Rate Laws" in ex for ex in traversal.selected_excerpts)

        # No-match terms should fall back to first child node
        fallback_trav = await TreeIndexerService.traverse_tree(mat_id, ["unmatchedtermxyz"])
        assert len(fallback_trav.selected_excerpts) == 1

    # Heuristic fallback when LLM fails
    failing_llm = FakeOpenRouterLLM(raise_error=RuntimeError("Simulated OpenRouter outage"))
    async with offline_runtime(fake_llm=failing_llm):
        heuristic_tree = await TreeIndexerService.build_tree_from_text(
            material_id=str(uuid.uuid4()),
            material_name="Fallback Material",
            text=md_text[:4500],
            model="google/gemini-2.5-flash",
            api_key="test-key",
        )
        assert heuristic_tree.total_nodes >= 2
        assert heuristic_tree.status == "completed"


run_interactive_cell(test_tree_indexer_workflow)


# %% [3] OntologyService: OKF v0.2, Recursive CTEs, Mastery & Soft-Warning Gate
async def test_ontology_service_and_answerable_gate() -> None:
    """Verify OKF concept envelopes, multi-hop prerequisite CTE, mastery thresholds, and check_answerable."""
    assert OntologyService.determine_mastery_status(0.90) == "mastered"
    assert OntologyService.determine_mastery_status(0.75) == "practicing"
    assert OntologyService.determine_mastery_status(0.45) == "gap_detected"

    class_id = str(uuid.uuid4())
    student_id = str(uuid.uuid4())
    mat_id = str(uuid.uuid4())

    db = MockDBState(
        classes={
            class_id: {
                "id": class_id,
                "name": "AP Chemistry 101",
                "subject": "AP Chemistry",
            }
        }
    )

    async with offline_runtime(db_state=db):
        # Empty ontology -> low coverage triggers soft warning
        low_gate = await OntologyService.check_answerable(class_id, ["kinetics", "rate", "catalysis"])
        assert low_gate.is_answerable is True
        assert low_gate.status_flag == "INCOMPLETE_WARNING"
        assert low_gate.requires_confirmation is True
        assert low_gate.coverage_score < 0.4

        # Build 3-hop prerequisite chain: Stoichiometry -> Rate Laws -> Reaction Mechanisms
        c_stoich = await OntologyService.upsert_concept(
            OntologyConcept(
                subject="AP Chemistry",
                code="CHEM-1.1",
                name="Stoichiometry",
                description="Molar mass and mole-to-mole conversions",
                bloom_level="Apply",
            )
        )
        c_rates = await OntologyService.upsert_concept(
            OntologyConcept(
                subject="AP Chemistry",
                code="CHEM-5.1",
                name="Rate Laws",
                description="Differential rate expressions and reaction order",
                bloom_level="Analyze",
            )
        )
        c_mech = await OntologyService.upsert_concept(
            OntologyConcept(
                subject="AP Chemistry",
                code="CHEM-5.3",
                name="Reaction Mechanisms",
                description="Elementary steps and catalysis pathways",
                bloom_level="Evaluate",
            )
        )

        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(
                source_concept_id=c_stoich,
                target_concept_id=c_rates,
                relationship_type="prerequisite_of",
            )
        )
        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(
                source_concept_id=c_rates,
                target_concept_id=c_mech,
                relationship_type="prerequisite_of",
            )
        )

        # Recursive CTE from Reaction Mechanisms traverses depth 1 (Rate Laws) & depth 2 (Stoichiometry)
        cte_rows = await OntologyService.get_prerequisite_graph_cte([c_mech], max_depth=3)
        names = [r["concept_name"] for r in cte_rows]
        assert "Rate Laws" in names
        assert "Stoichiometry" in names
        assert cte_rows[0]["depth"] <= cte_rows[-1]["depth"]

        # Link material & record student mastery
        await OntologyService.link_material_to_concepts(
            [
                MaterialConceptMapping(
                    material_id=mat_id,
                    concept_id=c_rates,
                    page_number=2,
                    relationship="teaches",
                    relevance_score=0.95,
                    confidence=0.95,
                )
            ]
        )
        await OntologyService.update_student_mastery(
            StudentConceptMastery(
                class_id=class_id,
                student_id=student_id,
                concept_id=c_rates,
                mastery_score=0.86,
                confidence=0.85,
                status=OntologyService.determine_mastery_status(0.86),
            )
        )
        assert (class_id, student_id, c_rates) in db.student_concept_mastery

        # Now query terms match Rate Laws & Stoichiometry -> VERIFIED
        ok_gate = await OntologyService.check_answerable(class_id, ["rate", "stoichiometry"])
        assert ok_gate.status_flag == "VERIFIED"
        assert ok_gate.requires_confirmation is False
        assert ok_gate.coverage_score >= 0.4


run_interactive_cell(test_ontology_service_and_answerable_gate)


# %% [4] EvaluatorService: Material Ingestion & Autonomous Submission Grading
async def test_evaluator_material_and_grading_pipeline() -> None:
    """Verify analyze_material (short + long tree-indexed) and grade_submission persistence."""
    class_id = str(uuid.uuid4())
    student_id = str(uuid.uuid4())
    short_mat_id = str(uuid.uuid4())
    long_mat_id = str(uuid.uuid4())
    sub_id = str(uuid.uuid4())

    db = MockDBState(
        classes={class_id: {"id": class_id, "name": "AP Chemistry 101", "subject": "AP Chemistry"}},
        student_submissions={sub_id: {"id": sub_id, "class_id": class_id, "student_id": student_id}},
    )

    async with offline_runtime(db_state=db):
        # 1. Short material -> skips tree indexing, generates insights + ontology mappings
        short_req = MaterialAnalyzeRequest(
            **sample_material_analyze_request(material_id=short_mat_id, class_id=class_id, long_document=False)
        )
        short_res = await EvaluatorService.analyze_material(short_req, "google/gemini-2.5-flash")
        assert short_res.status == "completed"
        assert short_res.tree_indexed is False
        assert len(short_res.syllabus_alignment) >= 1
        assert len(short_res.sample_questions) >= 1
        assert short_mat_id in db.material_insights

        # 2. Long material (>= 15k chars / >= 20 pages) -> builds & persists PageIndex tree
        long_req = MaterialAnalyzeRequest(
            **sample_material_analyze_request(material_id=long_mat_id, class_id=class_id, long_document=True)
        )
        long_res = await EvaluatorService.analyze_material(long_req, "google/gemini-2.5-flash")
        assert long_res.tree_indexed is True
        assert long_res.tree_total_nodes >= 4
        assert long_mat_id in db.material_trees
        assert len(db.material_concept_mappings) >= 2

        # 3. Grade student submission tied to long_mat_id -> updates mastery & proposes misconception
        grade_req = GradeRequest(
            **sample_grade_request(
                submission_id=sub_id,
                class_id=class_id,
                student_id=student_id,
                material_id=long_mat_id,
            )
        )
        grade_res = await EvaluatorService.grade_submission(grade_req, "google/gemini-2.5-flash")
        assert grade_res.status == "completed"
        assert grade_res.score == 86.0
        assert grade_res.grade == "B (86%)"
        assert len(grade_res.rubric_breakdown) == 2
        assert len(grade_res.detected_misconceptions) >= 1
        assert sub_id in db.submission_evaluations
        assert len(db.student_concept_mastery) >= 1
        assert len(db.ontology_misconceptions) >= 1


run_interactive_cell(test_evaluator_material_and_grading_pipeline)


# %% [5] ConsolidationService: Anti-Drift Audit, Dreaming & Misconception Review
async def test_consolidation_and_misconception_review() -> None:
    """Verify orphan detection, 2-node cycle repair, Misconception Dreaming, and teacher review."""
    class_id = str(uuid.uuid4())
    sub_1 = str(uuid.uuid4())
    sub_2 = str(uuid.uuid4())

    db = MockDBState(
        classes={class_id: {"id": class_id, "name": "AP Chemistry 101", "subject": "AP Chemistry"}},
        student_submissions={
            sub_1: {"id": sub_1, "class_id": class_id},
            sub_2: {"id": sub_2, "class_id": class_id},
        },
    )

    async with offline_runtime(db_state=db):
        # Create 3 concepts: A <-> B (cyclic prerequisite_of) and C (orphaned)
        c_a = await OntologyService.upsert_concept(
            OntologyConcept(subject="AP Chemistry", name="Equilibrium", description="Dynamic balance")
        )
        c_b = await OntologyService.upsert_concept(
            OntologyConcept(subject="AP Chemistry", name="Catalysis", description="Activation barrier")
        )
        _c_orphan = await OntologyService.upsert_concept(
            OntologyConcept(subject="AP Chemistry", name="Orphan Topic", description="Unlinked concept")
        )

        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(
                source_concept_id=c_a, target_concept_id=c_b, relationship_type="prerequisite_of"
            )
        )
        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(
                source_concept_id=c_b, target_concept_id=c_a, relationship_type="prerequisite_of"
            )
        )

        # Seed >= 2 evaluations so dream_misconceptions runs
        for sid in (sub_1, sub_2):
            _ = await EvaluatorService.grade_submission(
                GradeRequest(**sample_grade_request(submission_id=sid, class_id=class_id)),
                "google/gemini-2.5-flash",
            )

        cons_res = await ConsolidationService.run_daily_consolidation(
            ConsolidationRequest(class_id=class_id, run_type="daily"),
            "google/gemini-2.5-flash",
        )
        assert cons_res.status == "completed"
        assert cons_res.orphaned_nodes_found == 1
        assert cons_res.cycles_resolved == 1
        assert cons_res.drift_detected is True
        assert cons_res.misconceptions_synthesized >= 1
        assert len(db.ontology_relationships) == 1  # Inverse cycle edge removed
        assert len(db.knowledge_lint_reports) >= 2

        # Fetch proposed misconceptions and confirm the first one
        proposed = await OntologyService.get_proposed_misconceptions(class_id=class_id)
        assert len(proposed) >= 1
        target_id = proposed[0].id
        assert target_id is not None

        reviewer_id = str(uuid.uuid4())
        await OntologyService.review_misconception(target_id, "confirmed", reviewer_id)
        remaining = await OntologyService.get_proposed_misconceptions(class_id=class_id)
        assert all(m.id != target_id for m in remaining)


run_interactive_cell(test_consolidation_and_misconception_review)


# %% [6] ChatService: Soft-Warning Gate, Dual-Engine RAG Fusion & Visualization
async def test_chat_service_dual_engine_rag() -> None:
    """Verify ChatService soft-warning gate, confirmed caveat injection, and dual-engine context."""
    terms = _extract_query_terms("Show me how Rate Laws and Catalysis impact the class")
    assert "rate" in terms and "laws" in terms and "catalysis" in terms

    class_id = str(uuid.uuid4())
    mat_id = str(uuid.uuid4())
    student_id = str(uuid.uuid4())

    db = MockDBState(
        classes={class_id: {"id": class_id, "name": "AP Chemistry 101", "subject": "AP Chemistry"}},
        materials={mat_id: {"id": mat_id, "name": "Kinetics Textbook", "content": "placeholder"}},
        class_materials=[{"class_id": class_id, "material_id": mat_id}],
    )

    async with offline_runtime(db_state=db) as rt:
        # 1. Before concepts exist -> check_answerable returns soft warning without calling LLM
        unconfirmed = ChatPayload(**sample_chat_payload(class_id=None, confirmed_soft_warning=False))
        warn_res = await ChatService.process_chat_message(unconfirmed, "google/gemini-2.5-flash")
        assert warn_res["is_soft_warning"] is True
        assert warn_res["requires_confirmation"] is True
        assert warn_res["visualization"] is None
        assert len(rt.llm.recorded_prompts) == 0

        # 2. Confirm soft warning -> proceeds and prepends caveat note
        confirmed = ChatPayload(**sample_chat_payload(class_id=class_id, confirmed_soft_warning=True))
        caveat_res = await ChatService.process_chat_message(confirmed, "google/gemini-2.5-flash")
        assert str(caveat_res["text"]).startswith("> [!NOTE]")
        assert isinstance(caveat_res["visualization"], dict)
        assert len(rt.llm.recorded_prompts) == 1

        # 3. Populate Tree + Prerequisite Ontology + Mastery -> Dual-Engine context fused into prompt
        tree = await TreeIndexerService.build_tree_from_text(
            material_id=mat_id,
            material_name="Kinetics Textbook",
            text=sample_long_curriculum_markdown(min_chars=16000),
            model="google/gemini-2.5-flash",
            api_key="test-key",
        )
        await TreeIndexerService.persist_tree(tree)

        c_prereq = await OntologyService.upsert_concept(
            OntologyConcept(
                subject="AP Chemistry",
                name="Stoichiometry",
                description="Mole conversions required before kinetics",
            )
        )
        c_kinetics = await OntologyService.upsert_concept(
            OntologyConcept(
                subject="AP Chemistry",
                name="Chemical Kinetics",
                description="Reaction rates and rate laws",
            )
        )
        c_laws = await OntologyService.upsert_concept(
            OntologyConcept(
                subject="AP Chemistry",
                name="Rate Laws",
                description="Experimental order determination",
            )
        )
        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(
                source_concept_id=c_prereq, target_concept_id=c_laws, relationship_type="prerequisite_of"
            )
        )
        await OntologyService.update_student_mastery(
            StudentConceptMastery(
                class_id=class_id,
                student_id=student_id,
                concept_id=c_kinetics,
                mastery_score=0.72,
                confidence=0.85,
                status="practicing",
            )
        )

        rt.llm.recorded_prompts.clear()
        grounded_payload = ChatPayload(
            **sample_chat_payload(
                prompt="Chemical Kinetics and Rate Laws",
                class_id=class_id,
                confirmed_soft_warning=False,
            )
        )
        grounded_res = await ChatService.process_chat_message(
            grounded_payload, "google/gemini-2.5-flash"
        )
        assert grounded_res.get("is_soft_warning") is None
        assert "Chemical Kinetics Mastery Brief" in str(grounded_res["text"])

        sent_prompt = rt.llm.recorded_prompts[-1]
        assert "DOCUMENT TREE: Kinetics Textbook" in sent_prompt
        assert "PREREQUISITE ONTOLOGY CHAINS" in sent_prompt
        assert "Stoichiometry" in sent_prompt
        assert "CURRICULUM MASTERY SNAPSHOT" in sent_prompt


run_interactive_cell(test_chat_service_dual_engine_rag)


# %% [7] Live E2E Knowledge Pipeline (PostgreSQL ai.* + OpenRouter)
@pytest.mark.live
async def test_live_knowledge_pipeline_e2e() -> None:
    """Exercise material analysis, tree traversal, grading, consolidation, and chat on live DB + OpenRouter."""
    cfg = get_test_config()
    if cfg.mode == "offline":
        pytest.skip("Skipped in offline mode (run with --live or DIDACTIQ_TEST_MODE=live).")
    if not cfg.has_openrouter_key:
        pytest.skip("OPENROUTER_API_KEY is required for live knowledge workflow tests.")
    if not cfg.has_postgres_uri or not await is_postgres_reachable():
        pytest.skip("PostgreSQL at POSTGRES_URI is not configured or reachable.")

    model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
    async with live_db_sandbox() as sb:
        # 1. Analyze long material -> builds tree + concepts + insights in live ai.* tables
        mat_res = await EvaluatorService.analyze_material(
            MaterialAnalyzeRequest(
                **sample_material_analyze_request(
                    material_id=sb.material_id,
                    class_id=sb.class_id,
                    long_document=True,
                )
            ),
            model,
        )
        assert mat_res.status == "completed"
        assert mat_res.tree_indexed is True

        # 2. Traverse persisted live tree
        trav = await TreeIndexerService.traverse_tree(sb.material_id, ["rate", "laws"])
        assert len(trav.selected_excerpts) >= 1

        # 3. Grade submission(s) if student fixture exists, then run consolidation
        for sub_id in sb.submission_ids:
            g_res = await EvaluatorService.grade_submission(
                GradeRequest(
                    **sample_grade_request(
                        submission_id=sub_id,
                        class_id=sb.class_id,
                        student_id=sb.student_id,
                        material_id=sb.material_id,
                    )
                ),
                model,
            )
            assert g_res.status == "completed"

        cons_res = await ConsolidationService.run_daily_consolidation(
            ConsolidationRequest(class_id=sb.class_id, run_type="daily"),
            model,
        )
        sb.created_run_ids.append(cons_res.run_id)
        assert cons_res.status == "completed"

        # 4. Run live ChatService with confirmed_soft_warning=True
        chat_res = await ChatService.process_chat_message(
            ChatPayload(
                **sample_chat_payload(
                    class_id=sb.class_id,
                    confirmed_soft_warning=True,
                )
            ),
            model,
        )
        assert isinstance(chat_res.get("text"), str)


run_interactive_cell(test_live_knowledge_pipeline_e2e)


# %% [8] Direct CLI Entrypoint
if __name__ == "__main__":
    asyncio.run(
        run_interactive_suite(
            "Knowledge Store Workflows",
            [
                ("tree_indexer_workflow", test_tree_indexer_workflow),
                ("ontology_service_and_answerable_gate", test_ontology_service_and_answerable_gate),
                ("evaluator_material_and_grading_pipeline", test_evaluator_material_and_grading_pipeline),
                ("consolidation_and_misconception_review", test_consolidation_and_misconception_review),
                ("chat_service_dual_engine_rag", test_chat_service_dual_engine_rag),
                ("live_knowledge_pipeline_e2e", test_live_knowledge_pipeline_e2e),
            ],
        )
    )
