# Data Access Services — `src/services/`

This directory encapsulates all outbound HTTP requests, PostgREST queries, and Supabase Edge Function invocations into typed domain services.

---

## 📁 Directory Files

- [`classService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/classService.ts): Manages CRUD operations for classes, including fetching active/archived classes, updating class profile metadata, creating classes from scratch or templates, and deleting classes with cascading relationship cleanup.
- [`studentService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts): Handles student enrollment, student portfolio updates, submission creations/uploads, atomic submission deletion with storage cleanup via `delete_submission_atomic`, rubric grade evaluations, and attendance record synchronization.
- [`materialService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/materialService.ts): Manages curriculum materials, uploading files with rich size/mime metadata to Supabase Storage, forking materials for class-level rubric isolation (`forkMaterial`), linking shared references (`linkSharedMaterial`), unlinking materials from specific classes (`unlinkMaterialFromClass`), soft-archiving (`archiveMaterial`), and retrieving signed preview URLs via `get-material-url`.
- [`instructionService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/instructionService.ts): Manages AI instruction prompts and behavioral rubrics, linking them to classes and templates.
- [`templateService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/templateService.ts): Handles template creation, fetching preset teacher templates, duplicating classes into blueprints, and template deletion.
- [`chatService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/chatService.ts): Dispatches prompt payloads to the FastAPI backend (`POST /api/chat`) and falls back gracefully to local mock responses if the Python service is offline.

---

## 💡 Role in the Application

Services decouple UI components and custom hooks from database schema details, PostgREST query syntax, and backend API endpoints.

For service contracts, error handling strategies, and PostgREST query architectures, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/code.ARCH.md).
