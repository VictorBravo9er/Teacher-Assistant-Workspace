"""Shared in-memory helpers, visual renderers, and demo orchestrator for Didactiq notebooks."""

from __future__ import annotations

from collections.abc import Sequence
from contextlib import AsyncExitStack
import json
import os
from pathlib import Path
import sys
from typing import Any, Literal, cast, override
import uuid

from dotenv import load_dotenv
from httpx import AsyncClient
from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.store.memory import InMemoryStore
from pydantic import BaseModel
from typing_extensions import Annotated, TypedDict


def setup_backend_env() -> Path:
    """Add ``backend/`` to ``sys.path`` and load ``.env`` files quietly."""
    cwd = Path.cwd()
    backend_dir = next(
        (
            p
            for p in (cwd, *cwd.parents, cwd / "backend", Path(__file__).resolve().parent.parent)
            if (p / "src" / "main.py").exists()
        ),
        Path(__file__).resolve().parent.parent,
    )
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    _ = load_dotenv(backend_dir / ".env", override=False)
    _ = load_dotenv(backend_dir.parent / ".env", override=False)
    return backend_dir


_ = setup_backend_env()

from src.lib.db import fetch_one  # noqa: E402
from src.lib.llm import get_openrouter_llm, parse_llm_response  # noqa: E402
from tests._harness import (  # noqa: E402
    FakeOpenRouterLLM,
    LiveSandboxContext,
    MockDBState,
    api_client,
    build_langgraph_postgres_uri,
    is_postgres_reachable,
    live_db_sandbox,
    offline_runtime,
    sample_chat_payload,
    sample_long_curriculum_markdown,
    sample_material_analyze_request,
)

DemoMode = Literal["in_memory", "in_memory_real_llm", "live"]


def resolve_demo_mode(explicit: str | None = None) -> DemoMode:
    """Normalize requested demo mode string."""
    raw = (explicit or os.getenv("DEMO_MODE") or "in_memory").strip().lower()
    if raw in ("real_llm", "in_memory_real_llm"):
        return "in_memory_real_llm"
    if raw == "live":
        return "live"
    return "in_memory"


def pretty_print(title: str, data: object) -> None:
    """Print Pydantic models, dicts, lists, or strings cleanly in notebook output."""
    print(f"--- {title} ---")
    if isinstance(data, BaseModel):
        print(json.dumps(data.model_dump(mode="json"), indent=2, default=str))
    elif isinstance(data, (dict, list)):
        print(json.dumps(data, indent=2, default=str))
    else:
        print(data)


class DemoOpenRouterLLM(FakeOpenRouterLLM):
    """Demo-tuned fake LLM producing differentiated grades for Ada vs Alan."""

    @override
    def _build_reply(self, prompt_text: str) -> str:
        lower = prompt_text.lower()
        if "pedagogical assessor" in lower or "evaluate student work against the provided rubric" in lower:
            if "lower both forward and reverse barriers equally" in lower:
                return json.dumps(
                    {
                        "rubric_breakdown": [
                            {
                                "criterionId": "crit-kinetics-1",
                                "criterionName": "Conceptual Understanding",
                                "score": 49.0,
                                "maxScore": 50.0,
                                "comment": "Accurately explained activation energy barriers and unchanged equilibrium constant K.",
                            },
                            {
                                "criterionId": "crit-kinetics-2",
                                "criterionName": "Quantitative Calculations",
                                "score": 47.0,
                                "maxScore": 50.0,
                                "comment": "Correct second-order rate law derivation and units.",
                            },
                        ],
                        "feedback": "Outstanding synthesis of collision theory, rate laws, and catalysis!",
                        "private_teacher_notes": "Student demonstrates mastery of catalyst vs equilibrium distinction.",
                        "rationale": "Earned 96/100 across quantitative rate law and conceptual catalysis criteria.",
                        "detected_misconceptions": [],
                    }
                )
            if "shifts equilibrium toward products" in lower:
                return json.dumps(
                    {
                        "rubric_breakdown": [
                            {
                                "criterionId": "crit-kinetics-1",
                                "criterionName": "Conceptual Understanding",
                                "score": 22.0,
                                "maxScore": 50.0,
                                "comment": "Confuses kinetic acceleration with thermodynamic equilibrium shift.",
                            },
                            {
                                "criterionId": "crit-kinetics-2",
                                "criterionName": "Quantitative Calculations",
                                "score": 40.0,
                                "maxScore": 50.0,
                                "comment": "Correct reaction order calculation from initial rates.",
                            },
                        ],
                        "feedback": "Nice job finding the reaction order! Note that catalysts speed up attainment of equilibrium without changing final product yield.",
                        "private_teacher_notes": "Student exhibits classic catalyst-equilibrium shift misconception.",
                        "rationale": "Strong math (40/50) offset by conceptual misconception on catalysis (22/50).",
                        "detected_misconceptions": ["Catalyst Equilibrium Shift Misconception"],
                    }
                )
        return super()._build_reply(prompt_text)


