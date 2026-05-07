#!/usr/bin/env bash
set -euo pipefail

# Simple, repeatable "copy Vercel production DB into local clone DB" flow.
# Default local target is usoap_prod_clone so normal local DB stays untouched.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENV_FILE="${ENV_FILE:-.env.production.local}"
DUMP_FILE="${DUMP_FILE:-prod_dump.sql}"
LOCAL_DB_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5432}"
LOCAL_DB_USER="${LOCAL_DB_USER:-usoap}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-usoap}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-usoap_prod_clone}"

echo "Pulling production env vars from Vercel..."
npx vercel env pull --environment=production "$ENV_FILE"

set -a
source "$ENV_FILE"
set +a

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "DIRECT_URL is missing after env pull."
  exit 1
fi

echo "Dumping production DB..."
PGSSLMODE=require pg_dump "$DIRECT_URL" --no-owner --no-privileges --format=plain > "$DUMP_FILE"

echo "Rebuilding local DB: $LOCAL_DB_NAME"
export PGPASSWORD="$LOCAL_DB_PASSWORD"

psql -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -d postgres -c \
"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LOCAL_DB_NAME' AND pid <> pg_backend_pid();" >/dev/null

dropdb -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" --if-exists "$LOCAL_DB_NAME"
createdb -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" "$LOCAL_DB_NAME"
psql -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" < "$DUMP_FILE" >/dev/null

echo "Done."
echo "Local DB '$LOCAL_DB_NAME' now mirrors Vercel production."
echo "Next: npm run dev:clone"
