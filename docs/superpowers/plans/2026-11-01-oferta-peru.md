# Oferta para Perú con cobro por Culqi — Plan de implementación

> **Para agentes:** ejecuta este plan tarea por tarea. Cada tarea es independiente dentro de su orden (ver «Orden y paralelismo»). Los pasos usan casillas (`- [ ]`).

**Objetivo:** las empresas de Perú ven y contratan planes en soles con límites por comprobantes SUNAT y los pagan con Culqi; las de EE. UU. siguen igual (USD + Stripe).

**Arquitectura:** `Plan.pais` separa la oferta; el endpoint público de planes filtra por `?pais=`. Un cliente HTTP propio de Culqi (`src/pagos/culqi/`) crea cliente → tarjeta → suscripción; el webhook vuelve a consultar el evento y la suscripción en la API antes de tocar la BD. El cupo de comprobantes se verifica dentro de la transacción de `emitir`, contando lo emitido en el mes (hora de Lima).

**Stack:** Express 5 + Prisma 5.22 (CommonJS, `node:test`), Next.js 14 + next-intl + Tailwind, Culqi API v2 (`https://api.culqi.com`), Culqi Custom Checkout (`https://js.culqi.com/checkout-js`) y Culqi 3DS (`https://3ds.culqi.com`).

Spec: `docs/superpowers/specs/2026-11-01-oferta-peru-design.md`.

## Restricciones globales

- Precios (incluyen IGV): `pe-gratis` S/ 0; `pe-emprendedor` S/ 29 / S/ 279; `pe-negocio` S/ 59 / S/ 569 (popular); `pe-empresa` S/ 119 / S/ 1,149.
- Límites: comprobantes/mes 10 / 100 / 500 / ilimitado (-1); clientes 10 / 100 / -1 / -1.
- Flags: emprendedor `hasReports`; negocio + `hasProposals`, `hasDigitalSignatures`, `hasRegimenesSunat`, `hasCustomBranding`; empresa + `hasAdvancedReports`, `hasMultiCurrency`, `hasApiAccess`, `hasPrioritySupport`.
- Planes de Perú: `pais = 'PE'`, `currency = 'PEN'`, `trialDays = 0`.
- La llave secreta de Culqi (`CULQI_SECRET_KEY`) **solo** vive en el backend; nunca se imprime ni se registra en logs. El frontend usa `NEXT_PUBLIC_CULQI_PUBLIC_KEY`.
- Montos a Culqi en **céntimos** (S/ 59.00 → `5900`).
- Nada de esto cambia el flujo de EE. UU. (Stripe): toda rama nueva se activa por `pais === 'PE'` o `proveedorPago === 'culqi'`.
- Backend CommonJS, mensajes e identificadores en español; frontend TypeScript estricto, textos con next-intl.
- `prisma/migrations/` y `*.sql` están en `.gitignore`: los archivos nuevos de esas rutas se agregan con `git add -f`.

## API de Culqi verificada (OpenAPI oficial `https://apidocs.culqi.com/apiculqi.yaml`, versión 2.0)

Autenticación: `Authorization: Bearer <sk>`; `Content-Type: application/json`.

| Acción | Método y ruta | Cuerpo (obligatorios en **negrita**) | Respuesta útil |
|---|---|---|---|
| Crear cliente | `POST /v2/customers` | **first_name, last_name** (solo letras y espacios), **email, address, address_city, country_code** (`PE`), **phone_number**, metadata | 201 `{ id: 'cus_…' }` |
| Buscar cliente | `GET /v2/customers?email=…` | — | `{ data: [{ id }] }` |
| Crear tarjeta | `POST /v2/cards` | **customer_id, token_id**, authentication_3DS `{eci,xid,cavv,protocolVersion,directoryServerTransactionId}` | 201 `{ id: 'crd_…' }` · **200 `{ action_code: 'REVIEW' }` = falta 3DS** |
| Crear plan | `POST /v2/recurrent/plans/create` | **name, short_name, description, amount** (céntimos), **currency** (`PEN`), **interval_unit_time** (3 = mensual, 4 = anual), **interval_count**, **initial_cycles** `{count, has_initial_charge, amount, interval_unit_time}` | 201 `{ id: 'pln_…' }` |
| Crear suscripción | `POST /v2/recurrent/subscriptions/create` | card_id, plan_id, tyc (`true`), metadata | 201 `{ id: 'sxn_…', status: 1 }` |
| Consultar suscripción | `GET /v2/recurrent/subscriptions/{id}` | — | `status` (1 creada, 2 prueba, 3 activa, 4 cancelada, 5 en cola, 6 finalizada), `next_billing_date` (UNIX s), `active_card` |
| Cambiar tarjeta | `PATCH /v2/recurrent/subscriptions/{id}` | card_id | — |
| Cancelar | `DELETE /v2/recurrent/subscriptions/{id}` | — | `{ id, delete: true }` (inmediata e irreversible) |
| Consultar evento | `GET /v2/events/{id}` | — | `{ id, type, data }` |

- Errores: cuerpo `{ object:'error', type, merchant_message, user_message, code? }`; `card_error` llega con HTTP 402.
- Webhook (se registra en CulqiPanel › Eventos › Webhooks): POST con `{ object:'event', id:'evt_…', type, creation_date, data }`, donde `data` puede llegar como **string JSON**. **Culqi no firma el webhook**: por eso se reconsulta con la sk.
- Eventos que usamos: `subscription.charge.succeeded`, `subscription.charge.failed`, `subscription.cancel.succeeded`, `subscription.creation.succeeded`.
- `interval_count`: la doc dice «cantidad de intervalos entre cada cargo» y «si envía 0 se cobrará de forma indefinida». Usamos **`interval_count: 0`** y lo confirma Opus en el sandbox (Tarea 6) mirando el plan creado; si el sandbox lo rechaza, se cambia a `1` en el script.
- Tarjeta de prueba de éxito (docs.culqi.com › Tarjetas de prueba): `4111 1111 1111 1111`, vence `12/30`, CVV `123`.

## Mapa de archivos

| Archivo | Tarea | Qué |
|---|---|---|
| `apps/backend/prisma/schema.prisma` | 1 | `Plan.pais`, `culqiPlanId*`, `hasRegimenesSunat`; `Subscription.proveedorPago`, `culqi*`; modelo `EventoCulqi` |
| `apps/backend/prisma/migrations/20261101010000_oferta_peru/migration.sql` | 1 | migración (con `git add -f`) |
| `apps/backend/prisma/seed_plans_pe.sql` | 1 | los 4 planes (con `git add -f`) |
| `apps/backend/src/planes/catalogo.js` | 1 | `planGratisDe(pais)`, `featuresPlan(plan)`, `planPublico(plan)` |
| `apps/backend/app.js` | 1 (planes), 2 (montaje) | `GET /api/subscriptions/plans?pais=` ; montar router Culqi |
| `apps/backend/src/middleware/subscription.js` | 1 | `getOrCreateSubscription` elige el plan gratis del país |
| `apps/backend/src/routes/subscriptions.js` | 1 (initialize, switch-to-free), 2 (cancel, reactivate) | |
| `apps/backend/src/routes/empresa.js` | 1 | `PUT /mi-empresa` acepta `pais` |
| `apps/backend/test/db/planes-ayuda.js` | 1 | `sembrarPlanesPe()` para otras pruebas |
| `apps/backend/test/db/planes-pais.test.js` | 1 | pruebas de la tarea 1 |
| `apps/backend/src/pagos/culqi/cliente.js` | 2 | cliente HTTP de Culqi |
| `apps/backend/src/pagos/culqi/suscripciones.js` | 2 | contratar, cancelar, cambiar tarjeta, sincronizar |
| `apps/backend/src/routes/subscriptionsCulqi.js` | 2 | `/api/subscriptions/culqi/*` |
| `apps/backend/src/routes/webhooks.js` | 2 | `POST /api/webhooks/culqi` |
| `apps/backend/scripts/culqi-crear-planes.js` | 2 | crea los planes en Culqi |
| `apps/backend/test/unit/culqi/*.test.js`, `test/db/culqi.test.js` | 2 | |
| `apps/backend/src/planes/cupo.js` | 3 | `verificarCupo(tx, empresaId, fecha)`, `verificarRegimenes(prisma, empresaId, datos)` |
| `apps/backend/src/sunat/errores.js`, `src/sunat/http.js` | 3 | `ErrorPlan` → 402/403 |
| `apps/backend/src/sunat/emision/servicio.js`, `borradores.js` | 3 | llamadas a `cupo.js` |
| `apps/backend/src/routes/comprobantes.js` | 3 | el cupo deja de cobrarse al crear el borrador |
| `apps/backend/test/db/cupo.test.js` | 3 | |
| `apps/frontend/lib/subscriptions.ts` | 4 | `getPlans(pais)`, `formatPrice` con PEN, tipos y API Culqi |
| `apps/frontend/components/landing/PricingSection.tsx` | 4 | `es` → PE |
| `apps/frontend/components/setup/CompanyStep.tsx`, `PlanStep.tsx`, `app/[locale]/setup/page.tsx` | 4 | país en el asistente |
| `apps/frontend/messages/es.json`, `en.json` | 4 y 5 (claves distintas) | |
| `apps/frontend/lib/culqi.ts` | 5 | carga de scripts, checkout y 3DS |
| `apps/frontend/components/settings/ContratarCulqiModal.tsx` | 5 | datos de facturación + checkout + 3DS |
| `apps/frontend/components/settings/SubscriptionTab.tsx` | 5 | contratar/cambiar tarjeta/cancelar para PE |

## Orden y paralelismo

1. **Tarea 1** (sola; todo depende del esquema).
2. **Tareas 2, 3 y 4** en paralelo (archivos distintos; solo coinciden en `docs/HANDOFF.md` y la 4 en `messages/*.json`).
3. **Tarea 5** (necesita la API de la 2 y `lib/subscriptions.ts` de la 4).
4. **Tarea 6** (Opus): integración, sandbox de Culqi y Chrome.

---

### Tarea 1: Esquema, planes de Perú y visibilidad por país

**Riesgo:** medio · **Ejecutor:** Haiku

**Archivos:**
- Modificar: `apps/backend/prisma/schema.prisma`
- Crear: `apps/backend/prisma/migrations/20261101010000_oferta_peru/migration.sql`, `apps/backend/prisma/seed_plans_pe.sql`, `apps/backend/src/planes/catalogo.js`, `apps/backend/test/db/planes-ayuda.js`, `apps/backend/test/db/planes-pais.test.js`
- Modificar: `apps/backend/app.js` (solo el handler `GET /api/subscriptions/plans`), `apps/backend/src/middleware/subscription.js` (`getOrCreateSubscription`), `apps/backend/src/routes/subscriptions.js` (`/initialize`, `/switch-to-free`), `apps/backend/src/routes/empresa.js` (`PUT /mi-empresa`)

**Produce (lo usan otras tareas):**
- Campos Prisma: `Plan.pais`, `Plan.culqiPlanIdMensual`, `Plan.culqiPlanIdAnual`, `Plan.hasRegimenesSunat`; `Subscription.proveedorPago`, `Subscription.culqiCustomerId`, `Subscription.culqiCardId`, `Subscription.culqiSubscriptionId`; modelo `EventoCulqi { id, tipo, procesadoEn }`.
- `require('../planes/catalogo')` → `{ planGratisDe(prisma, pais) → Promise<Plan|null>, planPublico(plan) → objeto JSON del endpoint }`.
- `test/db/planes-ayuda.js` → `{ sembrarPlanesPe() → Promise<Record<slug, Plan>> }`.
- `GET /api/subscriptions/plans?pais=PE` devuelve `[{ id: slug, name, description, priceMonthly, priceYearly, currency, pais, features: string[], maxInvoices, maxClients, maxUsers, isActive, sortOrder, isPopular }]`.

- [ ] **Paso 1: esquema.** En `model Plan`, después de `currency`:

```prisma
  pais            String   @default("US") // "US" | "PE"
```

después de `stripeProductId`:

```prisma
  // Culqi (planes de Perú)
  culqiPlanIdMensual String? @map("culqi_plan_id_mensual")
  culqiPlanIdAnual   String? @map("culqi_plan_id_anual")
```

