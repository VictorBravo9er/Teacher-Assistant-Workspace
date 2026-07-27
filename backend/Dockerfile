FROM python:3.11-slim AS base

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Set path to use virtual environment's bin folder
ENV PATH="/app/.venv/bin:$PATH"

FROM base AS prep

ENV UV_CACHE_DIR=/tmp/uv-cache
ENV UV_LINK_MODE=copy
RUN mkdir -p $UV_CACHE_DIR && chmod 777 $UV_CACHE_DIR && \
    mkdir -p /app/.venv && chmod 777 /app/.venv

FROM prep AS build
# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync
RUN uv sync --frozen --no-dev --no-cache \
    && uv pip install --no-cache "uvicorn>=0.28.0" \
    && rm -rf "$UV_CACHE_DIR"# Copy application source

COPY ./src /app/src
COPY ./main.py /app/main.py

# COPY . .

FROM build as prod

# # Copy the virtual environment into its exact matching path
# COPY --from=build /app/.venv /app/.venv

# # Copy the source directory
# COPY --from=build /app/src /app/src

# # Copy the main execution file
# COPY --from=build /app/main.py /app/main.py

# Default port
ENV BACKEND_PORT=8001

# Expose default port
EXPOSE ${BACKEND_PORT}

CMD ["sh", "-c", "exec /app/.venv/bin/uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT}"]
