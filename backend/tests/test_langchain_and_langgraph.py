"""Interactive (# %%) & pytest suite for LangChain, OpenRouter LLM helpers, and LangGraph state/store.

Run interactively cell-by-cell in VS Code/Jupyter, directly via:
    uv run python tests/test_langchain_and_langgraph.py
or via pytest:
    uv run pytest tests/test_langchain_and_langgraph.py
    uv run pytest tests/test_langchain_and_langgraph.py --live
"""

# %% [1] Imports & Environment Configuration
import asyncio
import json
import os
from pathlib import Path
import sys
from typing import Annotated, Any, TypedDict, cast
import uuid

_BASE_DIR = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
_BACKEND_DIR = next(
    (p for p in (_BASE_DIR, *_BASE_DIR.parents, _BASE_DIR / "backend") if (p / "src" / "main.py").exists()),
    _BASE_DIR.parent,
)
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
import pytest

from tests._harness import (
    FakeOpenRouterLLM,
    build_langgraph_postgres_uri,
    get_test_config,
    is_postgres_reachable,
    print_environment_banner,
    run_interactive_cell,
    run_interactive_suite,
    sample_chat_payload,
)
from src.lib.formatter import (
    format_analysis_config_context,
    format_classroom_context,
    format_students_context,
)
from src.lib.llm import get_openrouter_llm, parse_llm_response
from src.types.schemas import ChatPayload

CONFIG = print_environment_banner("LangChain & LangGraph Suite")


# %% [2] Prompt Formatters (Classroom, Students, AnalysisConfig)
def test_prompt_formatters() -> None:
    """Verify formatter utilities serialize classroom metadata, students, and empty defaults safely."""
    payload = ChatPayload(**sample_chat_payload())
    class_ctx = format_classroom_context(payload)
    assert "Fall 2026 Science" in class_ctx
    assert "AP Chemistry" in class_ctx
    assert "Chemical Kinetics Textbook" in class_ctx
    assert "Lab Feedback Tone" in class_ctx

    students_ctx = format_students_context(payload.students)
    assert "Ada Lovelace" in students_ctx
    assert "Lab 1: 94.0/100.0" in students_ctx
    assert "Goal: AP Honors" in students_ctx

    cfg_ctx = format_analysis_config_context(payload.newAnalysisConfig)
    assert "Analysis Focus: diagnostic" in cfg_ctx
    assert "Highlight prerequisite concepts" in cfg_ctx

    # Minimal / empty edge cases
    minimal = ChatPayload(messages=[])
    assert "No reference files uploaded." in format_classroom_context(minimal)
    assert "No custom instruction rubrics." in format_classroom_context(minimal)
    assert format_analysis_config_context(None) == ""


run_interactive_cell(test_prompt_formatters)


# %% [3] OpenRouter LLM Factory & JSON Response Parser
def test_llm_factory_and_json_parser() -> None:
    """Verify OpenRouter ChatOpenAI configuration and defensive markdown/JSON parsing."""
    orig_referer = os.environ.get("OPENROUTER_HTTP_REFERER")
    try:
        os.environ["OPENROUTER_HTTP_REFERER"] = "https://didactiq.test"
        llm = get_openrouter_llm("google/gemini-2.5-flash", "sk-or-test-key")
        assert llm.model_name == "google/gemini-2.5-flash"
        assert llm.openai_api_base == "https://openrouter.ai/api/v1"
        assert llm.temperature == 0.7
        extra_headers = llm.model_kwargs.get("extra_headers", {})
        assert extra_headers.get("HTTP-Referer") == "https://didactiq.test"
    finally:
        if orig_referer is None:
            os.environ.pop("OPENROUTER_HTTP_REFERER", None)
        else:
            os.environ["OPENROUTER_HTTP_REFERER"] = orig_referer

    # Plain JSON
    assert parse_llm_response('{"text": "Hello", "visualization": null}') == {
        "text": "Hello",
        "visualization": None,
    }

    # Markdown code-fenced JSON
    fenced = '```json\n{"text": "Fenced response", "visualization": {"type": "stats", "data": []}}\n```'
    parsed_fenced = parse_llm_response(fenced)
    assert parsed_fenced["text"] == "Fenced response"
    assert isinstance(parsed_fenced["visualization"], dict)

    # Non-dict JSON coerces into {"raw": ...}
    assert parse_llm_response("[1, 2, 3]") == {"raw": [1, 2, 3]}

    # Non-string input coerces via str(...) and raises ValueError if invalid JSON
    with pytest.raises(ValueError, match="malformed JSON"):
        _ = parse_llm_response("not valid json {broken")


run_interactive_cell(test_llm_factory_and_json_parser)


