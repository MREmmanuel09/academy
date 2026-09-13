#!/bin/sh
# Container entrypoint for Academy.
#
# Responsibilities:
#   1. Apply DB schema migrations (idempotent — skip if the DB is already
#      in sync with the schema).
#   2. Hand off to the Next.js server (`node server.js` for standalone output).
#
# Fail fast: if the migration step exits non-zero, the container crashes
# instead of starting a broken app. Both stdout and stderr go to the
# container log so `docker compose logs web` shows the full trail.
#
# Why not just `pnpm db:push` on every boot? `drizzle-kit push --force`
# is not strictly idempotent: if a previous boot was killed mid-migration,
# the SQLite file is left in a half-migrated state and a subsequent
# push may try to recreate indexes that already exist, raising
# `index <name> already exists`. We avoid that by checking the DB's
# integrity first and only running the migration when needed.
set -eu

log() {
    printf '[entrypoint] %s\n' "$*" >&2
}

# Fail fast on a missing or weak AUTH_SECRET: sessions are HS256-signed
# with it, so a default/short value compromises every account.
if [ -z "${AUTH_SECRET:-}" ]; then
    log "FATAL: AUTH_SECRET is not set. Generate one with:"
    log "  openssl rand -base64 32"
    exit 1
fi
if [ "${#AUTH_SECRET}" -lt 32 ]; then
    log "FATAL: AUTH_SECRET is too short (${#AUTH_SECRET} chars, need >= 32)."
    log "  Generate one with: openssl rand -base64 32"
    exit 1
fi

DB_PATH="${DATABASE_URL#file:}"
# `file:` URLs can include extra query params; strip them.
DB_PATH="${DB_PATH%%\?*}"

# Ensure the DB parent directory exists. The volume mount at
# /app/apps/web/data provides the directory; we just need to make
# sure better-sqlite3 can open/create the file.
mkdir -p "$(dirname "$DB_PATH")"

# Absolutize the path and re-export it. drizzle-kit resolves a relative
# SQLite path from ITS OWN cwd — and `pnpm --filter` runs package
# scripts with cwd set to the package directory — so a relative
# DATABASE_URL would point drizzle-kit at a different (nonexistent)
# location than the app (which resolves from the workspace root).
# An absolute URL makes every tool open the same file.
DB_PATH="$(cd "$(dirname "$DB_PATH")" && pwd)/$(basename "$DB_PATH")"
export DATABASE_URL="file:${DB_PATH}"
log "DATABASE_URL=${DATABASE_URL} (resolves to ${DB_PATH})"

# --- 1. Migrations -------------------------------------------------------
# We treat the DB as "in sync" when:
#   - the file exists AND
#   - the `users` table is present (every schema has it)
# If both hold, the schema is up to date and we skip the push. This is
# safe because `drizzle-kit push` is destructive on a partial state and
# we want idempotency across restarts.
needs_migration() {
    [ -f "$DB_PATH" ] || return 0   # file missing → migrate
    # Probe for the `users` table via sqlite3. If absent, migrate.
    # sqlite3 CLI is not bundled in the runner image; if it happens to
    # be available (developer machine, custom image), we use it.
    if command -v sqlite3 >/dev/null 2>&1; then
        if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null | grep -q '^users$'; then
            return 1   # schema looks good → skip
        fi
        return 0       # no `users` table → migrate
    fi
    # No sqlite3 CLI available — fall back to running the migration
    # unconditionally. The bundle's `better-sqlite3` node binding is
    # already linked and works; we just lose the "skip if up to date"
    # fast path.
    return 0
}

if needs_migration; then
    log "Applying DB schema (first boot or out-of-sync)..."
    if ! pnpm --filter @academy/db db:push; then
        log "FATAL: database migration failed. Refusing to start the server."
        log "       If the DB file is corrupt, delete the volume and retry:"
        log "         docker compose down -v && docker compose up -d"
        exit 1
    fi
    # drizzle-kit can exit 0 without applying anything (e.g. it failed
    # to open the DB), so verify the schema actually landed instead of
    # trusting the exit code alone.
    if command -v sqlite3 >/dev/null 2>&1; then
        if ! sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" 2>/dev/null | grep -q '^users$'; then
            log "FATAL: migration reported success but the users table is missing."
            log "       If the DB file is corrupt, delete the volume and retry:"
            log "         docker compose down -v && docker compose up -d"
            exit 1
        fi
    fi
    log "DB schema is up to date."
else
    log "DB schema already in sync, skipping migration."
fi

# --- 1b. Content seed -------------------------------------------------
# Seed the static content (lessons, vocab, achievements, english arcs)
# if any of those tables are empty. Idempotent — `onConflictDoNothing()`
# inside the seed means re-runs are no-ops once the DB is populated.
#
# The Sprint L2 vocab file is bundled into the image at
# /app/packages/content/vocab.json so this works in production. Override
# the path with SEED_VOCAB_PATH to point at a different bundle.
needs_seed() {
    # Probe: if `lessons` table is empty, we need to seed.
    if command -v sqlite3 >/dev/null 2>&1; then
        count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM lessons;" 2>/dev/null || echo 0)
        [ "$count" = "0" ] && return 0
        return 1
    fi
    # No sqlite3 CLI: fall back to running the seed unconditionally.
    # The script is idempotent so this is safe, just slower.
    return 0
}

if needs_seed; then
    log "Seeding static content (lessons/vocab/achievements/english)..."
    # NOTE: plain string, not an array — this script runs under
    # `#!/bin/sh` (Alpine ash), which has no bash arrays. Unquoted
    # expansion below is intentional (word splitting on spaces).
    SEED_CMD="pnpm run db:seed:content --content-root /app/packages/content/src"
    if [ -f "${SEED_VOCAB_PATH:-/app/packages/content/vocab.json}" ]; then
        SEED_CMD="${SEED_CMD} --vocab ${SEED_VOCAB_PATH:-/app/packages/content/vocab.json}"
    fi
    # shellcheck disable=SC2086
    if ! $SEED_CMD; then
        log "WARN: content seed failed; the app will run but practice flows may be empty."
    else
        log "Content seed complete."
    fi
else
    log "Content already seeded, skipping."
fi

# --- 2. Server handoff ---------------------------------------------------
# `exec` replaces the shell with the server so SIGTERM/SIGINT (sent by
# `docker stop` and Kubernetes) reach the process directly. Without
# `exec`, the shell would swallow the signal and the container would
# hit its 10s stop timeout before being killed.
#
# For standalone output, Next.js generates a `server.js` file that
# doesn't require the full node_modules tree. This is the recommended
# way to run Next.js in production containers.
log "Starting Next.js server on port ${PORT:-3000}..."
cd /app/apps/web

# Standalone output: use server.js directly
if [ -f "server.js" ]; then
    log "Using standalone server.js"
    exec node server.js -p "${PORT:-3000}"
fi

# Fallback: use next start (for non-standalone builds)
log "Falling back to next start..."
NEXT_PKG_DIR=$(ls -d /app/node_modules/.pnpm/next@*/node_modules/next 2>/dev/null | head -n 1)
if [ -z "$NEXT_PKG_DIR" ]; then
    log "FATAL: cannot locate the `next` package in the pnpm store."
    log "       The image's node_modules tree is broken; rebuild the image."
    exit 1
fi
export NODE_PATH="/app/node_modules:/app/node_modules/.pnpm/node_modules:$(find /app/node_modules/.pnpm -mindepth 2 -maxdepth 2 -type d -name node_modules | tr '\n' ':')"
exec node "${NEXT_PKG_DIR}/dist/bin/next" start -p "${PORT:-3000}"
