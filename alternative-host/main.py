import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# ---------------------------------------------------------
# API Routes should be defined BEFORE the catch-all route
# ---------------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "API is running"}

# ---------------------------------------------------------
# Frontend Hosting Strategy
# ---------------------------------------------------------

# Define the path to the frontend distribution directory
DIST_DIR = os.path.join(os.path.dirname(__file__), "workdir", "dist")

# Mount the assets directory (Common in Vite/React builds)
# This serves files like /assets/index-xyz.js, /assets/index-xyz.css
assets_dir = os.path.join(DIST_DIR, "assets")
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# Catch-all route for Single Page Applications (SPA)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str, request: Request):
    # 1. If the path starts with /api, it means an API route was not found.
    # We should return a 404 instead of serving the frontend index.html.
    if full_path.startswith("api/"):
        return {"error": "API route not found"}, 404

    # 2. Check if the requested file exists in the root of the dist directory
    # (e.g., /vite.svg, /favicon.ico, /robots.txt)
    requested_file = os.path.join(DIST_DIR, full_path)
    if os.path.isfile(requested_file):
        return FileResponse(requested_file)
    
    # 3. Otherwise, serve the index.html to allow client-side routing
    # (React Router, Vue Router, etc.) to handle the path.
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    
    return {"error": "Frontend build not found. Did you run the deploy script?"}, 404
