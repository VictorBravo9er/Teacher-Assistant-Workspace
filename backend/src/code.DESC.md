# Backend Application Root — `src/`

This directory contains the entrypoint module for initializing and configuring the FastAPI web application.

---

## 📁 Directory Files

- [`main.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/main.py): Instantiates the core `FastAPI` application (`app`), registers CORS middleware for browser origin access, attaches HTTP request timing and logging middleware, loads environment variables via `dotenv`, and mounts the API router from `src.server.router`.

---

## 🚀 Application Lifecycle

When Uvicorn runs `src.main:app`, `main.py` sets up the OpenAPI documentation routes (`/docs`, `/api/internal-data/openapi.json`), configures global middleware, and registers the REST API endpoints.

For middleware sequence and request processing architecture, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/code.ARCH.md).
