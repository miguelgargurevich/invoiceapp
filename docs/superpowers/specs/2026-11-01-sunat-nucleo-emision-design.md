# Diseño — Facturación electrónica SUNAT: núcleo de emisión

> Fecha: 2026-11-01 · Estado: aprobado por Miguel (secciones 1–5) · Subproyecto 1+2 de 5

## Objetivo

Que InvoiceApp emita comprobantes electrónicos válidos ante SUNAT (Perú) con motor propio,
primero para las empresas de Miguel y luego como SaaS multiempresa. Las cuentas de EE. UU.
siguen funcionando igual.

## Alcance

### Descomposición en subproyectos

| # | Subproyecto | Estado |
|---|---|---|
| 1+2 | **Núcleo de emisión + procesos por ticket** (este documento) | Diseñado |
| 3 | Guía de remisión electrónica (API REST SUNAT con OAuth) | Pendiente de diseño |
| 4 | Comprobantes de retención (20) y percepción (40) | Pendiente de diseño |
| 5 | SaaS: onboarding self-service del certificado/SOL, paso beta→producción por empresa, evaluar inscripción como PSE | Pendiente de diseño |

### Dentro de este subproyecto

- Comprobantes: factura (01), boleta (03), nota de crédito (07), nota de débito (08).
- Resumen diario (RC) y comunicación de baja (RA) con consulta de ticket.
- Cálculo tributario: gravado (tasa de la empresa: 18 % o 10 % régimen restaurantes/hoteles),
  exonerado, inafecto, exportación, ICBPER, detracción (SPOT), percepción y retención informadas
  en la factura, contado/crédito con cuotas.
- Representación impresa (PDF con QR y hash) y envío por correo.

### Fuera de la v1 (YAGNI)

Operaciones gratuitas/bonificaciones, IVAP, ISC, anticipos, pago de detracciones.
Se agregan si un cliente real los necesita.

## 1. Arquitectura

```
Frontend (Next.js) ──► Backend InvoiceApp (Express)  ──►  sunat-engine (PHP + Greenter)  ──►  SUNAT
                         · reglas de negocio y cálculo      · arma UBL 2.1                       · billService (SOAP)
                         · correlativos y estados           · firma con el certificado           · consulta de CDR
                         · cola pg-boss (Postgres)          · envía, lee CDR, devuelve
                         · XML/CDR/PDF en R2 (privado)      · sin estado, sin BD
```

- **Engine sin estado.** Recibe por HTTP interno un JSON con el comprobante ya calculado, el
  certificado y las credenciales SOL de la empresa; devuelve XML firmado, hash, CDR y código de
  respuesta. No persiste nada; Postgres de InvoiceApp es la única fuente de verdad.
- **InvoiceApp es dueño de los montos.** El engine no recalcula; el PDF y el XML salen de los mismos
  totales.
- **Emisión asíncrona** con pg-boss sobre el Postgres existente (sin Redis): resiste caídas de SUNAT
  sin bloquear al usuario.
- **Despliegue:** backend (servidor permanente, `app.listen`) y engine como contenedores en Coolify.
  El engine solo escucha en la red interna, autenticado con token compartido (`SUNAT_ENGINE_TOKEN`).
- **Código nuevo:**
  - `apps/backend/src/sunat/catalogos/` — catálogos SUNAT y `parametros.js` (umbrales, tarifas,
    plazos con fecha de vigencia).
  - `apps/backend/src/sunat/calculo/` — `calcularComprobante`.
  - `apps/backend/src/sunat/emision/` — servicio de emisión y máquina de estados.
  - `apps/backend/src/sunat/engineClient.js` — cliente HTTP del engine.
  - `apps/backend/src/sunat/jobs/` — `enviar`, `resumenDiario`, `comunicacionBaja`,
    `consultarTicket`, `alertasPlazo`.
  - `apps/backend/src/sunat/pdf/` — representación impresa con QR.
  - `apps/sunat-engine/` — microservicio PHP con Greenter.

## 2. Modelo de datos

Principio: `Empresa.pais` (`US` | `PE`, por defecto `US` para las empresas existentes) activa el flujo SUNAT. Se extiende `Factura` en vez de crear
una tabla paralela, para reutilizar listas, pagos, correo y UI.

### Modelos nuevos

- **`EmisorSunat`** (1:1 con `Empresa`): ubigeo, departamento, provincia, distrito, dirección fiscal,
  código de establecimiento (`0000`), ambiente (`BETA` | `PRODUCCION`, por defecto `BETA`), usuario SOL
  secundario, clave SOL (cifrada), certificado `.pfx` (cifrado) y su contraseña (cifrada),
  vencimiento del certificado, cuenta de detracciones del Banco de la Nación, `esAgenteRetencion`,
  `esAgentePercepcion`. Campos `greClientId` / `greSecret` (cifrado) reservados para el subproyecto 3.
