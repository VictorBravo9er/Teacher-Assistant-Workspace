import json
from typing import cast

from langchain_openai import ChatOpenAI
from pydantic import SecretStr
from src.lib.logger import llm_logger


def get_openrouter_llm(model: str, api_key: str) -> ChatOpenAI:
    """Instantiate and return the LangChain OpenRouter-backed ChatOpenAI client."""
    llm_logger.debug("Configuring OpenRouter LLM client: model=%s", model)
    return ChatOpenAI(
        model=model,
        api_key=SecretStr(api_key),
        base_url="https://openrouter.ai/api/v1",
        model_kwargs={
            "extra_headers": {
                "HTTP-Referer": "https://github.com/Google-Developer-Assistant/Teacher-Assistant",
                "X-Title": "Teacher Assistant Workspace",
            }
        },
        temperature=0.7,
    )


def parse_llm_response(raw_content: str | list[str | dict[str, object]]) -> dict[str, object]:
    """Clean Markdown formatting blocks and load string payload into structured dict with diagnostic logging."""
    if not isinstance(raw_content, str):
        raw_content = str(raw_content)

    clean_text = raw_content.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
    clean_text = clean_text.strip()

    try:
        parsed = cast(object, json.loads(clean_text))
        if isinstance(parsed, dict):
            dict_val = cast(dict[str, object], parsed)
            llm_logger.debug(
                "Successfully parsed LLM JSON response (keys=%s)", list(dict_val.keys())
            )
            return dict_val
        llm_logger.warning("LLM response parsed into non-dict type: %s", type(parsed).__name__)
        return {"raw": parsed}
    except json.JSONDecodeError as err:
        llm_logger.error(
            "❌ Failed to parse LLM JSON response: %s\n--- RAW OUTPUT START ---\n%s\n--- RAW OUTPUT END ---",
            str(err),
            clean_text,
            exc_info=True,
        )
        raise ValueError(f"LLM returned malformed JSON: {err}") from err