def get_notebook_llm(use_real_llm: bool = False, model: str | None = None):
    """Return DemoOpenRouterLLM (default) or live OpenRouter ChatOpenAI when use_real_llm=True."""
    resolved_model = model or os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
    if not use_real_llm:
        return DemoOpenRouterLLM(model=resolved_model)
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY must be set when USE_REAL_LLM=True.")
    return get_openrouter_llm(resolved_model, api_key)


# ---------------------------------------------------------------------------
# Visual ASCII / Table Renderers
# ---------------------------------------------------------------------------


def banner(step: str, title: str) -> None:
    """Print a prominent section header."""
    line = "=" * 78
    print(f"\n{line}\n[{step}] {title}\n{line}")


def render_material_tree(tree_payload: dict[str, Any] | BaseModel, max_children: int = 8) -> None:
    """Render a PageIndex MaterialTree dict or model as an ASCII hierarchy."""
    payload = (
        tree_payload.model_dump(mode="json")
        if isinstance(tree_payload, BaseModel)
        else tree_payload
    )
    root = cast(dict[str, Any], payload.get("root_node", {}))
    print(
        f"Tree Summary: total_nodes={payload.get('total_nodes')} | "
        f"max_depth={payload.get('max_depth')} | pages={payload.get('page_count', root.get('page_end'))}"
    )
    print(f"ROOT: {root.get('title')} (pp. {root.get('page_start', 1)}-{root.get('page_end', 1)})")
    children = cast(list[dict[str, Any]], root.get("children", []))
    shown = children[:max_children]
    for idx, node in enumerate(shown):
        branch = "└──" if idx == len(shown) - 1 and len(children) <= max_children else "├──"
        concepts = ", ".join(str(k) for k in node.get("key_concepts", [])[:3]) or "heuristic"
        print(
            f"  {branch} [{node.get('node_id')}] {node.get('title')} "
            f"(pp. {node.get('page_start')}-{node.get('page_end')}) | concepts: {concepts}"
        )
    if len(children) > max_children:
        print(f"  └── ... (+{len(children) - max_children} more sections)")


def render_prereq_chain(rows: list[dict[str, Any]]) -> None:
    """Render recursive CTE prerequisite rows."""
    if not rows:
        print("  (no prerequisite edges found)")
        return
    for row in rows:
        indent = "  " * int(row.get("depth", 1))
        print(
            f"{indent}depth={row.get('depth')} <- {row.get('concept_name')} "
            f"[{row.get('bloom_level')}] ({row.get('relationship_type')})"
        )


def render_mastery_rows(rows: list[dict[str, Any]]) -> None:
    """Render student concept mastery records as an aligned table."""
    if not rows:
        print("  (no mastery records yet)")
        return
    print(f"  {'Student':<14} {'Concept':<24} {'Score':>7}  {'Status':<14}")
    print(f"  {'-' * 14} {'-' * 24} {'-' * 7}  {'-' * 14}")
    for r in rows:
        score_pct = f"{round(float(r.get('mastery_score', 0.0)) * 100)}%"
        print(
            f"  {str(r.get('student_label', r.get('student_id', '')))[:14]:<14} "
            f"{str(r.get('concept_name', r.get('concept_id', '')))[:24]:<24} "
            f"{score_pct:>7}  {str(r.get('status', '')):<14}"
        )


def render_misconceptions(items: Sequence[dict[str, Any] | BaseModel]) -> None:
    """Render proposed or reviewed pedagogical misconceptions."""
    if not items:
        print("  (none)")
        return
    for raw in items:
        item = raw.model_dump(mode="json") if isinstance(raw, BaseModel) else raw
        print(
            f"  - [{str(item.get('status', 'proposed')).upper()}] "
            f"{item.get('name')} (severity={item.get('severity')}, conf={item.get('confidence')})\n"
            f"    Pattern: {item.get('error_pattern')}\n"
            f"    Fix:     {item.get('remediation_strategy')}"
        )


def render_visualization(viz: object) -> None:
    """Render chat visualization widget metadata and rows."""
    if not isinstance(viz, dict) or not viz:
        print("  Visualization: None")
        return
    viz_dict = cast(dict[str, Any], viz)
    print(f"  Visualization [{viz_dict.get('type')}]: {viz_dict.get('title')} — {viz_dict.get('description')}")
    for row in cast(list[dict[str, Any]], viz_dict.get("data", [])):
        print(f"    * {json.dumps(row)}")


