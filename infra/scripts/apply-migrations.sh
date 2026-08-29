#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL nao configurada."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql nao encontrado. Instale o cliente PostgreSQL para aplicar migrations no Neon."
  exit 1
fi

for migration in database/migrations/*.sql; do
  echo "Aplicando ${migration}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
