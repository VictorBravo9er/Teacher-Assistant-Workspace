# Base Stage
FROM node:24-slim AS base

WORKDIR /app

# Create directories and set ownership AS ROOT before switching USER
RUN mkdir -p /app/node_modules /app/dist


ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# Build Stage
FROM base AS build-env
COPY package*.json ./
RUN npm ci

FROM build-env AS build
COPY . .
RUN npm run build

FROM build-env AS dev
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
ENV FRONTEND_PORT=8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f -s -I http://localhost:${FRONTEND_PORT}/ || exit 1

# Production Stage
FROM nginx:stable-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY default.conf.template /etc/nginx/templates/default.conf.template

ENV FRONTEND_PORT=8000
ENV BACKEND_PORT=8001
ENV BACKEND_HOST=backend
EXPOSE $FRONTEND_PORT

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f -s -I http://localhost:${FRONTEND_PORT}/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
