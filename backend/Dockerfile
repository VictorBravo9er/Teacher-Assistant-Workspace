FROM python:3.13-slim AS base

# 1. Define UID/GID args and create an unprivileged backend user
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN groupadd -g ${GROUP_ID} b-grp && \
  useradd -l -u ${USER_ID} -g b-grp -m b-usr

# 2. Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH"

FROM base AS prep
ENV UV_CACHE_DIR=/tmp/uv-cache
ENV UV_LINK_MODE=copy

# 3. Create needed directories and set ownership AS ROOT
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  rm -rf /var/lib/apt/lists/* && \
  mkdir -p $UV_CACHE_DIR /app/.venv && \
  chmod 777 $UV_CACHE_DIR /app/.venv && \
  chown -R b-usr /app $UV_CACHE_DIR

# 4. Switch to the non-root user
USER b-usr

FROM prep AS build
COPY --chown=b-usr pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-cache \
  && uv pip install --no-cache "uvicorn>=0.28.0" \
  && rm -rf "$UV_CACHE_DIR"

FROM build AS prod

COPY --chown=b-usr ./src /app/src

ENV BACKEND_PORT=8001
EXPOSE ${BACKEND_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=3s --retries=3 \
  CMD curl -f http://127.0.0.1:${BACKEND_PORT:-8001}/api/health || exit 1

CMD ["sh", "-c", "exec /app/.venv/bin/uvicorn src.main:app --host 0.0.0.0 --port ${BACKEND_PORT}"]
