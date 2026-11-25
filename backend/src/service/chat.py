from __future__ import annotations

import os
import re
from typing import Any, cast

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from src.lib.db import fetch_all, fetch_one
from src.lib.formatter import (
    format_analysis_config_context,
    format_classroom_context,
    format_students_context,
)
from src.lib.llm import get_openrouter_llm, parse_llm_response
from src.lib.logger import chat_logger, measure_async
from src.service.ontology import OntologyService
from src.service.tree_indexer import TreeIndexerService
from src.types.schemas import ChatPayload

_STOP_WORDS = {
    "the", "and", "for", "with", "that", "this", "from", "have", "what",
    "how", "why", "when", "where", "who", "which", "about", "show", "tell",
    "give", "please", "help", "class", "student", "teacher", "workspace",
}


def _extract_query_terms(text: str) -> list[str]:
    """Extract salient search terms from user prompt."""
    tokens = re.findall(r"\b[A-Za-z0-9_-]{3,}\b", text.lower())
    terms = [t for t in tokens if t not in _STOP_WORDS]
    return terms[:8] if terms else ["curriculum"]


class ChatService:
    """Service to coordinate data context formatting, dual-engine knowledge retrieval, soft-warning verification, and LLM operations."""

    @classmethod
    async def _resolve_class_id(cls, payload: ChatPayload) -> str | None:
        """Resolve UUID of classroom if not directly supplied in payload."""
        if payload.class_id:
            return payload.class_id

        class_name = payload.classItemName or payload.workspaceName
        if not class_name:
            return None

        sql = "SELECT id FROM public.classes WHERE name ILIKE %s LIMIT 1"
        row = await fetch_one(sql, (f"%{class_name}%",))
        return str(row["id"]) if row else None

    @classmethod
    async def _retrieve_knowledge_context(
        cls, class_id: str | None, query_terms: list[str]
    ) -> str:
        """Dual-Engine Retrieval: PageIndex Tree Navigation + Recursive CTE Prerequisite Traversal (<25ms total)."""
        retrieved_sections: list[str] = []

        if not class_id:
            return ""

        # 1. PageIndex Hierarchical Document Tree Traversal (<15ms)
        tree_materials_sql = """
        SELECT m.id, m.name
        FROM public.materials m
        JOIN public.class_materials cm ON cm.material_id = m.id
        JOIN ai.material_trees t ON t.material_id = m.id
        WHERE cm.class_id = %s
        LIMIT 3;
        """
        tree_materials = await fetch_all(tree_materials_sql, (class_id,))
        for mat in tree_materials:
            traversal = await TreeIndexerService.traverse_tree(
                material_id=str(mat["id"]), query_terms=query_terms
            )
            if traversal.selected_excerpts:
                retrieved_sections.append(
                    f"--- DOCUMENT TREE: {mat['name']} ---\n"
                    + "\n".join(traversal.selected_excerpts)
                )

        # 2. Recursive CTE Graph Traversal for Prerequisite Chains (<10ms)
        concept_find_sql = """
        SELECT c.id, c.name
        FROM ai.ontology_concepts c
        WHERE c.name ILIKE ANY(%s)
        LIMIT 5;
        """
        term_patterns = [f"%{t}%" for t in query_terms]
        matched_concepts = await fetch_all(concept_find_sql, (term_patterns,))
        if matched_concepts:
            concept_ids = [str(c["id"]) for c in matched_concepts]
            prereq_graph = await OntologyService.get_prerequisite_graph_cte(
                concept_ids, max_depth=3
            )
            if prereq_graph:
                graph_lines = [
                    f"- {p['concept_name']} (Bloom: {p['bloom_level']}, Depth: {p['depth']}): {p['description'][:120]}"
                    for p in prereq_graph[:6]
                ]
                retrieved_sections.append(
                    "--- PREREQUISITE ONTOLOGY CHAINS ---\n" + "\n".join(graph_lines)
                )

        # 3. Dynamic Student Mastery Summary for Class
        mastery_sql = """
        SELECT c.name AS concept_name, AVG(m.mastery_score) AS avg_score, COUNT(m.student_id) AS student_count
        FROM ai.student_concept_mastery m
        JOIN ai.ontology_concepts c ON c.id = m.concept_id
        WHERE m.class_id = %s
        GROUP BY c.name
        ORDER BY avg_score ASC
        LIMIT 5;
        """
        mastery_rows = await fetch_all(mastery_sql, (class_id,))
        if mastery_rows:
            mastery_lines = [
                f"- {m['concept_name']}: Class Avg {round(float(m['avg_score']) * 100)}% ({m['student_count']} students assessed)"
                for m in mastery_rows
            ]
            retrieved_sections.append(
                "--- CURRICULUM MASTERY SNAPSHOT ---\n" + "\n".join(mastery_lines)
            )

        return "\n\n".join(retrieved_sections)

    @classmethod
    async def process_chat_message(
        cls, payload: ChatPayload, model: str
    ) -> dict[str, object]:
        chat_logger.info(
            "Processing chat message: model=%s, message_count=%d, student_count=%d",
            model,
            len(payload.messages),
            len(payload.students),
        )

        api_key_str = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key_str:
            chat_logger.error("Missing OPENROUTER_API_KEY environment variable")
            raise ValueError("OPENROUTER_API_KEY environment variable is empty.")

        last_user_message = payload.messages[-1].text if payload.messages else ""
        query_terms = _extract_query_terms(last_user_message)
        resolved_class_id = await cls._resolve_class_id(payload)

        # 1. Pre-Query Soft-Warning Gate
        soft_warning_issued = False
        caveat_note = ""
        if resolved_class_id:
            try:
                check_res = await OntologyService.check_answerable(
                    resolved_class_id, query_terms
                )
                if check_res.requires_confirmation and not payload.confirmed_soft_warning:
                    chat_logger.info(
                        "Pre-query soft warning triggered: coverage=%.2f, missing=%s",
                        check_res.coverage_score,
                        check_res.missing_terms,
                    )
                    warning_msg = (
                        check_res.caveat_message
                        or "Processing and consolidation isn't complete so answers might not be complete. Do you still want to continue?"
                    )
                    return {
                        "text": (
                            f"⚠️ **Pre-Query Notice**: {warning_msg}\n\n"
                            f"Curriculum material coverage for this inquiry is currently at **{round(check_res.coverage_score * 100)}%**.\n\n"
                            "Would you like to proceed anyway?"
                        ),
                        "is_soft_warning": True,
                        "status_flag": check_res.status_flag,
                        "coverage_score": check_res.coverage_score,
                        "missing_terms": check_res.missing_terms,
                        "requires_confirmation": True,
                        "caveat_message": warning_msg,
                        "visualization": None,
                    }
                if payload.confirmed_soft_warning and check_res.requires_confirmation:
                    soft_warning_issued = True
                    caveat_note = (
                        "> [!NOTE]\n"
                        "> *Notice: Course material processing and knowledge consolidation for this topic are incomplete. Response generated with caveats.*\n\n"
                    )
            except Exception as exc:
                chat_logger.warning("Soft warning gate check encountered error: %s", exc)

        # 2. Dual-Engine Retrieval (Tree Navigation + Prerequisite Chains)
        knowledge_context = ""
        try:
            knowledge_context = await cls._retrieve_knowledge_context(
                resolved_class_id, query_terms
            )
        except Exception as exc:
            chat_logger.warning("Dual-engine retrieval encountered error: %s", exc)

        # 3. Format classroom, students, and session configurations
        class_context = format_classroom_context(payload)
        students_context = format_students_context(payload.students)
        analysis_config_text = format_analysis_config_context(
            payload.newAnalysisConfig
        )

        system_instruction = """You are an AI pedagogical assistant and educational data analyst.
Your target is to help teachers manage student portfolios, draft personalized grading feedback, evaluate syllabus materials, and diagnose learning gaps. Ground your advice in the provided curriculum materials and prerequisite knowledge chains whenever available.

Return your response in a serialized JSON format matching this schema:
{
  "text": "Detailed, professional markdown string containing constructive feedback, bullet points, checklists, analytical diagnosis tables, or report cards. Speak with a professional, positive, and constructive tone.",
  "visualization": {
    "type": "charts" | "heatmap" | "ranking" | "timeline" | "stats",
    "title": "A short, descriptive title for the visualization widget",
    "description": "A short subtitle explaining the visualized metrics",
    "data": [] /* Array of objects matching chart data structure */
  }
}

If no visualization fits or is needed, omit the "visualization" field (set it to null).

Data Schema Guidelines for "visualization":
- "ranking": list of {"name": str, "score": float, "classAvg": float, "status": str}
- "timeline": list of {"period": str, "score": float, "classAvg": float}
- "heatmap": list of {"topic": str, "mastery": float}
- "stats": list of {"label": str, "value": str}
"""

        # 4. Setup LangChain LLM Client
        llm = get_openrouter_llm(model, api_key_str)

        prompt_template = ChatPromptTemplate.from_messages(
            [
                SystemMessage(content=system_instruction),
                ("placeholder", "{history}"),
                (
                    "user",
                    "CONTEXT METADATA:\n{class_context}\n\nKNOWLEDGE STORE RETRIEVAL (PageIndex Trees & Ontology Graph):\n{knowledge_context}\n\nSTUDENT PORTFOLIOS:\n{students_context}\n\nACTIVE CONFIGURATION:\n{analysis_config_text}\n\nUSER PROMPT: {user_prompt}",
                ),
            ]
        )

        history_msgs: list[tuple[str, str]] = []
        for m in payload.messages[:-1]:
            history_msgs.append((m.role, m.text))

        formatted_messages = prompt_template.format_messages(
            history=history_msgs,
            class_context=class_context,
            knowledge_context=knowledge_context or "No active material tree excerpts indexed.",
            students_context=students_context,
            analysis_config_text=analysis_config_text,
            user_prompt=last_user_message,
        )

        async def _invoke_llm() -> BaseMessage:
            return await llm.ainvoke(formatted_messages)

        response = await measure_async(
            chat_logger, f"chat_llm_invoke:{model}", _invoke_llm
        )

        parsed_res = parse_llm_response(response.content)

        # Prepend caveat notice if generated with confirmed soft warning
        if soft_warning_issued and "text" in parsed_res:
            parsed_res["text"] = f"{caveat_note}{parsed_res['text']}"

        viz = parsed_res.get("visualization")
        if isinstance(viz, dict):
            viz_dict = cast(dict[str, Any], viz)
            chat_logger.info(
                "Chat response generated with visualization: type=%s, title=%s",
                viz_dict.get("type"),
                viz_dict.get("title"),
            )
        else:
            chat_logger.info("Chat response generated without visualization widget")

        return parsed_res
