<div align="center">
<img width="200" height="200" alt="Teach&Learn Logo" src="./frontend/public/logo.svg" />
</div>

# Teach&Learn

A modern, full-stack web application featuring a Python backend (Uvicorn/FastAPI) and a React/Vite frontend.

The entire application is strictly containerized using heavily optimized Docker images, meaning you do not need Python, Node.js, or any other local toolchains installed to develop or run it.

## 🚀 Quick Start

**Prerequisites:** 
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### 1. Environment Setup
Create your local environment file and fill in your Supabase and API credentials:
```bash
cp .env.example .env
```

### 2. Run in Development Mode
Development mode features live hot-reloading for both the frontend source code and the backend API. 

```bash
# Start the stack using the development overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
- **Frontend App**: http://localhost:80
- **Backend API**: http://localhost:8090

### 3. Run in Production Mode
Production mode complies the frontend into static assets served securely behind Nginx, and runs the backend optimized for performance.

```bash
# Start the stack in detached production mode
docker compose up -d --build
```

## 🏗️ Architecture & Security

This project utilizes highly optimized, multi-stage Docker builds to ensure small image sizes and extreme security:
- **Fast Builds**: The backend uses `uv` for lightning-fast Python dependency management. The frontend leverages advanced layer caching and a custom `busybox` multi-stage extraction.
- **Rootless Execution**: At runtime, both the backend API and frontend Nginx workers operate under unprivileged, non-root users.
- **Immutable Source Code**: Application source code is mounted and copied with strict read-only permissions (`0555` / `0444`), preventing any rogue processes from modifying the application source at runtime.