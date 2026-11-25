"""Shared test harness for Didactiq AI, Knowledge Store, LangChain/LangGraph, and FastAPI suites.

Supports two execution modes controlled by ``DIDACTIQ_TEST_MODE`` (or ``TEST_MODE``):
- ``offline`` (default): In-memory stateful PostgreSQL emulator + deterministic fake OpenRouter LLM
  + in-process ASGI HTTP client. Zero external DB or API dependencies.
- ``live``: Real PostgreSQL connection pool (``ai`` and ``langgraph`` schemas), real OpenRouter LLM
  calls, and either in-process FastAPI or a running server at ``TEST_BASE_URL``.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator, Callable, Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack, asynccontextmanager
import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
import inspect
import json
import os
from pathlib import Path
import sys
from typing import Any, Literal, cast
from unittest.mock import patch
from urllib.parse import parse_qsl, quote, urlencode, urlparse, urlunparse
import uuid

from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient
from langchain_core.callbacks import AsyncCallbackManagerForLLMRun, CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field

# Ensure ``backend/`` is importable regardless of working directory (repo root, backend/, tests/)
TESTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TESTS_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load backend/.env if present without exposing values
_ = load_dotenv(BACKEND_DIR / ".env", override=False)
_ = load_dotenv(REPO_ROOT / ".env", override=False)

TestMode = Literal["offline", "live", "auto"]


@dataclass(frozen=True)
class TestConfig:
    """Runtime configuration resolved from environment variables."""

    mode: TestMode
    base_url: str | None
    model: str
    has_openrouter_key: bool
    has_postgres_uri: bool


def get_test_config(override_mode: TestMode | None = None) -> TestConfig:
    """Resolve current test execution configuration without printing secret values."""
    raw_mode = (
        override_mode
        or os.getenv("DIDACTIQ_TEST_MODE")
        or os.getenv("TEST_MODE")
        or "offline"
    ).strip().lower()
    mode: TestMode = "live" if raw_mode == "live" else ("auto" if raw_mode == "auto" else "offline")
    raw_url = (os.getenv("TEST_BASE_URL") or "").strip()
    return TestConfig(
        mode=mode,
        base_url=raw_url or None,
        model=os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
        has_openrouter_key=bool(os.getenv("OPENROUTER_API_KEY", "").strip()),
        has_postgres_uri=bool(os.getenv("POSTGRES_URI", "").strip()),
    )


def build_langgraph_postgres_uri(base_uri: str | None = None) -> str:
    """Return PostgreSQL URI configured with ``search_path=langgraph`` safely."""
    raw = (base_uri or os.environ.get("POSTGRES_URI") or "").strip()
    if not raw:
        raise ValueError("POSTGRES_URI is not set.")
    parsed = urlparse(raw)
    query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query_items.setdefault("options", os.getenv("DB_OPTIONS", "-c search_path=langgraph"))
    new_query = urlencode(query_items, quote_via=quote)
    return urlunparse(parsed._replace(query=new_query))


async def is_postgres_reachable() -> bool:
    """Check whether PostgreSQL at ``POSTGRES_URI`` accepts connections."""
    uri = os.getenv("POSTGRES_URI", "").strip()
    if not uri:
        return False
    try:
        import psycopg

        async with await psycopg.AsyncConnection.connect(uri, connect_timeout=3) as conn:
            async with conn.cursor() as cur:
                _ = await cur.execute("SELECT 1")
        return True
    except Exception:
        return False


def print_environment_banner(suite_name: str, cfg: TestConfig | None = None) -> TestConfig:
    """Print non-sensitive environment status for interactive test sessions."""
    resolved = cfg or get_test_config()
    print(f"=== {suite_name} ===")
    print(
        f"mode={resolved.mode} | model={resolved.model} | "
        f"base_url={resolved.base_url or 'in-process ASGI'} | "
        f"openrouter_key={'set' if resolved.has_openrouter_key else 'unset'} | "
        f"postgres_uri={'set' if resolved.has_postgres_uri else 'unset'}"
    )
    return resolved


# ---------------------------------------------------------------------------
# Deterministic Fake OpenRouter LLM (Offline Mode)
# ---------------------------------------------------------------------------


def _stringify_prompt(prompt_input: object) -> str:
    """Normalize string or LangChain BaseMessage sequence into searchable text."""
    if isinstance(prompt_input, str):
        return prompt_input
    if isinstance(prompt_input, Sequence):
        parts: list[str] = []
        for item in prompt_input:
            if isinstance(item, BaseMessage):
                parts.append(f"[{item.type}] {item.content}")
            elif isinstance(item, tuple) and len(item) == 2:
                parts.append(f"[{item[0]}] {item[1]}")
            else:
                parts.append(str(item))
        return "\n".join(parts)
    return str(prompt_input)


class FakeOpenRouterLLM(BaseChatModel):
    """LangChain BaseChatModel returning deterministic JSON payloads per Didactiq workflow."""

    model: str = "google/gemini-2.5-flash"
    api_key: str = "test-key"
    temperature: float = 0.7
    recorded_prompts: list[str] = Field(default_factory=list)
    override_json: dict[str, object] | None = None
    override_raw: str | None = None
    raise_error: Exception | None = None

    @property
    def _llm_type(self) -> str:
        return "fake-openrouter"

    def _build_reply(self, prompt_text: str) -> str:
        if self.raise_error is not None:
            raise self.raise_error
        if self.override_raw is not None:
            return self.override_raw
        if self.override_json is not None:
            return json.dumps(self.override_json)

        lower = prompt_text.lower()

        if "pedagogical tree indexer" in lower:
            return json.dumps(
                {
                    "sections": [
                        {
                            "title": "Section 1: Reaction Rates & Collision Theory",
                            "summary": "Covers average vs instantaneous reaction rates and activation energy barriers.",
                            "key_concepts": ["Reaction Rates", "Collision Theory", "Activation Energy"],
                        },
                        {
                            "title": "Section 2: Rate Laws & Reaction Order",
                            "summary": "Derives differential rate laws and explains zero, first, and second order kinetics.",
                            "key_concepts": ["Rate Laws", "Reaction Order", "Rate Constant"],
                        },
                        {
                            "title": "Section 3: Catalysis & Mechanisms",
                            "summary": "Explains elementary steps, rate-determining steps, and catalytic pathways.",
                            "key_concepts": ["Catalysis", "Reaction Mechanism", "Rate-Determining Step"],
                        },
                    ]
                }
            )

        if "pedagogical assessor" in lower or "evaluate student work against the provided rubric" in lower:
            return json.dumps(
                {
                    "rubric_breakdown": [
                        {
                            "criterionId": "crit-kinetics-1",
                            "criterionName": "Conceptual Understanding",
                            "score": 44.0,
                            "maxScore": 50.0,
                            "comment": "Correctly explained collision frequency, with slight confusion on catalyst equilibrium effects.",
                        },
                        {
                            "criterionId": "crit-kinetics-2",
                            "criterionName": "Quantitative Calculations",
                            "score": 42.0,
                            "maxScore": 50.0,
                            "comment": "Accurate rate constant units and order determination.",
                        },
                    ],
                    "feedback": "Strong quantitative work on rate orders! Review how catalysts affect forward and reverse barriers equally.",
                    "private_teacher_notes": "Student assumes catalysts shift equilibrium position toward products.",
                    "rationale": "Demonstrated solid mathematical mastery (86%) with one conceptual misconception around equilibrium.",
                    "detected_misconceptions": [
                        "Catalyst Equilibrium Shift Misconception"
                    ],
                }
            )

        if "ai curriculum specialist" in lower or "analyze the provided educational material" in lower:
            return json.dumps(
                {
                    "summary": "Comprehensive AP Chemistry unit on Chemical Kinetics, rate laws, and catalysis.",
                    "difficulty_level": "Intermediate",
                    "syllabus_alignment": [
                        {
                            "topic": "Chemical Kinetics",
                            "standard_code": "AP-CHEM-5.1",
                            "confidence": 0.96,
                            "description": "Introduction to reaction rates and experimental determination.",
                        },
                        {
                            "topic": "Rate Laws",
                            "standard_code": "AP-CHEM-5.2",
                            "confidence": 0.93,
                            "description": "Determining reaction orders from initial rate data.",
                        },
                    ],
                    "prerequisite_gaps": [
                        {
                            "prerequisite_concept": "Stoichiometry & Molarity",
                            "gap_detected": True,
                            "remedial_action": "Assign a 10-minute molar concentration warm-up before deriving rate expressions.",
                        }
                    ],
                    "sample_questions": [
                        {
                            "question": "If doubling [A] quadruples the initial reaction rate, what is the order with respect to A?",
                            "options": ["Zero order", "First order", "Second order", "Third order"],
                            "answer": "Second order",
                            "explanation": "Since 2^2 = 4, the reaction is second order in A.",
                            "difficulty": "Intermediate",
                        }
                    ],
                }
            )

        if "pedagogical dreaming agent" in lower:
            return json.dumps(
                {
                    "proposed_misconceptions": [
                        {
                            "name": "Catalyst Shifts Equilibrium",
                            "error_pattern": "Multiple students wrote that adding a catalyst increases final product yield at equilibrium.",
                            "remediation_strategy": "Use potential energy diagrams showing equal lowering of forward and reverse activation energies.",
                            "severity": "High",
                            "confidence": 0.91,
                        }
                    ]
                }
            )

        if "ai pedagogical assistant" in lower:
            return json.dumps(
                {
                    "text": (
                        "### Chemical Kinetics Mastery Brief\n"
                        "Based on the indexed curriculum tree and prerequisite ontology, "
                        "students performing below 75% need reinforcement in **Stoichiometry & Molarity** "
                        "before advancing to **Rate Laws**."
                    ),
                    "visualization": {
                        "type": "ranking",
                        "title": "Class Mastery Snapshot",
                        "description": "Student scores compared with class average",
                        "data": [
                            {"name": "Ada Lovelace", "score": 94.0, "classAvg": 82.0, "status": "High"},
                            {"name": "Alan Turing", "score": 70.0, "classAvg": 82.0, "status": "Needs Review"},
                        ],
                    },
                }
            )

        return json.dumps({"text": "Synthetic LLM response", "status": "ok"})

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        _ = (stop, run_manager, kwargs)
        prompt_text = _stringify_prompt(messages)
        self.recorded_prompts.append(prompt_text)
        msg = AIMessage(content=self._build_reply(prompt_text))
        return ChatResult(generations=[ChatGeneration(message=msg)])

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: AsyncCallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> ChatResult:
        _ = (stop, run_manager, kwargs)
        prompt_text = _stringify_prompt(messages)
        self.recorded_prompts.append(prompt_text)
        msg = AIMessage(content=self._build_reply(prompt_text))
        return ChatResult(generations=[ChatGeneration(message=msg)])


# ---------------------------------------------------------------------------
# In-Memory Stateful PostgreSQL Emulator (Offline Mode)
# ---------------------------------------------------------------------------


@dataclass
class MockDBState:
    """Stateful in-memory representation of public + ai schema tables used by backend services."""

    classes: dict[str, dict[str, Any]] = field(default_factory=dict)
    materials: dict[str, dict[str, Any]] = field(default_factory=dict)
    class_materials: list[dict[str, str]] = field(default_factory=list)
    student_submissions: dict[str, dict[str, Any]] = field(default_factory=dict)
    material_trees: dict[str, dict[str, Any]] = field(default_factory=dict)
    ontology_concepts: dict[str, dict[str, Any]] = field(default_factory=dict)
    ontology_relationships: dict[str, dict[str, Any]] = field(default_factory=dict)
    material_concept_mappings: list[dict[str, Any]] = field(default_factory=list)
    student_concept_mastery: dict[tuple[str, str, str], dict[str, Any]] = field(default_factory=dict)
    submission_evaluations: dict[str, dict[str, Any]] = field(default_factory=dict)
    material_insights: dict[str, dict[str, Any]] = field(default_factory=dict)
    ontology_misconceptions: dict[str, dict[str, Any]] = field(default_factory=dict)
    consolidation_runs: dict[str, dict[str, Any]] = field(default_factory=dict)
    knowledge_lint_reports: list[dict[str, Any]] = field(default_factory=list)

    def _now(self) -> datetime:
        return datetime.now(UTC)

    async def fetch_all(
        self,
        sql: str,
        params: Sequence[object] | Mapping[str, object] | None = None,
    ) -> list[dict[str, Any]]:
        norm = " ".join(sql.split()).lower()
        p = list(params) if isinstance(params, Sequence) else []

        # 1. ChatService: tree materials for class
        if "from public.materials m join public.class_materials cm" in norm:
            class_id = str(p[0])
            mat_ids = {cm["material_id"] for cm in self.class_materials if cm["class_id"] == class_id}
            rows = [
                {"id": mid, "name": self.materials[mid]["name"]}
                for mid in mat_ids
                if mid in self.materials and mid in self.material_trees
            ]
            return rows[:3]

        # 2. ChatService: matching concepts via ILIKE ANY
        if "from ai.ontology_concepts c where c.name ilike any" in norm:
            patterns = [str(pat).strip("%").lower() for pat in cast(list[object], p[0])]
            matches = [
                {"id": c["id"], "name": c["name"]}
                for c in self.ontology_concepts.values()
                if any(pat in str(c["name"]).lower() for pat in patterns if pat)
            ]
            return matches[:5]

        # 3. ChatService: student concept mastery snapshot
        if "from ai.student_concept_mastery m join ai.ontology_concepts c" in norm:
            class_id = str(p[0])
            grouped: dict[str, list[float]] = {}
            for (cid, _sid, concept_id), row in self.student_concept_mastery.items():
                if cid == class_id and concept_id in self.ontology_concepts:
                    cname = str(self.ontology_concepts[concept_id]["name"])
                    grouped.setdefault(cname, []).append(float(row["mastery_score"]))
            summary_rows = [
                {
                    "concept_name": cname,
                    "avg_score": sum(scores) / len(scores),
                    "student_count": len(scores),
                }
                for cname, scores in grouped.items()
            ]
            summary_rows.sort(key=lambda r: float(r["avg_score"]))
            return summary_rows[:5]

        # 4. OntologyService: recursive CTE prerequisite traversal
        if "with recursive prereq_tree as" in norm:
            target_ids = {str(x) for x in cast(list[object], p[0])}
            max_depth = int(cast(int, p[1])) if len(p) > 1 else 3
            frontier = [(tid, 0, [tid]) for tid in target_ids]
            visited_edges: list[dict[str, Any]] = []
            while frontier:
                cur_target, depth, path = frontier.pop(0)
                if depth >= max_depth:
                    continue
                for rel in self.ontology_relationships.values():
                    if rel["target_concept_id"] == cur_target:
                        src = rel["source_concept_id"]
                        if src in path:
                            continue
                        new_depth = depth + 1
                        concept = self.ontology_concepts.get(src)
                        if concept:
                            visited_edges.append(
                                {
                                    "depth": new_depth,
                                    "relationship_type": rel["relationship_type"],
                                    "concept_id": src,
                                    "concept_name": concept["name"],
                                    "code": concept.get("code"),
                                    "bloom_level": concept.get("bloom_level", "Understand"),
                                    "description": concept.get("description", ""),
                                }
                            )
                        frontier.append((src, new_depth, [*path, src]))
            visited_edges.sort(key=lambda r: int(r["depth"]))
            return visited_edges

        # 5. EvaluatorService: concept rows mapped to material
        if "from ai.material_concept_mappings m join ai.ontology_concepts c" in norm:
            material_id = str(p[0])
            seen: set[str] = set()
            out: list[dict[str, Any]] = []
            for m in self.material_concept_mappings:
                if m["material_id"] == material_id:
                    cid = str(m["concept_id"])
                    if cid not in seen and cid in self.ontology_concepts:
                        seen.add(cid)
                        out.append({"id": cid, "name": self.ontology_concepts[cid]["name"]})
            return out

        # 6. OntologyService: proposed misconceptions
        if "from ai.ontology_misconceptions where" in norm:
            class_filter = str(p[0]) if p else None
            rows = [
                dict(m)
                for m in self.ontology_misconceptions.values()
                if m["status"] == "proposed" and (class_filter is None or m.get("class_id") == class_filter)
            ]
            rows.sort(key=lambda r: cast(datetime, r["created_at"]), reverse=True)
            return rows

        # 7. OntologyService: find concepts by exact names
        if "from ai.ontology_concepts where name = any" in norm:
            names = set(cast(list[str], p[0]))
            return [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "subject": c["subject"],
                    "code": c.get("code"),
                    "bloom_level": c.get("bloom_level"),
                    "description": c.get("description"),
                }
                for c in self.ontology_concepts.values()
                if c["name"] in names
            ]

        # 8. ConsolidationService: orphaned concept nodes
        if "left join ai.ontology_relationships r_out" in norm:
            connected: set[str] = set()
            for rel in self.ontology_relationships.values():
                connected.add(rel["source_concept_id"])
                connected.add(rel["target_concept_id"])
            orphans = [
                {"id": c["id"], "name": c["name"], "subject": c["subject"]}
                for c in self.ontology_concepts.values()
                if c["id"] not in connected
            ]
            return orphans[:50]

        # 9. ConsolidationService: 2-node prerequisite_of cycles
        if "from ai.ontology_relationships r1 join ai.ontology_relationships r2" in norm:
            prereqs = [
                r for r in self.ontology_relationships.values()
                if r["relationship_type"] == "prerequisite_of"
            ]
            cycles: list[dict[str, Any]] = []
            for r1 in prereqs:
                for r2 in prereqs:
                    if (
                        r1["source_concept_id"] == r2["target_concept_id"]
                        and r1["target_concept_id"] == r2["source_concept_id"]
                        and str(r1["id"]) < str(r2["id"])
                    ):
                        cycles.append(
                            {
                                "r1_id": r1["id"],
                                "r2_id": r2["id"],
                                "source_concept_id": r1["source_concept_id"],
                                "target_concept_id": r1["target_concept_id"],
                            }
                        )
            return cycles

        # 10. ConsolidationService: recent evaluations for dreaming
        if "from ai.submission_evaluations e join public.student_submissions s" in norm:
            class_filter = str(p[0]) if p else None
            joined: list[dict[str, Any]] = []
            for ev in self.submission_evaluations.values():
                sub = self.student_submissions.get(ev["submission_id"])
                if not sub:
                    continue
                if class_filter is not None and sub.get("class_id") != class_filter:
                    continue
                joined.append({**ev, "class_id": sub.get("class_id")})
            joined.sort(key=lambda r: cast(datetime, r["created_at"]), reverse=True)
            return joined[:30]

        raise NotImplementedError(f"MockDBState.fetch_all unhandled SQL: {sql}")

    async def fetch_one(
        self,
        sql: str,
        params: Sequence[object] | Mapping[str, object] | None = None,
    ) -> dict[str, Any] | None:
        norm = " ".join(sql.split()).lower()
        p = list(params) if isinstance(params, Sequence) else []

        # 1. ChatService: resolve class by name
        if "select id from public.classes where name ilike" in norm:
            needle = str(p[0]).strip("%").lower()
            for cid, crow in self.classes.items():
                if needle in str(crow.get("name", "")).lower():
                    return {"id": cid}
            return None

        # 2. Router: material row lookup for /api/materials/tree
        if "select name, content from public.materials where id =" in norm:
            mat = self.materials.get(str(p[0]))
            return {"name": mat["name"], "content": mat.get("content")} if mat else None

        # 3. TreeIndexerService: get_tree
        if "from ai.material_trees where material_id =" in norm:
            return self.material_trees.get(str(p[0]))

        # 4. OntologyService: ai.check_answerable
        if "from ai.check_answerable(" in norm:
            class_id = str(p[0])
            terms = [str(t).strip().lower() for t in cast(list[object], p[1]) if str(t).strip()]
            if not terms:
                return {
                    "is_answerable": True,
                    "status_flag": "VERIFIED",
                    "coverage_score": 1.0,
                    "matched_concept_count": 0,
                    "missing_terms": [],
                    "requires_confirmation": False,
                    "caveat_message": None,
                }
            cls_row = self.classes.get(class_id)
            cls_subject = cls_row.get("subject") if cls_row else None
            scoped_concepts = [
                c for c in self.ontology_concepts.values()
                if cls_subject is not None and c.get("subject") == cls_subject
            ]
            matched_ids: set[str] = set()
            missing: list[str] = []
            for term in terms:
                term_hits = [c["id"] for c in scoped_concepts if term in str(c["name"]).lower()]
                if term_hits:
                    matched_ids.update(term_hits)
                else:
                    missing.append(term)
            score = min(1.0, len(matched_ids) / len(terms))
            low_cov = score < 0.4
            return {
                "is_answerable": True,
                "status_flag": "INCOMPLETE_WARNING" if low_cov else "VERIFIED",
                "coverage_score": score,
                "matched_concept_count": len(matched_ids),
                "missing_terms": missing,
                "requires_confirmation": low_cov,
                "caveat_message": (
                    "Processing and consolidation of course materials for this topic is incomplete. "
                    "Insights might not be comprehensive. Do you still want to continue?"
                    if low_cov
                    else None
                ),
            }

        # 5. OntologyService: upsert_concept
        if "insert into ai.ontology_concepts" in norm:
            cid = str(uuid.uuid4())
            self.ontology_concepts[cid] = {
                "id": cid,
                "subject": p[0],
                "code": p[1],
                "name": p[2],
                "description": p[3],
                "bloom_level": p[4],
                "parent_concept_id": p[5],
                "okf_type": p[6],
                "status": p[7],
                "verified_by": p[8],
                "stale_after": p[9],
                "tags": p[10],
                "metadata": json.loads(str(p[11])) if isinstance(p[11], str) else p[11],
            }
            return {"id": cid}

        # 6. OntologyService: upsert_relationship
        if "insert into ai.ontology_relationships" in norm:
            rid = str(uuid.uuid4())
            self.ontology_relationships[rid] = {
                "id": rid,
                "source_concept_id": str(p[0]),
                "target_concept_id": str(p[1]),
                "relationship_type": str(p[2]),
                "weight": float(cast(float, p[3])),
                "metadata": json.loads(str(p[4])) if isinstance(p[4], str) else p[4],
            }
            return {"id": rid}

        # 7. OntologyService: propose_misconception
        if "insert into ai.ontology_misconceptions" in norm:
            mid = str(uuid.uuid4())
            self.ontology_misconceptions[mid] = {
                "id": mid,
                "class_id": p[0],
                "concept_id": p[1],
                "prerequisite_concept_id": p[2],
                "name": p[3],
                "error_pattern": p[4],
                "remediation_strategy": p[5],
                "severity": p[6],
                "status": p[7],
                "confidence": p[8],
                "evidence_submission_ids": list(cast(Sequence[str], p[9] or [])),
                "surfaced_in_gradebook": bool(p[10]),
                "teacher_reviewer_id": None,
                "teacher_reviewed_at": None,
                "created_at": self._now(),
            }
            return {"id": mid}

        # 8. EvaluatorService / ConsolidationService: anchor concept lookup
        if "select id from ai.ontology_concepts limit 1" in norm:
            first = next(iter(self.ontology_concepts.values()), None)
            return {"id": first["id"]} if first else None

        raise NotImplementedError(f"MockDBState.fetch_one unhandled SQL: {sql}")

    async def execute(
        self,
        sql: str,
        params: Sequence[object] | Mapping[str, object] | None = None,
    ) -> int:
        norm = " ".join(sql.split()).lower()
        p = list(params) if isinstance(params, Sequence) else []

        if "insert into ai.material_trees" in norm:
            mat_id = str(p[0])
            existing = self.material_trees.get(mat_id)
            now = self._now()
            root_obj = json.loads(str(p[1])) if isinstance(p[1], str) else p[1]
            self.material_trees[mat_id] = {
                "id": existing["id"] if existing else str(uuid.uuid4()),
                "material_id": mat_id,
                "root_node": root_obj,
                "total_nodes": int(cast(int, p[2])),
                "max_depth": int(cast(int, p[3])),
                "created_at": existing["created_at"] if existing else now,
                "updated_at": now,
            }
            return 1

        if "insert into ai.material_concept_mappings" in norm:
            self.material_concept_mappings.append(
                {
                    "id": str(uuid.uuid4()),
                    "material_id": p[0],
                    "concept_id": p[1],
                    "tree_node_id": p[2],
                    "page_number": p[3],
                    "relationship": p[4],
                    "relevance_score": p[5],
                    "confidence": p[6],
                    "evidence_excerpt": p[7],
                    "verified_by": p[8],
                }
            )
            return 1

        if "insert into ai.student_concept_mastery" in norm:
            key = (str(p[0]), str(p[1]), str(p[2]))
            self.student_concept_mastery[key] = {
                "class_id": p[0],
                "student_id": p[1],
                "concept_id": p[2],
                "mastery_score": float(cast(float, p[3])),
                "confidence": float(cast(float, p[4])),
                "status": str(p[5]),
                "evidence_submission_ids": list(cast(Sequence[str], p[6] or [])),
                "last_evaluated_at": self._now(),
            }
            return 1

        if "insert into ai.submission_evaluations" in norm:
            sub_id = str(p[0])
            existing = self.submission_evaluations.get(sub_id)
            now = self._now()
            self.submission_evaluations[sub_id] = {
                "id": existing["id"] if existing else str(uuid.uuid4()),
                "submission_id": sub_id,
                "suggested_score": p[1],
                "suggested_max_score": p[2],
                "suggested_grade": p[3],
                "suggested_feedback": p[4],
                "suggested_teacher_notes": p[5],
                "suggested_rubric_breakdown": json.loads(str(p[6])) if isinstance(p[6], str) else p[6],
                "rationale": p[7],
                "status": p[8],
                "model_used": p[9],
                "created_at": existing["created_at"] if existing else now,
                "updated_at": now,
            }
            return 1

        if "insert into ai.material_insights" in norm:
            mat_id = str(p[0])
            self.material_insights[mat_id] = {
                "material_id": mat_id,
                "syllabus_alignment": json.loads(str(p[1])) if isinstance(p[1], str) else p[1],
                "prerequisite_gaps": json.loads(str(p[2])) if isinstance(p[2], str) else p[2],
                "sample_questions": json.loads(str(p[3])) if isinstance(p[3], str) else p[3],
                "summary": p[4],
                "difficulty_level": p[5],
                "model_used": p[6],
                "status": "completed",
                "updated_at": self._now(),
            }
            return 1

        if "delete from ai.ontology_relationships where id =" in norm:
            rid = str(p[0])
            return 1 if self.ontology_relationships.pop(rid, None) is not None else 0

        if "insert into ai.knowledge_lint_reports" in norm:
            self.knowledge_lint_reports.append(
                {
                    "id": str(uuid.uuid4()),
                    "run_id": p[0],
                    "target_concept_id": p[1],
                    "details": json.loads(str(p[2])) if isinstance(p[2], str) else p[2],
                    "sql": norm,
                }
            )
            return 1

        if "insert into ai.consolidation_runs" in norm:
            run_id = str(p[0])
            self.consolidation_runs[run_id] = {
                "id": run_id,
                "status": "running",
                "frequency_tier": p[1],
                "drift_detected": False,
                "started_at": self._now(),
            }
            return 1

        if "update ai.consolidation_runs" in norm:
            run_id = str(p[6])
            if run_id in self.consolidation_runs:
                self.consolidation_runs[run_id].update(
                    {
                        "status": "completed",
                        "drift_detected": bool(p[0]),
                        "broken_linkages_repaired": int(cast(int, p[1])),
                        "concepts_audited": int(cast(int, p[2])),
                        "hypotheses_generated": int(cast(int, p[3])),
                        "lint_issues_detected": int(cast(int, p[4])),
                        "metrics": json.loads(str(p[5])) if isinstance(p[5], str) else p[5],
                        "completed_at": self._now(),
                    }
                )
                return 1
            return 0

        if "update ai.ontology_misconceptions set status =" in norm:
            status_val, reviewer_id, misc_id = str(p[0]), p[1], str(p[2])
            if misc_id in self.ontology_misconceptions:
                self.ontology_misconceptions[misc_id].update(
                    {
                        "status": status_val,
                        "teacher_reviewer_id": reviewer_id,
                        "teacher_reviewed_at": self._now(),
                    }
                )
                return 1
            return 0

        raise NotImplementedError(f"MockDBState.execute unhandled SQL: {sql}")


@dataclass
class OfflineRuntime:
    """Container holding active offline DB state, fake LLM, and patched modules."""

    db: MockDBState
    llm: FakeOpenRouterLLM


def _import_backend_modules() -> None:
    """Ensure all backend modules exist in sys.modules before patching imported bindings."""
    import src.lib.db  # noqa: F401
    import src.lib.llm  # noqa: F401
    import src.main  # noqa: F401
    import src.server.router  # noqa: F401
    import src.service.chat  # noqa: F401
    import src.service.consolidation  # noqa: F401
    import src.service.evaluator  # noqa: F401
    import src.service.ontology  # noqa: F401
    import src.service.tree_indexer  # noqa: F401


@asynccontextmanager
async def offline_runtime(
    db_state: MockDBState | None = None,
    fake_llm: FakeOpenRouterLLM | None = None,
    set_dummy_api_key: bool = True,
    use_real_llm: bool = False,
) -> AsyncGenerator[OfflineRuntime]:
    """Patch DB helpers (and optionally OpenRouter LLM factory) across all backend modules."""
    _import_backend_modules()
    if use_real_llm and not os.environ.get("OPENROUTER_API_KEY", "").strip():
        raise ValueError("OPENROUTER_API_KEY must be set when use_real_llm=True.")

    db = db_state or MockDBState()
    llm = fake_llm or FakeOpenRouterLLM()

    def _fake_llm_factory(model: str, api_key: str) -> FakeOpenRouterLLM:
        llm.model = model
        llm.api_key = api_key
        return llm

    async def _noop_pool() -> None:
        return None

    env_patch: dict[str, str] = {}
    if set_dummy_api_key and not use_real_llm:
        env_patch["OPENROUTER_API_KEY"] = "test-openrouter-key"

    with ExitStack() as stack:
        if env_patch:
            stack.enter_context(patch.dict(os.environ, env_patch, clear=False))

        # Patch DB pool lifecycle & query functions everywhere they were imported
        for mod in (
            "src.lib.db",
            "src.service.chat",
            "src.service.consolidation",
            "src.service.evaluator",
            "src.service.ontology",
            "src.service.tree_indexer",
        ):
            module_obj = sys.modules[mod]
            if hasattr(module_obj, "fetch_all"):
                stack.enter_context(patch(f"{mod}.fetch_all", side_effect=db.fetch_all))
            if hasattr(module_obj, "fetch_one"):
                stack.enter_context(patch(f"{mod}.fetch_one", side_effect=db.fetch_one))
            if hasattr(module_obj, "execute"):
                stack.enter_context(patch(f"{mod}.execute", side_effect=db.execute))

        stack.enter_context(patch("src.main.init_db_pool", side_effect=_noop_pool))
        stack.enter_context(patch("src.main.close_db_pool", side_effect=_noop_pool))

        if not use_real_llm:
            for llm_mod in (
                "src.lib.llm",
                "src.service.chat",
                "src.service.consolidation",
                "src.service.evaluator",
                "src.service.tree_indexer",
            ):
                if hasattr(sys.modules[llm_mod], "get_openrouter_llm"):
                    stack.enter_context(
                        patch(f"{llm_mod}.get_openrouter_llm", side_effect=_fake_llm_factory)
                    )

        yield OfflineRuntime(db=db, llm=llm)


# ---------------------------------------------------------------------------
# Live PostgreSQL Sandbox (Live Mode)
# ---------------------------------------------------------------------------


@dataclass
class LiveSandboxContext:
    """IDs of temporary synthetic records provisioned for live DB tests."""

    user_id: str
    class_id: str
    material_id: str
    student_id: str | None
    submission_ids: list[str]
    created_concept_ids: list[str] = field(default_factory=list)
    created_run_ids: list[str] = field(default_factory=list)


@asynccontextmanager
async def live_db_sandbox() -> AsyncGenerator[LiveSandboxContext]:
    """Provision isolated synthetic class/material/submission rows in live PostgreSQL and clean up on exit."""
    from src.lib.db import close_db_pool, execute, fetch_one, init_db_pool

    _ = await init_db_pool()
    user_row = await fetch_one("SELECT id FROM auth.users LIMIT 1")
    if not user_row:
        await close_db_pool()
        raise RuntimeError(
            "Live DB sandbox requires at least one row in auth.users to satisfy FK constraints."
        )

    user_id = str(user_row["id"])
    student_row = await fetch_one("SELECT id FROM public.students LIMIT 1")
    student_id = str(student_row["id"]) if student_row else None

    tag = uuid.uuid4().hex[:8]
    class_id = str(uuid.uuid4())
    material_id = str(uuid.uuid4())
    submission_ids: list[str] = []

    ctx = LiveSandboxContext(
        user_id=user_id,
        class_id=class_id,
        material_id=material_id,
        student_id=student_id,
        submission_ids=submission_ids,
    )

    try:
        _ = await execute(
            """
            INSERT INTO public.classes (id, user_id, name, subject, academic_year, semester, teacher_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                class_id,
                user_id,
                f"Didactiq Test Class {tag}",
                f"AP Chemistry Test {tag}",
                "2026-2027",
                "Fall",
                "Test Instructor",
            ),
        )
        content_json = json.dumps(
            [
                {
                    "id": str(uuid.uuid4()),
                    "name": "Kinetics Guide",
                    "type": "Text",
                    "description": sample_long_curriculum_markdown(),
                }
            ]
        )
        _ = await execute(
            """
            INSERT INTO public.materials (id, user_id, name, category, content)
            VALUES (%s, %s, %s, 'Study Material', %s::jsonb)
            """,
            (material_id, user_id, f"Chemical Kinetics {tag}", content_json),
        )
        _ = await execute(
            """
            INSERT INTO public.class_materials (class_id, material_id)
            VALUES (%s, %s)
            """,
            (class_id, material_id),
        )

        if student_id:
            for idx in range(2):
                sub_id = str(uuid.uuid4())
                sub_content = json.dumps(
                    [
                        {
                            "id": str(uuid.uuid4()),
                            "name": f"Response {idx + 1}",
                            "type": "Text",
                            "description": "A catalyst increases equilibrium yield by shifting K.",
                        }
                    ]
                )
                _ = await execute(
                    """
                    INSERT INTO public.student_submissions (id, class_id, student_id, material_id, content, status)
                    VALUES (%s, %s, %s, %s, %s::jsonb, 'Submitted')
                    """,
                    (sub_id, class_id, student_id, material_id, sub_content),
                )
                submission_ids.append(sub_id)

        yield ctx
    finally:
        # Clean up test records in reverse dependency order
        from src.lib.db import fetch_all

        mapped = await fetch_all(
            "SELECT concept_id FROM ai.material_concept_mappings WHERE material_id = %s",
            (material_id,),
        )
        all_concept_ids = list({*ctx.created_concept_ids, *(str(r["concept_id"]) for r in mapped)})
        for rid in ctx.created_run_ids:
            _ = await execute("DELETE FROM ai.consolidation_runs WHERE id = %s", (rid,))
        for sid in submission_ids:
            _ = await execute("DELETE FROM public.student_submissions WHERE id = %s", (sid,))
        _ = await execute("DELETE FROM public.materials WHERE id = %s", (material_id,))
        _ = await execute("DELETE FROM public.classes WHERE id = %s", (class_id,))
        for cid in all_concept_ids:
            _ = await execute("DELETE FROM ai.ontology_concepts WHERE id = %s", (cid,))
        await close_db_pool()


