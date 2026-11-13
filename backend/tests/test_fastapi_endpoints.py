"""Interactive (# %%) & pytest suite for all Didactiq FastAPI endpoints and middleware.

Covers:
  - GET  /api/health (and x-request-id middleware header)
  - POST /api/materials/analyze (short/long docs + 422 validation)
  - POST /api/materials/tree (build, cached=True hit, force_rebuild, 404 missing)
  - POST /api/grade (rubric breakdown, score, detected misconceptions)
  - POST /api/consolidation/run
  - GET  /api/misconceptions/proposed (all + ?class_id filter)
  - POST /api/misconceptions/{misconception_id}/review (confirm/dismiss + 422)
  - POST /api/chat (soft-warning gate, confirmed caveat, dual-engine RAG, 500 on missing key)

Run interactively cell-by-cell in VS Code/Jupyter, directly via:
    uv run python tests/test_fastapi_endpoints.py
or via pytest:
    uv run pytest tests/test_fastapi_endpoints.py
    uv run pytest tests/test_fastapi_endpoints.py --live
    TEST_BASE_URL=http://localhost:8090 uv run pytest tests/test_fastapi_endpoints.py --live
"""

# %% [1] Imports & Environment Configuration
from __future__ import annotations

import asyncio
import os
from pathlib import Path
import sys
from unittest.mock import patch
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
    MockDBState,
    api_client,
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

CONFIG = print_environment_banner("FastAPI Endpoints Suite")


# %% [2] GET /api/health & Request-ID Middleware
async def test_health_and_request_id_header() -> None:
    """Verify GET /api/health liveness response and x-request-id correlation header."""
    async with offline_runtime():
        async with api_client() as client:
            resp = await client.get("/api/health", headers={"x-request-id": "req-test-health-01"})
            assert resp.status_code == 200
            assert resp.json() == {"status": "ok"}
            assert resp.headers.get("x-request-id") == "req-test-health-01"

            auto_resp = await client.get("/api/health")
            assert auto_resp.status_code == 200
            assert str(auto_resp.headers.get("x-request-id", "")).startswith("req-")


run_interactive_cell(test_health_and_request_id_header)


