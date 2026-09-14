#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="${TOP100_PROJECT_DIR:-/root/top-100-albums}"
BACKUP_DIR="${TOP100_BACKUP_DIR:-/root/top100-backups/postgres}"
RETENTION_DAYS="${TOP100_BACKUP_RETENTION_DAYS:-14}"

TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
FINAL_FILE="${BACKUP_DIR}/top100-${TIMESTAMP}.dump"
TEMP_FILE="${FINAL_FILE}.partial"

cleanup() {
  rm -f "${TEMP_FILE}"
}

trap cleanup EXIT

umask 077

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

find "${BACKUP_DIR}" \
  -maxdepth 1 \
  -type f \
  \( -name 'top100-*.dump' -o -name 'top100-*.dump.sha256' \) \
  -mtime "+${RETENTION_DAYS}" \
  -delete

trap - EXIT

echo "Backup created: ${FINAL_FILE}"