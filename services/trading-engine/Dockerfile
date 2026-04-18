# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage monorepo build for the trading-engine service.
#
# IMPORTANT: Docker build context must be the MONOREPO ROOT, not this directory.
# In Railway: set "Root Directory" to "/" and "Dockerfile Path" to
#   "services/trading-engine/Dockerfile"
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# ── Install dependencies ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /monorepo

# Copy workspace manifests first (layer-cache friendly)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/trading-core/package.json    ./packages/trading-core/
COPY services/trading-engine/package.json  ./services/trading-engine/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Build ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /monorepo

COPY --from=deps /monorepo/node_modules                        ./node_modules
COPY --from=deps /monorepo/packages/trading-core/node_modules  ./packages/trading-core/node_modules
COPY --from=deps /monorepo/services/trading-engine/node_modules ./services/trading-engine/node_modules

# Copy source (trading-core first, then service)
COPY packages/trading-core/  ./packages/trading-core/
COPY services/trading-engine/ ./services/trading-engine/

WORKDIR /monorepo/services/trading-engine
RUN pnpm build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /monorepo/services/trading-engine/dist ./dist
COPY --from=builder /monorepo/services/trading-engine/package.json ./

# Install only production deps for the runner (technicalindicators, @supabase/*)
RUN npm install --omit=dev --ignore-scripts

CMD ["node", "dist/index.js"]
