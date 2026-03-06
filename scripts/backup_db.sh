#!/bin/bash
# Backup PostgreSQL database from Docker container
# Usage: ./backup_db.sh [backup_dir]
#
# Requires env vars (or .env file):
#   POSTGRES_USER, POSTGRES_DB
#   BACKUP_DIR (optional, default: /opt/backups/space-conquest)
#   BACKUP_KEEP_DAYS (optional, default: 7)
#   REMOTE_HOST (optional, e.g. phantomhex@zucchini.whatbox.ca)
#   REMOTE_DIR  (optional, e.g. /home/phantomhex/backups/space-conquest)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

# Load .env if it exists
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

POSTGRES_USER="${POSTGRES_USER:-spaceuser}"
POSTGRES_DB="${POSTGRES_DB:-space_db}"
BACKUP_DIR="${1:-${BACKUP_DIR:-/opt/backups/space-conquest}}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
REMOTE_HOST="${REMOTE_HOST:-phantomhex@zucchini.whatbox.ca}"
REMOTE_DIR="${REMOTE_DIR:-/home/phantomhex/backups/space-conquest}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Find the running postgres container
CONTAINER="$(docker ps --filter "ancestor=postgres:18-alpine" --format "{{.Names}}" | head -1)"
if [[ -z "$CONTAINER" ]]; then
    CONTAINER="$(docker ps --format "{{.Names}}" | grep -E "[-_]db[-_]|postgres" | head -1)"
fi

if [[ -z "$CONTAINER" ]]; then
    echo "ERROR: No running PostgreSQL container found" >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup of '${POSTGRES_DB}' from container '${CONTAINER}'"

mkdir -p "$BACKUP_DIR"

# Dump and compress locally
docker exec "$CONTAINER" \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
    | gzip > "$BACKUP_FILE"

SIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup saved: ${BACKUP_FILE} (${SIZE})"

# Transfer to Whatbox via rsync over SSH
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Transferring to ${REMOTE_HOST}:${REMOTE_DIR} ..."
rsync -az --mkpath \
    -e "ssh -o StrictHostKeyChecking=no -o BatchMode=yes" \
    "$BACKUP_FILE" \
    "${REMOTE_HOST}:${REMOTE_DIR}/"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Transfer complete."

# Rotate old LOCAL backups
DELETED="$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime "+${BACKUP_KEEP_DAYS}" -print -delete | wc -l)"
if [[ "$DELETED" -gt 0 ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted ${DELETED} local backup(s) older than ${BACKUP_KEEP_DAYS} days"
fi

# Rotate old REMOTE backups
ssh -o BatchMode=yes "${REMOTE_HOST}" \
    "find ${REMOTE_DIR} -name 'backup_*.sql.gz' -mtime +${BACKUP_KEEP_DAYS} -delete && echo 'Remote rotation done'"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."
