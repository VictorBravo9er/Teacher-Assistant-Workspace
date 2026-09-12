<div align="center">
<img width="200" height="200" alt="Teach&Learn Logo" src="./frontend/public/logo.svg" />
</div>

# Teach&Learn Workspace

Welcome to **Teach&Learn**, an AI-powered full-stack workspace for educators to manage classes, track student portfolios, build repeatable curriculum templates, evaluate rubric criteria, and perform pedagogical gap analyses via LangGraph/RAG assistants.

---

## 📁 Root Directory Files

This root directory contains the workspace configuration, multi-container orchestration, and environment templates:

- [`docker-compose.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docker-compose.yml): Production Docker Compose configuration defining rootless container services for the FastAPI backend (`backend`) and Nginx static frontend (`frontend`), port forwardings (80 for frontend, 8090 for backend), environment passing, and healthchecks.
- [`docker-compose.dev.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/docker-compose.dev.yml): Development Docker Compose override file enabling volume mount overrides, live hot-reloading for React/Vite and FastAPI, and debug port bindings.
- [`AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/AGENTS.md): The root governing rules, cascading guidelines, engineering principles (SRP, DRY, type safety), container security standards, ephemeral scratch directory (`./.scratch/`) manifest standards, and documentation requirements for the workspace.
- [`TODO.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/TODO.md): Master project roadmap, completed feature milestones, and upcoming backend vector RAG / autonomous grading tasks.
- [`.env.example`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/.env.example): Reference template listing mandatory environment variables required to run the workspace (Supabase keys, database connection strings, OpenRouter API keys).
- [`config.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/config.yml): Top-level platform and assistant configuration metadata.
- [`metadata.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/metadata.json): Workspace identifiers, project titles, and indexing properties.
- [`pyrightconfig.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/pyrightconfig.json): Root BasedPyright configuration defining Python version (`3.13`), search paths, and analysis modes for type verification.
- [`tsconfig.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/tsconfig.json): Root TypeScript project reference and workspace resolution configuration.
- [`vercel.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/vercel.json): Vercel deployment routing and build configurations for static web hosting.
- [`.gitignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/.gitignore): Root Git exclusion rules for node modules, python virtual environments, secrets, caches, scratch files (`.scratch/`), and build artifacts.

---

## 🚀 Quick Start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) & Docker Compose.

### 1. Environment Setup
```bash
cp .env.example .env
```

### 2. Run in Development Mode (Hot Reloading)
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
- **Frontend Web Application**: http://localhost:80
- **Backend FastAPI Service**: http://localhost:8090

### 3. Run in Production Mode (Optimized Rootless Build)
```bash
docker compose up -d --build
```

---

## 🏗️ Architectural Overview

- For deep details on multi-container orchestration, security constraints, and network flows across root services, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/code.ARCH.md).
- For comprehensive subsystem-by-subsystem specifications, data models, edge functions, AI evaluation pipelines, and frontend architecture, see [`systems/README.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/systems/README.md).