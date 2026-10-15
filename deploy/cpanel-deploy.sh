#!/usr/bin/env bash
#
# Deploy this repository (the cPanel Git clone) to the live site:
#   backend  → build here, copy dist/ + package files into the Node.js app root,
#              install production dependencies into the app's nodevenv, restart
#   frontend → build here, copy dist/ into public_html (nothing there is deleted,
#              so .htaccess, .well-known/ and other server files survive)
#
# Usage (cPanel Terminal, or via .cpanel.yml "Deploy HEAD Commit"):
#   bash deploy/cpanel-deploy.sh --dry-run        # show what would happen, change nothing
#   bash deploy/cpanel-deploy.sh --backend-only
#   bash deploy/cpanel-deploy.sh --frontend-only
#   bash deploy/cpanel-deploy.sh                  # both
#
# Settings live outside the repository in ~/.nevan-deploy.env (template:
# deploy/nevan-deploy.env.example), so pulling new code never changes them.
# Never touched in the app root: .env, node_modules, tmp/, stderr.log.
# ALLOW_DIRTY=1 (testing only) skips the "no uncommitted changes" check.

set -Eeuo pipefail

MODE="all"
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --backend-only) MODE="backend" ;;
    --frontend-only) MODE="frontend" ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\n✗ %s\n' "$*" >&2; exit 1; }
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run]'; printf ' %q' "$@"; printf '\n'
  else
    "$@"
  fi
}
trap 'fail "Stopped at line $LINENO. Nothing after this step ran."' ERR

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${NEVAN_DEPLOY_CONFIG:-$HOME/.nevan-deploy.env}"
[ -f "$CONFIG" ] || fail "Missing $CONFIG. Copy deploy/nevan-deploy.env.example there and fill it in."
# shellcheck disable=SC1090
source "$CONFIG"
: "${APP_ROOT:?APP_ROOT is not set in $CONFIG}"
: "${NODEVENV_ACTIVATE:?NODEVENV_ACTIVATE is not set in $CONFIG}"
: "${WEB_ROOT:?WEB_ROOT is not set in $CONFIG}"
HEALTH_URL="${HEALTH_URL:-https://backend.nevanhandicraft.com.np/api/v1/health}"

