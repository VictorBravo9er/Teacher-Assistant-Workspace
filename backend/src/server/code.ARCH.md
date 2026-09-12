# Server Layer Architecture & Routing Contracts

This document details the route architecture, validation boundaries, and exception mappings in `backend/src/server/`.

---

## 1. Request Dispatch & Error Mapping Architecture

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend Client
    participant Router as APIRouter (/api)
    participant Schema as ChatPayload (Pydantic v2)
    participant Service as ChatService
    
    Client->>Router: POST /api/chat (JSON)
    Router->>Schema: Validate request against ChatPayload
    alt Invalid Schema
        Schema-->>Client: 422 Unprocessable Entity (Field Errors)
    else Valid Schema
        Router->>Service: process_chat_message(payload, model)
        alt Success
            Service-->>Router: Parsed Response Dict
            Router-->>Client: 200 OK (JSON payload)
        else Exception
            Service-->>Router: Raise Exception
            Router->>Router: Log error traceback
            Router-->>Client: 500 Internal Server Error
        end
    end
```

---

## 2. Interface Contracts & Design Principles

1. **Schema-First Validation**: All request bodies are strictly bound to Pydantic v2 models (`ChatPayload`, `GradeRequest`, `MaterialAnalyzeRequest`). FastAPI automatically generates OpenAPI schema documentation and rejects invalid payloads before code execution.
2. **Environment Configuration**: Default model resolution leverages `os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")`, ensuring model selection can be swapped without code redeployments.
3. **Clean Layer Separation**: Route handlers contain zero business logic or direct LLM prompt manipulation, strictly delegating domain workflows to `src.service.chat.ChatService` and `src.service.evaluator.EvaluatorService`.

