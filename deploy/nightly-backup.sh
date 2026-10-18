#!/usr/bin/env bash
#
# Nightly copy of the shop's database (MongoDB Atlas M0 keeps no backups).
# Run by a cPanel Cron Job; exports every collection as gzipped EJSON into
#   ~/backups/db-YYYY-MM-DD/        (Nepal date)
# and deletes exports older than BACKUP_KEEP_DAYS (default 14). An export that
# fails part-way is discarded, never kept as if complete.
#
#   bash ~/repositories/nevan/deploy/nightly-backup.sh
#
# Needs:
#   ~/.nevan-deploy.env   APP_ROOT and NODEVENV_ACTIVATE (same file as the deploy)
#   ~/.nevan-backup.env   MONGODB_URI=<the live connection string>, chmod 600.
#                         Cron jobs don't get the app's cPanel environment, so
#                         the backup reads the connection string from here.
#
# Restore (into a new database, then point the app's MONGODB_URI at it):
#   node ~/backend/dist/scripts/cloneDatabase.js --import-dir ~/backups/db-YYYY-MM-DD \
#        --target-env-file ~/.nevan-backup.env --target-db bivanhandicraft_restored

set -Eeuo pipefail

CONFIG="${NEVAN_DEPLOY_CONFIG:-$HOME/.nevan-deploy.env}"
SECRETS="${NEVAN_BACKUP_ENV:-$HOME/.nevan-backup.env}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

fail() { printf '%s ✗ %s\n' "$(date '+%F %T')" "$*" >&2; exit 1; }

[ -f "$CONFIG" ] || fail "Missing $CONFIG"
# shellcheck disable=SC1090
source "$CONFIG"
: "${APP_ROOT:?APP_ROOT is not set in $CONFIG}"
: "${NODEVENV_ACTIVATE:?NODEVENV_ACTIVATE is not set in $CONFIG}"
[ -f "$SECRETS" ] || fail "Missing $SECRETS (one line: MONGODB_URI=...)"
case "$(stat -c '%a' "$SECRETS")" in
  600|400) ;;
  *) fail "$SECRETS must be readable only by you: chmod 600 $SECRETS" ;;
esac
SCRIPT="$APP_ROOT/dist/scripts/cloneDatabase.js"
[ -f "$SCRIPT" ] || fail "Not found: $SCRIPT (deploy the backend first)"

set +u
# shellcheck disable=SC1090
source "$NODEVENV_ACTIVATE"
set -u

DAY="$(TZ=Asia/Kathmandu date +%F)"
FINAL="$BACKUP_DIR/db-$DAY"
PARTIAL="$FINAL.partial"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
rm -rf "$PARTIAL"

echo "$(date '+%F %T') Backup to $FINAL"
# Small heap: the export streams, and the account's memory cap is shared by every app
if ! NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=256" node "$SCRIPT" --source-env-file "$SECRETS" --export-dir "$PARTIAL" --gzip; then
  rm -rf "$PARTIAL"
  fail "Export failed; nothing kept for $DAY"
fi
rm -rf "$FINAL"
mv "$PARTIAL" "$FINAL"
echo "$(date '+%F %T') ✓ $(du -sh "$FINAL" | cut -f1) in $FINAL"

# Only after a good export: drop the old ones
find "$BACKUP_DIR" -maxdepth 1 -type d -name 'db-*' -mtime "+$KEEP_DAYS" -print -exec rm -rf {} +
