# Diseño — Frontend de facturación electrónica SUNAT (Perú)

> Fecha: 2026-11-01 · Estado: aprobado por Miguel (secciones 1–4)
> Depende de: `docs/superpowers/specs/2026-11-01-sunat-nucleo-emision-design.md` (API ya construida, rama `feat/sunat-diseno`, PR #1)

## Objetivo

Que una empresa de Perú pueda, desde la web de InvoiceApp, configurar su emisor SUNAT, crear comprobantes con vista
previa, emitirlos, seguir su estado, anularlos (o emitir la nota de crédito) y descargar PDF, XML y CDR. Las
pantallas de EE. UU. no cambian.

## Alcance (v1)

Dentro: configuración del emisor (datos fiscales, ambiente, SOL, certificado, series), formulario de comprobante
(factura, boleta, nota de crédito, nota de débito) con vista previa, emisión, detalle con estado SUNAT e historial,
anulación o NC por anulación, «corregir» un rechazado, descargas, alertas en el dashboard, casilla «agente de
retención» en clientes.

Fuera: asistente de onboarding paso a paso, edición masiva, reportes SUNAT, guías de remisión (subproyecto 3),
comprobantes de retención/percepción (subproyecto 4).

Idioma: español con claves de next-intl en `messages/es.json` y traducción básica en `messages/en.json`.

## 1. Estructura y rutas

Rutas nuevas bajo `apps/frontend/app/[locale]/(dashboard)/`:

| Ruta | Qué hace |
|---|---|
| `/comprobantes` | Lista con filtros (tipo, estado SUNAT), insignia de estado, PDF rápido |
| `/comprobantes/nuevo` | Formulario con vista previa. Acepta `?tipo=07|08&afecta=<id>&motivo=<código>` para notas prellenadas |
| `/comprobantes/[id]` | Detalle: estado SUNAT, totales, historial de envíos y acciones según el estado |
| `/comprobantes/[id]/editar` | Mismo formulario cargado con el borrador |

Cambios en lo existente (mínimos, sin reescribir archivos grandes):

- `components/global/Sidebar.tsx`: si `empresa.pais === 'PE'`, el ítem «Facturas» (`/facturas`) se reemplaza por
  «Comprobantes» (`/comprobantes`).
- `app/[locale]/(dashboard)/facturas/page.tsx`: si la empresa es `PE`, redirige a `/comprobantes`.
- `app/[locale]/(dashboard)/configuracion/page.tsx`: pestaña nueva **SUNAT** que renderiza `<EmisorForm/>` y
  `<SeriesManager/>`. Para empresas no `PE` la pestaña muestra una tarjeta «¿Facturas en Perú? Activa la facturación
  electrónica» que abre el mismo `EmisorForm`. Al guardarlo, el backend pone `pais = 'PE'` y el frontend refresca la
  empresa de `AuthContext`.
- `app/[locale]/(dashboard)/dashboard/page.tsx`: para empresas `PE`, `<AlertasSunat/>` arriba.
- Formulario de cliente (`clientes/nuevo` y `clientes/[id]`): casilla «Agente de retención», visible solo para `PE`.

Código nuevo:

- `apps/frontend/lib/sunat/` (lógica pura, probada):
  - `tipos.ts` — tipos de la API (comprobante, línea, cuota, emisor, serie, envío, alertas, catálogos, vista previa).
  - `api.ts` — envoltorios tipados sobre `apiClient` para `/comprobantes` y `/sunat`, y descarga de archivos como blob.
  - `estados.ts` — `ESTADOS_SUNAT`, `etiquetaEstado(estado)`, `colorEstado(estado)`, `accionesPermitidas(estado)`,
    `estaEnProceso(estado)`.
  - `formulario.ts` — estado inicial por tipo, `aPayload(formulario)` (lo que espera `comprobanteSchema` del
    backend), `repartirCuotas(neto, n, primeraFecha)` y `camposVisibles(formulario, emisor)`.
- `apps/frontend/components/sunat/`: `EstadoSunatBadge`, `ComprobanteForm` (con `LineasEditor`, `CuotasEditor`,
  `PanelTotales`), `AccionesComprobante`, `AnularModal`, `HistorialEnvios`, `EmisorForm`, `SeriesManager`,
  `AlertasSunat`.

## 2. Comportamiento de las pantallas

### Formulario

- Cabecera: tipo de comprobante (filtra las series de `GET /api/sunat/series`), cliente con `SearchableSelect` (para
  factura solo clientes con RUC, salvo operación de exportación), operación (`0101`, `0200`, `1001`), moneda y tipo
  de cambio si no es PEN.
- Líneas: producto opcional (autocompleta descripción, precio, unidad y «precio incluye IGV» según
  `Producto.precioConIgv`), cantidad, unidad (catálogo), precio, interruptor «precio incluye IGV», descuento,
  afectación (10/20/30/40) y bolsas ICBPER.
- Detracción (código del catálogo) visible si la operación es `1001`; percepción (régimen) visible solo si el emisor
  es agente de percepción.
- Forma de pago: Contado o Crédito. En crédito, editor de cuotas con «Repartir en N cuotas» (mensuales desde una
  fecha) y aviso en vivo de cuánto falta o sobra contra el neto pendiente de la vista previa.
- Notas: muestran el comprobante afectado (solo lectura) y el motivo del catálogo 09/10.
- Vista previa: `POST /api/comprobantes/preview` con 500 ms de espera tras el último cambio. `PanelTotales` muestra
  exactamente lo que responde el backend (operaciones por afectación, IGV, ICBPER, total, monto en letras,
  detracción, retención, percepción, neto pendiente). **El frontend no calcula montos.** Un error de la vista previa
  se muestra junto al panel y deshabilita «Guardar y emitir».
- Botones: «Guardar borrador» (`POST` o `PUT /api/comprobantes`) y «Guardar y emitir» (guarda y luego
  `POST /:id/emitir`), este último con confirmación «Una vez emitido no se puede editar».

### Detalle

- Cabecera: tipo, `serie-número` (o «Borrador»), `EstadoSunatBadge` y el mensaje de SUNAT.
- Acciones según `accionesPermitidas(estado)`:

| Estado | Acciones |
|---|---|
| `BORRADOR` | Editar · Eliminar · Emitir |
| `PENDIENTE_ENVIO`, `ERROR_TEMPORAL`, `ANULACION_PENDIENTE` | Ninguna; se refresca cada 5 s durante 2 min y luego muestra «Actualizar» |
| `ACEPTADO`, `ACEPTADO_CON_OBS` | PDF · XML · CDR · Anular · Emitir nota de crédito · Emitir nota de débito |
| `RECHAZADO` | Ver motivo · Corregir y emitir nuevo (`POST /:id/corregir` → abre el borrador nuevo) |
| `ANULADO` | PDF · XML · CDR |

- Anular: `AnularModal` pide el motivo y llama `POST /:id/anular`. Si responde 409 con
  `accion: 'EMITIR_NOTA_CREDITO'`, el modal cambia a «El plazo de baja venció» con el botón «Emitir nota de crédito
  por anulación», que navega a `/comprobantes/nuevo?tipo=07&afecta=<id>&motivo=01`.
- `HistorialEnvios`: tabla de `envios` (fecha, operación, código, mensaje).
- Descargas: PDF, XML y CDR con `fetch` autenticado → blob → enlace temporal (`URL.createObjectURL`).

### Lista

`DataTable` con número, cliente, fecha, total y estado; filtros por tipo y estado; botón «Nuevo comprobante».

### Configuración › SUNAT

- `EmisorForm`: ubigeo, departamento, provincia, distrito, urbanización, dirección fiscal, código de
  establecimiento; ambiente Beta/Producción (pasar a Producción pide escribir el RUC para confirmar y envía
  `confirmarProduccion: true`); usuario SOL; clave SOL (nunca se muestra: «Configurada ✓» y botón «Cambiar»);
  certificado `.pfx` + clave (se lee con `FileReader` a base64; tras guardar se muestran vencimiento y estado);
  cuenta de detracciones; agente de retención; agente de percepción.
- `SeriesManager`: lista de series y alta (tipo + serie) con validación de la letra inicial (F para 01, B para 03,
  F o B para 07/08).

### Errores

- 422 con `errores[]`: lista sobre el formulario o junto al botón que la provocó.
- 503: «SUNAT o el motor no están disponibles, intenta en unos minutos».
- Resto: toast con el `error` del backend.

## 3. Ajustes al backend

1. `src/routes/clientes.js`: `clienteSchema` acepta `esAgenteRetencion: z.boolean().optional()` y se guarda al crear
   y editar.
2. `GET /api/sunat/catalogos` (en `src/routes/sunat.js`, con `soloPeru`): devuelve `{ afectaciones, unidades,
   tiposOperacion, motivosNotaCredito, motivosNotaDebito, detracciones, percepciones }` armados desde
   `src/sunat/catalogos`. El frontend no mantiene copia de los catálogos.
3. `GET /api/comprobantes/:id/xml` y `/:id/cdr`: en lugar de redirigir (302) a una URL firmada de R2, el backend lee
   el archivo con `almacen.leer(key)` y lo envía con `Content-Type` (`application/xml` / `application/zip`) y
   `Content-Disposition: attachment; filename="<RUC>-<TT>-<SERIE>-<NUM>.xml|.cdr.zip"`. Motivo: el `fetch` autenticado
   del navegador no sigue bien una redirección a otro dominio; además no se expone ninguna URL del bucket.
4. Almacén local para desarrollo: si `SUNAT_ALMACEN_DIR` está definido, `iniciarSunat` usa un almacén en disco
   (`crearAlmacenLocal(dir)` con `guardar`/`leer`) en lugar de R2. Con `NODE_ENV=production` y `SUNAT_ALMACEN_DIR`
   definido, `iniciarSunat` lanza error y no arranca el módulo.

## 4. Pruebas y verificación

- Frontend, lógica pura: `apps/frontend/lib/sunat/*.test.ts` con `node --test` (Node 26 ejecuta TypeScript con solo
  tipos borrables, sin dependencias nuevas). Script `test` en `apps/frontend/package.json`:
  `node --test "lib/**/*.test.ts"`. Casos mínimos: `accionesPermitidas` por cada estado; `etiquetaEstado` de todos;
  `aPayload` para factura contado, crédito con cuotas, detracción, nota de crédito con documento afectado y boleta;
  `repartirCuotas` suma exacto al céntimo (el residuo va a la última) y fechas mensuales; `camposVisibles`
  (detracción solo con `1001`, percepción solo con emisor agente).
- Backend: pruebas de BD para los ajustes 1–3 y unitarias para el 4; suites completas en verde.
- Compilación: `npx tsc --noEmit`, `npx next lint` y `npx next build` sin errores nuevos.
- Prueba real en navegador (la hace Opus al final): backend local contra la BD de pruebas, `SUNAT_ALMACEN_DIR`, motor
  en Docker apuntando a SUNAT beta, `next dev`. Flujo: activar SUNAT → emisor + certificado de prueba → serie →
  factura con vista previa → emitir → «Aceptado» → PDF/XML/CDR → anular; boleta y nota de crédito. Regresión: una
  empresa `US` ve «Facturas» y su flujo igual que hoy.

## Criterio de terminado

El flujo de la prueba real completo en el navegador contra SUNAT beta, suites (frontend, backend unitarias y BD) en
verde, build sin errores y la empresa `US` sin cambios visibles.