- **`Serie`**: `empresaId`, `tipoComprobante` (01/03/07/08), `serie` (`F001`, `B001`, `FC01`…),
  `ultimoNumero`. Reemplaza `Empresa.serieFactura` para empresas `PE`.
- **`CuotaFactura`**: `facturaId`, número de cuota, monto, fecha de vencimiento.
- **`ProcesoSunat`**: tipo (`RC` | `RA`), fecha de referencia, correlativo del día, ticket, estado,
  `xmlUrl`, `cdrUrl`, ítems (relación con los comprobantes incluidos y su estado en el proceso).
- **`EnvioSunat`**: bitácora de cada intento (comprobante o proceso, fecha, operación, código,
  mensaje, observaciones, duración).

### Cambios a `Factura`

- `tipoComprobante` (01/03/07/08), `tipoOperacion` (catálogo 51: `0101`, `0200`, `1001`…).
- `estadoSunat` (ver sección 3), **separado** de `estado`, que sigue siendo de cobranza.
- Totales por afectación: `totalGravadas`, `totalExoneradas`, `totalInafectas`, `totalExportacion`,
  `totalIgv`, `totalIcbper`; `montoEnLetras`.
- Detracción: código de bien/servicio (catálogo 54), porcentaje, monto.
- Percepción y retención: base, tasa, monto.
- NC/ND: documento relacionado (tipo, serie, número) y motivo (catálogos 09 / 10).
- `hashSunat`, `xmlUrl`, `cdrUrl`, `codigoRespuestaSunat`, `mensajeRespuestaSunat`.

### Cambios a `DetalleFactura`

`codigoUnidadSunat` (catálogo 03), `tipoAfectacionIgv` (catálogo 07), `valorUnitario` (sin IGV,
hasta 10 decimales), `precioUnitario` (con IGV), `cantidadBolsasIcbper`, `codigoProductoSunat`
(opcional).

### Cambios a `Cliente`

`tipoDocumento` pasa a códigos del catálogo 06 (`6` RUC, `1` DNI, `4` CE, `7` pasaporte, `0` sin
documento/exterior). Migración que convierte los valores de texto actuales.

### Catálogos

Constantes versionadas en código (`src/sunat/catalogos/`), no tablas: cambian por resolución de
SUNAT y deben pasar por revisión de código.

## 3. Ciclo de vida del comprobante

```
BORRADOR ──emitir──► PENDIENTE_ENVIO ──job──► ACEPTADO | ACEPTADO_CON_OBS
   │                       │                        │
 editable          ERROR_TEMPORAL ⟲ reintento        ├─ en plazo de baja ─► ANULACION_PENDIENTE ─ticket─► ANULADO
                           │                        └─ fuera de plazo ───► se emite NC (motivo 01)
                      RECHAZADO (número quemado)
```

1. **Solo `BORRADOR` es editable.** «Emitir», en una transacción: recalcula, toma el correlativo de
   `Serie` con `SELECT … FOR UPDATE`, pide al engine el XML firmado, lo guarda en R2 con su hash y
   deja el comprobante en `PENDIENTE_ENVIO`. Si el engine falla al construir/firmar, la transacción se
   revierte: vuelve a `BORRADOR` y el número no se consume. El bloqueo de la fila de `Serie` dura lo
   que tarda la firma (sin red a SUNAT), así que la emisión queda serializada por serie; aceptable
   para el volumen de la v1.
2. **Envío (job `enviar`):** factura, boleta, NC y ND se envían individualmente con `sendBill`
   (CDR inmediato). Boleta individual es el camino principal; **se confirma en beta**. Si SUNAT no lo
   admitiera, las boletas pasan a enviarse por resumen diario.
3. **Respuesta por rango de código:**
   - `0100–1999` (excepción) o falla de red/timeout → `ERROR_TEMPORAL`; se reenvía **el mismo XML
     firmado** con backoff (1, 5, 15, 60 min y luego cada hora hasta el plazo). Código `1033`
     («ya registrado») → se consulta el CDR en lugar de reenviar.
   - `2000–3999` (rechazo) → `RECHAZADO`; el número queda quemado. La UI ofrece «Corregir y emitir
     nuevo» (copia a un borrador nuevo).
   - `0` y `≥ 4000` → `ACEPTADO` / `ACEPTADO_CON_OBS` (se guardan las observaciones).
4. **Anulación:** factura/NC/ND aceptadas en plazo → comunicación de baja (RA); boleta → resumen
   diario (RC) con estado «anulado». Ambos devuelven ticket; `consultarTicket` hace polling hasta el
   CDR y pasa a `ANULADO`. Fuera de plazo, la acción «Anular» se convierte en «Emitir NC por
   anulación».
5. **Plazos:** job diario `alertasPlazo` avisa en el dashboard de comprobantes `PENDIENTE_ENVIO` /
   `ERROR_TEMPORAL` cerca del límite. Los plazos viven en `parametros.js`.