# ---------- safety checks ----------
abs() { (cd "$1" 2>/dev/null && pwd -P) || fail "Folder not found: $1"; }
APP_ROOT="$(abs "$APP_ROOT")"
WEB_ROOT="$(abs "$WEB_ROOT")"
REPO_REAL="$(abs "$REPO_DIR")"
HOME_REAL="$(abs "$HOME")"
for dir in "$APP_ROOT" "$WEB_ROOT"; do
  [ "$dir" != "/" ] && [ "$dir" != "$HOME_REAL" ] || fail "Refusing to deploy into $dir"
  case "$dir/" in "$REPO_REAL"/*) fail "$dir is inside the repository clone; use the real app root / public_html" ;; esac
  case "$REPO_REAL/" in "$dir"/*) fail "The repository clone is inside $dir; clone it to ~/repositories/nevan instead" ;; esac
done
[ -f "$NODEVENV_ACTIVATE" ] || fail "NODEVENV_ACTIVATE not found: $NODEVENV_ACTIVATE (copy the 'source …/activate' path from Setup Node.js App)"

if [ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ] && [ "${ALLOW_DIRTY:-0}" != "1" ]; then
  fail "The repository clone has local changes to tracked files. Deploy only committed code (git -C $REPO_DIR status)."
fi

DRY_NOTE=""
if [ "$DRY_RUN" -eq 1 ]; then DRY_NOTE=" (dry run: nothing is changed)"; fi
say "Deploying $(git -C "$REPO_DIR" log -1 --format='%h %s (%cr)') — mode: $MODE$DRY_NOTE"
echo "    repository: $REPO_DIR"
echo "    app root:   $APP_ROOT"
echo "    web root:   $WEB_ROOT"

# Node from the app's own virtual environment (CloudLinux Node.js Selector)
set +u
# shellcheck disable=SC1090
source "$NODEVENV_ACTIVATE"
set -u
echo "    node $(node -v), npm $(npm -v)"

# Copy helpers: rsync when available, cp otherwise
replace_dir() { # replace dst with exactly the contents of src
  if command -v rsync >/dev/null; then run rsync -a --delete "$1/" "$2/"
  else run rm -rf "$2"; run mkdir -p "$2"; run cp -a "$1/." "$2/"; fi
}
merge_dir() { # copy src over dst, deleting nothing
  if command -v rsync >/dev/null; then run rsync -a "$1/" "$2/"
  else run cp -a "$1/." "$2/"; fi
}

if [ "$DRY_RUN" -eq 1 ]; then
  say "Current app root (left as is except dist/ and package*.json)"
  ls -la "$APP_ROOT"
  if [ -L "$APP_ROOT/node_modules" ]; then
    echo "    node_modules → $(readlink "$APP_ROOT/node_modules") (nodevenv link, kept)"
  fi
  say "Server files in the web root that stay untouched"
  for keep in .htaccess .well-known cgi-bin; do
    if [ -e "$WEB_ROOT/$keep" ]; then echo "    $keep"; fi
  done
fi

# ---------- backend ----------
deploy_backend() {
  say "Backend: install and build in the repository clone"
  cd "$REPO_DIR/backend"
  # --include=dev: the nodevenv sets the app's NODE_ENV=production, which would
  # skip the build tools (TypeScript, Vite plugins) that live in devDependencies
  run npm ci --include=dev --no-audit --no-fund
  run npm run build
  [ "$DRY_RUN" -eq 1 ] || [ -f dist/server.js ] || fail "Build did not produce backend/dist/server.js"

  say "Backend: copy the build into the app root"
  replace_dir "$REPO_DIR/backend/dist" "$APP_ROOT/dist"
  run cp "$REPO_DIR/backend/package.json" "$REPO_DIR/backend/package-lock.json" "$APP_ROOT/"

  say "Backend: production dependencies (into the nodevenv)"
  cd "$APP_ROOT"
  # npm install, not npm ci: ci would delete the node_modules link the Node.js Selector manages
  run npm install --omit=dev --no-audit --no-fund

  say "Backend: restart"
  run mkdir -p "$APP_ROOT/tmp"
  run touch "$APP_ROOT/tmp/restart.txt"

  if [ "$DRY_RUN" -eq 0 ]; then
    say "Backend: health check $HEALTH_URL"
    for _ in $(seq 1 20); do
      if body="$(curl -fsS --max-time 10 "$HEALTH_URL" 2>/dev/null)"; then
        echo "    $body"
        return 0
      fi
      sleep 3
    done
    fail "The API did not answer at $HEALTH_URL. Check $APP_ROOT/stderr.log; to roll back, restore dist/ from the pre-deploy archive."
  fi
}

# ---------- frontend ----------
deploy_frontend() {
  say "Frontend: install and build in the repository clone"
  cd "$REPO_DIR/frontend"
  run npm ci --include=dev --no-audit --no-fund
  run npm run build
  [ "$DRY_RUN" -eq 1 ] || [ -f dist/index.html ] || fail "Build did not produce frontend/dist/index.html"

  say "Frontend: copy the build into the web root (nothing there is deleted)"
  local had_htaccess=0
  [ -f "$WEB_ROOT/.htaccess" ] && had_htaccess=1
  merge_dir "$REPO_DIR/frontend/dist" "$WEB_ROOT"
  if [ "$DRY_RUN" -eq 0 ] && [ "$had_htaccess" -eq 1 ] && [ ! -f "$WEB_ROOT/.htaccess" ]; then
    fail "$WEB_ROOT/.htaccess disappeared — restore it from the pre-deploy archive"
  fi
}

case "$MODE" in
  backend) deploy_backend ;;
  frontend) deploy_frontend ;;
  all) deploy_backend; deploy_frontend ;;
esac

trap - ERR
say "Done$DRY_NOTE"
