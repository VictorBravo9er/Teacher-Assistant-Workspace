# Backend Support Library — `src/lib/`

This directory provides shared infrastructure utilities, prompt formatters, LLM client initializers, and structured application loggers for the backend service.

---

## 📁 Directory Files

- [`formatter.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/formatter.py): Pure transformation functions that format incoming classroom data (`format_classroom_context`), student portfolios and grade histories (`format_students_context`), and custom session configs (`format_analysis_config_context`) into structured, token-efficient text prompts for LLM consumption.
- [`llm.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/llm.py): Contains `get_openrouter_llm` for instantiating LangChain's `ChatOpenAI` client directed to the OpenRouter gateway, and `parse_llm_response` for sanitizing markdown-wrapped JSON text blocks into typed Python dictionaries.
- [`logger.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/logger.py): Production-grade structured logging engine featuring context-aware request ID tracing (`x-request-id`), dual stream and rotating file output, coordinated 5000-entry timestamped cohorts, JSON Lines telemetry, and async execution measurement (`measure_async`).

---

## Architecture & Data Flow

### 1. Prompt Transformation & LLM Gateway Architecture

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    Payload["ChatPayload (Pydantic)"] --> Formatter["formatter.py Functions"]
    Formatter --> ClassCtx["Class Context String"]
    Formatter --> StudentCtx["Student Portfolio String"]
    Formatter --> ConfigCtx["Session Config String"]
    
    ClassCtx & StudentCtx & ConfigCtx --> PromptBuilder["ChatPromptTemplate"]
    PromptBuilder --> LLMClient["llm.get_openrouter_llm()"]
    LLMClient --> OpenRouter["OpenRouter API Gateway"]
    OpenRouter --> RawResponse["Raw LLM Output (Markdown/JSON)"]
    RawResponse --> Parser["llm.parse_llm_response()"]
    Parser --> ParsedJSON["Validated Dict Payload"]
```

---

### 2. Component Design & Structural Invariants

### 1. `formatter.py` Pure Functions:
- **`format_classroom_context(payload)`**: Serializes active workspace metadata, subject, teacher name, teaching style, materials list, and instructional rubrics into markdown lists.
- **`format_students_context(students)`**: Formats student records, performance indicators, attendance percentages, grades, custom attributes, and parent notes.
- **`format_analysis_config_context(config)`**: Formats targeted analysis types, scope filters, and custom instructions.

### 2. `llm.py` Transport & Sanitization:
- **`get_openrouter_llm(model, api_key)`**: Instantiates `ChatOpenAI` configured with OpenRouter `base_url`, custom referrer headers (`HTTP-Referer`, `X-Title`), and fixed temperature (`0.7`).
- **`parse_llm_response(raw_content)`**: Implements defensive JSON extraction by stripping leading/trailing markdown code fences (```json ... ```) prior to `json.loads` parsing.

### 3. `logger.py` Observability & Diagnostic Engine:
- **Request ID Tracing**: ContextVar-backed `RequestIdFilter` injects active `x-request-id` into all log records across thread-local and async tasks.
- **Coordinated Cohort Rotation**: Synchronizes file rotation across human-readable `.log`, dedicated `-error.log`, and structured `.jsonl` streams every 5,000 primary entries.
- **Structured JSON Lines Formatting**: Serializes log level, timestamp, logger name, message, request ID, duration, and exception tracebacks into ndjson format for automated log analysis.
- **Execution Telemetry**: `measure_async` context helper measures async execution durations in milliseconds and logs performance metrics.
