# Alternative Hosting Strategy

This directory contains a standalone unified hosting strategy that packages the compiled React frontend application and serves it directly through a FastAPI backend server within a single container.

---

## 📁 Directory Files

- [`Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/alternative-host/Dockerfile): Multi-stage Dockerfile that builds the React frontend in Node, installs backend Python dependencies with `uv`, and packages them into a lightweight, rootless container running Uvicorn.
- [`docker-compose.yml`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/alternative-host/docker-compose.yml): Standalone Docker Compose configuration for launching the unified container on port 8090.
- [`deploy.sh`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/alternative-host/deploy.sh): Shell script automating the frontend compilation (`npm run build`) and copying generated static assets into the backend static workdir (`workdir/dist`).
- [`main.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/alternative-host/main.py): FastAPI application demonstrating static file mounting for `/assets` and catch-all routing (`/{full_path:path}`) to serve `index.html` for client-side SPA routing alongside API endpoints.

---

## 🚀 How to Run

1. **Build and package assets**:
   ```bash
   ./deploy.sh
   ```
2. **Start the unified container**:
   ```bash
   docker compose up --build
   ```
3. Access both frontend and backend on `http://localhost:8090`.

For detailed request routing and architectural patterns, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/alternative-host/code.ARCH.md).
