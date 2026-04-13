# =============================================================================
# Overflow Backend — Multi-stage Dockerfile
# Base image: node:20-alpine  (small footprint, glibc-compatible enough for
#             Prisma query engine binaries compiled for linux-musl)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: deps
# Install ALL dependencies (prod + dev) so TypeScript / Prisma CLI are
# available at build time.  The result of this stage is never shipped.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Add libc-compat for Prisma's native query engine (musl shim)
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy lock files first — Docker layer caching skips npm ci if nothing changed
COPY package.json package-lock.json ./

# Copy Prisma schema so `prisma generate` can run in the builder stage
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for tsc, ts-node, etc.)
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: builder
# Compile TypeScript and generate the Prisma client.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy the full source tree
COPY . .

# Generate Prisma client for the linux-musl target (Alpine)
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner (production image)
# Only the compiled output, production node_modules, and Prisma artefacts are
# included.  No source code, no dev dependencies.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Overflow Backend"
LABEL org.opencontainers.image.description="Overflow Express/Prisma API server"

# Runtime dependencies for Prisma query engine
RUN apk add --no-cache libc6-compat openssl wget

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nodeuser

# Copy only what is needed to run the server
COPY --from=builder --chown=nodeuser:nodejs /app/dist        ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/prisma      ./prisma
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./

USER nodeuser

EXPOSE 3001

# Startup sequence:
#   1. npx prisma db push — applies schema to the target database without
#      creating migration files. Safe for initial deployments and CI.
#      --skip-generate avoids a redundant generate step (already done in build).
#      --accept-data-loss is intentionally omitted so the command will fail
#      rather than silently destroy data on a schema conflict.
#   2. node dist/index.js — runs the compiled server.
#
# If you prefer migration-based deployments, replace `db push` with:
#   npx prisma migrate deploy
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
