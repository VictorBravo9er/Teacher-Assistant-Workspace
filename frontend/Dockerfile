# Base Stage
FROM node:22-slim AS base

WORKDIR /app
RUN mkdir -p /app/node_modules && chmod 777 /app/node_modules

# Build Stage
FROM base AS build-stage

# Install dependencies
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine AS prod

# Copy built assets from build-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx configuration template
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Default ports
ENV PORT=8000
ENV BACKEND_PORT=8001
ENV BACKEND_URL=http://backend:8001

CMD ["nginx", "-g", "daemon off;"]
