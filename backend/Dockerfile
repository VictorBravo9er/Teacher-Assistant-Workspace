FROM python:3.11-slim as base

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Set path to use virtual environment's bin folder
ENV PATH="/app/.venv/bin:$PATH"

FROM base AS build
# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync
RUN uv sync --frozen --no-dev

# Copy application source
COPY . .

# Default port
ENV BACKEND_PORT=8001

# Expose default port
EXPOSE ${BACKEND_PORT}

FROM base as prod

# Copy the virtual environment into its exact matching path
COPY --from=build /app/.venv /app/.venv

# Copy the source directory
COPY --from=build /app/src /app/src

# Copy the main execution file
COPY --from=build /app/main.py /app/main.py

# Start the application using uvicorn with runtime port expansion
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT}"]
