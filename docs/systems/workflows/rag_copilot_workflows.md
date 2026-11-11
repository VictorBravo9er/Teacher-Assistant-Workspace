# Interactive RAG Copilot & Data Visualization Workflows

This document details the start-to-finish workflows for querying the AI Pedagogical Assistant, assembling classroom context payloads, parsing structured visualization outputs, and persisting multi-turn conversation sessions.

---

## 1. Workflow: Querying the Interactive AI Assistant

Teachers can interact with an AI Copilot specialized in class analytics, pedagogical diagnostics, student portfolio reviews, and custom lesson planning.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    participant UI as RAGClass.tsx (Copilot Drawer)
    participant Hook as useAIChat
    participant Svc as chatService
    participant BE as Backend FastAPI (/api/chat)
    participant Gate as ai.check_answerable Gate
    participant DualRAG as Dual-Engine Retriever (Tree + Graph)
    participant LLM as OpenRouter LLM
    participant Vis as Visualizer.tsx
    participant DB as PostgreSQL (public & ai)

    Teacher->>UI: Types pedagogical query (e.g. "What prerequisites are needed for Module 3?")
    Teacher->>UI: Submits chat prompt
    UI->>Hook: sendChatMessage(sessionId, promptText)

    Note over Hook,BE: 1. Assemble Context & Dispatch Direct fetch('/api/chat')
    Hook->>Hook: Compiles active class metadata, student rosters, running grades, & session config
    Hook->>BE: POST /api/chat (messages, students, classroom, newAnalysisConfig)
    BE->>BE: _resolve_class_id(payload) matches classroom.classItemName if class_id omitted

    Note over BE,Gate: 2. Pre-Query Soft-Warning Gate (Backend Active; UI Retry Loop Pending)
    BE->>Gate: ai.check_answerable(class_id, query_terms)
    alt Coverage < 0.4 and !confirmed_soft_warning
        Gate-->>BE: Returns requires_confirmation=true, caveat_message
        BE-->>Hook: Returns soft-warning caveat response (visualization: null)
        Note over Hook,UI: Interactive retry button passing confirmed_soft_warning=true is pending UI wiring
    end

    Note over BE,DualRAG: 3. Dual-Engine Retrieval & Slice-Bounded Context (~4,300 Target)
    BE->>DualRAG: Engine A: PageIndex Tree Traversal (ai.material_trees, <= 3 trees, <= 3 nodes/tree)
    BE->>DualRAG: Engine B: Recursive Prerequisite Graph CTE (ai.ontology_relationships, LIMIT 6) + Mastery Gaps (LIMIT 5)
    DualRAG-->>BE: Section excerpts + prerequisite chains + concept mastery summary

    Note over BE,LLM: 4. Prompt Templating & LLM Execution
    BE->>BE: Formats context strings & trims chat history to last 10 turns
    BE->>LLM: ChatOpenAI.ainvoke() → OpenRouter API
    LLM-->>BE: Returns JSON with "text" and optional "visualization" widget

    BE-->>Hook: Returns parsed { text: "...", visualization: { type, title, data } }
    Hook->>UI: Appends assistant message to chat thread

    opt When "visualization" payload is present
        UI->>Vis: Renders heatmap / ranking / timeline / stats widget (charts/radar fall back to stats)
    end

    Note over UI,DB: 5. Session Lifecycle Persistence (public.chat_sessions)
    Note over UI,Svc: RAGClass persists create/duplicate/delete via chatService; incremental turn sync via chatService.updateSession() is available
```

### Step-by-Step Execution Details:

1. **User Interaction**:
   - In [`RAGClass.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/RAGClass.tsx), the teacher opens the assistant sliding drawer and enters a prompt.
2. **Context Compilation & Dispatch**:
   - [`useAIChat`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useAIChat.ts) currently dispatches `POST /api/chat` directly via `fetch('/api/chat')` with:
     - **Classroom Metadata**: Subject, grade level, active instructional guidelines, teaching style.
     - **Student Rosters**: Enrolled students, performance tiers, running GPAs, submission histories, attendance averages.
     - **Active Directives**: Session type, scope, and teacher preferences configured in analysis settings.
     - **History Sequence**: Previous turns in the current conversation thread (`messages[:-1]`, capped at the last 10 turns on the backend).
   - *(Note: `class_id` and `confirmed_soft_warning` are supported on `ChatPayload`, with client UI wiring pending; `ChatService._resolve_class_id()` falls back to matching `classroom.classItemName` in `public.classes`.)*
3. **Pre-Query Answerability Verification**:
   - When `class_id` resolves, the backend calls `ai.check_answerable(p_class_id, p_query_terms)`. If curriculum coverage is below threshold ($< 0.4$) and `!confirmed_soft_warning`, the assistant returns the cooperative caveat prompt early without calling the LLM.
4. **Dual-Engine Retrieval & Context Bounding**:
   - **Engine 1 (PageIndex Tree Navigation)**: Queries up to 3 trees in `ai.material_trees` (`TreeIndexerService.traverse_tree()`), extracting up to 3 scored leaf/section summaries per material (`[Title] (pp. X-Y): Summary`).
   - **Engine 2 (Relational Ontological Graph)**: Queries top 5 matching `ai.ontology_concepts`, executes a PostgreSQL recursive `WITH RECURSIVE` prerequisite CTE over `ai.ontology_relationships` (`LIMIT 6`), and pulls top 5 student mastery gap records (`ai.student_concept_mastery`).
   - **Context Ceiling**: Bounded deterministically via SQL/slice limits and last-10-turn history slicing toward a ~4,300-token prompt target (without a runtime tokenizer loop).
5. **Backend Service Processing**:
   - [`ChatService.process_chat_message()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/chat.py) formats the prompt using [`formatter.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/formatter.py) and executes the call via OpenRouter.
6. **Structured Visualization Rendering**:
   - When the LLM includes a `"visualization"` object, [`Visualizer.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/Visualizer.tsx) mounts the matching widget:
     - `heatmap`: Subject topic mastery bars (`{ topic, mastery }`).
     - `ranking`: Ordered student performance leaderboard.
     - `timeline`: Longitudinal trend cards across milestones.
     - `stats`: Key metric counters and aggregate indicators (`charts` and `radar` fall back to `stats` cards in the current implementation).
7. **Session History Persistence**:
   - [`RAGClass.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/RAGClass.tsx) persists session creation, duplication, and deletion to `public.chat_sessions` via [`chatService`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/chatService.ts) (`createSession`, `deleteSession`, `fetchSessions`). Per-turn `updateSession()` calls from `useAIChat` are not yet wired.
