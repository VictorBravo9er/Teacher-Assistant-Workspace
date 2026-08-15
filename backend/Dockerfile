# 1. prepare required binaries source
FROM busybox:1.37.0-musl@sha256:fc6dddc4c44b1bfe37f41cae8e67d1693828e8f42a91862816d7953e2c9d3f23 AS busybox
FROM astral/uv:0.12.3@sha256:2d890623d310b57771ce840f0da5eed5fc6d657da05ffaa45d82797b53fa3abc AS uv


FROM python:3.13.15-slim-trixie@sha256:ffb752e139c0a19692a43af8d8523b274222dd68eebad5d583b45c2201c6e30a AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1


FROM base AS prep

# 2. Install uv and wget
COPY --from=uv /uv /uvx /bin/
COPY --from=busybox /bin/wget /bin/wget
ENV PATH="/app/.venv/bin:$PATH"


ENV UV_CACHE_DIR=/tmp/uv-cache
ENV UV_LINK_MODE=copy

# 3. Create needed directories and set ownership AS ROOT
RUN  mkdir -p $UV_CACHE_DIR /app/.venv \
  && chmod +rx -R /app/.venv


FROM prep AS build

# 4. copy project deps files.
COPY  pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/tmp/uv-cache \
    uv export --frozen --no-dev --format requirements.txt \
  |  uv pip install --system -r /dev/stdin \
  && uv pip install --system "uvicorn>=0.28.0"

FROM base AS dev

# last-1: Setup wget binary
COPY --from=busybox /bin/wget /bin/wget

# last-2. Define UID/GID args and create an unprivileged backend user in prod
ARG USER_ID=1000
ARG GROUP_ID=1000
RUN  groupadd -g ${GROUP_ID} b-grp \
  && useradd -l -u ${USER_ID} -g b-grp -m b-usr

# last-3: copy over required dependencies and library files.
COPY --from=build /usr/local /usr/local

# last-3.5: switch user, set port and expose.
USER b-usr
# last-4: set port and expose.
ENV BACKEND_PORT=8090
EXPOSE ${BACKEND_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:${BACKEND_PORT}/api/health || exit 1

COPY --chmod=0555 --chown=b-usr entrypoint.sh /app/entrypoint.sh

ENV ENVIRONMENT=development
ENTRYPOINT ["/app/entrypoint.sh"]

FROM dev AS prod

# last-4.5: copy src files.
COPY --chmod=0555 ./src /app/src

ENV ENVIRONMENT=production