# %% [4] LangChain ChatPromptTemplate + LCEL Chain Execution
async def test_langchain_prompt_chain() -> None:
    """Verify ChatPromptTemplate with history placeholder piped into LLM & parsed cleanly."""
    cfg = get_test_config()
    use_live = cfg.mode == "live" and cfg.has_openrouter_key

    prompt = ChatPromptTemplate.from_messages(
        [
            SystemMessage(
                content=(
                    "You are an AI pedagogical assistant. "
                    'Respond strictly in JSON: {"text": "...", "visualization": null}.'
                )
            ),
            ("placeholder", "{history}"),
            ("user", "Topic: {topic}. Summarize one diagnostic action."),
        ]
    )

    llm = (
        get_openrouter_llm(cfg.model, os.environ["OPENROUTER_API_KEY"])
        if use_live
        else FakeOpenRouterLLM()
    )
    chain = prompt | llm

    msg = await chain.ainvoke(
        {
            "history": [("user", "Earlier we covered stoichiometry."), ("assistant", "Noted!")],
            "topic": "Rate Laws",
        }
    )
    parsed = parse_llm_response(cast(str, msg.content))
    assert isinstance(parsed.get("text"), str)
    assert len(str(parsed["text"]).strip()) > 0

    if isinstance(llm, FakeOpenRouterLLM):
        assert "Earlier we covered stoichiometry." in llm.recorded_prompts[0]
        assert "Topic: Rate Laws." in llm.recorded_prompts[0]


run_interactive_cell(test_langchain_prompt_chain)


# %% [5] LangGraph StateGraph Multi-Turn Checkpointing (MemorySaver Offline)
class PedagogicalGraphState(TypedDict):
    """Minimal multi-turn diagnostic agent state mimicking Didactiq soft-warning + RAG turn."""

    messages: Annotated[list[AnyMessage], add_messages]
    class_id: str
    coverage_score: float
    confirmed: bool
    soft_warning_issued: bool
    diagnosis_json: dict[str, object] | None


class PedagogicalGraphInput(TypedDict, total=False):
    """Partial state update / turn input accepted by the compiled StateGraph."""

    messages: Annotated[list[AnyMessage], add_messages]
    class_id: str
    coverage_score: float
    confirmed: bool
    soft_warning_issued: bool
    diagnosis_json: dict[str, object] | None


def _build_pedagogical_graph(llm: object, checkpointer: object):
    """Construct compiled StateGraph with soft-warning gate and diagnostic LLM node."""

    async def gate_node(state: PedagogicalGraphState) -> dict[str, object]:
        needs_warning = state["coverage_score"] < 0.4 and not state["confirmed"]
        return {"soft_warning_issued": needs_warning}

    def route_after_gate(state: PedagogicalGraphState) -> str:
        return "soft_warning" if state["soft_warning_issued"] else "diagnose"

    async def soft_warning_node(state: PedagogicalGraphState) -> dict[str, object]:
        msg = AIMessage(
            content=json.dumps(
                {
                    "text": (
                        f"Incomplete coverage ({round(state['coverage_score'] * 100)}%). "
                        "Confirm to continue."
                    ),
                    "is_soft_warning": True,
                    "visualization": None,
                }
            )
        )
        return {"messages": [msg], "diagnosis_json": None}

    async def diagnose_node(state: PedagogicalGraphState) -> dict[str, object]:
        prompt = ChatPromptTemplate.from_messages(
            [
                SystemMessage(
                    content=(
                        "You are an AI pedagogical assistant. "
                        'Return strictly JSON: {"text": "...", "visualization": null}.'
                    )
                ),
                ("placeholder", "{history}"),
            ]
        )
        formatted = prompt.format_messages(history=state["messages"])
        ai_msg = await cast(FakeOpenRouterLLM, llm).ainvoke(formatted)
        parsed = parse_llm_response(cast(str, ai_msg.content))
        return {
            "messages": [AIMessage(content=json.dumps(parsed))],
            "diagnosis_json": parsed,
        }

    builder = StateGraph(PedagogicalGraphState, input_schema=PedagogicalGraphInput)
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
    return builder.compile(checkpointer=cast(Any, checkpointer))


