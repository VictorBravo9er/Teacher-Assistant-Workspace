# Custom React Hooks — `src/hooks/`

This directory encapsulates stateful workflows, asynchronous data fetching, theme toggling, and AI communication logic into reusable React custom hooks.

---

## 📁 Directory Files

- [`useClassOperations.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useClassOperations.ts): Master state orchestrator for classroom mutations. Provides functions to update class profiles, upload/delete materials, save instruction rubrics, enroll/update students, save submission grades, and batch log attendance records.
- [`useAIChat.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useAIChat.ts): Manages AI chat sessions, message histories, active analysis scopes, API communication with `/api/chat`, and simulated token streaming.
- [`useWorkspaceData.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useWorkspaceData.ts): Coordinates initial workspace bootstrapping, fetching active classes, templates, and institutes from Supabase services upon user authentication.
- [`useTheme.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useTheme.ts): Manages light/dark/system theme state, persists user preference to localStorage, and updates the `.dark` class on the root document element.

---

## 💡 Role in the Application

Hooks isolate side-effects and business data synchronization from presentation components, adhering to the Single Responsibility Principle.

For hook contracts, state transition diagrams, and dependency architectures, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/code.ARCH.md).
