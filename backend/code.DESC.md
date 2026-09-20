# Backend Service — Python 3.13 / FastAPI / LangGraph

This directory contains the root configuration, package specifications, containerization, and runtime entrypoint for the **Teach&Learn** Python backend service.

---

## 📁 Directory Files

- [`pyproject.toml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/pyproject.toml): Project metadata, Python runtime requirements (`>=3.13,<3.14`), dependencies (FastAPI, Uvicorn, LangChain, LangGraph, Pydantic v2, psycopg), and Poe the Poet task runner scripts (`lint`, `format`, `test`, `run-dev`).
- [`uv.lock`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/uv.lock): Fully resolved, deterministic dependency lockfile managed by `uv`.
- [`Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/Dockerfile): Multi-stage Docker build utilizing `ghcr.io/astral-sh/uv` to install dependencies into an isolated virtual environment and run rootless Uvicorn (`USER 1000:1000`) with immutable code permissions.
- [`entrypoint.sh`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/entrypoint.sh): Container startup script that parses runtime parameters and launches Uvicorn on host `0.0.0.0` and port `8090`.
- [`AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/AGENTS.md): Subsystem-specific engineering rules, FastAPI async conventions, LangGraph standards, and validation workflows.
- [`.env.example`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/.env.example): Backend environment template specifying required keys (`OPENROUTER_API_KEY`, `POSTGRES_URI`, `OPENROUTER_MODEL`).
- [`.dockerignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/.dockerignore): Excludes virtualenvs, cache files, and local settings from container build contexts.
- [`.gitignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/.gitignore): Excludes python bytecode, `.venv`, and temporary artifacts from version control.

---

## 🚀 Development & Tasks

Manage backend workflows using `uv` and `poe`:

```bash
# Install dependencies
uv sync

# Run development server with live reload
uv run poe run-dev

# Run linting and type verification
uv run poe lint

# Run auto-formatting
uv run poe format
```

For structural details on the multi-stage build, container security, and package management, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/code.ARCH.md).
