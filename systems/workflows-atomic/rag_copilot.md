# Atomic Workflows: RAG Copilot & Visualizer

This document details the discrete atomic tasks governing the interactive AI assistant, prompt context serialization, dynamic visualization widget mounting, and multi-turn session persistence.

---

## ATOM-RAG-01: Dispatch AI Copilot Query

### 1. Trigger
- **Event**: Teacher types a pedagogical question into the prompt input of [`RAGClass.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/RAGClass.tsx) and clicks **"Send"** (or presses Enter).

### 2. Preconditions
- Teacher is authenticated.
- Prompt string is non-empty (`text.trim().length > 0`).
- Active class context is loaded in `useClassOperations`.

### 3. Execution Pipeline
1. **Append Optimistic Message**: UI appends `{ role: 'user', text: promptText, timestamp: Date.now() }` to the message thread.
2. **Context Compilation in Hook**: [`useAIChat`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useAIChat.ts) compiles:
   - `classroom`: Subject, grade level, teaching style, assessment preferences.
   - `students`: Roster with current GPAs, performance tiers, attendance rates, and recent submissions.
   - `newAnalysisConfig`: Active teacher focus directives.
   - `messages`: Historical conversation turns.
3. **Dispatch to Backend**: Client invokes `chatService.sendMessage(payload)`:
   ```http
   POST /api/chat HTTP/1.1
   Host: backend:8090
   Content-Type: application/json
   ```
4. **Backend Processing**:
   - [`ChatService.process_chat_message()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/chat.py) runs prompt template through OpenRouter LLM.
   - Parser [`parse_llm_response()`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/lib/llm.py) isolates JSON object containing `"text"` and optional `"visualization"`.

### 4. Postconditions & Conclusion
- The backend returns `{ text: "...", visualization: { type, title, description, data } }`.
- UI appends the assistant message and passes the visualization spec to `Visualizer.tsx` (`ATOM-RAG-02`).
- Session persistence is triggered (`ATOM-RAG-03`).

---

## ATOM-RAG-02: Mount Dynamic Visualization Widget

### 1. Trigger
- **Event**: An assistant message in the chat thread contains a non-null `"visualization"` object in its parsed payload.

### 2. Input Parameters
```typescript
interface VisualizationPayload {
  type: 'charts' | 'heatmap' | 'ranking' | 'timeline' | 'stats';
  title: string;
  description?: string;
  data: any[];
}
```

### 3. Execution Pipeline
1. In [`Visualizer.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/Visualizer.tsx), the component checks `payload.type`:
   - `'ranking'`: Renders a sorted leaderboard comparing individual student scores against the class average.
   - `'heatmap'`: Renders topic mastery blocks colored by proficiency (Green $\ge 85\%$, Amber $65-84\%$, Red $< 65\%$).
   - `'timeline'`: Renders historical assessment trajectory graphs over terms.
   - `'charts'`: Renders comparative bar graphs and grade distributions.
   - `'stats'`: Renders KPI metric cards with summary values.
2. The widget mounts inline directly below the assistant's analytical narrative.

### 4. Conclusion
- The teacher interacts with the visualization (e.g. hovering over bars, filtering ranking tiers) directly inside the chat thread.

---

## ATOM-RAG-03: Persist Chat Session History

### 1. Trigger
- **Event**: An assistant response finishes rendering, or the teacher closes the chat drawer.

### 2. Execution Pipeline
1. Service serializes the complete conversation history array and active analysis configuration.
2. Upserts into `public.chat_sessions`:
   ```sql
   INSERT INTO public.chat_sessions (id, class_id, user_id, title, messages, analysis_config, updated_at)
   VALUES (
     :sessionId, :classId, auth.uid(), :sessionTitle,
     :messagesJSONB, :analysisConfigJSONB, timezone('utc'::text, now())
   ) ON CONFLICT (id) DO UPDATE SET
     messages = EXCLUDED.messages,
     analysis_config = EXCLUDED.analysis_config,
     updated_at = timezone('utc'::text, now());
   ```
3. In parallel, if LangGraph checkpointer is enabled, state checkpoints are recorded in `langgraph.checkpoints`.

### 3. Conclusion
- The conversation thread is safely stored in PostgreSQL, allowing the educator to resume discussions across browser refreshes or devices.

---

## ATOM-RAG-04: Switch / Load Historical Session

### 1. Trigger
- **Event**: Teacher clicks on a previous chat session in the session history dropdown of `RAGClass.tsx`.

### 2. Execution Pipeline
1. UI queries:
   ```sql
   SELECT * FROM public.chat_sessions WHERE id = :sessionId AND class_id = :classId;
   ```
2. Hydrates `messages` state in `useAIChat`.
3. Sets `activeSessionId = sessionId`.

### 3. Conclusion
- Chat thread instantly re-renders with all previous messages, questions, and interactive visualization widgets intact.