# ---------------------------------------------------------------------------
# In-Memory Classroom Seeding Helper (Shared by InMemoryWorkspace & DemoSession)
# ---------------------------------------------------------------------------


def _seed_in_memory_classroom(
    db: MockDBState,
    class_id: str,
    class_subject: str,
    material_id: str,
    student_submissions: list[tuple[str, str]],
) -> None:
    """Populate synthetic AP Chemistry classroom records inside MockDBState."""
    db.classes[class_id] = {
        "id": class_id,
        "name": "AP Chemistry 101",
        "subject": class_subject,
    }
    db.materials[material_id] = {
        "id": material_id,
        "name": "Unit 5: Chemical Kinetics",
        "content": sample_long_curriculum_markdown(min_chars=16000),
    }
    db.class_materials.append({"class_id": class_id, "material_id": material_id})
    for sub_id, student_id in student_submissions:
        db.student_submissions[sub_id] = {
            "id": sub_id,
            "class_id": class_id,
            "student_id": student_id,
        }


class InMemoryWorkspace:
    """Stateful in-memory classroom + knowledge store object container (zero database required)."""

    def __init__(self, seed_defaults: bool = True) -> None:
        self.class_id: str = str(uuid.uuid4())
        self.student_id: str = str(uuid.uuid4())
        self.material_id: str = str(uuid.uuid4())
        self.submission_ids: list[str] = [str(uuid.uuid4()), str(uuid.uuid4())]
        self.model: str = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
        self.db: MockDBState = MockDBState()
        self.llm: DemoOpenRouterLLM = DemoOpenRouterLLM(model=self.model)
        self._stack: AsyncExitStack | None = None
        self.client: AsyncClient | None = None

        if seed_defaults:
            _seed_in_memory_classroom(
                self.db,
                class_id=self.class_id,
                class_subject="AP Chemistry",
                material_id=self.material_id,
                student_submissions=[(sid, self.student_id) for sid in self.submission_ids],
            )

    async def start(self, use_real_llm: bool = False) -> InMemoryWorkspace:
        """Activate in-memory runtime patches across cells until stop() is called."""
        await self.stop()
        stack = AsyncExitStack()
        _ = await stack.enter_async_context(
            offline_runtime(db_state=self.db, fake_llm=self.llm, use_real_llm=use_real_llm)
        )
        self._stack = stack
        return self

    async def start_api_client(self, use_real_llm: bool = False) -> AsyncClient:
        """Activate in-memory runtime and open an in-process FastAPI ASGI AsyncClient."""
        await self.start(use_real_llm=use_real_llm)
        assert self._stack is not None
        self.client = await self._stack.enter_async_context(api_client())
        return self.client

    async def stop(self) -> None:
        """Close active client and restore runtime patches."""
        if self._stack is not None:
            await self._stack.aclose()
            self._stack = None
            self.client = None

    def summary(self) -> dict[str, int]:
        """Return counts of all objects currently held in memory."""
        return {
            "classes": len(self.db.classes),
            "materials": len(self.db.materials),
            "material_trees": len(self.db.material_trees),
            "ontology_concepts": len(self.db.ontology_concepts),
            "ontology_relationships": len(self.db.ontology_relationships),
            "material_concept_mappings": len(self.db.material_concept_mappings),
            "student_concept_mastery": len(self.db.student_concept_mastery),
            "submission_evaluations": len(self.db.submission_evaluations),
            "ontology_misconceptions": len(self.db.ontology_misconceptions),
            "consolidation_runs": len(self.db.consolidation_runs),
        }


# ---------------------------------------------------------------------------
# LangGraph Demo State Machine
# ---------------------------------------------------------------------------


class DemoGraphState(TypedDict):
    """State for the LangGraph multi-turn copilot demonstration."""

    messages: Annotated[list[AnyMessage], add_messages]
    coverage_score: float
    confirmed: bool
    soft_warning_issued: bool
    reply_json: dict[str, object] | None


class DemoGraphInput(TypedDict, total=False):
    """Partial turn input for the LangGraph copilot demonstration."""

    messages: Annotated[list[AnyMessage], add_messages]
    coverage_score: float
    confirmed: bool
    soft_warning_issued: bool
    reply_json: dict[str, object] | None