y entre los flags, después de `hasApiAccess`:

```prisma
  hasRegimenesSunat     Boolean @default(false) @map("has_regimenes_sunat") // detracción y percepción
```

En `model Subscription`, después de `stripeSubscriptionId`:

```prisma
  // Proveedor de pago: "stripe" (EE. UU.) | "culqi" (Perú)
  proveedorPago         String  @default("stripe") @map("proveedor_pago")
  culqiCustomerId       String? @map("culqi_customer_id")
  culqiCardId           String? @map("culqi_card_id")
  culqiSubscriptionId   String? @unique @map("culqi_subscription_id")
```

Al final de la sección de suscripciones, después de `model UsageEvent`:

```prisma
// Eventos de Culqi ya procesados (idempotencia del webhook)
model EventoCulqi {
  id          String   @id // evt_test_… / evt_live_…
  tipo        String
  procesadoEn DateTime @default(now()) @map("procesado_en")

  @@map("eventos_culqi")
}
```

- [ ] **Paso 2: migración.** Crea `apps/backend/prisma/migrations/20261101010000_oferta_peru/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "plans" ADD COLUMN "pais" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN "culqi_plan_id_mensual" TEXT,
ADD COLUMN "culqi_plan_id_anual" TEXT,
ADD COLUMN "has_regimenes_sunat" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "proveedor_pago" TEXT NOT NULL DEFAULT 'stripe',
ADD COLUMN "culqi_customer_id" TEXT,
ADD COLUMN "culqi_card_id" TEXT,
ADD COLUMN "culqi_subscription_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_culqi_subscription_id_key" ON "subscriptions"("culqi_subscription_id");

-- CreateTable
CREATE TABLE "eventos_culqi" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "procesado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eventos_culqi_pkey" PRIMARY KEY ("id")
);
```

Comprueba que coincide con Prisma: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` contra tu BD de pruebas **después** de aplicar la migración debe salir vacío (`-- This is an empty migration.`). Aplica a tu BD de pruebas con `DATABASE_URL=<tu BD de pruebas> npx prisma migrate deploy` y luego `npx prisma generate`.

- [ ] **Paso 3: semilla.** Crea `apps/backend/prisma/seed_plans_pe.sql`:

```sql
-- Planes de Perú (precios en soles, incluyen IGV). Idempotente: se puede correr varias veces.
-- Los culqi_plan_id_* los llena scripts/culqi-crear-planes.js.
INSERT INTO plans (id, name, slug, description, price_monthly, price_yearly, currency, pais,
  max_invoices_per_month, max_clients, max_proposals_per_month, max_storage_mb,
  has_proposals, has_digital_signatures, has_reports, has_custom_branding, has_multi_currency,
  has_job_tracking, has_advanced_reports, has_priority_support, has_api_access, has_regimenes_sunat,
  is_active, display_order, is_popular, trial_days, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Gratis', 'pe-gratis', 'Para empezar a emitir comprobantes electrónicos', 0, 0, 'PEN', 'PE',
   10, 10, 0, 100, false, false, false, false, false, false, false, false, false, false, true, 10, false, 0, now(), now()),
  (gen_random_uuid(), 'Emprendedor', 'pe-emprendedor', 'Para negocios que empiezan a crecer', 29, 279, 'PEN', 'PE',
   100, 100, 0, 500, false, false, true, false, false, false, false, false, false, false, true, 11, false, 0, now(), now()),
  (gen_random_uuid(), 'Negocio', 'pe-negocio', 'Todo lo que tu negocio necesita para facturar', 59, 569, 'PEN', 'PE',
   500, -1, -1, 2048, true, true, true, true, false, false, false, false, false, true, true, 12, true, 0, now(), now()),
  (gen_random_uuid(), 'Empresa', 'pe-empresa', 'Sin límites, con API y soporte prioritario', 119, 1149, 'PEN', 'PE',
   -1, -1, -1, 10240, true, true, true, true, true, false, true, true, true, true, true, 13, false, 0, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly, price_yearly = EXCLUDED.price_yearly,
  currency = EXCLUDED.currency, pais = EXCLUDED.pais,
  max_invoices_per_month = EXCLUDED.max_invoices_per_month, max_clients = EXCLUDED.max_clients,
  max_proposals_per_month = EXCLUDED.max_proposals_per_month, max_storage_mb = EXCLUDED.max_storage_mb,
  has_proposals = EXCLUDED.has_proposals, has_digital_signatures = EXCLUDED.has_digital_signatures,
  has_reports = EXCLUDED.has_reports, has_custom_branding = EXCLUDED.has_custom_branding,
  has_multi_currency = EXCLUDED.has_multi_currency, has_job_tracking = EXCLUDED.has_job_tracking,
  has_advanced_reports = EXCLUDED.has_advanced_reports, has_priority_support = EXCLUDED.has_priority_support,
  has_api_access = EXCLUDED.has_api_access, has_regimenes_sunat = EXCLUDED.has_regimenes_sunat,
  is_active = EXCLUDED.is_active, display_order = EXCLUDED.display_order, is_popular = EXCLUDED.is_popular,
  trial_days = EXCLUDED.trial_days, updated_at = now();
```

- [ ] **Paso 4: ayuda de pruebas.** Crea `apps/backend/test/db/planes-ayuda.js`:

```js
// Siembra los planes de Perú desde prisma/seed_plans_pe.sql (el mismo archivo que se usa en producción).
const fs = require('node:fs');
const path = require('node:path');
const { prisma } = require('./ayuda');

async function sembrarPlanesPe() {
  const sql = fs.readFileSync(path.join(__dirname, '../../prisma/seed_plans_pe.sql'), 'utf8');
  await prisma.$executeRawUnsafe(sql);
  const planes = await prisma.plan.findMany({ where: { pais: 'PE' } });
  return Object.fromEntries(planes.map((p) => [p.slug, p]));
}

module.exports = { sembrarPlanesPe };
```

- [ ] **Paso 5: prueba que falla.** Crea `apps/backend/test/db/planes-pais.test.js`:

```js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_falsa';
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { planGratisDe, planPublico } = require('../../src/planes/catalogo');
const { getOrCreateSubscription } = require('../../src/middleware/subscription');

let planes;
test.before(async () => {
  await limpiar();
  await prisma.plan.upsert({
    where: { slug: 'free' }, update: {},
    create: { name: 'Free', slug: 'free', priceMonthly: 0, priceYearly: 0, displayOrder: 0 },
  });
  planes = await sembrarPlanesPe();
  await sembrarPlanesPe(); // idempotente
});
test.after(() => prisma.$disconnect());

test('la semilla crea los 4 planes de Perú con sus precios y límites', async () => {
  assert.deepEqual(Object.keys(planes).sort(), ['pe-emprendedor', 'pe-empresa', 'pe-gratis', 'pe-negocio']);
  assert.equal(Number(planes['pe-negocio'].priceMonthly), 59);
  assert.equal(Number(planes['pe-empresa'].priceYearly), 1149);
  assert.equal(planes['pe-gratis'].maxInvoicesPerMonth, 10);
  assert.equal(planes['pe-empresa'].maxInvoicesPerMonth, -1);
  assert.equal(planes['pe-negocio'].hasRegimenesSunat, true);
  assert.equal(planes['pe-emprendedor'].hasRegimenesSunat, false);
  assert.equal(planes['pe-negocio'].currency, 'PEN');
});

test('planGratisDe elige el plan gratis de cada país', async () => {
  assert.equal((await planGratisDe(prisma, 'PE')).slug, 'pe-gratis');
  assert.equal((await planGratisDe(prisma, 'US')).slug, 'free');
});

test('planPublico arma la lista de funciones en español para Perú', () => {
  const p = planPublico(planes['pe-negocio']);
  assert.equal(p.id, 'pe-negocio');
  assert.equal(p.currency, 'PEN');
  assert.equal(p.pais, 'PE');
  assert.equal(p.priceMonthly, 59);
  assert.equal(p.isPopular, true);
  assert.ok(p.features.includes('500 comprobantes al mes'));
  assert.ok(p.features.includes('Clientes ilimitados'));
  assert.ok(p.features.includes('Detracción y percepción'));
  assert.equal(planPublico(planes['pe-empresa']).features[0], 'Comprobantes ilimitados');
});

test('una empresa de Perú sin suscripción recibe el plan pe-gratis activo', async () => {
  const { empresa } = await crearEmpresaPeru({ ruc: '20000000077' });
  const s = await getOrCreateSubscription(empresa.id);
  assert.equal(s.plan.slug, 'pe-gratis');
  assert.equal(s.status, 'ACTIVE');
});
```

Corre `TEST_DATABASE_URL=<tu BD> node --test test/db/planes-pais.test.js` → debe FALLAR (`Cannot find module '../../src/planes/catalogo'`).

- [ ] **Paso 6: catálogo.** Crea `apps/backend/src/planes/catalogo.js`:

```js
// Planes por país: el plan gratis de cada país y la forma pública (landing, asistente y Configuración).
const SLUG_GRATIS = { PE: 'pe-gratis', US: 'free' };

async function planGratisDe(prisma, pais = 'US') {
  const slug = SLUG_GRATIS[pais] || SLUG_GRATIS.US;
  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (plan) return plan;
  // Sin la semilla del país: el primer plan activo y gratis de ese país.
  return prisma.plan.findFirst({
    where: { pais: pais === 'PE' ? 'PE' : 'US', isActive: true, priceMonthly: 0 },
    orderBy: { displayOrder: 'asc' },
  });
}

function featuresPe(plan) {
  const f = [];
  f.push(plan.maxInvoicesPerMonth === -1 ? 'Comprobantes ilimitados' : `${plan.maxInvoicesPerMonth} comprobantes al mes`);
  f.push(plan.maxClients === -1 ? 'Clientes ilimitados' : `${plan.maxClients} clientes`);
  f.push('Factura, boleta y notas de crédito y débito');
  f.push('PDF y envío por correo');
  if (plan.hasReports) f.push('Reportes');
  if (plan.hasProposals) f.push('Proformas');
  if (plan.hasDigitalSignatures) f.push('Firma digital de documentos');
  if (plan.hasRegimenesSunat) f.push('Detracción y percepción');
  if (plan.hasCustomBranding) f.push('Tu logo en los comprobantes');
  if (plan.hasAdvancedReports) f.push('Reportes avanzados');
  if (plan.hasMultiCurrency) f.push('Multimoneda');
  if (plan.hasApiAccess) f.push('Acceso por API');
  if (plan.hasPrioritySupport) f.push('Soporte prioritario');
  return f;
}

function featuresUs(plan) {
  const f = [];
  f.push(plan.maxInvoicesPerMonth === -1 ? 'Unlimited invoices' : `${plan.maxInvoicesPerMonth} invoices per month`);
  f.push(plan.maxClients === -1 ? 'Unlimited clients' : `${plan.maxClients} clients`);
  f.push(plan.maxStorageMb >= 1000 ? `${(plan.maxStorageMb / 1024).toFixed(0)}GB storage` : `${plan.maxStorageMb}MB storage`);
  if (plan.hasProposals) f.push('Proposals');
  if (plan.hasDigitalSignatures) f.push('Digital signatures');
  if (plan.hasJobTracking) f.push('Job tracking');
  if (plan.hasReports) f.push('Reports');
  if (plan.hasAdvancedReports) f.push('Advanced reports');
  if (plan.hasCustomBranding) f.push('Custom branding');
  if (plan.hasMultiCurrency) f.push('Multi-currency');
  if (plan.hasApiAccess) f.push('API access');
  if (plan.hasPrioritySupport) f.push('Priority support');
  return f;
}

function planPublico(plan) {
  return {
    id: plan.slug,
    name: plan.name,
    description: plan.description,
    priceMonthly: parseFloat(plan.priceMonthly),
    priceYearly: parseFloat(plan.priceYearly),
    currency: plan.currency,
    pais: plan.pais,
    features: plan.pais === 'PE' ? featuresPe(plan) : featuresUs(plan),
    maxInvoices: plan.maxInvoicesPerMonth === -1 ? null : plan.maxInvoicesPerMonth,
    maxClients: plan.maxClients === -1 ? null : plan.maxClients,
    maxUsers: null,
    isActive: plan.isActive,
    sortOrder: plan.displayOrder,
    isPopular: plan.isPopular,
  };
}

module.exports = { planGratisDe, planPublico };
```

- [ ] **Paso 7: endpoint público.** En `apps/backend/app.js`, reemplaza el cuerpo de `app.get('/api/subscriptions/plans', …)` (todo el `try`) por:

```js
  try {
    const prisma = require('./src/utils/prisma');
    const { planPublico } = require('./src/planes/catalogo');
    const pais = req.query.pais === 'PE' ? 'PE' : 'US';
    const plans = await prisma.plan.findMany({
      where: { isActive: true, pais },
      orderBy: { displayOrder: 'asc' }
    });
    res.json(plans.map(planPublico));
  } catch (error) {
```

(El `catch` existente se conserva.)

- [ ] **Paso 8: `getOrCreateSubscription` por país.** En `apps/backend/src/middleware/subscription.js`, agrega arriba `const { planGratisDe } = require('../planes/catalogo');` y reemplaza el bloque `if (!subscription) { … }` por:

```js
  if (!subscription) {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { pais: true } });
    const pais = empresa?.pais || 'US';

    if (pais === 'PE') {
      // Perú: sin prueba gratuita; arranca en el plan gratis.
      const gratis = await planGratisDe(prisma, 'PE');
      if (!gratis) return null;
      subscription = await prisma.subscription.create({
        data: { empresaId, planId: gratis.id, status: 'ACTIVE', billingInterval: 'MONTH', currentPeriodStart: new Date() },
        include: { plan: true }
      });
      console.log(`[SUBSCRIPTION] Created pe-gratis subscription for empresa ${empresaId}`);
      return subscription;
    }

    // Find starter plan (EE. UU.)
    const starterPlan = await prisma.plan.findFirst({
      where: {
        pais: 'US',
        OR: [
          { slug: 'starter' },
          { isActive: true }
        ]
      },
      orderBy: { displayOrder: 'asc' }
    });
```

…y deja el resto del bloque original (creación del TRIALING) igual.

- [ ] **Paso 9: `/initialize` y `/switch-to-free`.** En `apps/backend/src/routes/subscriptions.js`, agrega arriba `const { planGratisDe } = require('../planes/catalogo');`.
  - En `/initialize`: el plan se busca por `id` **o** por `slug` (el asistente manda el slug): `prisma.plan.findFirst({ where: { OR: [{ id: planId }, { slug: planId }] } })`. Si no hay plan o su `pais` no coincide con `req.empresa.pais` (`(req.empresa.pais || 'US')`), usa `await planGratisDe(prisma, req.empresa.pais)`. El chequeo de gratis compara números: `const isFree = Number(selectedPlan.priceMonthly) === 0 && Number(selectedPlan.priceYearly) === 0;` (hoy compara un `Decimal` con `0` y siempre da `false`). Si `req.empresa.pais === 'PE'` y el plan **no** es gratis, crea igualmente la suscripción en `pe-gratis` ACTIVE (el pago con Culqi se hace después desde Configuración) y responde `{ subscription, pagoPendiente: selectedPlan.slug }`.
  - En `/switch-to-free`: reemplaza `prisma.plan.findUnique({ where: { slug: 'free' } })` por `await planGratisDe(prisma, req.empresa.pais)`. Si la suscripción es Culqi (`subscription?.proveedorPago === 'culqi' && subscription.culqiSubscriptionId`), **no** llames a Stripe: deja una línea `// La Tarea 2 cancela en Culqi aquí` (la Tarea 2 la completa). En el `update` agrega `culqiSubscriptionId: null`.

- [ ] **Paso 10: `PUT /mi-empresa` acepta `pais`.** En `apps/backend/src/routes/empresa.js`, dentro de `empresaData` agrega `pais: ['US', 'PE'].includes(req.body.pais) ? req.body.pais : undefined,`. Antes del `update`, si la empresa existente ya tiene emisor SUNAT, no se le cambia el país:

```js
    if (existingEmpresa && empresaData.pais && empresaData.pais !== existingEmpresa.pais) {
      const emisor = await prisma.emisorSunat.findUnique({ where: { empresaId: existingEmpresa.id }, select: { id: true } });
      if (emisor) delete empresaData.pais; // ya factura en SUNAT: el país no cambia desde el asistente
    }
```

- [ ] **Paso 11: pruebas en verde.** No montes `app.js` en las pruebas (arrastra Stripe y la cola): el endpoint queda cubierto por `planPublico` y lo prueba Opus en la Tarea 6. Corre `npm test` y `TEST_DATABASE_URL=<tu BD> npm run test:db` → todo en verde (las suites anteriores incluidas). Mutación: en `planGratisDe`, devolver siempre `free` → la prueba de país debe fallar.

- [ ] **Paso 12: commit.**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/src/planes/catalogo.js apps/backend/app.js \
  apps/backend/src/middleware/subscription.js apps/backend/src/routes/subscriptions.js apps/backend/src/routes/empresa.js \
  apps/backend/test/db/planes-ayuda.js apps/backend/test/db/planes-pais.test.js
git add -f apps/backend/prisma/migrations/20261101010000_oferta_peru/migration.sql apps/backend/prisma/seed_plans_pe.sql
git commit -m "feat(planes): planes de Perú en soles y visibilidad por país"
```

---

### Tarea 2: Cobro con Culqi (backend)

**Riesgo:** alto · **Delicado:** sí (pagos) · **Ejecutor:** Sonnet

**Archivos:**
- Crear: `apps/backend/src/pagos/culqi/cliente.js`, `apps/backend/src/pagos/culqi/suscripciones.js`, `apps/backend/src/routes/subscriptionsCulqi.js`, `apps/backend/scripts/culqi-crear-planes.js`, `apps/backend/test/unit/culqi/cliente.test.js`, `apps/backend/test/db/culqi.test.js`
- Modificar: `apps/backend/src/routes/webhooks.js` (agregar `/culqi`), `apps/backend/app.js` (montar el router), `apps/backend/src/routes/subscriptions.js` (`/cancel`, `/reactivate`, `/switch-to-free` para Culqi), `apps/backend/.env.example`

**Consume:** campos y modelo `EventoCulqi` de la Tarea 1; `planGratisDe` de `src/planes/catalogo.js`; `sembrarPlanesPe` de `test/db/planes-ayuda.js`.

**Produce (contrato para la Tarea 5):**
- `POST /api/subscriptions/culqi/suscribir` — cuerpo `{ planSlug, intervalo: 'MONTH'|'YEAR', tokenId, facturacion: { nombre, apellido, telefono, direccion, ciudad }, authentication3DS? }`.
  - 200 `{ subscription }` → contratado.
  - 200 `{ requiere3DS: true }` → el frontend corre 3DS con el **mismo** `tokenId` y repite la llamada con `authentication3DS`.
  - 402 `{ error }` → tarjeta rechazada (texto de `user_message` de Culqi).
  - 400 `{ error }` → datos inválidos / plan no contratable.
- `POST /api/subscriptions/culqi/tarjeta` — `{ tokenId, authentication3DS? }` → 200 `{ ok: true }` | 200 `{ requiere3DS: true }` | 402.
- `POST /api/subscriptions/cancel` (existente): si `proveedorPago === 'culqi'`, cancela en Culqi y deja `cancelAtPeriodEnd = true` (el plan sigue hasta `currentPeriodEnd`).
- `POST /api/webhooks/culqi` → siempre 200 si el evento se procesó o ya estaba procesado; 400 si no trae `id`.

- [ ] **Paso 1: prueba del cliente que falla.** `apps/backend/test/unit/culqi/cliente.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearClienteCulqi, ErrorCulqi } = require('../../../src/pagos/culqi/cliente');

