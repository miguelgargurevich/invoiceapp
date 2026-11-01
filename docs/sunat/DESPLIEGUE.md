# Despliegue del módulo SUNAT

## Variables del backend (Coolify)

| Variable | Valor |
|---|---|
| `SUNAT_ENGINE_URL` | URL interna del servicio `sunat-engine` (red interna de Coolify, sin dominio público) |
| `SUNAT_ENGINE_TOKEN` | Igual que `ENGINE_TOKEN` del motor (`openssl rand -hex 32`) |
| `SUNAT_MASTER_KEY` | `openssl rand -base64 32`. **Si se pierde, los certificados y claves guardados no se pueden descifrar.** Guardarla también en el gestor de secretos. |
| `R2_PRIVATE_BUCKET` | Bucket R2 **sin** acceso público para XML y CDR |
| `DIRECT_URL` | Conexión directa a Postgres (no el pooler) para pg-boss |

Sin `SUNAT_ENGINE_URL` el módulo queda apagado y InvoiceApp funciona igual que antes.

## Servicio `sunat-engine` (Coolify)

- Origen: `apps/sunat-engine` (Dockerfile). Puerto 80. Sin dominio público.
- Variable: `ENGINE_TOKEN`.
- Healthcheck: `GET /salud`.

## Base de datos

1. Con el OK de Miguel: `npx prisma migrate status` contra producción.
2. Si `20261101000000_sunat_nucleo` aparece pendiente y no hay drift: `npx prisma migrate deploy`.
3. Si hay drift (migraciones `.sql` aplicadas a mano): aplicar `migration.sql` con `psql` y luego `npx prisma migrate resolve --applied 20261101000000_sunat_nucleo`.

## Paso a producción de una empresa

1. Configurar el emisor en beta (`PUT /api/sunat/emisor`) y emitir de prueba.
2. Subir el certificado real y el usuario SOL secundario.
3. `PUT /api/sunat/emisor` con `ambiente: "PRODUCCION"` y `confirmarProduccion: true`.
