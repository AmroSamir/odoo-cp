# ── Stage 1: Build Next.js frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
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