6. **Cobranza separada:** `estado` (pagada, vencida…) no depende de `estadoSunat`. Un comprobante
   `ANULADO` no admite pagos.
7. **PDF:** generado en el servidor solo cuando hay XML (QR + hash), regenerable. El correo al
   cliente sale al pasar a `ACEPTADO`/`ACEPTADO_CON_OBS`, con PDF y XML adjuntos.

## 4. Cálculo tributario

Una función pura `calcularComprobante(entrada) → { lineas, totales, leyendas, detraccion, cuotas }`
en `src/sunat/calculo/`, con `decimal.js` (nunca flotantes). El frontend no calcula: la vista previa
usa `POST /api/comprobantes/preview`, que llama a la misma función.

- **Línea:** el usuario ingresa precio con o sin IGV (respeta `Producto.precioConIgv`); se guardan
  `valorUnitario` (hasta 10 decimales) y `precioUnitario`.
  `valorVenta = cantidad × valorUnitario − descuento`, redondeado a 2 decimales.
- **IGV por afectación (catálogo 07):** `10` gravado → `Empresa.taxRate`; `20` exonerado, `30`
  inafecto, `40` exportación → 0.
- **ICBPER:** bolsas × tarifa vigente del año (`parametros.js`).
- **Totales:** suma de líneas ya redondeadas (incluido el IGV); no se recalcula sobre el total.
- **Exportación:** `tipoOperacion = 0200`, todas las líneas en `40`, cliente con documento del
  exterior, moneda extranjera con tipo de cambio.
- **Detracción:** `tipoOperacion = 1001`; obligatoria si el total supera el umbral vigente;
  `monto = total × porcentaje` del código (catálogo 54), redondeado según la norma vigente; leyenda
  SPOT y cuenta del Banco de la Nación.
- **Percepción:** si el emisor es agente de percepción, se informan base, tasa y monto; el total a
  cobrar la incluye.
- **Retención:** si el cliente es agente de retención, el neto pendiente se reduce en su monto.
- **Forma de pago:** Contado o Crédito con cuotas. Regla dura:
  `Σ cuotas = total − detracción − retención`.
- **Monto en letras:** «SON: MIL DOSCIENTOS CON 50/100 SOLES».

## 5. Errores, seguridad y pruebas

### Errores

- **Validación previa (Zod), mensajes en español de usuario:** factura → cliente con RUC; boleta
  sobre el umbral → DNI obligatorio; serie del tipo correcto; cuotas cuadran; detracción completa;
  emisor configurado; certificado vigente.
- Engine o SUNAT caídos → `ERROR_TEMPORAL` + reintento; el XML firmado ya está en R2.
- Error del engine al construir → rollback a `BORRADOR` sin consumir número (sección 3, regla 1).
- Código y mensaje de SUNAT en `EnvioSunat` y visibles en el detalle, con explicación para los
  códigos frecuentes.
- **Alertas en el dashboard:** certificado a menos de 30 días de vencer, comprobantes cerca del
  plazo, tickets sin respuesta.

### Seguridad

- `.pfx`, su contraseña y la clave SOL cifrados con AES-256-GCM; llave maestra `SUNAT_MASTER_KEY`
  solo en variables de Coolify. Al guardar el certificado se valida que abra y que su RUC coincida
  con el de la empresa.
- Los secretos nunca vuelven al frontend ni se escriben en logs; la API solo expone «configurado» y
  la fecha de vencimiento.
- El engine solo en red interna con token; no conserva el certificado tras cada solicitud.
- XML y CDR en una ruta **privada** de R2 (no en el bucket público de fotos), servidos con URL
  firmada.
- Ambiente `BETA` por defecto; pasar a `PRODUCCION` exige confirmación explícita.

### Pruebas

1. Unitarias de `calcularComprobante` con casos fijos: gravado, mixto, exportación, detracción,
   percepción, crédito con cuotas, ICBPER, redondeos límite.
2. Contrato del engine: JSON de entrada → XML que valida contra el XSD de UBL 2.1.
3. Integración contra el ambiente beta de SUNAT (credenciales de prueba públicas): uno de cada tipo,
   rechazo provocado, baja y resumen. Manual o CI nocturno, no en cada push.
4. Máquina de estados y cola con engine simulado (respuestas `0`, `1033`, `2xxx`, `4xxx`, timeout).
5. Regresión: una empresa `pais = US` funciona igual que hoy.

## Criterio de terminado

Con una empresa de Miguel en beta: factura, boleta, NC y ND emitidas y aceptadas; anulación por
baja y por resumen; PDF con QR; correo enviado. Luego, paso a producción con su certificado real.

## Supuestos a verificar en beta

- Envío individual de boletas con `sendBill` (si no, resumen diario como camino principal).
- Plazos vigentes de envío y de comunicación de baja.
- Umbral y regla de redondeo vigentes de la detracción; tarifa ICBPER del año.
