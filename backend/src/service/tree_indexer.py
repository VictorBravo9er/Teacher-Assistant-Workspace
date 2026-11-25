from __future__ import annotations

import json
import re
from typing import Any
import uuid

from src.lib.db import fetch_one
from src.lib.llm import get_openrouter_llm, parse_llm_response
from src.lib.logger import eval_logger, measure_async
from src.types.ai import (
    MaterialTree,
    TreeNode,
    TreeTraversalContext,
)


class TreeIndexerService:
    """PageIndex-inspired hierarchical document tree builder and top-down branch navigator."""

    @staticmethod
    def _estimate_pages(text_length: int) -> int:
        """Estimate document page count assuming ~2,500 characters per page."""
        return max(1, round(text_length / 2500))

    @staticmethod
    def _extract_markdown_sections(text: str) -> list[dict[str, Any]]:
        """Decompose text into structured sections based on Markdown headers or paragraph breaks."""
        lines = text.split("\n")
        sections: list[dict[str, Any]] = []
        current_title = "Introduction"
        current_lines: list[str] = []
        heading_pattern = re.compile(r"^(#{1,3})\s+(.+)$")

        for line in lines:
            match = heading_pattern.match(line.strip())
            if match:
                if current_lines:
                    content = "\n".join(current_lines).strip()
                    if content:
                        sections.append({"title": current_title, "content": content})
                    current_lines = []
                current_title = match.group(2).strip()
            else:
                current_lines.append(line)

        if current_lines:
            content = "\n".join(current_lines).strip()
            if content:
                sections.append({"title": current_title, "content": content})

        # Fallback if no markdown headers were detected
        if len(sections) <= 1 and len(text) > 4000:
            sections = []
            chunk_size = 3500
            for i in range(0, len(text), chunk_size):
                chunk = text[i : i + chunk_size]
                part_idx = (i // chunk_size) + 1
                sections.append({"title": f"Part {part_idx}", "content": chunk})

        return sections if sections else [{"title": "General Content", "content": text}]

    @classmethod
    async def build_tree_from_text(
        cls,
        material_id: str,
        material_name: str,
        text: str,
        model: str,
        api_key: str,
    ) -> MaterialTree:
        """Construct a multi-layer hierarchical summary tree from long-form educational material."""
        eval_logger.info(
            "Building hierarchical tree for material_id=%s, name=%s, text_length=%d",
            material_id,
            material_name,
            len(text),
        )

        total_pages = cls._estimate_pages(len(text))
        sections = cls._extract_markdown_sections(text)

        # For fast and deterministic tree extraction, generate section summaries and key concepts
        children_nodes: list[TreeNode] = []
        char_per_page = max(1, len(text) // total_pages)

        # Build prompt for LLM to summarize and structure sections
        sections_summary_prompt = f"""You are a Pedagogical Tree Indexer (RAPTOR/PageIndex architecture).
Analyze these {len(sections)} sections from the educational document '{material_name}' (approx {total_pages} pages).
For each section:
1. Provide a concise 2-sentence pedagogical abstract.
2. Extract 3-5 core curriculum concepts.

Return strictly JSON matching this format:
{{
  "sections": [
    {{
      "title": "Section Title",
      "summary": "Concise summary of concepts and objectives.",
      "key_concepts": ["concept1", "concept2"]
    }}
  ]
}}

SECTIONS:
"""
        for idx, s in enumerate(sections[:15], start=1):
            excerpt = s["content"][:400].replace("\n", " ")
            sections_summary_prompt += f"{idx}. {s['title']}: {excerpt}...\n"

        try:
            llm = get_openrouter_llm(model, api_key)
            response = await measure_async(
                eval_logger,
                f"build_tree_sections_llm:{material_id}",
                lambda: llm.ainvoke(sections_summary_prompt),
            )
            parsed = parse_llm_response(str(response.content))
            parsed_sections = parsed.get("sections")
            if not isinstance(parsed_sections, list):
                parsed_sections = []
        except Exception as exc:
            eval_logger.warning("LLM tree summarization failed, falling back to heuristic: %s", exc)
            parsed_sections = []

        # Assemble tree nodes
        running_char = 0
        total_nodes = 1
        max_depth = 2

        for idx, s in enumerate(sections, start=1):
            s_len = len(s["content"])
            p_start = max(1, running_char // char_per_page + 1)
            p_end = min(total_pages, (running_char + s_len) // char_per_page + 1)
            running_char += s_len

            summary_text = s["content"][:200].replace("\n", " ") + "..."
            key_concepts: list[str] = []

            # Check if LLM parsed section info is available
            if idx <= len(parsed_sections) and isinstance(parsed_sections[idx - 1], dict):
                p_item: dict[str, Any] = parsed_sections[idx - 1]
                if p_item.get("summary"):
                    summary_text = str(p_item["summary"])
                if isinstance(p_item.get("key_concepts"), list):
                    key_concepts = [str(k) for k in p_item["key_concepts"]]

            node_id = f"node-{uuid.uuid4().hex[:8]}"
            child = TreeNode(
                node_id=node_id,
                title=s["title"],
                page_start=p_start,
                page_end=p_end,
                summary=summary_text,
                key_concepts=key_concepts,
                children=[],
            )
            children_nodes.append(child)
            total_nodes += 1

        root_node = TreeNode(
            node_id=f"root-{uuid.uuid4().hex[:8]}",
            title=f"Course Material: {material_name}",
            page_start=1,
            page_end=total_pages,
            summary=f"Hierarchical tree index for '{material_name}' spanning {total_pages} pages and {len(children_nodes)} major modules.",
            key_concepts=[c for node in children_nodes for c in node.key_concepts][:12],
            children=children_nodes,
        )

        tree = MaterialTree(
            material_id=material_id,
            root_node=root_node,
            total_nodes=total_nodes,
            max_depth=max_depth,
            page_count=total_pages,
            status="completed",
        )
        return tree

    @classmethod
    async def persist_tree(cls, tree: MaterialTree) -> None:
        """Persist or upsert the material tree into ai.material_trees."""
        eval_logger.info("Persisting material tree for material_id=%s", tree.material_id)
        from src.lib.db import execute

        root_json = (
            tree.root_node.model_dump()
            if isinstance(tree.root_node, TreeNode)
            else tree.root_node
        )
        sql = """
        INSERT INTO ai.material_trees (
            material_id, root_node, total_nodes, max_depth, updated_at
        ) VALUES (
            %s, %s::jsonb, %s, %s, NOW()
        )
        ON CONFLICT (material_id) DO UPDATE SET
            root_node = EXCLUDED.root_node,
            total_nodes = EXCLUDED.total_nodes,
            max_depth = EXCLUDED.max_depth,
            updated_at = NOW()
        """
        _ = await execute(
            sql,
            (
                tree.material_id,
                json.dumps(root_json),
                tree.total_nodes,
                tree.max_depth,
            ),
        )

    @classmethod
    async def get_tree(cls, material_id: str) -> MaterialTree | None:
        """Fetch existing material tree from ai.material_trees."""
        sql = "SELECT id, material_id, root_node, total_nodes, max_depth, created_at, updated_at FROM ai.material_trees WHERE material_id = %s"
        row = await fetch_one(sql, (material_id,))
        if not row:
            return None
        root_data = row["root_node"]
        page_count = 1
        if isinstance(root_data, dict):
            page_count = int(root_data.get("page_end", 1))

        return MaterialTree(
            id=str(row["id"]),
            material_id=str(row["material_id"]),
            root_node=root_data,
            total_nodes=int(row["total_nodes"]),
            max_depth=int(row["max_depth"]),
            page_count=page_count,
            status="completed",
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @classmethod
    async def traverse_tree(
        cls, material_id: str, query_terms: list[str]
    ) -> TreeTraversalContext:
        """Fast top-down branch navigation across the document hierarchy (<15ms)."""
        tree = await cls.get_tree(material_id)
        if not tree:
            return TreeTraversalContext(
                material_id=material_id,
                material_name="",
                matched_nodes=[],
                selected_excerpts=[],
                token_estimate=0,
            )

        root = tree.root_node
        root_dict = root.model_dump() if isinstance(root, TreeNode) else root
        children: list[dict[str, Any]] = root_dict.get("children", [])

        # Match query terms against child nodes
        scored_nodes: list[tuple[int, dict[str, Any]]] = []
        lowered_terms = [t.lower() for t in query_terms if t]

        for child in children:
            score = 0
            title = str(child.get("title", "")).lower()
            summary = str(child.get("summary", "")).lower()
            key_concepts = [str(k).lower() for k in child.get("key_concepts", [])]

            for term in lowered_terms:
                if term in title:
                    score += 3
                if term in summary:
                    score += 2
                for kc in key_concepts:
                    if term in kc:
                        score += 3

            if score > 0:
                scored_nodes.append((score, child))

        scored_nodes.sort(key=lambda x: x[0], reverse=True)
        top_matches = [node for _, node in scored_nodes[:3]]
        if not top_matches and children:
            # Fallback: include first module if none scored
            top_matches = children[:1]

        excerpts: list[str] = []
        token_estimate = 0
        for m in top_matches:
            pages = f"pp. {m.get('page_start', 1)}-{m.get('page_end', 1)}"
            ex = f"[{m.get('title')}] ({pages}): {m.get('summary')}"
            excerpts.append(ex)
            token_estimate += len(ex) // 4

        return TreeTraversalContext(
            material_id=material_id,
            material_name=str(root_dict.get("title", "")),
            matched_nodes=top_matches,
            selected_excerpts=excerpts,
            token_estimate=token_estimate,
        )
