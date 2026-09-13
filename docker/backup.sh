#!/bin/sh
# Online SQLite backup for Academy (homelab use).
#
# Uses sqlite3's `.backup`, which is safe on a LIVE database (no
# downtime, no need to stop the container). Run from the host via:
#
#   docker exec academy-web /usr/local/bin/backup.sh
#
# Backups land next to the DB in `backups/` (inside the same volume),
# so copy them offsite afterwards (see HOMELAB.md). Files older than
# BACKUP_KEEP_DAYS (default 30) are pruned.
#
# Env overrides:
#   DB_PATH            SQLite file (default /app/apps/web/data/prod.db)
#   BACKUP_KEEP_DAYS   retention in days (default 30)
set -eu

log() {
    printf '[backup] %s\n' "$*" >&2
}

DB_PATH="${DB_PATH:-/app/apps/web/data/prod.db}"
KEEP="${BACKUP_KEEP_DAYS:-30}"
BACKUP_DIR="$(dirname "$DB_PATH")/backups"
mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/prod-${STAMP}.db"

if ! command -v sqlite3 >/dev/null 2>&1; then
    log "FATAL: sqlite3 CLI not found in this image."
    exit 1
fi
if [ ! -f "$DB_PATH" ]; then
    log "FATAL: database file not found: $DB_PATH"
    exit 1
fi

sqlite3 "$DB_PATH" ".backup '$OUT'"
find "$BACKUP_DIR" -name 'prod-*.db' -mtime +"$KEEP" -delete 2>/dev/null || true
log "backup written to $OUT (keeping $KEEP days)"
