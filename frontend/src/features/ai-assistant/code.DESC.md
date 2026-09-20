# AI Assistant Feature Module — `src/features/ai-assistant/`

This directory provides the AI pedagogical chat experience, interactive rubric diagnostic reviews, and rich analytical visualization widgets.

---

## 📁 Directory Files

- [`RAGClass.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/RAGClass.tsx): Full-featured pedagogical AI chat interface. Features multi-session conversation history, active diagnostic scope indicators, prompt chip shortcuts, token-by-token streaming simulation, Markdown message rendering, code/table copies, and session export to Markdown.
- [`AIDiagnosticDiffModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/AIDiagnosticDiffModal.tsx): Interactive modal comparing human grades against AI diagnostic recommendations for student submissions. Allows teachers to selectively accept, adjust with sliders, or reject AI-generated criteria scores, strengths, and gap diagnoses before saving.
- [`Visualizer.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/Visualizer.tsx): Dynamic data visualization renderer that transforms AI-generated structured payloads into responsive chart cards (Ranking leaderboards, Progress timelines, Topic heatmaps, and Statistic badge metrics).

---

## 💡 Role in the Application

This module represents the primary AI interaction layer, translating teacher queries into context-grounded prompt executions and rendering structured pedagogical outputs.

For chat state machines, diff review lifecycles, and visualization schemas, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/ai-assistant/code.ARCH.md).