# %% [3] POST /api/materials/analyze (+ 422 Schema Validation)
async def test_materials_analyze_endpoint() -> None:
    """Verify POST /api/materials/analyze syllabus insights, tree indexing trigger, and 422 check."""
    class_id = str(uuid.uuid4())
    mat_id = str(uuid.uuid4())
    db = MockDBState(
        classes={class_id: {"id": class_id, "name": "AP Chemistry 101", "subject": "AP Chemistry"}}
    )

    async with offline_runtime(db_state=db):
        async with api_client() as client:
            # Long material triggers PageIndex tree construction
            payload = sample_material_analyze_request(
                material_id=mat_id, class_id=class_id, long_document=True
            )
            resp = await client.post("/api/materials/analyze", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["material_id"] == mat_id
            assert data["status"] == "completed"
            assert data["tree_indexed"] is True
            assert data["tree_total_nodes"] >= 4
            assert len(data["syllabus_alignment"]) >= 1
            assert len(data["sample_questions"]) >= 1

            # Missing required fields -> FastAPI 422 validation error
            bad_resp = await client.post("/api/materials/analyze", json={"extracted_text": "no id"})
            assert bad_resp.status_code == 422


run_interactive_cell(test_materials_analyze_endpoint)


# %% [4] POST /api/materials/tree (Build, Cache Hit, Force Rebuild, 404)
async def test_materials_tree_endpoint() -> None:
    """Verify POST /api/materials/tree cache miss, cache hit, force rebuild, and 404 handling."""
    mat_id = str(uuid.uuid4())
    missing_id = str(uuid.uuid4())
    db = MockDBState(
        materials={
            mat_id: {
                "id": mat_id,
                "name": "Kinetics Manual",
                "content": sample_long_curriculum_markdown(min_chars=5000),
            }
        }
    )

    async with offline_runtime(db_state=db):
        async with api_client() as client:
            # 1. Initial call builds & caches tree
            build_resp = await client.post(
                "/api/materials/tree", json={"material_id": mat_id, "force_rebuild": False}
            )
            assert build_resp.status_code == 200
            build_data = build_resp.json()
            assert build_data["cached"] is False
            assert build_data["status"] == "completed"
            assert build_data["tree"]["total_nodes"] >= 2

            # 2. Second call returns cached=True
            cached_resp = await client.post(
                "/api/materials/tree", json={"material_id": mat_id, "force_rebuild": False}
            )
            assert cached_resp.status_code == 200
            assert cached_resp.json()["cached"] is True

            # 3. Force rebuild regenerates tree with cached=False
            rebuild_resp = await client.post(
                "/api/materials/tree", json={"material_id": mat_id, "force_rebuild": True}
            )
            assert rebuild_resp.status_code == 200
            assert rebuild_resp.json()["cached"] is False

            # 4. Unknown material returns 404
            missing_resp = await client.post(
                "/api/materials/tree", json={"material_id": missing_id, "force_rebuild": False}
            )
            assert missing_resp.status_code == 404


run_interactive_cell(test_materials_tree_endpoint)


# %% [5] POST /api/grade (+ Rubric Breakdown & Misconceptions)
async def test_grade_endpoint() -> None:
    """Verify POST /api/grade returns structured rubric scores, grade, feedback, and misconceptions."""
    class_id = str(uuid.uuid4())
    student_id = str(uuid.uuid4())
    mat_id = str(uuid.uuid4())
    sub_id = str(uuid.uuid4())

    db = MockDBState(
        classes={class_id: {"id": class_id, "name": "AP Chemistry 101", "subject": "AP Chemistry"}},
        student_submissions={sub_id: {"id": sub_id, "class_id": class_id, "student_id": student_id}},
    )

    async with offline_runtime(db_state=db):
        async with api_client() as client:
            # Analyze material first so anchor ontology concept exists
            _ = await client.post(
                "/api/materials/analyze",
                json=sample_material_analyze_request(material_id=mat_id, class_id=class_id),
            )

            grade_resp = await client.post(
                "/api/grade",
                json=sample_grade_request(
                    submission_id=sub_id,
                    class_id=class_id,
                    student_id=student_id,
                    material_id=mat_id,
                ),
            )
            assert grade_resp.status_code == 200
            data = grade_resp.json()
            assert data["submission_id"] == sub_id
            assert data["score"] == 86.0
            assert data["grade"] == "B (86%)"
            assert len(data["rubric_breakdown"]) == 2
            assert len(data["detected_misconceptions"]) >= 1
            assert data["status"] == "completed"


run_interactive_cell(test_grade_endpoint)


# %% [6] POST /api/consolidation/run & Misconception Review Endpoints
async def test_consolidation_and_misconception_endpoints() -> None:
    """Verify consolidation run, GET /api/misconceptions/proposed, and POST review endpoints."""
    class_id = str(uuid.uuid4())
    other_class_id = str(uuid.uuid4())
    sub_1 = str(uuid.uuid4())
    sub_2 = str(uuid.uuid4())

    db = MockDBState(
        classes={
            class_id: {"id": class_id, "name": "AP Chemistry 101", "subject": "AP Chemistry"},
            other_class_id: {"id": other_class_id, "name": "Physics 101", "subject": "Physics"},
        },
        student_submissions={
            sub_1: {"id": sub_1, "class_id": class_id},
            sub_2: {"id": sub_2, "class_id": class_id},
        },
    )

    async with offline_runtime(db_state=db):
        async with api_client() as client:
            # Seed anchor concept and 2 graded submissions
            _ = await client.post(
                "/api/materials/analyze",
                json=sample_material_analyze_request(class_id=class_id),
            )
            for sid in (sub_1, sub_2):
                _ = await client.post(
                    "/api/grade",
                    json=sample_grade_request(submission_id=sid, class_id=class_id),
                )

            # 1. Trigger consolidation
            cons_resp = await client.post(
                "/api/consolidation/run",
                json={"class_id": class_id, "run_type": "daily", "force_dreaming": True},
            )
            assert cons_resp.status_code == 200
            cons_data = cons_resp.json()
            assert cons_data["status"] == "completed"
            assert cons_data["misconceptions_synthesized"] >= 1

            # 2. Fetch proposed misconceptions (unfiltered & filtered by class_id)
            all_resp = await client.get("/api/misconceptions/proposed")
            assert all_resp.status_code == 200
            proposed_list = all_resp.json()
            assert len(proposed_list) >= 1

            other_resp = await client.get(
                "/api/misconceptions/proposed", params={"class_id": other_class_id}
            )
            assert other_resp.status_code == 200
            assert other_resp.json() == []

            # 3. Review first misconception -> confirmed; invalid status -> 422
            misc_id = proposed_list[0]["id"]
            bad_rev = await client.post(
                f"/api/misconceptions/{misc_id}/review",
                json={"status": "invalid_status"},
            )
            assert bad_rev.status_code == 422

            rev_resp = await client.post(
                f"/api/misconceptions/{misc_id}/review",
                json={"status": "confirmed", "reviewer_id": str(uuid.uuid4())},
            )
            assert rev_resp.status_code == 200
            assert rev_resp.json()["new_status"] == "confirmed"

            after_resp = await client.get("/api/misconceptions/proposed", params={"class_id": class_id})
            assert all(item["id"] != misc_id for item in after_resp.json())


run_interactive_cell(test_consolidation_and_misconception_endpoints)


# %% [7] POST /api/chat (Soft Warning, Confirmed Caveat, Grounded RAG & 500 Error)
async def test_chat_endpoint_flows() -> None:
    """Verify POST /api/chat soft-warning UX, confirmed caveat, RAG visualization, and 500 error."""
    class_id = str(uuid.uuid4())
    mat_id = str(uuid.uuid4())

    db = MockDBState(
        classes={class_id: {"id": class_id, "name": "AP Chemistry 101", "subject": "AP Chemistry"}},
        materials={
            mat_id: {
                "id": mat_id,
                "name": "Kinetics Guide",
                "content": sample_long_curriculum_markdown(min_chars=16000),
            }
        },
        class_materials=[{"class_id": class_id, "material_id": mat_id}],
    )

    async with offline_runtime(db_state=db):
        async with api_client() as client:
            # 1. Soft warning when topic coverage < 0.4
            warn_resp = await client.post(
                "/api/chat",
                json=sample_chat_payload(class_id=class_id, confirmed_soft_warning=False),
            )
            assert warn_resp.status_code == 200
            warn_data = warn_resp.json()
            assert warn_data["is_soft_warning"] is True
            assert warn_data["requires_confirmation"] is True

            # 2. Confirmed soft warning proceeds with caveat prepended
            confirm_resp = await client.post(
                "/api/chat",
                json=sample_chat_payload(class_id=class_id, confirmed_soft_warning=True),
            )
            assert confirm_resp.status_code == 200
            confirm_data = confirm_resp.json()
            assert str(confirm_data["text"]).startswith("> [!NOTE]")
            assert confirm_data["visualization"]["type"] == "ranking"

            # 3. Index long material via /api/materials/analyze and register class-subject concepts
            #    so ai.check_answerable (which matches c.subject = cl.subject) returns VERIFIED
            _ = await client.post(
                "/api/materials/analyze",
                json=sample_material_analyze_request(
                    material_id=mat_id, class_id=class_id, long_document=True
                ),
            )
            for cname in ("Chemical Kinetics", "Rate Laws"):
                cid = str(uuid.uuid4())
                db.ontology_concepts[cid] = {
                    "id": cid,
                    "subject": "AP Chemistry",
                    "name": cname,
                    "description": f"{cname} curriculum concept",
                    "bloom_level": "Analyze",
                }
            grounded_resp = await client.post(
                "/api/chat",
                json=sample_chat_payload(
                    prompt="Chemical Kinetics and Rate Laws",
                    class_id=class_id,
                    confirmed_soft_warning=False,
                ),
            )
            assert grounded_resp.status_code == 200
            grounded_data = grounded_resp.json()
            assert grounded_data.get("is_soft_warning") is None
            assert "Chemical Kinetics Mastery Brief" in grounded_data["text"]

            # 4. Missing OPENROUTER_API_KEY surfaces HTTP 500
            with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}, clear=False):
                err_resp = await client.post(
                    "/api/chat",
                    json=sample_chat_payload(class_id=class_id, confirmed_soft_warning=True),
                )
                assert err_resp.status_code == 500


