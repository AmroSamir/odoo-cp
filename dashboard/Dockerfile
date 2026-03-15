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

# Copy Next.js standalone build (includes _next/static via symlink)
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend-build
COPY --from=frontend-builder /app/frontend/.next/static ./frontend-build/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend-build/public

# Copy backend source
COPY backend/ ./backend/

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "backend/server.js"]
