#!/usr/bin/env bash
# Entorno LOCAL de la demo de Facturo. Uso: source scripts/demo/entorno-demo.sh   (desde apps/backend)
#
# - Base APARTE: invoiceapp_demo en el Postgres del docker-compose (localhost:5435). Nunca `invoiceapp` ni
#   `invoiceapp_videos`: la siembra se niega (ver src/demo/guardas.js) si la base no empieza con invoiceapp_demo.
# - Los secretos (SUNAT_MASTER_SECRET, JWT_SECRET) se generan una vez y quedan en .claude/demo/entorno.env, fuera del repo.
# - Correo, cobros y subidas a R2 se apagan con claves FALSAS: aunque algo llame a un proveedor, nada sale con una cuenta real.
# - SUNAT: motor local (localhost:8089) y ambiente BETA (la demo fuerza BETA en el mapper).
set -euo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
DEMO="$RAIZ/.claude/demo"
ARCHIVO_ENV="$DEMO/entorno.env"
mkdir -p "$DEMO"

if [ ! -f "$ARCHIVO_ENV" ]; then
  (
    umask 077
    {
      echo "SUNAT_MASTER_SECRET=$(openssl rand -hex 32)"
      echo "JWT_SECRET=$(openssl rand -hex 32)"
    } > "$ARCHIVO_ENV"
  )
fi
set -a
# shellcheck disable=SC1090
. "$ARCHIVO_ENV"
set +a

export MODO_DEMO=si
export NODE_ENV=development
export DATABASE_URL="postgresql://postgres:postgres@localhost:5435/invoiceapp_demo"
export DIRECT_URL="$DATABASE_URL"
export PORT=4001
export FRONTEND_URL=http://localhost:3000
export CORS_ORIGINS=http://localhost:3000
export STORAGE_PROVIDER=local
export LOCAL_UPLOADS_DIR="$DEMO/uploads"
export RESEND_API_KEY=re_demo_local_sin_envio
export RESEND_FROM_EMAIL=facturo@example.invalid
export STRIPE_SECRET_KEY=sk_test_demo_local_sin_uso
export STRIPE_WEBHOOK_SECRET=whsec_demo_local_sin_uso
export CULQI_SECRET_KEY=sk_test_demo_local_sin_uso
export SUNAT_ENGINE_URL=http://localhost:8089
export SUNAT_ENGINE_TOKEN=dev
# XML y CDR a disco, fuera del repo (sin R2_PRIVATE_BUCKET el módulo SUNAT no arranca).
export SUNAT_ALMACEN_DIR="$DEMO/sunat-almacen"
