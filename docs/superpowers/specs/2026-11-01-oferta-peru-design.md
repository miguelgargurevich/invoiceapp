# Diseño — Oferta de planes para Perú y cobro con Culqi

> Fecha: 2026-11-01 · Estado: alcance, pasarela y planes aprobados por Miguel · Rama: `feat/oferta-peru` (sale de `feat/marca-facturo`)

## Objetivo

Las empresas de Perú ven y contratan planes propios: en soles, en español, con beneficios SUNAT y límites por comprobantes electrónicos. Los pagan con **Culqi**. Las empresas de EE. UU. siguen con sus planes en dólares y Stripe, sin ningún cambio.

## 1. Planes para Perú (aprobados)

Los precios incluyen IGV. El plan anual tiene un 20 % de descuento.

| slug | Nombre | Mensual | Anual | Comprobantes/mes | Clientes | Funciones |
|---|---|---|---|---|---|---|
| `pe-gratis` | Gratis | S/ 0 | — | 10 | 10 | Factura, boleta, NC y ND; PDF y correo |
| `pe-emprendedor` | Emprendedor | S/ 29 | S/ 279 | 100 | 100 | + reportes |
| `pe-negocio` | Negocio (más popular) | S/ 59 | S/ 569 | 500 | ilimitados | + proformas, firma digital, detracción, percepción y retención, logo propio |
| `pe-empresa` | Empresa | S/ 119 | S/ 1,149 | ilimitados | ilimitados | + reportes avanzados, multimoneda, API, soporte prioritario |

- **Gratis:** emite en producción con el certificado del cliente.
- **No consumen cupo:** las bajas, los resúmenes ni los reintentos. Solo cuenta cada comprobante emitido (factura, boleta, NC o ND), es decir, cada vez que un borrador pasa a `PENDIENTE_ENVIO`.
- **El cupo se descuenta al emitir.** Hoy se descuenta al crear el borrador, por el `checkLimit('invoice')` de `POST /api/comprobantes`. Para Perú se mueve a `emitir`, porque un borrador que no se emite no debe gastar cupo.

## 2. Modelo de datos

- **`Plan`:**
  - `pais String @default("US")` (`US` | `PE`).
  - `culqiPlanIdMensual` y `culqiPlanIdAnual` (`String?`).
  - `hasRegimenesSunat Boolean @default(false)`: detracción, percepción y retención.
  - Para Perú, `maxInvoicesPerMonth` se interpreta como comprobantes al mes.
  - Los planes de EE. UU. quedan con `pais = 'US'`.
- **`Subscription`:**
  - `proveedorPago String @default("stripe")` (`stripe` | `culqi`).
  - `culqiCustomerId`, `culqiCardId` y `culqiSubscriptionId` (`String?`, el último `@unique`).
- **Semilla:** `apps/backend/prisma/seed_plans_pe.sql` es idempotente (`ON CONFLICT (slug)`) y crea los 4 planes. El `.gitignore` ignora `*.sql`, así que se agrega con `git add -f` y se documenta en el README. Los `culqiPlanId*` se llenan con un script (sección 3).

## 3. Integración con Culqi

> Los nombres exactos de endpoints, eventos y campos de la API de Culqi (v2 y suscripciones recurrentes) **se verifican contra la documentación oficial y el sandbox** antes de escribir código. Abajo va el flujo, no los nombres definitivos.

- **Llaves:** `CULQI_PUBLIC_KEY` (pk, la usa el frontend) y `CULQI_SECRET_KEY` (sk, solo el backend) van en variables de entorno. En desarrollo se usan llaves de prueba (`pk_test_…`, `sk_test_…`) de la cuenta de Culqi de Miguel. La sk nunca llega al frontend ni a los logs.
- **Planes en Culqi:** el script `apps/backend/scripts/culqi-crear-planes.js` crea en Culqi los planes recurrentes (montos en céntimos, PEN, intervalo mensual o anual) y guarda sus ids en la tabla `plans`. Es idempotente: si el id ya existe, no crea otro.
- **Contratar:**
  1. El frontend abre **Culqi Checkout** con la pk y el monto del plan, y obtiene un **token** de tarjeta (o Yape, si Culqi lo permite para cobros recurrentes; si no, solo tarjeta).
  2. `POST /api/subscriptions/culqi/suscribir { planSlug, intervalo, token }` crea en el backend, en este orden, el cliente, la tarjeta y la suscripción en Culqi.
  3. Si todo sale bien, la `Subscription` queda `ACTIVE`, con plan, período e ids. Si Culqi rechaza la tarjeta, responde 402 con el mensaje de Culqi en lenguaje de usuario.