def build_demo_graph(llm: Any, checkpointer: Any, store: Any):
    """Compile a 3-node LangGraph copilot mirroring Didactiq's soft-warning + memory flow."""

    async def gate_node(state: DemoGraphState) -> dict[str, object]:
        return {"soft_warning_issued": state["coverage_score"] < 0.4 and not state["confirmed"]}

    def route_after_gate(state: DemoGraphState) -> str:
        return "soft_warning" if state["soft_warning_issued"] else "diagnose"

    async def soft_warning_node(state: DemoGraphState) -> dict[str, object]:
        payload: dict[str, object] = {
            "text": (
                f"Course coverage is {round(state['coverage_score'] * 100)}%. "
                "Please confirm if you want to proceed with incomplete context."
            ),
            "requires_confirmation": True,
        }
        return {"messages": [AIMessage(content=json.dumps(payload))], "reply_json": payload}

    async def diagnose_node(state: DemoGraphState) -> dict[str, object]:
        pref = await store.aget(("teacher", "demo-instructor"), "style")
        style_note = pref.value["tone"] if pref else "Constructive"
        msgs = [
            SystemMessage(
                content=(
                    f"You are an AI pedagogical assistant (Tone: {style_note}). "
                    'Return JSON: {"text": "...", "visualization": null}.'
                )
            ),
            *state["messages"],
        ]
        ai_msg = await llm.ainvoke(msgs)
        parsed = parse_llm_response(cast(str, ai_msg.content))
        return {"messages": [AIMessage(content=json.dumps(parsed))], "reply_json": parsed}

    builder = StateGraph(DemoGraphState, input_schema=DemoGraphInput)
    builder.add_node("gate", gate_node)
    builder.add_node("soft_warning", soft_warning_node)
    builder.add_node("diagnose", diagnose_node)
    builder.add_edge(START, "gate")
    builder.add_conditional_edges(
        "gate",
        route_after_gate,
        {"soft_warning": "soft_warning", "diagnose": "diagnose"},
    )
    builder.add_edge("soft_warning", END)
    builder.add_edge("diagnose", END)
    return builder.compile(checkpointer=checkpointer)


# ---------------------------------------------------------------------------
# Unified Demo Session & 7-Act Story Orchestrator
# ---------------------------------------------------------------------------


