# ── Stage 1: Build Next.js frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Install backend production deps ──────────────────────────────────
FROM node:20-alpine AS backend-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install tools needed by setup-production.sh and staging-manager.sh
# These scripts run inside this container and need:
#   bash      — scripts use bash syntax
#   docker-cli — talk to host Docker daemon via mounted socket
#   wget      — download addons from Dropbox
#   unzip     — extract addon archives
#   openssl   — self-signed cert fallback
#   curl      — health checks in scripts
RUN apk add --no-cache bash docker-cli wget unzip openssl curl

# Install docker compose plugin (standalone binary as fallback if docker-cli-compose unavailable)
RUN apk add --no-cache docker-cli-compose 2>/dev/null || \
    (COMPOSE_VERSION=$(wget -qO- https://api.github.com/repos/docker/compose/releases/latest | grep -o '"tag_name": "v[^"]*' | cut -d'"' -f4) && \
     wget -qO /usr/local/bin/docker-compose "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" && \
     chmod +x /usr/local/bin/docker-compose && \
     mkdir -p /usr/local/lib/docker/cli-plugins && \
     ln -s /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose)

# Copy backend production dependencies
COPY --from=backend-deps /app/node_modules ./node_modules

# Copy Next.js static export
COPY --from=frontend-builder /app/frontend/out ./frontend-build

# Copy backend source
COPY backend/ ./backend/

# Note: runs as root to access /var/run/docker.sock for container management.
# The container is network-isolated and only exposed via nginx reverse proxy.

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "backend/server.js"]
