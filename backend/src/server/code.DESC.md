# Backend Server Layer — `src/server/`

This directory defines the HTTP REST routing boundaries, endpoint definitions, and request dispatchers for the FastAPI backend.

---

## 📁 Directory Files

- [`router.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/server/router.py): Defines the `/api` prefixed `APIRouter`, exposing:
  - `GET /api/health`: Basic liveness check returning `{"status": "ok"}`.
  - `POST /api/chat`: Validates incoming `ChatPayload` requests and delegates execution to `ChatService.process_chat_message`.
  - `POST /api/grade`: Validates `GradeRequest` payloads and delegates autonomous rubric grading to `EvaluatorService.grade_submission`.
  - `POST /api/materials/analyze`: Validates `MaterialAnalyzeRequest` payloads and delegates syllabus alignment/gap analysis to `EvaluatorService.analyze_material`.

---

## 💡 Role in the Application

The server layer acts as the transport gateway, validating client payloads via Pydantic models before delegating execution to the business service layer.

For routing design, exception translation, and endpoint contracts, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/server/code.ARCH.md).
