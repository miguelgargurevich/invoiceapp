# Despliegue del módulo SUNAT

## Variables del backend (Coolify)

| Variable | Valor |
|---|---|
| `SUNAT_ENGINE_URL` | URL interna del servicio `sunat-engine` (red interna de Coolify, sin dominio público) |
| `SUNAT_ENGINE_TOKEN` | Igual que `ENGINE_TOKEN` del motor (`openssl rand -hex 32`) |
| `SUNAT_MASTER_KEY` | `openssl rand -base64 32`. **Si se pierde, los certificados y claves guardados no se pueden descifrar.** Guardarla también en el gestor de secretos. Alternativa: `SUNAT_MASTER_SECRET` (texto de 32 caracteres o más; la llave se deriva con scrypt y una sal fija). Si existen las dos, manda `SUNAT_MASTER_KEY`. |
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

## Coolify (Docker Compose)

Facturo completo (base, motor SUNAT, API y web) se publica como **un solo recurso Docker Compose** que sale de `docker-compose.coolify.yml`.
Nadie escribe llaves secretas en formularios: Coolify las genera.

### Crear el recurso

1. En Coolify: proyecto **Facturo** → **New resource** → **Docker Compose** desde un repositorio Git.
2. Repositorio `miguelgargurevich/invoiceapp` (`https://github.com/miguelgargurevich/invoiceapp`), rama `main`, archivo `docker-compose.coolify.yml`.
3. Dominios (pestaña del recurso, en cada servicio; el puerto es el del contenedor):

   | Servicio | Dominio |
   |---|---|
   | `frontend` | `https://facturo.gargurevich.dev:3000` |
   | `backend` | `https://api.facturo.gargurevich.dev:4001` |
   | `postgres`, `sunat-engine` | ninguno (solo red interna) |

   Al cargar el archivo, Coolify propone un dominio automático por las variables `SERVICE_FQDN_BACKEND_4001` y `SERVICE_FQDN_FRONTEND_3000`; cámbialos por los de la tabla.
4. **Deploy**. El primer arranque del backend crea las tablas (`prisma db push`) y siembra los planes de EE. UU. y Perú. Los arranques siguientes repiten ambos pasos sin efecto (la siembra usa `ON CONFLICT`).

El DNS comodín `*.gargurevich.dev` ya apunta al VPS: no hay que crear registros.

### Llaves: las genera Coolify

Las variables `SERVICE_PASSWORD_…` del compose las crea Coolify la primera vez y las conserva entre despliegues. Se ven (y se copian al gestor de secretos) en **Environment Variables** del recurso:

| Variable generada | Para qué |
|---|---|
| `SERVICE_PASSWORD_POSTGRES` | Contraseña de la base (32 caracteres) |
| `SERVICE_PASSWORD_64_ENGINE` | Token entre el backend y el motor SUNAT (`ENGINE_TOKEN` = `SUNAT_ENGINE_TOKEN`) |
| `SERVICE_PASSWORD_64_JWT` | `JWT_SECRET` (cambiarla cierra todas las sesiones) |
| `SERVICE_PASSWORD_64_SUNATMASTER` | `SUNAT_MASTER_SECRET`, la llave maestra de los certificados |

> **`SERVICE_PASSWORD_64_SUNATMASTER` (`SUNAT_MASTER_SECRET`) NO se debe regenerar ni cambiar nunca.** Con otro valor, los certificados `.pfx` y las claves SOL ya cifrados no se pueden descifrar y cada empresa tendría que volver a subirlos. Cópiala ahora al gestor de secretos. Tampoco borres el recurso con «delete volumes» sin respaldo.

### Datos y volúmenes

- `postgres-data`: la base. `backend-data` (montado en `/data`): archivos subidos (`/data/uploads`) y XML/CDR de SUNAT (`/data/sunat`).
- El arranque usa `prisma db push` **sin** `--accept-data-loss`: si un cambio futuro del esquema borrara datos, el backend no arranca y no se pierde nada. Habría que migrar a mano y volver a desplegar.
- **Antes de emitir en PRODUCCION de SUNAT** pasa los XML y CDR a R2 (`R2_PRIVATE_BUCKET` y sus llaves, y quitar `SUNAT_ALMACEN_DIR`), o como mínimo programa respaldos del volumen `backend-data`: son los comprobantes legales y deben conservarse. En beta basta el volumen.

### Encender correos, Stripe y Culqi después

Salen apagados con valores inofensivos (`desactivado`). Para encenderlos, crea o edita la variable en **Environment Variables** del recurso y redespliega el backend (no hace falta reconstruir):

| Servicio | Variables |
|---|---|
| Correos (Resend) | `RESEND_API_KEY` y, si quieres, `RESEND_FROM_EMAIL` y `RESEND_FROM_NAME` |
| Stripe | `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` (el webhook apunta a `https://api.facturo.gargurevich.dev/api/webhooks/stripe`) |
| Culqi | `CULQI_SECRET_KEY` (backend) y `NEXT_PUBLIC_CULQI_PUBLIC_KEY` (llave pública: la incrusta Next al compilar, así que **sí exige redesplegar con reconstrucción del frontend**) |

El ambiente de SUNAT sigue siendo beta hasta que cada empresa pase a producción (sección anterior).