# ---------------------------------------------------------------------------
# FastAPI HTTP Client Factory (In-Process ASGI or Live Server URL)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def api_client(base_url: str | None = None) -> AsyncGenerator[AsyncClient]:
    """Yield an httpx.AsyncClient bound to TEST_BASE_URL or in-process FastAPI ASGI app."""
    if base_url:
        async with AsyncClient(base_url=base_url, timeout=60.0) as client:
            yield client
        return

    from src.main import app

    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver", timeout=60.0) as client:
            yield client


# ---------------------------------------------------------------------------
# Sample Pedagogical Payload Builders
# ---------------------------------------------------------------------------


def sample_long_curriculum_markdown(min_chars: int = 16000) -> str:
    """Generate structured Markdown curriculum content exceeding the 15k-char tree-index threshold."""
    sections = [
        (
            "# Unit 1: Reaction Rates and Collision Theory\n\n"
            "Chemical kinetics examines how quickly reactants transform into products and "
            "the molecular pathways governing reaction velocity. Collision theory states that "
            "reactant molecules must collide with sufficient kinetic energy (activation energy, Ea) "
            "and proper steric orientation for bond reorganization to occur. "
        ),
        (
            "## 1.1 Rate Laws and Reaction Order\n\n"
            "The differential rate law expresses reaction rate as a function of reactant concentrations "
            "raised to experimentally determined orders: Rate = k[A]^m[B]^n. Zero-order reactions proceed "
            "at constant speed, first-order reactions exhibit constant half-lives, and second-order "
            "reactions show linear 1/[A] vs time plots. "
        ),
        (
            "### 1.2 Catalysis and Reaction Mechanisms\n\n"
            "Elementary reaction steps sum to the overall balanced stoichiometry, and the slowest "
            "elementary step acts as the rate-determining bottleneck. Catalysts provide an alternative "
            "mechanism with lower activation energy Ea for both forward and reverse steps, accelerating "
            "attainment of equilibrium without altering the equilibrium constant K or final yield. "
        ),
    ]
    block = "\n".join(sections)
    repeat_count = max(1, (min_chars // len(block)) + 1)
    # Keep distinct headings across repeated chapters so section parser preserves hierarchy
    chapters = [
        block.replace("Unit 1", f"Unit {i + 1}").replace("1.1", f"{i + 1}.1").replace("1.2", f"{i + 1}.2")
        for i in range(repeat_count)
    ]
    return "\n\n".join(chapters)


def sample_chat_payload(
    prompt: str = "Analyze student performance on Chemical Kinetics and Rate Laws",
    class_id: str | None = None,
    class_name: str = "AP Chemistry 101",
    confirmed_soft_warning: bool = False,
) -> dict[str, Any]:
    """Return a valid ChatPayload JSON dictionary."""
    return {
        "messages": [
            {
                "id": "msg-1",
                "role": "user",
                "text": "We finished Lab 1 on Chemical Kinetics yesterday.",
                "timestamp": "2026-11-10T09:00:00Z",
            },
            {
                "id": "msg-2",
                "role": "assistant",
                "text": "Great! Let me know what diagnostics or feedback you'd like to review.",
                "timestamp": "2026-11-10T09:00:05Z",
            },
            {
                "id": "msg-3",
                "role": "user",
                "text": prompt,
                "timestamp": "2026-11-10T09:01:00Z",
            },
        ],
        "workspaceName": "Fall 2026 Science",
        "classItemName": class_name,
        "class_id": class_id,
        "confirmed_soft_warning": confirmed_soft_warning,
        "subject": "AP Chemistry",
        "academicYear": "2026-2027",
        "semester": "Fall",
        "teacherName": "Dr. Marie Curie",
        "teachingStyle": "Socratic Method",
        "specialNotes": "Focus on prerequisite stoichiometry gaps.",
        "assessmentPreferences": "Rubric-driven lab diagnostics",
        "materials": [
            {"name": "Chemical Kinetics Textbook", "type": "Study Material", "tags": ["kinetics", "rate-laws"]}
        ],
        "instructions": [
            {"title": "Lab Feedback Tone", "type": "Grading Rubric", "content": "Be encouraging and evidence-based."}
        ],
        "students": [
            {
                "name": "Ada Lovelace",
                "rollNumber": "CHEM-01",
                "email": "ada@school.edu",
                "performanceIndicator": "High",
                "attendance": 98.0,
                "grades": [{"assessmentName": "Lab 1", "score": 94.0, "maxScore": 100.0}],
                "customFields": [{"label": "Goal", "value": "AP Honors"}],
                "parentName": "Anne Byron",
                "parentContact": "555-0101",
                "parentNotes": "Excels at math modeling.",
            },
            {
                "name": "Alan Turing",
                "rollNumber": "CHEM-02",
                "email": "alan@school.edu",
                "performanceIndicator": "Needs Review",
                "attendance": 92.0,
                "grades": [{"assessmentName": "Lab 1", "score": 70.0, "maxScore": 100.0}],
                "customFields": [],
                "parentName": "Julius Turing",
                "parentContact": "555-0102",
                "parentNotes": "Needs catalyst concept review.",
            },
        ],
        "newAnalysisConfig": {
            "type": "diagnostic",
            "scopeType": "class",
            "selectedIds": [],
            "customInstructions": "Highlight prerequisite concepts and misconceptions.",
        },
    }


def sample_grade_request(
    submission_id: str | None = None,
    class_id: str | None = None,
    student_id: str | None = None,
    material_id: str | None = None,
) -> dict[str, Any]:
    """Return a valid GradeRequest JSON dictionary."""
    return {
        "submission_id": submission_id or str(uuid.uuid4()),
        "class_id": class_id,
        "student_id": student_id,
        "material_id": material_id,
        "material_name": "Lab 1: Chemical Kinetics",
        "max_score": 100.0,
        "rubric_criteria": [
            {
                "id": "crit-kinetics-1",
                "name": "Conceptual Understanding",
                "maxScore": 50.0,
                "description": "Explains collision theory, activation energy, and catalysis accurately.",
            },
            {
                "id": "crit-kinetics-2",
                "name": "Quantitative Calculations",
                "maxScore": 50.0,
                "description": "Determines reaction orders and rate constant units correctly.",
            },
        ],
        "submission_text": (
            "From experimental trials 1 and 2, doubling [A] quadruples the initial rate, "
            "so the reaction is second order in A. Adding a catalyst lowers activation energy "
            "and shifts equilibrium toward products so we obtain a higher final yield."
        ),
    }


def sample_material_analyze_request(
    material_id: str | None = None,
    class_id: str | None = None,
    long_document: bool = False,
) -> dict[str, Any]:
    """Return a valid MaterialAnalyzeRequest JSON dictionary."""
    text = (
        sample_long_curriculum_markdown()
        if long_document
        else (
            "# Chemical Kinetics Overview\n"
            "Reaction rate measures change in concentration per unit time. "
            "Rate laws relate rate to reactant molarity using experimental reaction orders."
        )
    )
    return {
        "material_id": material_id or str(uuid.uuid4()),
        "name": "Unit 5: Chemical Kinetics",
        "category": "Study Material",
        "rubric_criteria": [],
        "extracted_text": text,
        "page_count": 24 if long_document else 2,
        "class_id": class_id,
    }


# ---------------------------------------------------------------------------
# Interactive Cell / Script Runner Utility
# ---------------------------------------------------------------------------


async def _invoke_check(fn: Callable[[], object]) -> None:
    result = fn()
    if inspect.isawaitable(result):
        await result


def run_interactive_cell(fn: Callable[[], object]) -> None:
    """Execute a sync or async check when running a # %% cell interactively in IPython/Jupyter."""
    frame = inspect.currentframe()
    caller_globals = frame.f_back.f_globals if frame and frame.f_back else {}
    if "__file__" in caller_globals:
        return

    import pytest

    async def _run() -> None:
        await _invoke_check(fn)

    try:
        try:
            _ = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(_run())
        else:
            with ThreadPoolExecutor(max_workers=1) as pool:
                pool.submit(lambda: asyncio.run(_run())).result()
        print(f"[PASS] {fn.__name__}")
    except pytest.skip.Exception as exc:
        print(f"[SKIP] {fn.__name__}: {exc}")


async def run_interactive_suite(
    suite_name: str,
    checks: Sequence[tuple[str, Callable[[], object]]],
) -> None:
    """Execute sync or async check functions sequentially with concise PASS/SKIP/FAIL summary."""
    import pytest

    print(f"\nRunning interactive suite: {suite_name} ({len(checks)} checks)")
    failures: list[tuple[str, Exception]] = []
    skipped = 0
    for label, fn in checks:
        try:
            await _invoke_check(fn)
            print(f"  [PASS] {label}")
        except pytest.skip.Exception as exc:
            skipped += 1
            print(f"  [SKIP] {label}: {exc}")
        except Exception as exc:
            failures.append((label, exc))
            print(f"  [FAIL] {label}: {exc}")
    if failures:
        raise AssertionError(
            f"{suite_name} failed {len(failures)}/{len(checks)} checks: "
            + ", ".join(name for name, _ in failures)
        )
    passed = len(checks) - skipped
    print(f"Finished {suite_name}: {passed} passed, {skipped} skipped.\n")
