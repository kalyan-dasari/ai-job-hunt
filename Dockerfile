# Multi-stage Dockerfile for JobPilot AI v1.0
# Requires Node.js 22+ for native node:sqlite engine support

# ----------------- Stage 1: Build Frontend & Prepare App -----------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for node build
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build production assets using Vite
RUN npm run build

# Prune dev dependencies for production runtime
RUN npm prune --production

# ----------------- Stage 2: Production Runtime -----------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/jobpilot.db

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy production files and built assets from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Ensure data directory exists with appropriate permissions
RUN mkdir -p /app/data && chown -R node:node /app

USER node

# Expose server port
EXPOSE 3000

# Persistent SQLite directory volume
VOLUME ["/app/data"]

# Healthcheck probing root /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start full-stack server
CMD ["node", "--loader", "tsx", "server.ts"]

