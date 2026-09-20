# Backend Support Library — `src/lib/`

This directory provides shared infrastructure utilities, prompt formatters, LLM client initializers, and structured application loggers for the backend service.

---

## 📁 Directory Files

- [`formatter.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/formatter.py): Pure transformation functions that format incoming classroom data (`format_classroom_context`), student portfolios and grade histories (`format_students_context`), and custom session configs (`format_analysis_config_context`) into structured, token-efficient text prompts for LLM consumption.
- [`llm.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/llm.py): Contains `get_openrouter_llm` for instantiating LangChain's `ChatOpenAI` client directed to the OpenRouter gateway, and `parse_llm_response` for sanitizing markdown-wrapped JSON text blocks into typed Python dictionaries.
- [`logger.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/logger.py): Production-grade structured logging engine featuring context-aware request ID tracing (`x-request-id`), dual stream and rotating file output, coordinated 5000-entry timestamped cohorts, JSON Lines telemetry, and async execution measurement (`measure_async`).

---

## 💡 Role in the Application

The library functions decouple external LLM transport protocols and data serialization from core business logic in `src/service/`.

For format transformations, LLM interface contracts, and design specifics, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/code.ARCH.md).
