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
    UI->>Hook: sendMessage(promptText)
    
    Note over Hook,Svc: 1. Assemble Full Context Payload
    Hook->>Hook: Compiles active class metadata, student rosters, running grades, & session config
    Hook->>Svc: sendChatMessage(chatPayload)
    
    Svc->>BE: POST /api/chat (messages, students, classroom, newAnalysisConfig, class_id)

    Note over BE,Gate: 2. Pre-Query Soft-Warning Gate
    BE->>Gate: ai.check_answerable(class_id, query_terms)
    alt Coverage < 0.4 and !confirmed_soft_warning
        Gate-->>BE: Returns requires_confirmation=true, caveat_message
        BE-->>Svc: Returns soft-warning caveat payload
        Svc-->>UI: Surfaces confirmation prompt: "Processing incomplete; continue anyway?"
        Teacher->>UI: Clicks "Continue Anyway"
        UI->>Hook: sendMessage(promptText, { confirmed_soft_warning: true })
        Hook->>BE: POST /api/chat (confirmed_soft_warning=true)
    end
    
    Note over BE,DualRAG: 3. Dual-Engine Retrieval & Context Fusion (~4,300 Token Budget)
    BE->>DualRAG: Engine A: PageIndex Tree Traversal (ai.material_trees)
    BE->>DualRAG: Engine B: Recursive Prerequisite Graph CTE (ai.ontology_relationships)
    DualRAG-->>BE: Precise leaf citations + prerequisite dependency subgraphs

    Note over BE,LLM: 4. Prompt Templating & LLM Execution
    BE->>BE: Formats context strings with token budget priorities
    BE->>LLM: ChatPromptTemplate.format_messages() -> OpenRouter API
    LLM-->>BE: Returns JSON with "text" and optional "visualization" widget
    
    BE-->>Svc: Returns parsed { text: "...", visualization: { type, title, data } }
    Svc-->>Hook: Resolves assistant message
    Hook->>UI: Appends assistant message to chat thread
    
    opt When "visualization" payload is present
        UI->>Vis: Renders chart / heatmap / ranking / timeline widget
    end

    Note over Hook,DB: 5. Persist Conversation Session
    Hook->>DB: UPSERT INTO public.chat_sessions (class_id, user_id, messages JSONB, analysis_config JSONB)
```

### Step-by-Step Execution Details:

1. **User Interaction**:
   - In [`RAGClass.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/RAGClass.tsx), the teacher opens the assistant sliding drawer and enters a prompt.
2. **Context Compilation**:
   - [`useAIChat`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useAIChat.ts) compiles:
     - **Classroom Metadata**: Subject, grade level, active instructional guidelines, teaching style.
     - **Student Rosters**: All enrolled students, performance tiers, running GPAs, submission completion rates, attendance averages.
     - **Active Directives**: Teacher preferences configured in the analysis settings.
     - **History Sequence**: Previous turns in the current conversation thread.
3. **Pre-Query Answerability Verification**:
   - The backend runs `ai.check_answerable(class_id, query_terms)`. If the class lacks compiled material or curriculum coverage is below threshold ($< 0.4$), the assistant returns a cooperative caveat asking if the educator wants to continue. When confirmed (`confirmed_soft_warning: true`), the query proceeds without friction.
4. **Dual-Engine Retrieval & Token Budget Allocation**:
   - **Engine 1 (PageIndex Tree Navigation)**: For materials $\ge 20$ pages, queries traverse the JSONB tree in `ai.material_trees`, fetching target leaf paragraphs (~300–500 tokens) with parent section breadcrumbs.
   - **Engine 2 (Relational Ontological Graph)**: Native PostgreSQL recursive CTEs traverse prerequisite edges in `ai.ontology_relationships` for multi-hop curriculum gap analysis.
   - **Token Ceiling**: Enforces a strict ~4,300 prompt token limit (Persona: ~500, Classroom Profile: ~300, Retrieved Leaf: ~1,500, Mastery Stats: ~800, History: ~1,200), ensuring rapid response times and zero context truncation.
5. **Backend Service Processing**:
   - [`ChatService.process_chat_message()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/chat.py) formats the prompt using [`formatter.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/formatter.py) and executes the call via OpenRouter.
6. **Structured Visualization Rendering**:
   - When the LLM includes a `"visualization"` object, [`Visualizer.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/Visualizer.tsx) dynamically mounts the appropriate widget:
     - `charts`: Comparative bar charts and distribution graphs.
     - `heatmap`: Subject topic mastery heatmaps.
     - `ranking`: Top/bottom student performance rankings.
     - `timeline`: Longitudinal grade trajectory graphs.
     - `stats`: Key metric counters and aggregate indicators.
7. **Session History Persistence**:
   - The conversation thread is automatically saved to `public.chat_sessions` in PostgreSQL, enabling teachers to resume past analytical discussions across sessions.
