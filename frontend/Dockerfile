# 1. Base stage
FROM busybox:1.37.0-musl AS busybox

FROM node:24-slim AS base

WORKDIR /app

# 2. Create directories before switching users (if any)
RUN mkdir -p /app/node_modules /app/dist

# 3. Inject build arguments into environment
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}


# 4. Dependency installation stage
FROM base AS prep

# Switch to the built-in non-root 'node' user (UID 1000)
# We chown /app so Vite can write to node_modules, .vite, dist, etc.
RUN chown -R node:node /app
USER node

# Copy dependency manifests first for layer caching
COPY --chmod=0555 package*.json ./
RUN npm ci


# 5. Full build stage for production artifacts
FROM prep AS build

# Copy all source files and run the Vite build
COPY --chmod=0555 . .
RUN npm run build


# 6. Development runtime stage
FROM prep AS dev

# Install curl for the healthcheck
COPY --from=busybox /bin/wget /bin/wget

ENV FRONTEND_PORT=8080
EXPOSE ${FRONTEND_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:${FRONTEND_PORT}/ || exit 1

# Dev deployment command (moved from docker-compose.dev.yml)
CMD ["sh", "-c", "exec npm run dev -- --host 0.0.0.0 --port ${FRONTEND_PORT}"]


# 7. Production runtime stage
FROM nginx:stable-alpine AS prod

# Copy static assets from the build stage (read & execute only)
COPY --chmod=0555 --chown=nginx:nginx --from=build /app/dist /usr/share/nginx/html
# Copy nginx config (read only)
COPY --chmod=0444 --chown=nginx:nginx default.conf.template /etc/nginx/templates/default.conf.template

ENV FRONTEND_PORT=8080
ENV BACKEND_PORT=8090
ENV BACKEND_HOST=backend
EXPOSE ${FRONTEND_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:${FRONTEND_PORT}/ || exit 1

# Nginx handles env substitution in templates via its default entrypoint
CMD ["nginx", "-g", "daemon off;"]
