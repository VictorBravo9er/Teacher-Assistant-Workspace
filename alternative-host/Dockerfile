# -----------------------------------
# Stage 1: Build the Frontend
# -----------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend dependency files
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend source code and build it
COPY frontend/ ./
RUN npm run build


# -----------------------------------
# Stage 2: Serve via FastAPI Backend
# -----------------------------------
FROM python:3.11-slim

WORKDIR /app/backend

# Install necessary Python dependencies for the demo
# (If you have a requirements.txt, you would COPY backend/requirements.txt ./ and pip install it here)
RUN pip install --no-cache-dir fastapi uvicorn

# Copy the demo FastAPI script that contains our hosting strategy
COPY alternative-host/main.py ./

# Create the workdir where the FastAPI app expects the frontend files
RUN mkdir -p workdir

# Copy the built dist from the frontend-builder stage to the backend workdir
COPY --from=frontend-builder /app/frontend/dist ./workdir/dist

# Expose the port the app runs on
EXPOSE 8000

# Command to run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
