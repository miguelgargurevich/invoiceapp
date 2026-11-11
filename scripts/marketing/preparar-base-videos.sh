#!/usr/bin/env bash
# Prepara la base LOCAL de los videos (invoiceapp_videos) y la deja lista para el seed. Es idempotente.
#   1. crea invoiceapp_videos en el Postgres del docker-compose (localhost:5435) si no existe;
#   2. aplica el esquema con `prisma db push` (así lo hace el despliegue: las migraciones no arrancan desde cero);
#   3. carga los planes (seed_plans.sql y seed_plans_pe.sql). NO carga seed_sitio.sql: trae datos legales reales.
# Nunca toca la base invoiceapp. Aborta si el nombre de la base no es invoiceapp_videos.
set -euo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"
# shellcheck disable=SC1091
source scripts/marketing/entorno-videos.sh

BASE="invoiceapp_videos"
case "$DATABASE_URL" in
  *localhost:5435/"$BASE") ;;
  *) echo "Aborto: DATABASE_URL no apunta a localhost:5435/$BASE"; exit 1 ;;
esac

export PGPASSWORD=postgres
PSQL=(psql -h localhost -p 5435 -U postgres -v ON_ERROR_STOP=1 -q)

existe="$(psql -h localhost -p 5435 -U postgres -d invoiceapp -tAc "select 1 from pg_database where datname='$BASE'" || true)"
if [ "$existe" != "1" ]; then
  "${PSQL[@]}" -d invoiceapp -c "CREATE DATABASE $BASE"
  echo "base $BASE creada"
else
  echo "base $BASE ya existe"
fi

(cd apps/backend && ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss=false > "$RAIZ/.claude/videos/db-push.log" 2>&1) \
  || { tail -n 20 "$RAIZ/.claude/videos/db-push.log"; echo "db push falló"; exit 1; }
echo "esquema al día (prisma db push)"

"${PSQL[@]}" -d "$BASE" -f apps/backend/prisma/seed_plans.sql
"${PSQL[@]}" -d "$BASE" -f apps/backend/prisma/seed_plans_pe.sql
echo "planes cargados: $("${PSQL[@]}" -d "$BASE" -tAc "select string_agg(slug, ' ' order by slug) from plans" 2>/dev/null || true)"