- **Webhook:** `POST /api/webhooks/culqi` recibe los eventos de cobro renovado, cobro fallido y suscripción cancelada.
  - **No confía en el cuerpo:** con el id que llega, vuelve a consultar el evento o la suscripción en la API de Culqi con la sk, y solo entonces actualiza `status` y período.
  - **Es idempotente:** se guarda el id de evento procesado (tabla `UsageEvent` con `eventType = 'culqi:<id>'`, o una columna dedicada si se ve más claro).
- **Cancelar:** `POST /api/subscriptions/cancel` con `proveedorPago = 'culqi'` cancela en Culqi y marca `cancelAtPeriodEnd`. El portal de facturación de Stripe no aplica a Culqi: el botón «Gestionar facturación» se cambia por «Cambiar tarjeta» (un nuevo token a la tarjeta del cliente en Culqi).
- **Cambiar de plan:** se cancela la suscripción actual en Culqi y se crea la nueva. En la v1 no hay prorrateo: el plan nuevo empieza a cobrarse ese día.

## 4. Quién ve qué

- **`GET /api/subscriptions/plans`:**
  - Sin sesión (landing): `?pais=PE|US`. El landing pide `PE` si el idioma es `es` y `US` si es `en`.
  - Con sesión: los planes del `pais` de la empresa.
- **El país se elige en el asistente:** el paso de empresa del onboarding (`components/setup/CompanyStep.tsx`) agrega «País: Perú / Estados Unidos», que por defecto toma el idioma del navegador. Se guarda en `Empresa.pais`. Así, desde el paso de plan (`PlanStep`) la empresa ya ve los planes de su país. Configurar el emisor SUNAT sigue poniendo `pais = 'PE'`.
- **Textos de los planes de Perú:** en español en el seed (nombre, descripción) y lista de funciones armada en el backend desde los flags, en español para `pais = 'PE'`.
- **Precio en pantalla:** `S/ 59 /mes` con `Intl.NumberFormat('es-PE', { currency: 'PEN' })`, y debajo «Precio incluye IGV».

## 5. Límites

- `checkLimit` lee el plan de la suscripción, igual que hoy.
- **Para Perú:** el cupo de comprobantes se verifica y se descuenta en `servicioEmision.emitir`. `incrementUsage` se llama tras el commit, una sola vez por emisión. Con el cupo agotado, `emitir` responde 402 con el mensaje «Llegaste al límite de comprobantes de tu plan este mes» y la acción «Mejorar plan».
- **Funciones por plan:** guardar un borrador con detracción, percepción o retención en un plan sin `hasRegimenesSunat` responde 403, con el mensaje que indica el plan necesario.

## 6. Coordinación

- **El onboarding** (`components/setup/*`) lo acaba de corregir la sesión de la marca, con colores y flujo, en `feat/marca-facturo`. Antes de tocar `CompanyStep` y `PlanStep`, esta rama se actualiza con lo último de `feat/marca-facturo`.
- **Facturo facturando a sus propios clientes** (comprobante por cada cobro de suscripción) queda fuera de esta versión.

## 7. Verificación

- Backend: pruebas unitarias del mapeo plan → monto en céntimos, pruebas del webhook (que reconsulta a Culqi y es idempotente, con un cliente Culqi falso) y pruebas de BD de suscribir, cancelar y del cupo al emitir.
- Frontend: `npm test`, `tsc`, `next build`.
- **Sandbox de Culqi, lo hace Opus:**
  - Contratar Negocio mensual con una tarjeta de prueba publicada por Culqi.
  - Ver la suscripción activa.
  - Disparar un webhook de prueba.
  - Cancelar.
  - Exige que Miguel cree la cuenta de Culqi y pase las llaves de prueba (`pk_test`, `sk_test`) como variables de entorno locales.
- **Chrome:** el landing en `es` muestra los planes en soles, una empresa `PE` ve sus planes en Configuración › Suscripción y en el asistente, y una empresa `US` ve los de siempre.

## Fuera de alcance

Prorrateo, cupones, Yape para pagos recurrentes (si Culqi no lo soporta), facturar las suscripciones con Facturo, y migrar empresas peruanas que hoy tengan un plan en USD.
