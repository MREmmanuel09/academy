# syntax=docker/dockerfile:1.7
#
# Academy — production image.
#
# Multi-stage build:
#   base    — node:22-alpine + pnpm via Corepack + minimal tools
#   deps    — `pnpm fetch` populates the offline store (cache-friendly layer)
#   builder — `pnpm install --offline` + `pnpm --filter web build`
#             (produces a standalone `.next` output)
#   runner  — minimal image with only the standalone output,
#             workspace sources (DB schema, content, i18n messages),
#             and minimal node_modules for db:push at startup.
#
# Runtime contract:
#   - Listens on $PORT (default 3000) on 0.0.0.0
#   - Expects AUTH_SECRET, DATABASE_URL, NEXT_PUBLIC_APP_URL via env
#   - The entrypoint applies schema migrations then execs the server
#   - Healthcheck hits GET /api/health every 30s
#
# The standalone output reduces the image size significantly by only
# including the files needed at runtime (no devDependencies, no full
# node_modules tree).
# -----------------------------------------------------------------------------

# ---- Base stage --------------------------------------------------------
# No NODE_ENV here: leaving it unset lets the deps + builder stages see
# devDependencies. Only the runner stage flips it to production.
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# libc6-compat: better-sqlite3 needs it on Alpine.
# wget: used by the HEALTHCHECK below.
# sqlite3: CLI used by the entrypoint to detect whether the bundled SQLite
# DB already has the schema and the migration can be skipped.
RUN apk add --no-cache libc6-compat wget sqlite \
    # Install pnpm globally via npm rather than corepack — corepack tries
    # to re-download pnpm on every `pnpm` invocation from a non-root user,
    # which adds 1-2 s of overhead and fails in air-gapped CI. `npm i -g`
    # drops the binary in /usr/local/bin where PATH already finds it for
    # every user, including our non-root `nextjs` runtime user.
    && npm install -g pnpm@9.15.0 --no-audit --no-fund \
    && pnpm --version

# ---- Deps stage: populate the offline store ----------------------------
# pnpm fetch downloads every package referenced by the lockfile into
# ~/.local/share/pnpm/store. This layer only invalidates when the
# lockfile or a package.json changes.
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && ln -sf python3 /usr/bin/python
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/ui/package.json ./packages/ui/
COPY packages/content/package.json ./packages/content/
RUN pnpm fetch --frozen-lockfile
# Run the install once so better-sqlite3 gets prebuilt and the .pnpm
# store is fully populated.
RUN pnpm install --frozen-lockfile --offline
RUN apk del .build-deps

# ---- Build stage: compile Next.js --------------------------------------
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Copy the populated store + manifests (no host node_modules, see note
# in the header).
COPY --from=deps /app ./
COPY . .
# Use --offline against the populated store; the build never touches
# the network.
RUN pnpm install --frozen-lockfile --offline
# Make sure no local dev DB sneaks into the runtime image. The volume
# mount at `/app/apps/web/data` will provide the actual DB file in
# production; the entrypoint creates the schema fresh.
RUN rm -f /app/apps/web/data/*.db* /app/apps/web/data/*.bak
# `next build` with `output: 'standalone'` produces a minimal .next/standalone
# directory with only the files needed at runtime.
RUN pnpm --filter web build

# ---- Runner stage: ship the minimal runtime ----------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    # pnpm 9 stores its cache in this location. We point it at a writable
    # spot under the home dir of our non-root user.
    npm_config_cache=/home/nextjs/.npm
# Non-root user for defense in depth.
RUN addgroup --system --gid 1001 nodejs 2>/dev/null || true; \
    adduser --system --uid 1001 nextjs 2>/dev/null || true

# 1. Standalone Next.js output (minimal runtime).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# 2. Static assets the server serves directly (manifest, icons, audio).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
# 3. Standalone .next directory (server files needed at runtime).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/ ./apps/web/.next
# 4. Workspace package sources the runtime needs (db schema, content,
#    i18n messages, UI components).
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
# 5. The DB data directory (created with the right ownership so the
#    volume mount works out of the box).
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/data ./apps/web/data
# 6. Workspace manifests so pnpm recognises the layout at runtime.
#    The lockfile is essential — without it pnpm can't resolve packages
#    and `--filter` falls back to "no projects matched".
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# 7. Minimal node_modules for db:push (needs drizzle-kit, drizzle-orm,
#    better-sqlite3, tsx). Use pnpm prune to remove devDependencies.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Entrypoint: applies schema migrations then execs the Next.js server.
COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
# Backup helper (online sqlite3 .backup; see HOMELAB.md). Runs as the
# runtime user via `docker exec` so created files stay writable.
COPY --chown=nextjs:nodejs docker/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# `next start` writes to `.next/cache` and pnpm's `db:push` may need
# scratch space. The directory itself must be writable; the
# COPY --chown above already gave us ownership of all the files.
# chown the top-level dirs so `nextjs` can create new entries.
RUN chown nextjs:nodejs /app

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
