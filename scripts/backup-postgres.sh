#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="${TOP100_PROJECT_DIR:-/root/top-100-albums}"
BACKUP_DIR="${TOP100_BACKUP_DIR:-/root/top100-backups/postgres}"
LOCAL_RETENTION_DAYS="${TOP100_BACKUP_RETENTION_DAYS:-14}"

RESTIC_ENV_FILE="${TOP100_RESTIC_ENV_FILE:-/root/.config/top100-restic.env}"
RESTIC_BIN="${TOP100_RESTIC_BIN:-/usr/local/bin/restic}"
RESTIC_TAG="top100-postgres"

TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
FINAL_FILE="${BACKUP_DIR}/top100-${TIMESTAMP}.dump"
TEMP_FILE="${FINAL_FILE}.partial"

cleanup() {
  rm -f "${TEMP_FILE}"
}

trap cleanup EXIT
umask 077

if [[ ! -r "${RESTIC_ENV_FILE}" ]]; then
  echo "Backup failed: Restic environment file is unavailable" >&2
  exit 1
fi

if [[ ! -x "${RESTIC_BIN}" ]]; then
  echo "Backup failed: Restic executable is unavailable" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${RESTIC_ENV_FILE}"
set +a

for required_variable in \
  AWS_ACCESS_KEY_ID \
  AWS_SECRET_ACCESS_KEY \
  RESTIC_REPOSITORY \
  RESTIC_PASSWORD
do
  if [[ -z "${!required_variable:-}" ]]; then
    echo "Backup failed: ${required_variable} is not configured" >&2
    exit 1
  fi
done

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

cd "${PROJECT_DIR}"

docker compose exec -T postgres \
  pg_isready -U top100 -d top100 >/dev/null

docker compose exec -T postgres \
  pg_dump \
    --username=top100 \
    --dbname=top100 \
    --format=custom \
    --no-owner \
    --no-privileges \
  > "${TEMP_FILE}"

if [[ ! -s "${TEMP_FILE}" ]]; then
  echo "Backup failed: generated file is empty" >&2
  exit 1
fi

docker compose exec -T postgres \
  pg_restore --list \
  < "${TEMP_FILE}" \
  > /dev/null

mv "${TEMP_FILE}" "${FINAL_FILE}"

sha256sum "${FINAL_FILE}" \
  > "${FINAL_FILE}.sha256"

"${RESTIC_BIN}" backup \
  "${FINAL_FILE}" \
  "${FINAL_FILE}.sha256" \
  --tag "${RESTIC_TAG}"

"${RESTIC_BIN}" forget \
  --tag "${RESTIC_TAG}" \
  --group-by tags \
  --keep-daily 30 \
  --keep-monthly 12 \
  --prune

find "${BACKUP_DIR}" \
  -maxdepth 1 \
  -type f \
  \( -name 'top100-*.dump' -o -name 'top100-*.dump.sha256' \) \
  -mtime "+${LOCAL_RETENTION_DAYS}" \
  -delete

trap - EXIT

echo "Local backup created: ${FINAL_FILE}"
echo "Encrypted R2 backup completed successfully"