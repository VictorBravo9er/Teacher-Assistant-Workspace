import os
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from src.lib.formatter import (
    format_analysis_config_context,
    format_classroom_context,
    format_students_context,
)
from src.lib.llm import get_openrouter_llm, parse_llm_response
from src.lib.logger import logger
from src.types.schemas import ChatPayload


class ChatService:
    """Service to coordinate data context formatting, prompt templating, and LLM call operations."""

    @staticmethod
    async def process_chat_message(payload: ChatPayload, model: str) -> dict[str, Any]:
        logger.info(
            "Processing chat message: model=%s, message_count=%d, student_count=%d",
            model,
            len(payload.messages),
            len(payload.students),
        )
        # EAFP: Access environmental variable directly
        api_key_str = os.environ["OPENROUTER_API_KEY"]
        if not api_key_str:
            logger.error("Missing OPENROUTER_API_KEY environment variable")
            raise ValueError("OPENROUTER_API_KEY environment variable is empty.")

        # 1. Format classroom, students, and session configurations
        class_context = format_classroom_context(payload)
        students_context = format_students_context(payload.students)
        analysis_config_text = format_analysis_config_context(payload.newAnalysisConfig)

        system_instruction = """You are the ultimate Teacher Assistant, an AI Pedagogist, and a RAG Data Analyst.
Your target is to help teachers manage student portfolios, draft personalized grading feedback, evaluate syllabus materials, and diagnose learning gaps.

Return your response in a serialized JSON format matching this schema:
{
  "text": "Detailed, professional markdown string containing constructive feedback, bullet points, checklists, analytical diagnosis tables, or report cards. Speak with professional, positive, compassionate teacher-assistant tone.",
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

        # 2. Setup LangChain LLM Client
        llm = get_openrouter_llm(model, api_key_str)

        # Build prompt template
        prompt_template = ChatPromptTemplate.from_messages(
            [
                ("system", system_instruction),
                ("placeholder", "{history}"),
                (
                    "user",
                    "CONTEXT METADATA:\n{class_context}\n\nSTUDENT PORTFOLIOS:\n{students_context}\n\nACTIVE CONFIGURATION:\n{analysis_config_text}\n\nUSER PROMPT: {user_prompt}",
                ),
            ]
        )

        # Formulate history sequence
        history_msgs: list[tuple[str, str]] = []
        for m in payload.messages[:-1]:
            history_msgs.append((m.role, m.text))

        formatted_messages = prompt_template.format_messages(
            history=history_msgs,
            class_context=class_context,
            students_context=students_context,
            analysis_config_text=analysis_config_text,
            user_prompt=payload.messages[-1].text,
        )

        # 3. Call LLM generation
        logger.info("Invoking OpenRouter LLM: model=%s", model)
        try:
            response = llm.invoke(formatted_messages)
            logger.info(
                "LLM generation successful, response_length=%d", len(response.content)
            )
        except Exception as err:
            logger.error("LLM generation failed: %s", str(err), exc_info=True)
            raise

        # 4. Clean and parse LLM response payload
        logger.info("Parsing LLM response")
        try:
            parsed_res = parse_llm_response(response.content)
            logger.info("LLM response parsed successfully")
            return parsed_res
        except Exception as err:
            logger.error("Failed to parse LLM response: %s", str(err), exc_info=True)
            raise
