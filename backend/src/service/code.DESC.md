# Backend Domain Services — `src/service/`

This directory encapsulates the core business logic, prompt orchestration, and LLM execution workflows for the backend service.

---

## 📁 Directory Files

- [`chat.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/chat.py): Implements `ChatService`, which manages the multi-turn chat prompt lifecycle, context assembly, and OpenRouter LLM invocations.
- [`evaluator.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/evaluator.py): Implements `EvaluatorService` for autonomous rubric evaluations (`grade_submission`) with criterion score breakdowns, student feedback drafts, private teacher pedagogical notes, and material syllabus ingestion analysis (`analyze_material`) with prerequisite gap checks and practice question generation.
- [`ontology.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/ontology.py): Implements `OntologyService` for knowledge graph node/edge formatting, concept mappings, and student mastery categorization (`mastered`, `practicing`, `gap_detected`).

---

## 💡 Role in the Application

`ChatService` serves as the framework-agnostic business core, isolating AI prompt engineering, context assembly, and LLM invocation from the HTTP server layer.

For prompt structure, schema requirements, and execution details, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/service/code.ARCH.md).