class DemoSession:
    """Manages lifecycle, IDs, FastAPI client, and cleanup across all three demo modes."""

    def __init__(self, mode: DemoMode = "in_memory", base_url: str | None = None) -> None:
        self.mode: DemoMode = mode
        self.base_url: str | None = base_url or os.getenv("DEMO_BASE_URL") or None
        self.model: str = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
        self.db: MockDBState = MockDBState()
        self.llm: DemoOpenRouterLLM = DemoOpenRouterLLM(model=self.model)
        self._stack: AsyncExitStack | None = None
        self.client: AsyncClient | None = None
        self.live_ctx: LiveSandboxContext | None = None

        self.class_id: str = str(uuid.uuid4())
        self.class_subject: str = "AP Chemistry"
        self.material_id: str = str(uuid.uuid4())
        self.ada_student_id: str = str(uuid.uuid4())
        self.alan_student_id: str = str(uuid.uuid4())
        self.ada_sub_id: str = str(uuid.uuid4())
        self.alan_sub_id: str = str(uuid.uuid4())
        self.created_concept_ids: list[str] = []

    async def start(self) -> AsyncClient:
        """Initialize the requested demo backend and return a ready httpx AsyncClient."""
        await self.stop()
        stack = AsyncExitStack()
        self._stack = stack

        if self.mode in ("in_memory", "in_memory_real_llm"):
            use_real = self.mode == "in_memory_real_llm"
            _seed_in_memory_classroom(
                self.db,
                class_id=self.class_id,
                class_subject=self.class_subject,
                material_id=self.material_id,
                student_submissions=[
                    (self.ada_sub_id, self.ada_student_id),
                    (self.alan_sub_id, self.alan_student_id),
                ],
            )
            _ = await stack.enter_async_context(
                offline_runtime(db_state=self.db, fake_llm=self.llm, use_real_llm=use_real)
            )
            self.client = await stack.enter_async_context(api_client())
            return self.client

        if not os.environ.get("OPENROUTER_API_KEY", "").strip():
            raise ValueError("OPENROUTER_API_KEY is required for DEMO_MODE='live'.")
        if not await is_postgres_reachable():
            raise RuntimeError("PostgreSQL at POSTGRES_URI is not reachable for DEMO_MODE='live'.")

        ctx = await stack.enter_async_context(live_db_sandbox())
        self.live_ctx = ctx
        self.class_id = ctx.class_id
        self.material_id = ctx.material_id

        cls_row = await fetch_one("SELECT subject FROM public.classes WHERE id = %s", (ctx.class_id,))
        self.class_subject = str(cls_row["subject"]) if cls_row and cls_row.get("subject") else "AP Chemistry"
        if ctx.student_id:
            self.ada_student_id = ctx.student_id
            self.alan_student_id = ctx.student_id
        if len(ctx.submission_ids) >= 2:
            self.ada_sub_id, self.alan_sub_id = ctx.submission_ids[0], ctx.submission_ids[1]

        self.client = await stack.enter_async_context(api_client(base_url=self.base_url))
        return self.client

    async def stop(self) -> None:
        """Tear down live/in-memory resources cleanly."""
        if self._stack is not None:
            if self.live_ctx is not None and self.created_concept_ids:
                self.live_ctx.created_concept_ids.extend(self.created_concept_ids)
                self.created_concept_ids.clear()
            await self._stack.aclose()
            self._stack = None
            self.client = None
            self.live_ctx = None

    def active_llm(self) -> Any:
        """Return live ChatOpenAI or DemoOpenRouterLLM matching current mode."""
        if self.mode in ("in_memory_real_llm", "live"):
            return get_openrouter_llm(self.model, os.environ["OPENROUTER_API_KEY"])
        return self.llm

    def status_summary(self) -> dict[str, object]:
        """Return high-level Knowledge Base counts for display."""
        if self.mode == "live":
            return {
                "mode": self.mode,
                "class_id": self.class_id,
                "material_id": self.material_id,
                "tracked_concepts": len(self.created_concept_ids),
            }
        return {
            "mode": self.mode,
            "classes": len(self.db.classes),
            "material_trees": len(self.db.material_trees),
            "ontology_concepts": len(self.db.ontology_concepts),
            "ontology_relationships": len(self.db.ontology_relationships),
            "student_concept_mastery": len(self.db.student_concept_mastery),
            "submission_evaluations": len(self.db.submission_evaluations),
            "ontology_misconceptions": len(self.db.ontology_misconceptions),
            "consolidation_runs": len(self.db.consolidation_runs),
        }

    def ada_submission_payload(self) -> dict[str, Any]:
        """Strong student submission payload for /api/grade."""
        return {
            "submission_id": self.ada_sub_id,
            "class_id": self.class_id,
            "student_id": self.ada_student_id,
            "material_id": self.material_id,
            "material_name": "Lab 1: Chemical Kinetics",
            "max_score": 100.0,
            "rubric_criteria": [
                {"id": "crit-kinetics-1", "name": "Conceptual Understanding", "maxScore": 50.0, "description": "Collision theory & catalysis"},
                {"id": "crit-kinetics-2", "name": "Quantitative Calculations", "maxScore": 50.0, "description": "Rate order & units"},
            ],
            "submission_text": (
                "Student: Ada Lovelace. Doubling [A] quadruples rate, indicating second-order kinetics. "
                "Catalysts lower both forward and reverse barriers equally without changing K."
            ),
        }

    def alan_submission_payload(self) -> dict[str, Any]:
        """Misconception-carrying student submission payload for /api/grade."""
        return {
            "submission_id": self.alan_sub_id,
            "class_id": self.class_id,
            "student_id": self.alan_student_id,
            "material_id": self.material_id,
            "material_name": "Lab 1: Chemical Kinetics",
            "max_score": 100.0,
            "rubric_criteria": [
                {"id": "crit-kinetics-1", "name": "Conceptual Understanding", "maxScore": 50.0, "description": "Collision theory & catalysis"},
                {"id": "crit-kinetics-2", "name": "Quantitative Calculations", "maxScore": 50.0, "description": "Rate order & units"},
            ],
            "submission_text": (
                "Student: Alan Turing. Reaction is second order in A. Adding a catalyst lowers Ea "
                "and shifts equilibrium toward products to increase final yield."
            ),
        }