function fetchFalso(respuestas) {
  const llamadas = [];
  const fn = async (url, opciones) => {
    llamadas.push({ url, opciones });
    const r = respuestas.shift();
    return { status: r.status, ok: r.status < 300, text: async () => JSON.stringify(r.cuerpo) };
  };
  fn.llamadas = llamadas;
  return fn;
}

test('envía la sk como Bearer y el cuerpo en JSON', async () => {
  const f = fetchFalso([{ status: 201, cuerpo: { id: 'cus_test_1' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_x', fetch: f });
  const r = await c.crearCliente({ first_name: 'Ana' });
  assert.equal(r.id, 'cus_test_1');
  assert.equal(f.llamadas[0].url, 'https://api.culqi.com/v2/customers');
  assert.equal(f.llamadas[0].opciones.method, 'POST');
  assert.equal(f.llamadas[0].opciones.headers.Authorization, 'Bearer sk_test_x');
  assert.deepEqual(JSON.parse(f.llamadas[0].opciones.body), { first_name: 'Ana' });
});

test('un error de tarjeta se convierte en ErrorCulqi con el mensaje para el usuario', async () => {
  const f = fetchFalso([{ status: 402, cuerpo: { object: 'error', type: 'card_error', merchant_message: 'Fondos', user_message: 'Su tarjeta no tiene fondos suficientes.' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_x', fetch: f });
  await assert.rejects(c.crearTarjeta({ customer_id: 'c', token_id: 't' }), (e) => {
    assert.ok(e instanceof ErrorCulqi);
    assert.equal(e.status, 402);
    assert.equal(e.tipo, 'card_error');
    assert.equal(e.mensajeUsuario, 'Su tarjeta no tiene fondos suficientes.');
    return true;
  });
});

test('crearTarjeta devuelve requiere3DS cuando Culqi pide autenticación', async () => {
  const f = fetchFalso([{ status: 200, cuerpo: { action_code: 'REVIEW', user_message: 'El usuario necesita autenticarse' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_x', fetch: f });
  assert.deepEqual(await c.crearTarjeta({ customer_id: 'c', token_id: 't' }), { requiere3DS: true });
});

test('el mensaje de error nunca incluye la sk', async () => {
  const f = fetchFalso([{ status: 401, cuerpo: { object: 'error', type: 'authentication_error', merchant_message: 'Llave inválida' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_secreta', fetch: f });
  await assert.rejects(c.consultarSuscripcion('sxn_test_1'), (e) => !String(e.message).includes('sk_test_secreta') && !JSON.stringify(e).includes('sk_test_secreta'));
});

test('sin sk no se puede crear el cliente', () => {
  assert.throws(() => crearClienteCulqi({ secretKey: '' }), /CULQI_SECRET_KEY/);
});
```

`npm test` → FALLA (módulo inexistente).

- [ ] **Paso 2: cliente HTTP.** `apps/backend/src/pagos/culqi/cliente.js`:

```js
// Cliente mínimo de la API de Culqi v2 (https://apidocs.culqi.com). La sk nunca sale de aquí ni va a los logs.
const BASE = 'https://api.culqi.com';

class ErrorCulqi extends Error {
  constructor({ status, tipo, mensajeUsuario, mensajeComercio }) {
    super(mensajeComercio || mensajeUsuario || `Culqi respondió ${status}`);
    this.name = 'ErrorCulqi';
    this.status = status;
    this.tipo = tipo || null;
    this.mensajeUsuario = mensajeUsuario || 'No se pudo procesar el pago. Intenta con otra tarjeta.';
  }
}

function crearClienteCulqi({ secretKey = process.env.CULQI_SECRET_KEY, fetch: hacerFetch = globalThis.fetch } = {}) {
  if (!secretKey) throw new Error('Falta CULQI_SECRET_KEY');

  async function pedir(metodo, ruta, cuerpo) {
    const r = await hacerFetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await r.text();
    let datos = {};
    try { datos = texto ? JSON.parse(texto) : {}; } catch { datos = {}; }
    if (r.status >= 400 || datos.object === 'error') {
      throw new ErrorCulqi({
        status: r.status, tipo: datos.type, mensajeUsuario: datos.user_message, mensajeComercio: datos.merchant_message,
      });
    }
    return datos;
  }

  return {
    crearCliente: (datos) => pedir('POST', '/v2/customers', datos),
    buscarClientePorEmail: async (email) => {
      const r = await pedir('GET', `/v2/customers?email=${encodeURIComponent(email)}`);
      return r.data?.[0] || null;
    },
    crearTarjeta: async (datos) => {
      const r = await pedir('POST', '/v2/cards', datos);
      if (r.action_code === 'REVIEW') return { requiere3DS: true };
      return r;
    },
    crearPlan: (datos) => pedir('POST', '/v2/recurrent/plans/create', datos),
    consultarPlan: (id) => pedir('GET', `/v2/recurrent/plans/${encodeURIComponent(id)}`),
    crearSuscripcion: (datos) => pedir('POST', '/v2/recurrent/subscriptions/create', datos),
    consultarSuscripcion: (id) => pedir('GET', `/v2/recurrent/subscriptions/${encodeURIComponent(id)}`),
    cambiarTarjetaSuscripcion: (id, cardId) => pedir('PATCH', `/v2/recurrent/subscriptions/${encodeURIComponent(id)}`, { card_id: cardId }),
    cancelarSuscripcion: (id) => pedir('DELETE', `/v2/recurrent/subscriptions/${encodeURIComponent(id)}`),
    consultarEvento: (id) => pedir('GET', `/v2/events/${encodeURIComponent(id)}`),
  };
}

module.exports = { crearClienteCulqi, ErrorCulqi };
```

`npm test` → verde.

- [ ] **Paso 3: servicio de suscripciones — prueba de BD que falla.** `apps/backend/test/db/culqi.test.js` usa un **Culqi falso** (objeto con los mismos métodos que `crearClienteCulqi`, que registra llamadas):

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { crearServicioCulqi } = require('../../src/pagos/culqi/suscripciones');
const { ErrorCulqi } = require('../../src/pagos/culqi/cliente');

const AHORA = new Date('2026-11-10T15:00:00Z');
const facturacion = { nombre: 'Ana María', apellido: 'Pérez 2', telefono: '999888777', direccion: 'Av. Prueba 123', ciudad: 'Lima' };

function culqiFalso(sobre = {}) {
  const llamadas = [];
  const reg = (nombre, valor) => async (...args) => {
    llamadas.push({ nombre, args });
    const v = typeof valor === 'function' ? valor(...args) : valor;
    if (v instanceof Error) throw v;
    return v;
  };
  return {
    llamadas,
    crearCliente: reg('crearCliente', sobre.crearCliente ?? { id: 'cus_test_1' }),
    buscarClientePorEmail: reg('buscarClientePorEmail', sobre.buscarClientePorEmail ?? null),
    crearTarjeta: reg('crearTarjeta', sobre.crearTarjeta ?? { id: 'crd_test_1' }),
    crearSuscripcion: reg('crearSuscripcion', sobre.crearSuscripcion ?? { id: 'sxn_test_1', status: 1 }),
    consultarSuscripcion: reg('consultarSuscripcion', sobre.consultarSuscripcion ?? { id: 'sxn_test_1', status: 3, next_billing_date: 1765400000 }),
    cambiarTarjetaSuscripcion: reg('cambiarTarjetaSuscripcion', { id: 'sxn_test_1' }),
    cancelarSuscripcion: reg('cancelarSuscripcion', sobre.cancelarSuscripcion ?? { id: 'sxn_test_1', delete: true }),
    consultarEvento: reg('consultarEvento', sobre.consultarEvento ?? null),
  };
}

let ctx; let planes;
test.beforeEach(async () => {
  await limpiar();
  await prisma.eventoCulqi.deleteMany();
  planes = await sembrarPlanesPe();
  await prisma.plan.update({ where: { slug: 'pe-negocio' }, data: { culqiPlanIdMensual: 'pln_test_negocio_m', culqiPlanIdAnual: 'pln_test_negocio_a' } });
  ctx = await crearEmpresaPeru();
  await prisma.subscription.create({ data: { empresaId: ctx.empresa.id, planId: planes['pe-gratis'].id, status: 'ACTIVE' } });
});
test.after(() => prisma.$disconnect());

const servicio = (culqi) => crearServicioCulqi({ prisma, culqi, ahora: () => AHORA });
const suscribir = (s, extra = {}) => s.suscribir({
  empresa: ctx.empresa, email: ctx.user.email, planSlug: 'pe-negocio', intervalo: 'MONTH', tokenId: 'tkn_test_1', facturacion, ...extra,
});

test('suscribir crea cliente, tarjeta y suscripción en Culqi y activa el plan', async () => {
  const culqi = culqiFalso();
  const r = await suscribir(servicio(culqi));
  assert.equal(r.subscription.plan.slug, 'pe-negocio');
  assert.equal(r.subscription.status, 'ACTIVE');
  assert.equal(r.subscription.proveedorPago, 'culqi');
  assert.equal(r.subscription.culqiSubscriptionId, 'sxn_test_1');
  assert.equal(r.subscription.billingInterval, 'MONTH');
  const cliente = culqi.llamadas.find((l) => l.nombre === 'crearCliente').args[0];
  assert.equal(cliente.first_name, 'Ana María');
  assert.equal(cliente.last_name, 'Pérez'); // solo letras y espacios
  assert.equal(cliente.country_code, 'PE');
  const sus = culqi.llamadas.find((l) => l.nombre === 'crearSuscripcion').args[0];
  assert.deepEqual(sus, { card_id: 'crd_test_1', plan_id: 'pln_test_negocio_m', tyc: true, metadata: { empresa_id: ctx.empresa.id } });
});

test('si Culqi pide 3DS no crea la suscripción y guarda el cliente para el reintento', async () => {
  const culqi = culqiFalso({ crearTarjeta: { requiere3DS: true } });
  assert.deepEqual(await suscribir(servicio(culqi)), { requiere3DS: true });
  assert.equal(culqi.llamadas.some((l) => l.nombre === 'crearSuscripcion'), false);
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } });
  assert.equal(s.culqiCustomerId, 'cus_test_1');
  // Reintento con 3DS: no vuelve a crear el cliente y manda los parámetros.
  const culqi2 = culqiFalso();
  await suscribir(servicio(culqi2), { authentication3DS: { eci: '05', xid: 'x', cavv: 'c', protocolVersion: '2.1.0', directoryServerTransactionId: 'd' } });
  assert.equal(culqi2.llamadas.some((l) => l.nombre === 'crearCliente'), false);
  assert.equal(culqi2.llamadas.find((l) => l.nombre === 'crearTarjeta').args[0].authentication_3DS.eci, '05');
});

test('una tarjeta rechazada deja el plan como estaba', async () => {
  const culqi = culqiFalso({ crearTarjeta: new ErrorCulqi({ status: 402, tipo: 'card_error', mensajeUsuario: 'Fondos insuficientes' }) });
  await assert.rejects(suscribir(servicio(culqi)), ErrorCulqi);
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(s.plan.slug, 'pe-gratis');
});

test('no se puede contratar un plan sin id de Culqi, gratis o de otro país', async () => {
  for (const planSlug of ['pe-emprendedor', 'pe-gratis', 'free']) {
    await assert.rejects(suscribir(servicio(culqiFalso()), { planSlug }), /no se puede contratar/i);
  }
});

test('cambiar de plan crea la nueva suscripción y después cancela la anterior', async () => {
  await suscribir(servicio(culqiFalso()));
  const culqi = culqiFalso({ crearSuscripcion: { id: 'sxn_test_2', status: 1 } });
  await suscribir(servicio(culqi), { intervalo: 'YEAR' });
  const nombres = culqi.llamadas.map((l) => l.nombre);
  assert.ok(nombres.indexOf('crearSuscripcion') < nombres.indexOf('cancelarSuscripcion'));
  assert.equal(culqi.llamadas.find((l) => l.nombre === 'cancelarSuscripcion').args[0], 'sxn_test_1');
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } });
  assert.equal(s.culqiSubscriptionId, 'sxn_test_2');
  assert.equal(s.billingInterval, 'YEAR');
});

test('cancelar cancela en Culqi y conserva el plan hasta el fin del período', async () => {
  await suscribir(servicio(culqiFalso()));
  const culqi = culqiFalso();
  await servicio(culqi).cancelar(ctx.empresa.id);
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(s.cancelAtPeriodEnd, true);
  assert.equal(s.plan.slug, 'pe-negocio');
  assert.equal(culqi.llamadas[0].nombre, 'cancelarSuscripcion');
});

test('el webhook reconsulta el evento y la suscripción, y es idempotente', async () => {
  await suscribir(servicio(culqiFalso()));
  const evento = { id: 'evt_test_1', type: 'subscription.charge.succeeded', data: JSON.stringify({ subscription_id: 'sxn_test_1' }) };
  const culqi = culqiFalso({ consultarEvento: evento, consultarSuscripcion: { id: 'sxn_test_1', status: 3, next_billing_date: 1767000000 } });
  const s = servicio(culqi);
  assert.equal((await s.procesarEvento('evt_test_1')).procesado, true);
  assert.equal((await s.procesarEvento('evt_test_1')).procesado, false); // ya estaba
  assert.equal(culqi.llamadas.filter((l) => l.nombre === 'consultarEvento').length, 1);
  const sub = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } });
  assert.equal(sub.currentPeriodEnd.getTime(), 1767000000 * 1000);
  assert.equal(sub.status, 'ACTIVE');
});

test('cobro fallido marca PAST_DUE y una cancelación de Culqi pasa a pe-gratis', async () => {
  await suscribir(servicio(culqiFalso()));
  const fallo = culqiFalso({
    consultarEvento: { id: 'evt_test_2', type: 'subscription.charge.failed', data: { id: 'sxn_test_1' } },
    consultarSuscripcion: { id: 'sxn_test_1', status: 3, next_billing_date: 1767000000 },
  });
  await servicio(fallo).procesarEvento('evt_test_2');
  assert.equal((await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } })).status, 'PAST_DUE');

  const cancel = culqiFalso({
    consultarEvento: { id: 'evt_test_3', type: 'subscription.cancel.succeeded', data: { id: 'sxn_test_1' } },
    consultarSuscripcion: { id: 'sxn_test_1', status: 4 },
  });
  await servicio(cancel).procesarEvento('evt_test_3');
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(s.plan.slug, 'pe-gratis');
  assert.equal(s.status, 'ACTIVE');
  assert.equal(s.culqiSubscriptionId, null);
});

test('un evento de una suscripción ajena a la BD se registra y no toca nada', async () => {
  const culqi = culqiFalso({ consultarEvento: { id: 'evt_test_4', type: 'subscription.charge.succeeded', data: { id: 'sxn_test_otra' } } });
  assert.equal((await servicio(culqi).procesarEvento('evt_test_4')).procesado, true);
  assert.equal(culqi.llamadas.some((l) => l.nombre === 'consultarSuscripcion'), false);
});
```

`TEST_DATABASE_URL=<tu BD> node --test test/db/culqi.test.js` → FALLA.

- [ ] **Paso 4: servicio.** `apps/backend/src/pagos/culqi/suscripciones.js`:

```js
// Contratar, cancelar y sincronizar suscripciones de Culqi (planes de Perú).
const { planGratisDe } = require('../../planes/catalogo');

class ErrorContratacion extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorContratacion'; }
}

const INTERVALO_A_DIAS = { MONTH: 31, YEAR: 366 };
// Culqi solo acepta letras y espacios en nombres (incluye tildes y ñ).
const soloLetras = (s) => String(s || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, '').replace(/\s+/g, ' ').trim();

// Busca un id de suscripción (sxn_…) dentro del data del evento, venga como objeto o como string JSON.
function idSuscripcion(data) {
  let d = data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return null; } }
  const pila = [d];
  while (pila.length) {
    const v = pila.pop();
    if (typeof v === 'string' && /^sxn_(test|live)_/.test(v)) return v;
    if (v && typeof v === 'object') pila.push(...Object.values(v));
  }
  return null;
}

function crearServicioCulqi({ prisma, culqi, ahora = () => new Date() }) {
  async function asegurarCliente(sub, { empresa, email, facturacion }) {
    if (sub.culqiCustomerId) return sub.culqiCustomerId;
    let cliente;
    try {
      cliente = await culqi.crearCliente({
        first_name: soloLetras(facturacion.nombre),
        last_name: soloLetras(facturacion.apellido),
        email,
        address: String(facturacion.direccion).slice(0, 100),
        address_city: String(facturacion.ciudad).slice(0, 30),
        country_code: 'PE',
        phone_number: String(facturacion.telefono).replace(/\D/g, '').slice(0, 15),
        metadata: { empresa_id: empresa.id },
      });
    } catch (error) {
      // El email ya tiene un cliente en Culqi (p. ej. un intento anterior): se reutiliza.
      cliente = await culqi.buscarClientePorEmail(email);
      if (!cliente) throw error;
    }
    await prisma.subscription.update({ where: { id: sub.id }, data: { culqiCustomerId: cliente.id } });
    return cliente.id;
  }

  async function crearTarjeta(customerId, tokenId, authentication3DS) {
    return culqi.crearTarjeta({
      customer_id: customerId,
      token_id: tokenId,
      ...(authentication3DS ? { authentication_3DS: authentication3DS } : {}),
    });
  }

  async function suscribir({ empresa, email, planSlug, intervalo, tokenId, facturacion, authentication3DS }) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    const culqiPlanId = intervalo === 'YEAR' ? plan?.culqiPlanIdAnual : plan?.culqiPlanIdMensual;
    if (!plan || plan.pais !== 'PE' || !plan.isActive || Number(plan.priceMonthly) === 0 || !culqiPlanId) {
      throw new ErrorContratacion('Este plan no se puede contratar en línea');
    }
    const sub = await prisma.subscription.findUnique({ where: { empresaId: empresa.id } });
    if (!sub) throw new ErrorContratacion('Completa el asistente antes de contratar un plan');

    const customerId = await asegurarCliente(sub, { empresa, email, facturacion });
    const tarjeta = await crearTarjeta(customerId, tokenId, authentication3DS);
    if (tarjeta.requiere3DS) return { requiere3DS: true };

    const nueva = await culqi.crearSuscripcion({ card_id: tarjeta.id, plan_id: culqiPlanId, tyc: true, metadata: { empresa_id: empresa.id } });
    const anterior = sub.culqiSubscriptionId;

    const inicio = ahora();
    const fin = new Date(inicio.getTime() + INTERVALO_A_DIAS[intervalo] * 86400000);
    const subscription = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: plan.id, status: 'ACTIVE', billingInterval: intervalo, proveedorPago: 'culqi',
        culqiCardId: tarjeta.id, culqiSubscriptionId: nueva.id,
        currentPeriodStart: inicio, currentPeriodEnd: fin, cancelAtPeriodEnd: false, canceledAt: null,
        trialStart: null, trialEnd: null,
      },
      include: { plan: true },
    });

    // Cambio de plan: la anterior se cancela solo después de que la nueva existe (sin prorrateo).
    if (anterior && anterior !== nueva.id) {
      try { await culqi.cancelarSuscripcion(anterior); } catch (error) {
        console.error('[CULQI] No se pudo cancelar la suscripción anterior', anterior, error.message);
      }
    }
    return { subscription };
  }

  async function cambiarTarjeta({ empresaId, tokenId, authentication3DS }) {
    const sub = await prisma.subscription.findUnique({ where: { empresaId } });
    if (!sub?.culqiSubscriptionId || !sub.culqiCustomerId) throw new ErrorContratacion('No tienes una suscripción con Culqi');
    const tarjeta = await crearTarjeta(sub.culqiCustomerId, tokenId, authentication3DS);
    if (tarjeta.requiere3DS) return { requiere3DS: true };
    await culqi.cambiarTarjetaSuscripcion(sub.culqiSubscriptionId, tarjeta.id);
    await prisma.subscription.update({ where: { id: sub.id }, data: { culqiCardId: tarjeta.id } });
    return { ok: true };
  }

  async function cancelar(empresaId) {
    const sub = await prisma.subscription.findUnique({ where: { empresaId } });
    if (!sub?.culqiSubscriptionId) throw new ErrorContratacion('No tienes una suscripción con Culqi');
    // En Culqi la cancelación es inmediata y no hay más cobros; el plan pagado sigue hasta currentPeriodEnd.
    await culqi.cancelarSuscripcion(sub.culqiSubscriptionId);
    return prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, canceledAt: ahora() },
      include: { plan: true },
    });
  }

  async function pasarAGratis(sub) {
    const gratis = await planGratisDe(prisma, 'PE');
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: gratis.id, status: 'ACTIVE', billingInterval: 'MONTH', culqiSubscriptionId: null, culqiCardId: null,
        cancelAtPeriodEnd: false, canceledAt: ahora(), currentPeriodStart: ahora(), currentPeriodEnd: null,
      },
    });
  }

  async function procesarEvento(eventoId) {
    try {
      await prisma.eventoCulqi.create({ data: { id: eventoId, tipo: 'pendiente' } });
    } catch (error) {
      if (error.code === 'P2002') return { procesado: false };
      throw error;
    }
    try {
      // No se confía en el cuerpo del webhook (Culqi no lo firma): se vuelve a pedir con la sk.
      const evento = await culqi.consultarEvento(eventoId);
      await prisma.eventoCulqi.update({ where: { id: eventoId }, data: { tipo: String(evento.type || 'desconocido') } });
      const sxn = idSuscripcion(evento.data);
      const sub = sxn ? await prisma.subscription.findUnique({ where: { culqiSubscriptionId: sxn } }) : null;
      if (!sub) return { procesado: true };

      const remota = await culqi.consultarSuscripcion(sxn);
      if ([4, 6].includes(remota.status)) {
        // Cancelada o finalizada en Culqi. Si la canceló el usuario, conserva el plan hasta el fin del período.
        if (sub.cancelAtPeriodEnd && sub.currentPeriodEnd && sub.currentPeriodEnd > ahora()) return { procesado: true };
        await pasarAGratis(sub);
        return { procesado: true };
      }
      const data = {};
      if (remota.next_billing_date) data.currentPeriodEnd = new Date(remota.next_billing_date * 1000);
      if (evento.type === 'subscription.charge.failed') data.status = 'PAST_DUE';
      if (evento.type === 'subscription.charge.succeeded') { data.status = 'ACTIVE'; data.currentPeriodStart = ahora(); }
      if (Object.keys(data).length) await prisma.subscription.update({ where: { id: sub.id }, data });
      return { procesado: true };
    } catch (error) {
      // Se borra la marca para que el reintento de Culqi lo vuelva a procesar.
      await prisma.eventoCulqi.delete({ where: { id: eventoId } }).catch(() => {});
      throw error;
    }
  }

  return { suscribir, cambiarTarjeta, cancelar, procesarEvento, pasarAGratis };
}

module.exports = { crearServicioCulqi, ErrorContratacion, idSuscripcion };
```

Prueba en verde.

- [ ] **Paso 5: rutas.** `apps/backend/src/routes/subscriptionsCulqi.js`:

```js
// /api/subscriptions/culqi — contratar y cambiar tarjeta (empresas de Perú).
const express = require('express');
const { z } = require('zod');
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const { ErrorCulqi } = require('../pagos/culqi/cliente');
const { ErrorContratacion } = require('../pagos/culqi/suscripciones');

const tresDS = z.object({
  eci: z.string(), xid: z.string(), cavv: z.string(), protocolVersion: z.string(), directoryServerTransactionId: z.string(),
}).partial().optional();

const suscribirSchema = z.object({
  planSlug: z.string().min(1),
  intervalo: z.enum(['MONTH', 'YEAR']),
  tokenId: z.string().regex(/^tkn_(test|live)_/),
  facturacion: z.object({
    nombre: z.string().trim().min(1).max(50),
    apellido: z.string().trim().min(1).max(50),
    telefono: z.string().trim().min(6).max(20),
    direccion: z.string().trim().min(3).max(100),
    ciudad: z.string().trim().min(2).max(30),
  }),
  authentication3DS: tresDS,
});
const tarjetaSchema = z.object({ tokenId: z.string().regex(/^tkn_(test|live)_/), authentication3DS: tresDS });

function crearRouterCulqi({ prisma, obtenerServicio, auth = [authenticateToken, getEmpresaFromUser] }) {
  const router = express.Router();
  router.use(...auth, (req, res, next) => (req.empresa?.pais === 'PE'
    ? next()
    : res.status(403).json({ error: 'El pago con Culqi solo está disponible para empresas de Perú' })));

  const manejar = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', detalles: error.issues });
      if (error instanceof ErrorContratacion) return res.status(400).json({ error: error.message });
      if (error instanceof ErrorCulqi) {
        console.error('[CULQI]', error.status, error.tipo, error.message);
        return res.status(error.tipo === 'card_error' ? 402 : 502).json({ error: error.mensajeUsuario });
      }
      console.error('[CULQI]', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

  router.post('/suscribir', manejar(async (req, res) => {
    const d = suscribirSchema.parse(req.body);
    const usuario = await prisma.userProfile.findUnique({ where: { id: req.user.id }, select: { email: true } });
    res.json(await obtenerServicio().suscribir({ empresa: req.empresa, email: usuario.email, ...d }));
  }));

  router.post('/tarjeta', manejar(async (req, res) => {
    const d = tarjetaSchema.parse(req.body);
    res.json(await obtenerServicio().cambiarTarjeta({ empresaId: req.empresa.id, ...d }));
  }));

  return router;
}

module.exports = { crearRouterCulqi };
```

En `apps/backend/app.js`, **antes** de `app.use('/api/subscriptions', limiter, authenticateToken, subscriptionsRoutes);`:

```js
// Pagos de Perú con Culqi (el servicio se crea al usarse: sin CULQI_SECRET_KEY la app arranca igual)
const { crearRouterCulqi } = require('./src/routes/subscriptionsCulqi');
const { obtenerServicioCulqi } = require('./src/pagos/culqi');
app.use('/api/subscriptions/culqi', limiter, crearRouterCulqi({ prisma: require('./src/utils/prisma'), obtenerServicio: obtenerServicioCulqi }));
```

Crea `apps/backend/src/pagos/culqi/index.js`:

```js
const prisma = require('../../utils/prisma');
const { crearClienteCulqi } = require('./cliente');
const { crearServicioCulqi } = require('./suscripciones');

let servicio = null;
function obtenerServicioCulqi() {
  if (!servicio) servicio = crearServicioCulqi({ prisma, culqi: crearClienteCulqi() });
  return servicio;
}

module.exports = { obtenerServicioCulqi };
```

- [ ] **Paso 6: webhook.** En `apps/backend/src/routes/webhooks.js`, agrega antes de `module.exports`:

```js
// ==========================================
// CULQI WEBHOOK (Perú)
// ==========================================
// Culqi no firma sus webhooks: solo se usa el id del evento y todo se vuelve a consultar con la sk.
router.post('/culqi', express.json({ limit: '1mb' }), async (req, res) => {
  const id = req.body?.id;
  if (typeof id !== 'string' || !/^evt_(test|live)_[A-Za-z0-9]+$/.test(id)) {
    return res.status(400).json({ error: 'Evento inválido' });
  }
  try {
    const { obtenerServicioCulqi } = require('../pagos/culqi');
    const r = await obtenerServicioCulqi().procesarEvento(id);
    return res.json({ received: true, procesado: r.procesado });
  } catch (error) {
    console.error('[CULQI] Error procesando evento', id, error.message);
    return res.status(500).json({ error: 'No se pudo procesar el evento' }); // Culqi reintenta
  }
});
```

Agrega una prueba en `culqi.test.js` que monte `webhooks.js` en un `express()` (antes define `process.env.STRIPE_SECRET_KEY = 'sk_test_falsa'`) y compruebe que `POST /culqi` con `{ id: 'no-valido' }` responde 400. (El caso válido ya lo cubre `procesarEvento`.)

- [ ] **Paso 7: cancelar, reactivar y pasar a gratis con Culqi.** En `apps/backend/src/routes/subscriptions.js`:
  - `/cancel`: al inicio del `try`, después de leer `subscription`, si `subscription?.proveedorPago === 'culqi'`:

```js
    if (subscription?.proveedorPago === 'culqi') {
      const { obtenerServicioCulqi } = require('../pagos/culqi');
      await obtenerServicioCulqi().cancelar(req.empresa.id);
      return res.json({ message: 'Tu plan seguirá activo hasta el fin del período pagado' });
    }
```

  - `/reactivate`: si `proveedorPago === 'culqi'` responde `400 { error: 'En Culqi la cancelación no se puede deshacer: vuelve a contratar el plan' }`.
  - `/switch-to-free`: en la línea que dejó la Tarea 1, cancela en Culqi con `obtenerServicioCulqi().cancelar(...)` dentro de un `try/catch` que solo registra el error (igual que con Stripe).

- [ ] **Paso 8: script de planes.** `apps/backend/scripts/culqi-crear-planes.js`:

```js
#!/usr/bin/env node
// Crea en Culqi los planes recurrentes de Perú y guarda sus ids. Idempotente: no repite los que ya tienen id.
// Uso: CULQI_SECRET_KEY=sk_test_… DATABASE_URL=… node scripts/culqi-crear-planes.js
const prisma = require('../src/utils/prisma');
const { crearClienteCulqi } = require('../src/pagos/culqi/cliente');

const INTERVALOS = [
  { campo: 'culqiPlanIdMensual', precio: 'priceMonthly', unidad: 3, sufijo: 'mensual' },
  { campo: 'culqiPlanIdAnual', precio: 'priceYearly', unidad: 4, sufijo: 'anual' },
];

async function main() {
  const culqi = crearClienteCulqi();
  const planes = await prisma.plan.findMany({ where: { pais: 'PE', isActive: true }, orderBy: { displayOrder: 'asc' } });
  for (const plan of planes) {
    for (const i of INTERVALOS) {
      const monto = Math.round(Number(plan[i.precio]) * 100);
      if (monto === 0) continue;
      if (plan[i.campo]) { console.log(`= ${plan.slug} ${i.sufijo}: ya existe ${plan[i.campo]}`); continue; }
      const creado = await culqi.crearPlan({
        name: `Facturo ${plan.name} ${i.sufijo}`,
        short_name: `facturo-${plan.slug}-${i.sufijo}`,
        description: plan.description || `Plan ${plan.name}`,
        amount: monto,
        currency: 'PEN',
        interval_unit_time: i.unidad,
        interval_count: 0, // cobro indefinido (verificar en sandbox: Tarea 6)
        initial_cycles: { count: 0, has_initial_charge: false, amount: 0, interval_unit_time: i.unidad },
        metadata: { slug: plan.slug },
      });
      await prisma.plan.update({ where: { id: plan.id }, data: { [i.campo]: creado.id } });
      console.log(`+ ${plan.slug} ${i.sufijo}: ${creado.id} (S/ ${(monto / 100).toFixed(2)})`);
    }
  }
}

main().catch((e) => { console.error('Error:', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
```

Agrega una prueba unitaria `test/unit/culqi/montos.test.js` que compruebe `Math.round(Number('569.00') * 100) === 56900` y `Math.round(Number('1149') * 100) === 114900` extrayendo esa conversión a una función `aCentimos(valor)` exportada desde `src/pagos/culqi/cliente.js` y usada por el script.

- [ ] **Paso 9: `.env.example`.** Agrega a `apps/backend/.env.example`:

```bash
# Culqi (pagos de Perú). Llaves de prueba en CulqiPanel › Desarrollo › API Keys. La sk NUNCA va al frontend.
CULQI_SECRET_KEY=
```

- [ ] **Paso 10: suites.** `npm test` y `TEST_DATABASE_URL=<tu BD> npm run test:db` en verde. Mutaciones mínimas (cada una debe poner en rojo una prueba): (a) en `procesarEvento`, saltarse `consultarEvento` y leer `data` del cuerpo; (b) quitar el `try/catch` de P2002 (idempotencia); (c) cancelar la anterior **antes** de crear la nueva.

- [ ] **Paso 11: commit.**

```bash
git add apps/backend/src/pagos/culqi/cliente.js apps/backend/src/pagos/culqi/suscripciones.js apps/backend/src/pagos/culqi/index.js \
  apps/backend/src/routes/subscriptionsCulqi.js apps/backend/src/routes/webhooks.js apps/backend/src/routes/subscriptions.js \
  apps/backend/app.js apps/backend/scripts/culqi-crear-planes.js apps/backend/.env.example \
  apps/backend/test/unit/culqi/cliente.test.js apps/backend/test/unit/culqi/montos.test.js apps/backend/test/db/culqi.test.js
git commit -m "feat(pagos): suscripciones de Perú con Culqi (contratar, 3DS, cancelar, webhook)"
```

---

### Tarea 3: Cupo de comprobantes al emitir y regímenes por plan

**Riesgo:** medio · **Ejecutor:** Haiku

**Archivos:**
- Crear: `apps/backend/src/planes/cupo.js`, `apps/backend/test/db/cupo.test.js`
- Modificar: `apps/backend/src/sunat/errores.js`, `apps/backend/src/sunat/http.js`, `apps/backend/src/sunat/emision/servicio.js`, `apps/backend/src/sunat/emision/borradores.js`, `apps/backend/src/routes/comprobantes.js`

**Consume:** `Plan.pais`, `Plan.hasRegimenesSunat` (Tarea 1); `sembrarPlanesPe` (`test/db/planes-ayuda.js`).

**Decisiones (ya tomadas):**
- El cupo **cuenta** lo emitido en el mes calendario de Lima (facturas, boletas y notas con `estadoSunat` distinto de `BORRADOR` y `fechaEmision` en el mes). No se usa `invoicesUsed`: nadie lo reinicia cada mes. Contar es exacto y no necesita reinicio.
- La verificación va **dentro** de la transacción de `emitir`, bloqueando la fila de la suscripción (`FOR UPDATE`) para que dos emisiones simultáneas no pasen ambas con el último cupo.
- Sin suscripción, o con plan de EE. UU., no hay límite aquí (la empresa PE siempre tiene suscripción tras el asistente o `getOrCreateSubscription`).
- Si la suscripción Culqi está cancelada y `currentPeriodEnd` ya pasó, se usa el límite de `pe-gratis`.
- Regímenes: solo **detracción y percepción** se bloquean por plan (las elige quien emite). La **retención** no: la impone el cliente cuando es agente de retención y bloquearla impediría emitir un comprobante obligatorio.

- [ ] **Paso 1: error nuevo.** En `src/sunat/errores.js`:

```js
class ErrorPlan extends Error {
  constructor(mensaje, { status = 402, codigo = 'LIMIT_REACHED' } = {}) {
    super(mensaje); this.name = 'ErrorPlan'; this.status = status; this.codigo = codigo;
  }
}
```

y agrégalo al `module.exports`. En `src/sunat/http.js`, importa `ErrorPlan` y, antes del `console.error` final de `responderError`:

```js
  if (error instanceof ErrorPlan) {
    return res.status(error.status).json({ error: error.message, code: error.codigo, upgradeRequired: true });
  }
```

- [ ] **Paso 2: prueba que falla.** `apps/backend/test/db/cupo.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { engineFalso, almacenFalso, colaFalsa } = require('./falsos');
const { guardarBorrador } = require('../../src/sunat/emision/borradores');
const { crearServicioEmision } = require('../../src/sunat/emision/servicio');
const { descifrar } = require('../../src/sunat/seguridad/cifrado');
const { ErrorPlan } = require('../../src/sunat/errores');
const { inicioMesLima } = require('../../src/planes/cupo');

const AHORA = new Date('2026-11-15T17:00:00Z');
let ctx; let planes;
test.beforeEach(async () => {
  await limpiar();
  planes = await sembrarPlanesPe();
  ctx = await crearEmpresaPeru();
});
test.after(() => prisma.$disconnect());

const suscribirA = (slug, extra = {}) => prisma.subscription.create({
  data: { empresaId: ctx.empresa.id, planId: planes[slug].id, status: 'ACTIVE', ...extra },
});
const borrador = (extra = {}) => guardarBorrador({
  prisma, empresa: ctx.empresa, userId: ctx.user.id,
  datos: { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 118 }], ...extra },
});
const servicio = () => crearServicioEmision({ prisma, engine: engineFalso(), almacen: almacenFalso(), descifrar, cola: colaFalsa(), ahora: () => AHORA });
async function emitidas(n, fecha = AHORA) {
  for (let i = 1; i <= n; i += 1) await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 1000 + i, fechaEmision: fecha });
}

test('inicioMesLima usa la medianoche de Lima', () => {
  assert.equal(inicioMesLima(new Date('2026-11-15T17:00:00Z')).toISOString(), '2026-11-01T05:00:00.000Z');
  assert.equal(inicioMesLima(new Date('2026-12-01T03:00:00Z')).toISOString(), '2026-11-01T05:00:00.000Z'); // aún 30/11 en Lima
});

test('con el cupo agotado emitir responde ErrorPlan 402 y el borrador queda igual', async () => {
  await suscribirA('pe-gratis');
  await emitidas(10);
  const b = await borrador();
  await assert.rejects(servicio().emitir(b.id, ctx.empresa.id), (e) => e instanceof ErrorPlan && e.status === 402
    && /límite de comprobantes/.test(e.message));
  assert.equal((await prisma.factura.findUnique({ where: { id: b.id } })).estadoSunat, 'BORRADOR');
});

test('lo emitido el mes anterior no cuenta', async () => {
  await suscribirA('pe-gratis');
  await emitidas(10, new Date('2026-10-20T15:00:00Z'));
  const b = await borrador();
  assert.equal((await servicio().emitir(b.id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO');
});

test('los borradores no gastan cupo', async () => {
  await suscribirA('pe-gratis');
  await emitidas(9);
  for (let i = 0; i < 3; i += 1) await borrador();
  const b = await borrador();
  assert.equal((await servicio().emitir(b.id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO');
});

test('plan ilimitado y empresa sin suscripción no tienen tope', async () => {
  await emitidas(12);
  assert.equal((await servicio().emitir((await borrador()).id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO');
  await suscribirA('pe-empresa');
  assert.equal((await servicio().emitir((await borrador()).id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO');
});

test('emisiones simultáneas no superan el último cupo', async () => {
  await suscribirA('pe-gratis');
  await emitidas(9);
  const [a, b] = await Promise.all([borrador(), borrador()]);
  const s = servicio();
  const r = await Promise.allSettled([s.emitir(a.id, ctx.empresa.id), s.emitir(b.id, ctx.empresa.id)]);
  assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
  assert.ok(r.find((x) => x.status === 'rejected').reason instanceof ErrorPlan);
});

test('suscripción Culqi cancelada y vencida usa el límite de pe-gratis', async () => {
  await suscribirA('pe-negocio', { proveedorPago: 'culqi', cancelAtPeriodEnd: true, currentPeriodEnd: new Date('2026-11-01T00:00:00Z') });
  await emitidas(10);
  await assert.rejects(servicio().emitir((await borrador()).id, ctx.empresa.id), ErrorPlan);
});

test('detracción en un plan sin regímenes responde 403 con el plan necesario', async () => {
  await suscribirA('pe-emprendedor');
  await assert.rejects(borrador({ detraccion: { codigo: '037' } }), (e) => e instanceof ErrorPlan && e.status === 403 && /Negocio/.test(e.message));
  await prisma.subscription.update({ where: { empresaId: ctx.empresa.id }, data: { planId: planes['pe-negocio'].id } });
  const ok = await borrador({ detraccion: { codigo: '037' } });
  assert.ok(ok.id);
});
```

> Si `detraccion: { codigo: '037' }` no es válido para el total de la prueba (la validación de borradores puede exigir monto mínimo), ajusta `precio` de la línea a un valor que la acepte (mira `test/db/borradores.test.js`, que ya prueba detracción) y explícalo en el resumen.

`TEST_DATABASE_URL=<tu BD> node --test test/db/cupo.test.js` → FALLA.

- [ ] **Paso 3: módulo de cupo.** `apps/backend/src/planes/cupo.js`:

```js
// Límites del plan para la facturación electrónica de Perú: cupo mensual al emitir y regímenes por plan.
const { ErrorPlan } = require('../sunat/errores');

const TIPOS_QUE_CUENTAN = ['01', '03', '07', '08'];
const OFFSET_LIMA_MS = 5 * 3600 * 1000; // Lima es UTC-5 todo el año

function inicioMesLima(fecha) {
  const lima = new Date(fecha.getTime() - OFFSET_LIMA_MS);
  return new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), 1) + OFFSET_LIMA_MS);
}

async function limiteVigente(tx, fila, fecha) {
  const vencida = fila.proveedor_pago === 'culqi' && fila.cancel_at_period_end
    && fila.current_period_end && new Date(fila.current_period_end) < fecha;
  if (!vencida) return Number(fila.limite);
  const gratis = await tx.plan.findUnique({ where: { slug: 'pe-gratis' }, select: { maxInvoicesPerMonth: true } });
  return gratis ? gratis.maxInvoicesPerMonth : Number(fila.limite);
}

// Se llama dentro de la transacción de emitir. Bloquea la suscripción para serializar el último cupo.
async function verificarCupo(tx, empresaId, fecha) {
  const filas = await tx.$queryRaw`
    SELECT s.id, s.proveedor_pago, s.cancel_at_period_end, s.current_period_end,
           p.max_invoices_per_month AS limite, p.pais
    FROM subscriptions s JOIN plans p ON p.id = s.plan_id
    WHERE s.empresa_id = ${empresaId}
    FOR UPDATE OF s`;
  if (filas.length === 0 || filas[0].pais !== 'PE') return;
  const limite = await limiteVigente(tx, filas[0], fecha);
  if (limite === -1) return;
  const usados = await tx.factura.count({
    where: {
      empresaId,
      tipoComprobante: { in: TIPOS_QUE_CUENTAN },
      fechaEmision: { gte: inicioMesLima(fecha) },
      AND: [{ estadoSunat: { not: null } }, { estadoSunat: { not: 'BORRADOR' } }],
    },
  });
  if (usados >= limite) {
    throw new ErrorPlan(`Llegaste al límite de comprobantes de tu plan este mes (${limite}). Mejora tu plan para seguir emitiendo.`);
  }
}

// Detracción y percepción solo en planes con hasRegimenesSunat (la retención la impone el cliente: no se bloquea).
async function verificarRegimenes(prisma, empresaId, datos) {
  if (!datos.detraccion && !datos.percepcion) return;
  const sub = await prisma.subscription.findUnique({ where: { empresaId }, include: { plan: true } });
  if (!sub || sub.plan.pais !== 'PE' || sub.plan.hasRegimenesSunat) return;
  throw new ErrorPlan('La detracción y la percepción están disponibles desde el plan Negocio', { status: 403, codigo: 'FEATURE_NOT_AVAILABLE' });
}

module.exports = { verificarCupo, verificarRegimenes, inicioMesLima };
```

- [ ] **Paso 4: conectar.**
  - `src/sunat/emision/servicio.js`: `const { verificarCupo } = require('../../planes/cupo');`. En `emitir`, justo después de `const fecha = ahora();` y **antes** de `validarParaEmision`, agrega `await verificarCupo(tx, empresaId, fecha);`.
  - `src/sunat/emision/borradores.js`: `const { verificarRegimenes } = require('../../planes/cupo');`. En `guardarBorrador`, después de `const d = comprobanteSchema.parse(datos);`, agrega `await verificarRegimenes(prisma, empresa.id, d);`. (`previsualizar` no se bloquea: solo calcula.)
  - `src/routes/comprobantes.js`: el borrador ya no gasta cupo. Cambia el valor por defecto de `limites` a `limites = { verificar: (_req, _res, next) => next(), incrementar: async () => {} }` y quita el import de `checkLimit, incrementUsage` si queda sin uso. Revisa `test/db/rutas.test.js`: si alguna prueba depende de `limites`, ajústala y explícalo.

- [ ] **Paso 5: suites.** `npm test` y `TEST_DATABASE_URL=<tu BD> npm run test:db` en verde (incluidas `servicio.test.js` y `borradores.test.js`). Mutaciones: (a) quitar `FOR UPDATE OF s` → la prueba de simultáneas debe fallar (si no falla de forma estable, repórtalo); (b) contar también `BORRADOR`; (c) `inicioMesLima` sin el desfase de Lima.

- [ ] **Paso 6: commit.**

```bash
git add apps/backend/src/planes/cupo.js apps/backend/src/sunat/errores.js apps/backend/src/sunat/http.js \
  apps/backend/src/sunat/emision/servicio.js apps/backend/src/sunat/emision/borradores.js apps/backend/src/routes/comprobantes.js \
  apps/backend/test/db/cupo.test.js
git commit -m "feat(planes): cupo mensual de comprobantes al emitir y regímenes SUNAT por plan"
```

---

### Tarea 4: Planes de Perú en el landing y en el asistente

**Riesgo:** alto · **Delicado:** no · **Ejecutor:** Haiku

**Archivos:**
- Modificar: `apps/frontend/lib/subscriptions.ts`, `apps/frontend/components/landing/PricingSection.tsx`, `apps/frontend/components/setup/CompanyStep.tsx`, `apps/frontend/components/setup/PlanStep.tsx`, `apps/frontend/app/[locale]/setup/page.tsx`, `apps/frontend/messages/es.json`, `apps/frontend/messages/en.json`
- Crear: `apps/frontend/lib/subscriptions.test.ts`

**Consume:** `GET /api/subscriptions/plans?pais=` (Tarea 1); `/initialize` responde `pagoPendiente` para PE pagado.

**Produce (para la Tarea 5):** en `lib/subscriptions.ts`: `Plan.currency: string`, `Plan.pais: 'US'|'PE'`, `Plan.isPopular?: boolean`; `getPlans(pais?: 'US'|'PE')`; `formatPrice(price, currency)` en `es-PE` para PEN; `esPlanGratis(plan)`; tipos `Facturacion`, `Autenticacion3DS`; funciones `suscribirCulqi(datos)` y `cambiarTarjetaCulqi(datos)`.

- [ ] **Paso 1: prueba que falla.** `apps/frontend/lib/subscriptions.test.ts` (sigue el estilo de `lib/sunat/formato.test.ts`, con el mismo runner que usa `npm test`):

```ts
import { formatPrice, esPlanGratis } from './subscriptions';

describe('formatPrice', () => {
  it('muestra soles con el formato de Perú', () => {
    expect(formatPrice(59, 'PEN')).toBe('S/ 59.00');
    expect(formatPrice(1149, 'PEN')).toBe('S/ 1,149.00');
  });
  it('mantiene dólares como antes', () => {
    expect(formatPrice(15, 'USD')).toBe('$15.00');
  });
});

describe('esPlanGratis', () => {
  it('reconoce free y pe-gratis por precio', () => {
    expect(esPlanGratis({ priceMonthly: 0 } as any)).toBe(true);
    expect(esPlanGratis({ priceMonthly: 29 } as any)).toBe(false);
  });
});
```

> Si el runner es `node:test` u otro, adapta la sintaxis (mira `lib/sunat/formato.test.ts`). Si `Intl` del entorno de pruebas usa un espacio no separable en `S/ 59.00`, normaliza con `.replace(/ /g, ' ')` dentro de `formatPrice` y explícalo.

- [ ] **Paso 2: `lib/subscriptions.ts`.**
  - En `interface Plan` agrega `currency: string; pais: 'US' | 'PE'; isPopular?: boolean;` y en `Subscription` agrega `proveedorPago?: 'stripe' | 'culqi';`.
  - `getPlans`:

```ts
export async function getPlans(pais: 'US' | 'PE' = 'US'): Promise<Plan[]> {
  // Use direct fetch for this public endpoint to avoid auth issues
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  const response = await fetch(`${apiUrl}/subscriptions/plans?pais=${pais}`);

  if (!response.ok) {
    throw new Error('Failed to fetch plans');
  }

  return response.json();
}
```

  - `formatPrice` y `esPlanGratis`:

```ts
export function formatPrice(price: number, currency: string = 'USD'): string {
  const texto = new Intl.NumberFormat(currency === 'PEN' ? 'es-PE' : 'en-US', {
    style: 'currency',
    currency,
  }).format(price);
  return texto.replace(/ /g, ' ');
}

export function esPlanGratis(plan: Pick<Plan, 'priceMonthly'>): boolean {
  return Number(plan.priceMonthly) === 0;
}
```

  - Tipos y API de Culqi (al final de «API Functions»):

```ts
export interface Facturacion {
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
  ciudad: string;
}

export interface Autenticacion3DS {
  eci?: string;
  xid?: string;
  cavv?: string;
  protocolVersion?: string;
  directoryServerTransactionId?: string;
}

export type RespuestaCulqi = { subscription?: Subscription; requiere3DS?: boolean; ok?: boolean };

export async function suscribirCulqi(datos: {
  planSlug: string;
  intervalo: 'MONTH' | 'YEAR';
  tokenId: string;
  facturacion: Facturacion;
  authentication3DS?: Autenticacion3DS;
}): Promise<RespuestaCulqi> {
  return api.post<RespuestaCulqi>('/subscriptions/culqi/suscribir', datos);
}

export async function cambiarTarjetaCulqi(datos: { tokenId: string; authentication3DS?: Autenticacion3DS }): Promise<RespuestaCulqi> {
  return api.post<RespuestaCulqi>('/subscriptions/culqi/tarjeta', datos);
}
```

  Corrige los usos de `formatPrice(x)` sin moneda en todo el frontend (`git grep -n "formatPrice("`) pasando la moneda del plan (`plan.currency`).

- [ ] **Paso 3: landing.** En `PricingSection.tsx`: el `fetch` pide `?pais=${locale === 'es' ? 'PE' : 'US'}`; los planes por defecto (sin API) quedan para `en`, y para `es` se agregan 4 por defecto con los precios de Perú (copiados de «Restricciones globales», `currency: 'PEN'`). Los precios se muestran con `formatPrice(…, plan.currency || 'USD')` en vez de `$${…}`; el mensual equivalente del anual con `Math.round(plan.priceYearly / 12)`. Para `PEN`, debajo del precio, `t('pricing.igvIncluido')` («Precio incluye IGV»). El enlace queda `/${locale}/setup?plan=${plan.id}`. El plan con `isPopular` lleva la insignia «Más popular» que ya existe (si hoy se decide por índice, cámbialo a `plan.isPopular`, y para `en` conserva el comportamiento actual).

- [ ] **Paso 4: país en el asistente.**
  - `app/[locale]/setup/page.tsx`: agrega `pais: 'US' | 'PE'` a `SetupData`, con valor inicial `locale === 'es' ? 'PE' : 'US'` (usa el idioma ya disponible en la página) y al cargar la empresa existente toma `response.pais`. En `completeSetup`, manda `pais: setupData.pais` en el `PUT /empresas/mi-empresa`. En el paso 3, para `setupData.pais === 'PE'`: **no** llames a `create-checkout-session`; llama `POST /subscriptions/initialize` con el slug elegido y, si responde `pagoPendiente`, redirige a `/${locale}/configuracion?tab=suscripcion&contratar=${pagoPendiente}&intervalo=${setupData.billingInterval === 'monthly' ? 'MONTH' : 'YEAR'}` en vez de al dashboard. Para `US` todo queda igual.
  - `components/setup/CompanyStep.tsx`: agrega `pais` a su `SetupData` y, arriba del formulario, un selector «País» con dos botones (`Perú` / `Estados Unidos`, con los estilos de botones que ya usa el paso) que llama `onUpdate({ pais: 'PE', currency: 'PEN', taxName: 'IGV', taxRate: 18, taxEnabled: true })` o `onUpdate({ pais: 'US' })`. Textos con next-intl (`setup.company.pais`, `setup.company.paisPeru`, `setup.company.paisUsa`).
  - `components/setup/PlanStep.tsx`: agrega `pais` a su `SetupData`; `getPlans(data.pais || 'US')`; el plan gratis por defecto se busca con `esPlanGratis`; `const isFree = esPlanGratis(plan)`; precios con `formatPrice(price, plan.currency)`; si `plan.currency === 'PEN'` muestra «Precio incluye IGV».

- [ ] **Paso 5: textos.** Agrega en `messages/es.json` y `messages/en.json` las claves `pricing.igvIncluido` («Precio incluye IGV» / «Price includes IGV»), `setup.company.pais` («País» / «Country»), `setup.company.paisPeru` («Perú» / «Peru»), `setup.company.paisUsa` («Estados Unidos» / «United States»). Si el asistente usa otro namespace, sigue el que ya usa el componente.

- [ ] **Paso 6: suites.** Desde `apps/frontend`: `npm test`, `npx tsc --noEmit`, `npx next build` (una vez, al final) en verde.

- [ ] **Paso 7: commit.**

```bash
git add apps/frontend/lib/subscriptions.ts apps/frontend/lib/subscriptions.test.ts apps/frontend/components/landing/PricingSection.tsx \
  apps/frontend/components/setup/CompanyStep.tsx apps/frontend/components/setup/PlanStep.tsx "apps/frontend/app/[locale]/setup/page.tsx" \
  apps/frontend/messages/es.json apps/frontend/messages/en.json
git commit -m "feat(planes): planes en soles en el landing y país en el asistente"
```

(Agrega también, archivo por archivo, cualquier otro archivo donde corregiste `formatPrice`.)

---

### Tarea 5: Contratar con Culqi en Configuración › Suscripción

**Riesgo:** alto · **Delicado:** sí (pagos) · **Ejecutor:** Sonnet

**Archivos:**
- Crear: `apps/frontend/lib/culqi.ts`, `apps/frontend/components/settings/ContratarCulqiModal.tsx`
- Modificar: `apps/frontend/components/settings/SubscriptionTab.tsx`, `apps/frontend/messages/es.json`, `apps/frontend/messages/en.json`, `apps/frontend/.env.example`

**Consume:** contrato de la Tarea 2 (`/api/subscriptions/culqi/*`, `/cancel`); de la Tarea 4: `getPlans(pais)`, `formatPrice`, `esPlanGratis`, `suscribirCulqi`, `cambiarTarjetaCulqi`, `Facturacion`, `Autenticacion3DS`.

**Flujo:**
1. El usuario elige un plan pagado → modal con «Datos de facturación» (nombre, apellido, teléfono, dirección, ciudad), prellenados con la empresa (`direccion`, `telefono`) y el usuario.
2. «Pagar con tarjeta» abre Culqi Custom Checkout (solo tarjeta) → `Culqi.token.id`.
3. `suscribirCulqi(...)`. Si responde `requiere3DS`, se corre Culqi 3DS con el mismo token y se repite la llamada con `authentication3DS`.
4. Éxito → mensaje, recarga de la suscripción y `refreshSubscription()`. 402 → el mensaje del backend en el modal.

- [ ] **Paso 1: `lib/culqi.ts`.**

```ts
// Culqi en el navegador: Custom Checkout (token de tarjeta) y Culqi 3DS. Solo usa la llave PÚBLICA.
import type { Autenticacion3DS } from './subscriptions';

const CHECKOUT_SRC = 'https://js.culqi.com/checkout-js';
const TRES_DS_SRC = 'https://3ds.culqi.com';

declare global {
  interface Window {
    CulqiCheckout?: new (publicKey: string, config: unknown) => CulqiInstancia;
    Culqi3DS?: {
      publicKey: string;
      settings: unknown;
      options?: unknown;
      generateDevice: () => Promise<string>;
      initAuthentication: (tokenId: string) => void;
      reset: () => void;
    };
  }
}

interface CulqiInstancia {
  open: () => void;
  close: () => void;
  culqi: () => void;
  token?: { id: string; email?: string };
  error?: { user_message?: string; merchant_message?: string };
}

export function llavePublica(): string {
  const llave = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
  if (!llave) throw new Error('Falta NEXT_PUBLIC_CULQI_PUBLIC_KEY');
  return llave;
}

function cargarScript(src: string): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolver();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolver();
    s.onerror = () => rechazar(new Error(`No se pudo cargar ${src}`));
    document.body.appendChild(s);
  });
}

// Abre el checkout y resuelve con el id del token (tkn_…). Rechaza si el usuario cierra o falla la tarjeta.
export async function pedirTokenTarjeta(opciones: { titulo: string; email: string; nombre: string; apellido: string }): Promise<string> {
  await cargarScript(CHECKOUT_SRC);
  if (!window.CulqiCheckout) throw new Error('Culqi no está disponible');
  const config = {
    settings: { title: opciones.titulo, currency: 'PEN' },
    client: { email: opciones.email, firstName: opciones.nombre, lastName: opciones.apellido },
    options: { lang: 'auto', installments: false, modal: true, paymentMethods: { tarjeta: true }, paymentMethodsSort: ['tarjeta'] },
    appearance: { theme: 'default', menuType: 'sidebar', buttonCardPayText: 'Guardar tarjeta' },
  };
  const culqi = new window.CulqiCheckout(llavePublica(), config);
  return new Promise((resolver, rechazar) => {
    culqi.culqi = () => {
      if (culqi.token?.id) {
        const id = culqi.token.id;
        culqi.close();
        resolver(id);
      } else {
        rechazar(new Error(culqi.error?.user_message || 'No se pudo validar la tarjeta'));
      }
    };
    culqi.open();
  });
}

// Corre la autenticación 3DS para un token ya creado y resuelve con los parámetros para el backend.
export async function autenticar3DS(tokenId: string, opciones: { email: string; montoCentimos: number }): Promise<Autenticacion3DS> {
  await cargarScript(TRES_DS_SRC);
  const tds = window.Culqi3DS;
  if (!tds) throw new Error('Culqi 3DS no está disponible');
  tds.reset();
  tds.publicKey = llavePublica();
  tds.settings = {
    charge: { totalAmount: opciones.montoCentimos, returnUrl: window.location.href, currency: 'PEN' },
    card: { email: opciones.email },
  };
  tds.options = { showModal: true, showLoading: true, showIcon: true, style: { btnColor: '#1D9E75', btnTextColor: '#FFFFFF' } };
  await tds.generateDevice();
  return new Promise((resolver, rechazar) => {
    const escuchar = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const r = event.data || {};
      if (r.parameters3DS) {
        window.removeEventListener('message', escuchar);
        resolver(r.parameters3DS as Autenticacion3DS);
      } else if (r.error) {
        window.removeEventListener('message', escuchar);
        rechazar(new Error(typeof r.error === 'string' ? r.error : 'No se pudo autenticar la tarjeta'));
      }
    };
    window.addEventListener('message', escuchar, false);
    tds.initAuthentication(tokenId);
  });
}
```

- [ ] **Paso 2: modal.** `components/settings/ContratarCulqiModal.tsx` (`'use client'`; usa `Modal`, `Button`, `Input` de `@/components/common` — revisa sus props reales):
  - Props: `{ plan: Plan; intervalo: 'MONTH' | 'YEAR'; modo: 'contratar' | 'tarjeta'; email: string; inicial: Partial<Facturacion>; onListo: () => void; onCerrar: () => void }`.
  - En modo `contratar`: título con el nombre del plan y el precio (`formatPrice(intervalo === 'YEAR' ? plan.priceYearly : plan.priceMonthly, 'PEN')` + «/mes» o «/año» + «Precio incluye IGV»), formulario de facturación (todos obligatorios; el nombre y el apellido solo letras y espacios: valida con `/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/`), casilla obligatoria «Acepto los términos y la renovación automática» y botón «Pagar con tarjeta».
  - En modo `tarjeta`: solo el botón «Cambiar tarjeta».
  - Al pulsar: `const tokenId = await pedirTokenTarjeta(...)`; luego `let r = modo === 'contratar' ? await suscribirCulqi({ planSlug: plan.id, intervalo, tokenId, facturacion }) : await cambiarTarjetaCulqi({ tokenId })`; si `r.requiere3DS`, `const authentication3DS = await autenticar3DS(tokenId, { email, montoCentimos: Math.round(precio * 100) })` (en modo tarjeta usa `300`) y repite la misma llamada con `authentication3DS`. Si al final hay `subscription` u `ok`, `onListo()`.
  - Errores: muestra `error.message` (el cliente `api` del frontend ya expone el `error` del backend: verifícalo en `lib/api.ts`) dentro del modal; el botón se deshabilita mientras procesa.
  - Nunca registres en consola el token completo.

- [ ] **Paso 3: `SubscriptionTab.tsx`.** Usa `const { empresa } = useAuth()` (verifica el nombre real en `contexts/AuthContext.tsx`) para `const esPeru = empresa?.pais === 'PE'`.
  - `loadData`: `getPlans(esPeru ? 'PE' : 'US')`.
  - `proceedWithSubscription(planId)`: si `esPeru`:
    - plan gratis (`esPlanGratis`) → `switchToFreePlan()` como hoy;
    - plan pagado → abre `ContratarCulqiModal` en modo `contratar` con el plan y el `billingInterval` (`'monthly'` → `'MONTH'`, `'yearly'` → `'YEAR'`).
    - (La comparación existente `planId === 'free'` pasa a `esPlanGratis(plan)`.)
  - Si no es Perú, todo queda igual (Stripe).
  - Botón «Gestionar facturación»: si `subscription.proveedorPago === 'culqi'`, se muestra «Cambiar tarjeta» y abre el modal en modo `tarjeta`. Si `esPeru` y no es Culqi (plan gratis), no se muestra.
  - Reactivar: si `proveedorPago === 'culqi'`, se oculta el botón «Reactivar» y se muestra el texto «Tu plan sigue activo hasta {fecha}. Para seguir después, vuelve a contratarlo.».
  - Precios con `formatPrice(…, plan.currency)`; para `PEN`, «Precio incluye IGV» bajo el precio.
  - Al montar, si la URL trae `contratar=<slug>&intervalo=MONTH|YEAR` (redirección del asistente), cuando lleguen los planes abre el modal con ese plan y limpia esos parámetros de la URL (como ya se hace con `success`/`canceled`).

- [ ] **Paso 4: textos y env.** Claves nuevas bajo `subscription.culqi.*` en `es.json` y `en.json` (títulos, etiquetas del formulario, botones, términos, `igvIncluido`, `cambiarTarjeta`, `tarjetaActualizada`, `contratado`, `noReactivable`). En `apps/frontend/.env.example`: `NEXT_PUBLIC_CULQI_PUBLIC_KEY=` con el comentario «Llave pública de Culqi (pk_test_… en desarrollo)».

- [ ] **Paso 5: suites.** `npm test`, `npx tsc --noEmit`, `npx next build` en verde. No hay pruebas automáticas del checkout (depende del script de Culqi): lo prueba Opus en la Tarea 6. Describe en el resumen qué quedó sin probar.

- [ ] **Paso 6: commit.**

```bash
git add apps/frontend/lib/culqi.ts apps/frontend/components/settings/ContratarCulqiModal.tsx \
  apps/frontend/components/settings/SubscriptionTab.tsx apps/frontend/messages/es.json apps/frontend/messages/en.json apps/frontend/.env.example
git commit -m "feat(pagos): contratar y cambiar tarjeta con Culqi en Configuración"
```

---

### Tarea 6: Integración y prueba real (Opus, no se delega)

- [ ] Integrar las ramas por cherry-pick en `feat/oferta-peru`; correr todas las suites (backend `npm test` y `test:db`; frontend `npm test`, `tsc`, `next build`).
- [ ] BD local: `npx prisma migrate deploy`, `psql … -f prisma/seed_plans_pe.sql`.
- [ ] Con las llaves de prueba de Miguel como variables de entorno locales (`CULQI_SECRET_KEY`, `NEXT_PUBLIC_CULQI_PUBLIC_KEY`, sin escribirlas en el chat): `node scripts/culqi-crear-planes.js`; confirmar en `consultarPlan` que `interval_unit_time`/`interval_count` dan cobro mensual/anual indefinido (si no, cambiar `interval_count` a `1`, borrar los planes de prueba y repetir).
- [ ] Chrome: landing `es` en soles; empresa PE contrata Negocio mensual con `4111 1111 1111 1111` · `12/30` · `123`; ver suscripción activa; disparar un webhook de prueba desde CulqiPanel (con un túnel público temporal hacia `:4001/api/webhooks/culqi`, solo con OK de Miguel) o, si no hay túnel, `curl` local con un `evt_` real de la cuenta de prueba; cambiar tarjeta; cancelar. Empresa US: planes en USD y Stripe sin cambios.
- [ ] Emitir hasta agotar el cupo en una empresa `pe-gratis` de prueba (o bajar su límite en la BD local) y ver el 402 en la interfaz.
- [ ] `docs/HANDOFF.md` y `delegar.sh resultado` por tarea.

## Pendiente fuera de este plan

- Registrar la URL del webhook de producción en CulqiPanel (cuando haya dominio).
- Llaves `live` de Culqi solo en el entorno de producción.
- Facturar las suscripciones con Facturo; prorrateo; cupones; Yape recurrente.