async def test_langgraph_statemachine_memory_checkpointing() -> None:
    """Verify LangGraph StateGraph branching, thread_id state persistence, and checkpoint history."""
    fake_llm = FakeOpenRouterLLM()
    saver = MemorySaver()
    graph = _build_pedagogical_graph(fake_llm, saver)

    thread_id = f"test-thread-{uuid.uuid4().hex[:8]}"
    run_cfg: Any = {"configurable": {"thread_id": thread_id}}

    # Turn 1: Low coverage without confirmation -> stops at soft_warning
    turn1 = await graph.ainvoke(
        {
            "messages": [HumanMessage(content="Diagnose student gaps in Rate Laws")],
            "class_id": "cls-1",
            "coverage_score": 0.2,
            "confirmed": False,
            "soft_warning_issued": False,
            "diagnosis_json": None,
        },
        config=run_cfg,
    )
    assert turn1["soft_warning_issued"] is True
    assert turn1["diagnosis_json"] is None
    assert len(turn1["messages"]) == 2

    # Turn 2: Teacher confirms continuation on the same thread_id -> routes to diagnose_node
    turn2 = await graph.ainvoke(
        {
            "messages": [HumanMessage(content="Yes, proceed with available materials.")],
            "confirmed": True,
        },
        config=run_cfg,
    )
    assert turn2["soft_warning_issued"] is False
    assert isinstance(turn2["diagnosis_json"], dict)
    assert "text" in turn2["diagnosis_json"]
    # Prior turns preserved in checkpointed message history
    assert len(turn2["messages"]) == 4

    snapshot = await graph.aget_state(run_cfg)
    assert len(snapshot.values["messages"]) == 4

    history = [state async for state in graph.aget_state_history(run_cfg)]
    assert len(history) >= 2


run_interactive_cell(test_langgraph_statemachine_memory_checkpointing)


# %% [6] Live LangGraph PostgreSQL Checkpointer & Store (langgraph.* schema)
@pytest.mark.live
async def test_langgraph_postgres_saver_and_store_live() -> None:
    """Verify AsyncPostgresSaver and AsyncPostgresStore against live langgraph schema."""
    cfg = get_test_config()
    if cfg.mode == "offline":
        pytest.skip("Skipped in offline mode (run with --live or DIDACTIQ_TEST_MODE=live).")
    if not cfg.has_postgres_uri or not await is_postgres_reachable():
        pytest.skip("PostgreSQL at POSTGRES_URI is not configured or reachable.")

    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    from langgraph.store.postgres.aio import AsyncPostgresStore
    import psycopg

    lg_uri = build_langgraph_postgres_uri()
    llm = (
        get_openrouter_llm(cfg.model, os.environ["OPENROUTER_API_KEY"])
        if cfg.has_openrouter_key
        else FakeOpenRouterLLM()
    )

    thread_id = f"live-lg-thread-{uuid.uuid4().hex[:8]}"
    store_ns = ("teacher_preferences", f"test_{uuid.uuid4().hex[:8]}")

    try:
        async with (
            AsyncPostgresSaver.from_conn_string(lg_uri) as checkpointer,
            AsyncPostgresStore.from_conn_string(lg_uri) as store,
        ):
            await checkpointer.setup()
            await store.setup()

            graph = _build_pedagogical_graph(llm, checkpointer)
            run_cfg: Any = {"configurable": {"thread_id": thread_id}}

            res = await graph.ainvoke(
                {
                    "messages": [HumanMessage(content="Summarize Kinetics readiness.")],
                    "class_id": "cls-live",
                    "coverage_score": 0.9,
                    "confirmed": True,
                    "soft_warning_issued": False,
                    "diagnosis_json": None,
                },
                config=run_cfg,
            )
            assert isinstance(res["diagnosis_json"], dict)

            persisted_state = await graph.aget_state(run_cfg)
            assert len(persisted_state.values["messages"]) == 2

            await store.aput(store_ns, "grading_tone", {"style": "Socratic", "concise": True})
            item = await store.aget(store_ns, "grading_tone")
            assert item is not None
            assert item.value["style"] == "Socratic"
    finally:
        # Clean up ephemeral checkpoint & store rows
        async with await psycopg.AsyncConnection.connect(lg_uri) as conn:
            async with conn.cursor() as cur:
                _ = await cur.execute(
                    "DELETE FROM langgraph.checkpoint_writes WHERE thread_id = %s",
                    (thread_id,),
                )
                _ = await cur.execute(
                    "DELETE FROM langgraph.checkpoint_blobs WHERE thread_id = %s",
                    (thread_id,),
                )
                _ = await cur.execute(
                    "DELETE FROM langgraph.checkpoints WHERE thread_id = %s",
                    (thread_id,),
                )
                _ = await cur.execute(
                    "DELETE FROM langgraph.store WHERE prefix = %s",
                    (".".join(store_ns),),
                )


run_interactive_cell(test_langgraph_postgres_saver_and_store_live)


# %% [7] Direct CLI Entrypoint
if __name__ == "__main__":
    asyncio.run(
        run_interactive_suite(
            "LangChain & LangGraph",
            [
                ("prompt_formatters", test_prompt_formatters),
                ("llm_factory_and_json_parser", test_llm_factory_and_json_parser),
                ("langchain_prompt_chain", test_langchain_prompt_chain),
                ("langgraph_memory_checkpointing", test_langgraph_statemachine_memory_checkpointing),
                ("langgraph_postgres_live", test_langgraph_postgres_saver_and_store_live),
            ],
        )
    )
