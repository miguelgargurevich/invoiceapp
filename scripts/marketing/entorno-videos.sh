#!/usr/bin/env bash
# Entorno LOCAL para grabar los videos de Facturo. Uso: source scripts/marketing/entorno-videos.sh
#
# - Base APARTE: invoiceapp_videos en el Postgres del docker-compose (localhost:5435). La base invoiceapp tiene datos reales
#   y no se toca. Este script exporta DATABASE_URL apuntando a la de videos; el backend y el seed no leen otra.
# - Los secretos (SUNAT_MASTER_SECRET, JWT_SECRET) se generan una vez y quedan en .claude/videos/entorno.env (fuera del repo).
# - Se apagan los servicios que mandan correo, cobran o suben archivos a R2: RESEND, STRIPE, CULQI, storage local.
#   Con claves falsas, aunque algo llame a un proveedor, la petición no sale con una cuenta real.
set -euo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
VIDEOS="$RAIZ/.claude/videos"
ARCHIVO_ENV="$VIDEOS/entorno.env"
mkdir -p "$VIDEOS"

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

export DATABASE_URL="postgresql://postgres:postgres@localhost:5435/invoiceapp_videos"
export DIRECT_URL="$DATABASE_URL"
export PORT=4001
export NODE_ENV=development
export FRONTEND_URL=http://localhost:3000
export CORS_ORIGINS=http://localhost:3000
export STORAGE_PROVIDER=local
export LOCAL_UPLOADS_DIR="$VIDEOS/uploads"
export RESEND_API_KEY=re_video_local_sin_envio
export RESEND_FROM_EMAIL=facturo@example.invalid
export STRIPE_SECRET_KEY=sk_test_video_local_sin_uso
export STRIPE_WEBHOOK_SECRET=whsec_video_local_sin_uso
export CULQI_SECRET_KEY=sk_test_video_local_sin_uso
export SUNAT_ENGINE_URL=http://localhost:8089
export SUNAT_ENGINE_TOKEN=dev
# XML y CDR a disco, fuera del repo (sin R2_PRIVATE_BUCKET el módulo SUNAT no arranca).
export SUNAT_ALMACEN_DIR="$VIDEOS/sunat-almacen"
export NEXT_PUBLIC_API_URL=http://localhost:4001