run_interactive_cell(test_chat_endpoint_flows)


# %% [8] Live FastAPI Endpoint Verification (In-Process or TEST_BASE_URL)
@pytest.mark.live
async def test_live_fastapi_endpoints() -> None:
    """Exercise FastAPI endpoints against TEST_BASE_URL or live in-process ASGI + DB + OpenRouter."""
    cfg = get_test_config()
    if cfg.mode == "offline":
        pytest.skip("Skipped in offline mode (run with --live or DIDACTIQ_TEST_MODE=live).")

    if cfg.base_url:
        async with api_client(base_url=cfg.base_url) as client:
            health = await client.get("/api/health")
            assert health.status_code == 200
            assert health.json() == {"status": "ok"}

            # Stateless chat check against running server (no DB fixture needed when class_id=None)
            chat = await client.post(
                "/api/chat",
                json=sample_chat_payload(
                    prompt="Briefly summarize Ada Lovelace's grade trend.",
                    class_id=None,
                    class_name="NonexistentLiveCheckClass",
                    confirmed_soft_warning=True,
                ),
            )
            assert chat.status_code == 200
            assert isinstance(chat.json().get("text"), str)
        return

    if not cfg.has_openrouter_key:
        pytest.skip("OPENROUTER_API_KEY is required when testing live endpoints without TEST_BASE_URL.")
    if not cfg.has_postgres_uri or not await is_postgres_reachable():
        pytest.skip("PostgreSQL at POSTGRES_URI is not configured or reachable.")

    async with live_db_sandbox() as sb:
        async with api_client() as client:
            health = await client.get("/api/health")
            assert health.status_code == 200

            analyze = await client.post(
                "/api/materials/analyze",
                json=sample_material_analyze_request(
                    material_id=sb.material_id, class_id=sb.class_id, long_document=True
                ),
            )
            assert analyze.status_code == 200
            assert analyze.json()["tree_indexed"] is True

            tree = await client.post(
                "/api/materials/tree",
                json={"material_id": sb.material_id, "force_rebuild": False},
            )
            assert tree.status_code == 200
            assert tree.json()["cached"] is True

            if sb.submission_ids:
                grade = await client.post(
                    "/api/grade",
                    json=sample_grade_request(
                        submission_id=sb.submission_ids[0],
                        class_id=sb.class_id,
                        student_id=sb.student_id,
                        material_id=sb.material_id,
                    ),
                )
                assert grade.status_code == 200

            cons = await client.post(
                "/api/consolidation/run",
                json={"class_id": sb.class_id, "run_type": "daily"},
            )
            assert cons.status_code == 200
            sb.created_run_ids.append(cons.json()["run_id"])

            proposed = await client.get(
                "/api/misconceptions/proposed", params={"class_id": sb.class_id}
            )
            assert proposed.status_code == 200

            chat = await client.post(
                "/api/chat",
                json=sample_chat_payload(class_id=sb.class_id, confirmed_soft_warning=True),
            )
            assert chat.status_code == 200
            assert isinstance(chat.json().get("text"), str)


run_interactive_cell(test_live_fastapi_endpoints)


# %% [9] Direct CLI Entrypoint
if __name__ == "__main__":
    asyncio.run(
        run_interactive_suite(
            "FastAPI Endpoints",
            [
                ("health_and_request_id_header", test_health_and_request_id_header),
                ("materials_analyze_endpoint", test_materials_analyze_endpoint),
                ("materials_tree_endpoint", test_materials_tree_endpoint),
                ("grade_endpoint", test_grade_endpoint),
                ("consolidation_and_misconception_endpoints", test_consolidation_and_misconception_endpoints),
                ("chat_endpoint_flows", test_chat_endpoint_flows),
                ("live_fastapi_endpoints", test_live_fastapi_endpoints),
            ],
        )
    )