class KnowledgeBaseDemo:
    """Step-by-step interactive orchestrator shared by the CLI demo and Jupyter notebook."""

    def __init__(self, mode: DemoMode = "in_memory", base_url: str | None = None) -> None:
        self.session: DemoSession = DemoSession(mode=mode, base_url=base_url)
        self.c_kinetics: str = ""
        self.c_rates: str = ""
        self.c_mech: str = ""

    async def start(self) -> AsyncClient:
        """Start the underlying DemoSession and return the active httpx AsyncClient."""
        client = await self.session.start()
        print(
            f"Demo initialized | mode={self.session.mode} | model={self.session.model} | "
            f"target={self.session.base_url or 'in-process FastAPI ASGI'}"
        )
        return client

    async def stop(self) -> None:
        """Clean up session resources."""
        await self.session.stop()

    def _client(self) -> AsyncClient:
        if self.session.client is None:
            raise RuntimeError("Call await demo.start() before executing demo acts.")
        return self.session.client

    async def act1_pre_ingestion_gate(
        self,
        prompt: str = "Why are students struggling with Rate Laws and Catalysis?",
    ) -> dict[str, Any]:
        """ACT 1: Verify backend health and observe pre-ingestion soft-warning gate."""
        client = self._client()
        banner("ACT 1", "Pre-Ingestion Soft-Warning Gate (GET /api/health + POST /api/chat)")
        health = await client.get("/api/health", headers={"x-request-id": "demo-act1-health"})
        print(f"Backend Health: {health.json()} (x-request-id={health.headers.get('x-request-id')})")

        act1_chat = await client.post(
            "/api/chat",
            json=sample_chat_payload(
                prompt=prompt,
                class_id=self.session.class_id,
                confirmed_soft_warning=False,
            ),
        )
        warn_data = cast(dict[str, Any], act1_chat.json())
        print(
            f"Soft-Warning Gate: status_flag={warn_data.get('status_flag')} | "
            f"coverage={warn_data.get('coverage_score')} | "
            f"missing_terms={warn_data.get('missing_terms')}"
        )
        print(f"Assistant Caveat:\n{warn_data.get('text')}")
        return warn_data

    async def act2_ingest_curriculum(self) -> dict[str, Any]:
        """ACT 2: Analyze long curriculum textbook, render PageIndex tree, and link ontology CTE."""
        from src.service.ontology import OntologyService
        from src.types.ai import MaterialConceptMapping, OntologyConcept, OntologyRelationship

        client = self._client()
        banner("ACT 2", "Material Ingestion -> PageIndex Tree + Prerequisite Ontology (POST /api/materials/analyze & /tree)")
        analyze_resp = await client.post(
            "/api/materials/analyze",
            json=sample_material_analyze_request(
                material_id=self.session.material_id,
                class_id=self.session.class_id,
                long_document=True,
            ),
        )
        analyze_data = cast(dict[str, Any], analyze_resp.json())
        print(f"Summary: {analyze_data.get('summary')}")
        print(f"Difficulty: {analyze_data.get('difficulty_level')} | Tree Indexed: {analyze_data.get('tree_indexed')}")
        print(f"Detected Prerequisite Gaps: {json.dumps(analyze_data.get('prerequisite_gaps'), indent=2)}")

        tree_resp = await client.post(
            "/api/materials/tree",
            json={"material_id": self.session.material_id, "force_rebuild": False},
        )
        tree_data = cast(dict[str, Any], tree_resp.json())
        print(f"Tree Retrieval cached={tree_data.get('cached')}:")
        render_material_tree(cast(dict[str, Any], tree_data["tree"]))

        c_stoich = await OntologyService.upsert_concept(
            OntologyConcept(subject=self.session.class_subject, code="CHEM-1.1", name="Stoichiometry", description="Molar conversions", bloom_level="Apply")
        )
        self.c_kinetics = await OntologyService.upsert_concept(
            OntologyConcept(subject=self.session.class_subject, code="CHEM-5.0", name="Chemical Kinetics", description="Reaction velocity & collision theory", bloom_level="Understand")
        )
        self.c_rates = await OntologyService.upsert_concept(
            OntologyConcept(subject=self.session.class_subject, code="CHEM-5.1", name="Rate Laws", description="Differential rate laws and orders", bloom_level="Analyze")
        )
        self.c_mech = await OntologyService.upsert_concept(
            OntologyConcept(subject=self.session.class_subject, code="CHEM-5.3", name="Reaction Mechanisms", description="Catalysis and rate-determining steps", bloom_level="Evaluate")
        )
        self.session.created_concept_ids.extend([c_stoich, self.c_kinetics, self.c_rates, self.c_mech])

        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(source_concept_id=c_stoich, target_concept_id=self.c_kinetics, relationship_type="prerequisite_of")
        )
        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(source_concept_id=self.c_kinetics, target_concept_id=self.c_rates, relationship_type="prerequisite_of")
        )
        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(source_concept_id=self.c_rates, target_concept_id=self.c_mech, relationship_type="prerequisite_of")
        )
        await OntologyService.link_material_to_concepts(
            [
                MaterialConceptMapping(material_id=self.session.material_id, concept_id=self.c_kinetics, page_number=1, relationship="teaches"),
                MaterialConceptMapping(material_id=self.session.material_id, concept_id=self.c_rates, page_number=2, relationship="teaches"),
            ]
        )

        cte_rows = await OntologyService.get_prerequisite_graph_cte([self.c_mech], max_depth=3)
        print("\nRecursive CTE Prerequisite Chain for 'Reaction Mechanisms':")
        render_prereq_chain(cte_rows)
        return analyze_data

    async def act3_grade_students(self) -> tuple[dict[str, Any], dict[str, Any]]:
        """ACT 3: Grade student submissions and display updated concept mastery matrix."""
        client = self._client()
        banner("ACT 3", "Student Submissions -> Autonomous Grading & Concept Mastery (POST /api/grade)")
        ada_grade = cast(dict[str, Any], (await client.post("/api/grade", json=self.session.ada_submission_payload())).json())
        alan_grade = cast(dict[str, Any], (await client.post("/api/grade", json=self.session.alan_submission_payload())).json())
        print(f"Ada Lovelace -> Score: {ada_grade['score']}/{ada_grade['max_score']} ({ada_grade['grade']}) | Misconceptions: {ada_grade['detected_misconceptions']}")
        print(f"Alan Turing  -> Score: {alan_grade['score']}/{alan_grade['max_score']} ({alan_grade['grade']}) | Misconceptions: {alan_grade['detected_misconceptions']}")

        if self.session.mode != "live":
            mastery_view = [
                {
                    "student_label": "Ada Lovelace" if row["student_id"] == self.session.ada_student_id else "Alan Turing",
                    "concept_name": self.session.db.ontology_concepts.get(row["concept_id"], {}).get("name", row["concept_id"]),
                    "mastery_score": row["mastery_score"],
                    "status": row["status"],
                }
                for row in self.session.db.student_concept_mastery.values()
            ]
            print("\nUpdated In-Memory Concept Mastery Matrix:")
            render_mastery_rows(mastery_view)
        return ada_grade, alan_grade

    async def act4_consolidate_and_review(self) -> dict[str, Any]:
        """ACT 4: Inject graph drift, run anti-drift consolidation + dreaming, and review misconceptions."""
        from src.service.ontology import OntologyService
        from src.types.ai import OntologyConcept, OntologyRelationship

        client = self._client()
        banner("ACT 4", "Graph Drift Repair, Misconception Dreaming & Teacher Review")
        c_orphan = await OntologyService.upsert_concept(
            OntologyConcept(subject=self.session.class_subject, name="Electrochemistry Orphan", description="Unlinked stray concept")
        )
        self.session.created_concept_ids.append(c_orphan)
        _ = await OntologyService.upsert_relationship(
            OntologyRelationship(source_concept_id=self.c_rates, target_concept_id=self.c_kinetics, relationship_type="prerequisite_of")
        )

        cons_data = cast(
            dict[str, Any],
            (
                await client.post(
                    "/api/consolidation/run",
                    json={"class_id": self.session.class_id, "run_type": "daily", "force_dreaming": True},
                )
            ).json(),
        )
        if self.session.live_ctx:
            self.session.live_ctx.created_run_ids.append(str(cons_data["run_id"]))
        print(f"Consolidation Summary: {cons_data['summary']}")

        proposed = cast(
            list[dict[str, Any]],
            (await client.get("/api/misconceptions/proposed", params={"class_id": self.session.class_id})).json(),
        )
        print("\nProposed Misconceptions Surfaced for Gradebook Review:")
        render_misconceptions(proposed)

        if proposed:
            misc_id = proposed[0]["id"]
            rev = (
                await client.post(
                    f"/api/misconceptions/{misc_id}/review",
                    json={"status": "confirmed", "reviewer_id": None},
                )
            ).json()
            print(f"\nTeacher Confirmed Misconception: {rev}")
        return cons_data

    async def act5_grounded_rag_copilot(
        self,
        prompt: str = "Chemical Kinetics and Rate Laws",
    ) -> dict[str, Any]:
        """ACT 5: Query /api/chat after ingestion with dual-engine context and visualization."""
        client = self._client()
        banner("ACT 5", "Grounded Dual-Engine RAG Copilot (POST /api/chat)")
        rag_resp = cast(
            dict[str, Any],
            (
                await client.post(
                    "/api/chat",
                    json=sample_chat_payload(
                        prompt=prompt,
                        class_id=self.session.class_id,
                        confirmed_soft_warning=False,
                    ),
                )
            ).json(),
        )
        print(f"Soft Warning Triggered? {bool(rag_resp.get('is_soft_warning', False))}")
        print(f"\nAssistant Response:\n{rag_resp.get('text')}\n")
        render_visualization(cast(dict[str, Any] | None, rag_resp.get("visualization")))
        return rag_resp

    async def act6_langgraph_checkpointing(self) -> int:
        """ACT 6: Run multi-turn LangGraph copilot flow with checkpointer and store."""
        banner("ACT 6", "LangGraph Multi-Turn Checkpointer & Memory Store Flow")
        lg_thread = f"demo-lg-{uuid.uuid4().hex[:8]}"
        lg_cfg: RunnableConfig = {"configurable": {"thread_id": lg_thread}}
        active_llm = self.session.active_llm()

        if self.session.mode == "live":
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            from langgraph.store.postgres.aio import AsyncPostgresStore
            import psycopg

            lg_uri = build_langgraph_postgres_uri()
            try:
                async with (
                    AsyncPostgresSaver.from_conn_string(lg_uri) as cp,
                    AsyncPostgresStore.from_conn_string(lg_uri) as st,
                ):
                    await cp.setup()
                    await st.setup()
                    await st.aput(("teacher", "demo-instructor"), "style", {"tone": "Socratic"})
                    graph = build_demo_graph(active_llm, cp, st)
                    _ = await graph.ainvoke(
                        {
                            "messages": [HumanMessage(content="Summarize Rate Laws mastery.")],
                            "coverage_score": 0.8,
                            "confirmed": True,
                            "soft_warning_issued": False,
                            "reply_json": None,
                        },
                        config=lg_cfg,
                    )
                    state_snap = await graph.aget_state(lg_cfg)
                    msg_count = len(state_snap.values["messages"])
                    print(f"Live Postgres Checkpointed Messages: {msg_count}")
                    return msg_count
            finally:
                async with await psycopg.AsyncConnection.connect(lg_uri) as conn:
                    async with conn.cursor() as cur:
                        _ = await cur.execute("DELETE FROM langgraph.checkpoint_writes WHERE thread_id = %s", (lg_thread,))
                        _ = await cur.execute("DELETE FROM langgraph.checkpoint_blobs WHERE thread_id = %s", (lg_thread,))
                        _ = await cur.execute("DELETE FROM langgraph.checkpoints WHERE thread_id = %s", (lg_thread,))

        cp = MemorySaver()
        st = InMemoryStore()
        await st.aput(("teacher", "demo-instructor"), "style", {"tone": "Socratic"})
        graph = build_demo_graph(active_llm, cp, st)
        t1 = await graph.ainvoke(
            {
                "messages": [HumanMessage(content="Explain student gaps in Catalysis.")],
                "coverage_score": 0.25,
                "confirmed": False,
                "soft_warning_issued": False,
                "reply_json": None,
            },
            config=lg_cfg,
        )
        print("Turn 1 (Low coverage gate):", t1["reply_json"])
        t2 = await graph.ainvoke(
            {"messages": [HumanMessage(content="Proceed anyway.")], "confirmed": True},
            config=lg_cfg,
        )
        print("Turn 2 (Confirmed diagnosis):", t2["reply_json"])
        msg_count = len(graph.get_state(lg_cfg).values["messages"])
        print(f"In-Memory Checkpointed Messages: {msg_count}")
        return msg_count

    def act7_summary(self) -> dict[str, object]:
        """ACT 7: Print final Knowledge Base state summary."""
        banner("ACT 7", "Final Knowledge Base Snapshot")
        summary = self.session.status_summary()
        print(json.dumps(summary, indent=2))
        return summary


async def run_full_knowledge_base_demo(
    mode: DemoMode = "in_memory",
    base_url: str | None = None,
) -> dict[str, object]:
    """Execute the complete 7-act Knowledge Base in Action demonstration."""
    demo = KnowledgeBaseDemo(mode=mode, base_url=base_url)
    _ = await demo.start()
    try:
        _ = await demo.act1_pre_ingestion_gate()
        _ = await demo.act2_ingest_curriculum()
        _ = await demo.act3_grade_students()
        _ = await demo.act4_consolidate_and_review()
        _ = await demo.act5_grounded_rag_copilot()
        _ = await demo.act6_langgraph_checkpointing()
        return demo.act7_summary()
    finally:
        await demo.stop()


__all__ = [
    "DemoMode",
    "DemoOpenRouterLLM",
    "DemoSession",
    "InMemoryWorkspace",
    "KnowledgeBaseDemo",
    "banner",
    "build_demo_graph",
    "get_notebook_llm",
    "pretty_print",
    "render_mastery_rows",
    "render_material_tree",
    "render_misconceptions",
    "render_prereq_chain",
    "render_visualization",
    "resolve_demo_mode",
    "run_full_knowledge_base_demo",
    "setup_backend_env",
]
