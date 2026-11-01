#!/bin/sh
# Arranque del backend de Facturo en producción (Coolify / Docker Compose).
set -e

# Carpetas de datos: normalmente son el volumen nombrado montado en /data.
mkdir -p "${LOCAL_UPLOADS_DIR:-uploads}"
if [ -n "${SUNAT_ALMACEN_DIR:-}" ]; then
  mkdir -p "$SUNAT_ALMACEN_DIR"
fi

# Esquema de la base: `db push` lleva la base al estado de prisma/schema.prisma.
# SIN --accept-data-loss a propósito: si un cambio futuro del esquema borrara datos (quitar una columna o tabla con
# filas, acortar un tipo), Prisma se niega, este script se detiene por `set -e` y el contenedor no arranca.
# Preferimos un despliegue caído y datos intactos a un despliegue sano y datos perdidos. Quien despliega decide
# entonces cómo migrar (a mano o con `prisma migrate`) y vuelve a desplegar.
npx prisma db push --skip-generate

# Planes (EE. UU. y Perú). Ambos scripts usan ON CONFLICT (slug) DO UPDATE: repetirlos en cada arranque es seguro.
npx prisma db execute --file prisma/seed_plans.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/seed_plans_pe.sql --schema prisma/schema.prisma

# `exec`: node pasa a ser el proceso principal y recibe las señales de parada de Docker.
exec node app.js
