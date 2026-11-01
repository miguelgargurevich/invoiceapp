# Núcleo de emisión SUNAT — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).
> **Regla de Miguel que manda sobre lo anterior:** la construcción se delega con la skill `delegar` (pestaña de terminal visible, worktree en `.claude/worktrees/<tema>`). Cada tarea trae su línea `Riesgo:` / `Delicado:` para elegir ejecutor. La verificación (leer el diff, correr las suites, integrar) la hace Opus.

**Objetivo:** que InvoiceApp emita factura, boleta, nota de crédito y nota de débito electrónicas válidas ante SUNAT, con anulación por baja o resumen diario, PDF con QR y correo. Todo desde la API del backend.

**Arquitectura:** el backend Express es dueño de los cálculos (`decimal.js`), los correlativos, la máquina de estados y la cola (pg-boss sobre el Postgres existente). Un microservicio PHP sin estado (`apps/sunat-engine`, Greenter) arma el UBL 2.1, lo firma y habla con SUNAT. Los XML y CDR van a un bucket R2 privado.

**Stack:** Node 26 (CommonJS), Express 5, Prisma 5.22, Zod 4, decimal.js 10, pg-boss 10.4.2, pdf-lib, qrcode, @aws-sdk/client-s3 y s3-request-presigner, PHP 8.3 y greenter/lite ^5, Docker.

**Spec:** `docs/superpowers/specs/2026-11-01-sunat-nucleo-emision-design.md`

**Fuera de este plan:** la interfaz del frontend (va en un plan aparte, sobre esta API ya probada) y los subproyectos 3 a 5.

## Restricciones globales

- Backend en CommonJS (`require`/`module.exports`), identificadores y mensajes en español, como el resto del repo.
- Montos con `decimal.js`, nunca aritmética de flotantes. Los montos viajan como strings con 2 decimales (`"118.00"`). El valor unitario lleva 10 decimales.
- Los mensajes de error al usuario van en español claro, sin códigos SUNAT crudos.
- Los secretos (clave SOL, `.pfx`, su contraseña) se guardan cifrados con AES-256-GCM, con la llave `SUNAT_MASTER_KEY` (32 bytes en base64). **Nunca** van en respuestas HTTP ni en logs. Las respuestas de la API no incluyen `empresa.emisorSunat`.
- Las empresas existentes quedan con `pais = "US"`: su flujo no cambia. Lo de SUNAT solo corre con `pais = "PE"`.
- Las pruebas usan `node:test`, sin dependencias nuevas de testing. Las unitarias van en `apps/backend/test/unit/`; las que tocan BD, en `apps/backend/test/db/`, contra el Postgres de pruebas en el puerto 5436.
- Zod 4: los errores se leen con `error.issues`.
- Las versiones van fijas: `pg-boss@10.4.2` (la 11 o mayor es solo ESM), `decimal.js@^10.6.0`, `qrcode@^1.5.4`, `@aws-sdk/s3-request-presigner@^3.922.0`.
- Todos los comandos de Node se corren desde `apps/backend/`.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/sunat/errores.js` | Clases de error del módulo |
| `src/sunat/fechas.js` | Fechas en hora de Lima |
| `src/sunat/numeros.js` | Conversión a `Decimal` y formato a 2 decimales |
| `src/sunat/catalogos/index.js` | Catálogos SUNAT y mapeos legados |
| `src/sunat/catalogos/parametros.js` | Umbrales, tarifas y plazos con vigencia |
| `src/sunat/calculo/montoEnLetras.js` | Monto en letras |
| `src/sunat/calculo/calcular.js` | `calcularComprobante` (función pura) |
| `src/sunat/seguridad/cifrado.js` | AES-256-GCM |
| `src/sunat/almacen.js` | Bucket R2 privado (guardar, leer, URL firmada) |
| `src/sunat/emision/borradores.js` | Esquema Zod, guardar y previsualizar borradores |
| `src/sunat/engine/cliente.js` | Cliente HTTP del microservicio |
| `src/sunat/engine/mapper.js` | Factura → JSON del engine |
| `src/sunat/emision/estados.js` | Estados, clasificación de respuestas y reintentos |
| `src/sunat/emision/plazos.js` | Plazos de envío y de baja |
| `src/sunat/emision/validacion.js` | Validaciones previas a emitir |
| `src/sunat/emision/servicio.js` | Emitir y procesar el envío |
| `src/sunat/emision/anulacion.js` | Baja (RA), resumen (RC) y tickets |
| `src/sunat/cola/index.js`, `cola/manejadores.js` | pg-boss y manejadores de trabajos |
| `src/sunat/pdf/representacion.js` | PDF con QR |
| `src/sunat/notificador.js` | Correo con PDF y XML |
| `src/sunat/http.js` | Errores HTTP y middlewares |
| `src/sunat/index.js` | Arranque del módulo |
| `src/routes/comprobantes.js`, `src/routes/sunat.js` | API |
| `apps/sunat-engine/**` | Microservicio PHP con Greenter |

**Orden y paralelismo:** la tarea 1 va primero. Después, las tareas 2, 4, 6 y 8 son independientes entre sí. La 3 necesita la 2; la 5 necesita la 4; la 7 necesita la 3 y la 5; la 9 necesita la 7. De la 10 a la 15 van en orden. La 16 va al final.

---

### Tarea 1: Base de pruebas, errores, fechas, números y catálogos

`Riesgo: medio` · `Delicado: no` · `Permitidos: apps/backend/package.json, apps/backend/package-lock.json, apps/backend/src/sunat/errores.js, apps/backend/src/sunat/fechas.js, apps/backend/src/sunat/numeros.js, apps/backend/src/sunat/catalogos/**, apps/backend/test/unit/sunat/**`

**Archivos:**
- Modificar: `apps/backend/package.json` (scripts `test` y `test:db`, dependencia `decimal.js`)
- Crear: `src/sunat/errores.js`, `src/sunat/fechas.js`, `src/sunat/numeros.js`, `src/sunat/catalogos/index.js`, `src/sunat/catalogos/parametros.js`
- Pruebas: `test/unit/sunat/fechas.test.js`, `test/unit/sunat/catalogos.test.js`

**Interfaces que produce:**
- `errores.js`: `ErrorValidacion(errores: string[])` con `.errores`; `ErrorEstado(msg)`; `ErrorFueraDePlazo(msg)`; `ErrorBorrador(msg)`; `ErrorEngineNoDisponible(msg)`; `ErrorConstruccion(msg, detalle?)`.
- `fechas.js`: `fechaLima(date) → 'YYYY-MM-DD'`; `isoLima(date) → 'YYYY-MM-DDTHH:mm:ss-05:00'`; `diasCalendario(desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD') → number`.
- `numeros.js`: `aDecimal(v) → Decimal` (acepta number, string o Prisma.Decimal; null → 0); `dos(v) → string` con 2 decimales.
- `catalogos/index.js`: `TIPO_COMPROBANTE`, `TIPO_DOC_IDENTIDAD`, `AFECTACION_IGV`, `TIPO_OPERACION`, `MOTIVOS_NOTA_CREDITO`, `MOTIVOS_NOTA_DEBITO`, `UNIDADES`, `DETRACCION_CODIGOS`, `PERCEPCION_REGIMENES`, `LEYENDAS`, `TEXTO_LEYENDA_DETRACCION`, `codigoDocIdentidad(tipo) → '0'|'1'|'4'|'6'|'7'`, `codigoUnidad(u) → string`.
- `catalogos/parametros.js`: `parametro(nombre, fecha = new Date()) → string`.

- [ ] **Paso 1: instalar `decimal.js` y agregar los scripts**

```bash
npm install decimal.js@^10.6.0
npm pkg set scripts.test="node --test \"test/unit/**/*.test.js\""
npm pkg set scripts.test:db="node --test --test-concurrency=1 \"test/db/**/*.test.js\""
```

- [ ] **Paso 2: escribir las pruebas que fallan**

`test/unit/sunat/fechas.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { fechaLima, isoLima, diasCalendario } = require('../../../src/sunat/fechas');
const { aDecimal, dos } = require('../../../src/sunat/numeros');

test('fechaLima usa la hora de Lima (UTC-5)', () => {
  assert.equal(fechaLima(new Date('2026-11-02T03:00:00Z')), '2026-11-01');
  assert.equal(fechaLima(new Date('2026-11-02T05:00:00Z')), '2026-11-02');
});

test('isoLima devuelve la hora local con -05:00', () => {
  assert.equal(isoLima(new Date('2026-11-01T15:30:00Z')), '2026-11-01T10:30:00-05:00');
});

test('diasCalendario cuenta días entre fechas', () => {
  assert.equal(diasCalendario('2026-11-01', '2026-11-04'), 3);
  assert.equal(diasCalendario('2026-11-01', '2026-11-01'), 0);
});

test('aDecimal y dos aceptan números, strings y null', () => {
  assert.equal(dos(aDecimal('1.005')), '1.01');
  assert.equal(dos(null), '0.00');
  assert.equal(dos(18), '18.00');
});
```

`test/unit/sunat/catalogos.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { codigoDocIdentidad, codigoUnidad, DETRACCION_CODIGOS } = require('../../../src/sunat/catalogos');
const { parametro } = require('../../../src/sunat/catalogos/parametros');

test('codigoDocIdentidad convierte textos legados y respeta códigos', () => {
  assert.equal(codigoDocIdentidad('RUC'), '6');
  assert.equal(codigoDocIdentidad('dni'), '1');
  assert.equal(codigoDocIdentidad('CE'), '4');
  assert.equal(codigoDocIdentidad('6'), '6');
  assert.equal(codigoDocIdentidad(null), '0');
});

test('codigoUnidad convierte UND a NIU y conserva códigos válidos', () => {
  assert.equal(codigoUnidad('UND'), 'NIU');
  assert.equal(codigoUnidad('ZZ'), 'ZZ');
  assert.equal(codigoUnidad(undefined), 'NIU');
});

test('DETRACCION_CODIGOS incluye el 037 al 12 %', () => {
  assert.equal(DETRACCION_CODIGOS['037'].porcentaje, '12');
});

test('parametro devuelve el valor vigente a la fecha', () => {
  assert.equal(parametro('ICBPER_TARIFA', new Date('2026-06-01T12:00:00Z')), '0.50');
  assert.equal(parametro('PLAZO_BAJA_DIAS'), '7');
  assert.throws(() => parametro('NO_EXISTE'), /desconocido/);
  assert.throws(() => parametro('ICBPER_TARIFA', new Date('2019-01-01T12:00:00Z')), /vigente/);
});
```

- [ ] **Paso 3: correr y ver que fallan**

Correr: `npm test`
Esperado: FAIL con `Cannot find module '../../../src/sunat/fechas'`.

- [ ] **Paso 4: implementar**

`src/sunat/errores.js`:

```js
// Errores del módulo SUNAT. Las rutas los traducen a códigos HTTP en src/sunat/http.js.
class ErrorValidacion extends Error {
  constructor(errores) {
    super(errores.join('. '));
    this.name = 'ErrorValidacion';
    this.errores = errores;
  }
}

class ErrorEstado extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorEstado'; }
}

class ErrorFueraDePlazo extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorFueraDePlazo'; }
}

class ErrorBorrador extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorBorrador'; }
}

class ErrorEngineNoDisponible extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorEngineNoDisponible'; }
}

class ErrorConstruccion extends Error {
  constructor(mensaje, detalle) { super(mensaje); this.name = 'ErrorConstruccion'; this.detalle = detalle; }
}

module.exports = {
  ErrorValidacion,
  ErrorEstado,
  ErrorFueraDePlazo,
  ErrorBorrador,
  ErrorEngineNoDisponible,
  ErrorConstruccion,
};
```

`src/sunat/fechas.js`:

```js
// Perú no tiene horario de verano: Lima es siempre UTC-5.
const DESFASE_LIMA_MS = 5 * 60 * 60 * 1000;

function aLima(fecha) {
  return new Date(new Date(fecha).getTime() - DESFASE_LIMA_MS);
}

function fechaLima(fecha) {
  return aLima(fecha).toISOString().slice(0, 10);
}

function isoLima(fecha) {
  return `${aLima(fecha).toISOString().slice(0, 19)}-05:00`;
}

function diasCalendario(desde, hasta) {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  return Math.round((fin - inicio) / 86400000);
}

module.exports = { fechaLima, isoLima, diasCalendario };
```

`src/sunat/numeros.js`:

```js
const Decimal = require('decimal.js');

// Prisma devuelve sus propios Decimal: se convierten por string para no depender de la instancia.
function aDecimal(valor) {
  if (valor === null || valor === undefined || valor === '') return new Decimal(0);
  return new Decimal(String(valor));
}

function dos(valor) {
  return aDecimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

module.exports = { aDecimal, dos };
```

`src/sunat/catalogos/index.js`:

```js
// Catálogos SUNAT (anexos de la RS 097-2012/SUNAT y modificatorias) usados por el núcleo de emisión.
// Cambian por resolución: se versionan en código y pasan por revisión.

const TIPO_COMPROBANTE = Object.freeze({
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
});

// Catálogo 06
const TIPO_DOC_IDENTIDAD = Object.freeze({
  SIN_DOCUMENTO: '0',
  DNI: '1',
  CARNET_EXTRANJERIA: '4',
  RUC: '6',
  PASAPORTE: '7',
});

// Catálogo 07 (solo las afectaciones de la v1)
const AFECTACION_IGV = Object.freeze({
  GRAVADO: '10',
  EXONERADO: '20',
  INAFECTO: '30',
  EXPORTACION: '40',
});

// Catálogo 51
const TIPO_OPERACION = Object.freeze({
  VENTA_INTERNA: '0101',
  EXPORTACION: '0200',
  DETRACCION: '1001',
});

// Catálogo 09
const MOTIVOS_NOTA_CREDITO = Object.freeze({
  '01': 'Anulación de la operación',
  '02': 'Anulación por error en el RUC',
  '03': 'Corrección por error en la descripción',
  '04': 'Descuento global',
  '05': 'Descuento por ítem',
  '06': 'Devolución total',
  '07': 'Devolución por ítem',
  '09': 'Disminución en el valor',
  '13': 'Ajustes de montos y/o fechas de pago',
});

// Catálogo 10
const MOTIVOS_NOTA_DEBITO = Object.freeze({
  '01': 'Intereses por mora',
  '02': 'Aumento en el valor',
  '03': 'Penalidades / otros conceptos',
});

// Catálogo 03 (subconjunto de uso común)
const UNIDADES = Object.freeze({
  NIU: 'Unidad (bienes)',
  ZZ: 'Unidad (servicios)',
  KGM: 'Kilogramo',
  MTR: 'Metro',
  LTR: 'Litro',
  HUR: 'Hora',
  DAY: 'Día',
  BX: 'Caja',
  GLL: 'Galón',
});

const UNIDADES_LEGADAS = Object.freeze({ UND: 'NIU', UNIDAD: 'NIU', SERV: 'ZZ', SERVICIO: 'ZZ' });

// Catálogo 54 (subconjunto). Porcentajes a verificar contra la norma vigente antes de producción.
const DETRACCION_CODIGOS = Object.freeze({
  '012': { descripcion: 'Intermediación laboral y tercerización', porcentaje: '12' },
  '019': { descripcion: 'Arrendamiento de bienes muebles', porcentaje: '10' },
  '020': { descripcion: 'Mantenimiento y reparación de bienes muebles', porcentaje: '12' },
  '022': { descripcion: 'Otros servicios empresariales', porcentaje: '12' },
  '030': { descripcion: 'Contratos de construcción', porcentaje: '4' },
  '037': { descripcion: 'Demás servicios gravados con el IGV', porcentaje: '12' },
});

// Catálogo 53 (percepciones)
const PERCEPCION_REGIMENES = Object.freeze({
  '51': { descripcion: 'Percepción venta interna', porcentaje: '2' },
  '52': { descripcion: 'Percepción a la adquisición de combustible', porcentaje: '1' },
  '53': { descripcion: 'Percepción al agente de percepción con tasa especial', porcentaje: '0.5' },
});

// Catálogo 52
const LEYENDAS = Object.freeze({
  MONTO_EN_LETRAS: '1000',
  DETRACCION: '2006',
});

const TEXTO_LEYENDA_DETRACCION = 'Operación sujeta al Sistema de Pago de Obligaciones Tributarias';

const DOC_IDENTIDAD_LEGADO = Object.freeze({
  RUC: '6',
  DNI: '1',
  CE: '4',
  'CARNET DE EXTRANJERIA': '4',
  PASAPORTE: '7',
  PASSPORT: '7',
});

// Los clientes antiguos guardan "RUC"/"DNI"; los nuevos, el código del catálogo 06.
function codigoDocIdentidad(tipoDocumento) {
  if (!tipoDocumento) return TIPO_DOC_IDENTIDAD.SIN_DOCUMENTO;
  const valor = String(tipoDocumento).trim().toUpperCase();
  if (Object.values(TIPO_DOC_IDENTIDAD).includes(valor)) return valor;
  return DOC_IDENTIDAD_LEGADO[valor] || TIPO_DOC_IDENTIDAD.SIN_DOCUMENTO;
}

function codigoUnidad(unidad) {
  if (!unidad) return 'NIU';
  const valor = String(unidad).trim().toUpperCase();
  if (UNIDADES[valor]) return valor;
  return UNIDADES_LEGADAS[valor] || 'NIU';
}

module.exports = {
  TIPO_COMPROBANTE,
  TIPO_DOC_IDENTIDAD,
  AFECTACION_IGV,
  TIPO_OPERACION,
  MOTIVOS_NOTA_CREDITO,
  MOTIVOS_NOTA_DEBITO,
  UNIDADES,
  DETRACCION_CODIGOS,
  PERCEPCION_REGIMENES,
  LEYENDAS,
  TEXTO_LEYENDA_DETRACCION,
  codigoDocIdentidad,
  codigoUnidad,
};
```

`src/sunat/catalogos/parametros.js`:

```js
const { fechaLima } = require('../fechas');

// Parámetros normativos con fecha de vigencia. Un cambio de SUNAT = agregar una entrada aquí.
// Todos los valores van a verificarse en beta antes del paso a producción (ver spec).
const PARAMETROS = Object.freeze({
  ICBPER_TARIFA: [{ desde: '2023-01-01', valor: '0.50' }],
  DETRACCION_UMBRAL: [{ desde: '2000-01-01', valor: '700' }],
  RETENCION_UMBRAL: [{ desde: '2000-01-01', valor: '700' }],
  RETENCION_PORCENTAJE: [{ desde: '2014-03-01', valor: '3' }],
  BOLETA_UMBRAL_IDENTIFICACION: [{ desde: '2000-01-01', valor: '700' }],
  PLAZO_ENVIO_DIAS: [{ desde: '2000-01-01', valor: '3' }],
  PLAZO_BAJA_DIAS: [{ desde: '2000-01-01', valor: '7' }],
});

function parametro(nombre, fecha = new Date()) {
  const vigencias = PARAMETROS[nombre];
  if (!vigencias) throw new Error(`Parámetro SUNAT desconocido: ${nombre}`);
  const dia = fechaLima(fecha);
  const vigente = vigencias
    .filter((v) => v.desde <= dia)
    .sort((a, b) => (a.desde < b.desde ? 1 : -1))[0];
  if (!vigente) throw new Error(`No hay valor vigente de ${nombre} para ${dia}`);
  return vigente.valor;
}

module.exports = { parametro };
```

- [ ] **Paso 5: correr y ver que pasan**

Correr: `npm test`
Esperado: PASS (8 pruebas).

- [ ] **Paso 6: commit**

```bash
git add package.json package-lock.json src/sunat test/unit/sunat
git commit -m "feat(sunat): base de pruebas, catálogos, parámetros y utilidades"
```

---

### Tarea 2: Monto en letras

`Riesgo: medio` · `Delicado: no` · `Permitidos: apps/backend/src/sunat/calculo/montoEnLetras.js, apps/backend/test/unit/sunat/montoEnLetras.test.js`

**Archivos:**
- Crear: `src/sunat/calculo/montoEnLetras.js`
- Prueba: `test/unit/sunat/montoEnLetras.test.js`

**Interfaces que produce:** `montoEnLetras(monto: string|number|Decimal, moneda = 'PEN') → 'SON: … CON NN/100 SOLES'`.

- [ ] **Paso 1: escribir la prueba que falla**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { montoEnLetras } = require('../../../src/sunat/calculo/montoEnLetras');

const casos = [
  ['0', 'SON: CERO CON 00/100 SOLES'],
  ['1', 'SON: UNO CON 00/100 SOLES'],
  ['15', 'SON: QUINCE CON 00/100 SOLES'],
  ['21', 'SON: VEINTIUNO CON 00/100 SOLES'],
  ['45', 'SON: CUARENTA Y CINCO CON 00/100 SOLES'],
  ['100', 'SON: CIEN CON 00/100 SOLES'],
  ['101', 'SON: CIENTO UNO CON 00/100 SOLES'],
  ['118', 'SON: CIENTO DIECIOCHO CON 00/100 SOLES'],
  ['1000', 'SON: MIL CON 00/100 SOLES'],
  ['1200.50', 'SON: MIL DOSCIENTOS CON 50/100 SOLES'],
  ['21000', 'SON: VEINTIUN MIL CON 00/100 SOLES'],
  ['31000', 'SON: TREINTA Y UN MIL CON 00/100 SOLES'],
  ['100000', 'SON: CIEN MIL CON 00/100 SOLES'],
  ['1000000', 'SON: UN MILLON CON 00/100 SOLES'],
  ['2500000', 'SON: DOS MILLONES QUINIENTOS MIL CON 00/100 SOLES'],
];

for (const [monto, esperado] of casos) {
  test(`montoEnLetras(${monto})`, () => assert.equal(montoEnLetras(monto), esperado));
}

test('usa el nombre de la moneda', () => {
  assert.equal(montoEnLetras('0.5', 'USD'), 'SON: CERO CON 50/100 DÓLARES AMERICANOS');
});

test('rechaza montos de mil millones o más', () => {
  assert.throws(() => montoEnLetras('1000000000'), /fuera de rango/);
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `node --test test/unit/sunat/montoEnLetras.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar**

```js
const Decimal = require('decimal.js');

const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIEZ_A_VEINTINUEVE = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE',
  'VEINTIOCHO', 'VEINTINUEVE',
];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS',
  'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
const MONEDAS = { PEN: 'SOLES', USD: 'DÓLARES AMERICANOS', EUR: 'EUROS' };

function decenas(n) {
  if (n < 10) return UNIDADES[n];
  if (n < 30) return DIEZ_A_VEINTINUEVE[n - 10];
  const unidad = n % 10;
  const decena = DECENAS[Math.floor(n / 10)];
  return unidad ? `${decena} Y ${UNIDADES[unidad]}` : decena;
}

function centenas(n) {
  if (n === 100) return 'CIEN';
  return [CENTENAS[Math.floor(n / 100)], decenas(n % 100)].filter(Boolean).join(' ');
}

// "VEINTIUNO MIL" se dice "VEINTIUN MIL"
function apocopar(texto) {
  return texto.replace(/UNO$/, 'UN');
}

function enteroEnLetras(n) {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1e6);
  const miles = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (millones) partes.push(millones === 1 ? 'UN MILLON' : `${apocopar(centenas(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? 'MIL' : `${apocopar(centenas(miles))} MIL`);
  if (resto) partes.push(centenas(resto));
  return partes.join(' ');
}

function montoEnLetras(monto, moneda = 'PEN') {
  const [entero, centimos] = new Decimal(String(monto)).toFixed(2).split('.');
  const n = Number(entero);
  if (n >= 1e9) throw new Error('Monto fuera de rango para el monto en letras');
  return `SON: ${enteroEnLetras(n)} CON ${centimos}/100 ${MONEDAS[moneda] || moneda}`;
}

module.exports = { montoEnLetras };
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `node --test test/unit/sunat/montoEnLetras.test.js`
Esperado: PASS (17 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/sunat/calculo/montoEnLetras.js test/unit/sunat/montoEnLetras.test.js
git commit -m "feat(sunat): monto en letras"
```

---

### Tarea 3: `calcularComprobante`

`Riesgo: alto` · `Delicado: sí` (dinero) · `Permitidos: apps/backend/src/sunat/calculo/calcular.js, apps/backend/test/unit/sunat/calcular.test.js`

**Archivos:**
- Crear: `src/sunat/calculo/calcular.js`
- Prueba: `test/unit/sunat/calcular.test.js`

**Interfaces:**
- Usa: `montoEnLetras`, `parametro`, los catálogos y `aDecimal`.
- Produce: `calcularComprobante(entrada) → resultado` y `ErrorCalculo`.

```
entrada = {
  tipoOperacion?: '0101'|'0200'|'1001', tasaIgv?: number (18), moneda?: 'PEN'|'USD'|'EUR',
  tipoCambio?: number, fechaEmision?: Date, retencion?: boolean,
  lineas: [{ descripcion, cantidad, precio, precioIncluyeIgv?, descuento?, afectacion?: '10'|'20'|'30'|'40',
             unidad?, bolsasIcbper?, codigoProducto? }],
  detraccion?: { codigo }, percepcion?: { regimen },
  formaPago?: { tipo: 'Contado' } | { tipo: 'Credito', cuotas: [{ monto, fechaVencimiento: 'YYYY-MM-DD' }] }
}
resultado = {
  tipoOperacion, moneda, formaPago: 'Contado'|'Credito', netoPendiente: '0.00',
  lineas: [{ descripcion, codigoProducto, unidad, cantidad, afectacion, porcentajeIgv, precioIncluyeIgv, precio,
             valorUnitario (10 dec), precioUnitario (10 dec), valorBruto, descuento, valorVenta, igv,
             bolsasIcbper, icbper, total }],
  totales: { gravadas, exoneradas, inafectas, exportacion, igv, icbper, descuento, valorVenta, totalImpuestos, total },
  leyendas: [{ codigo, valor }],
  detraccion: null | { codigo, porcentaje, monto (en soles, sin céntimos), montoMoneda },
  percepcion: null | { regimen, porcentaje, base, monto, total },
  retencion: null | { porcentaje, base, monto },
  cuotas: [{ numero, monto, fechaVencimiento }]
}
```

El descuento de cada línea es sin IGV. Todos los montos de salida son strings.

- [ ] **Paso 1: escribir las pruebas que fallan**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularComprobante, ErrorCalculo } = require('../../../src/sunat/calculo/calcular');

const FECHA = new Date('2026-11-01T15:00:00Z');
const linea = (extra) => ({ descripcion: 'Servicio', cantidad: 1, precio: 100, ...extra });
const calcular = (extra) => calcularComprobante({ tasaIgv: 18, moneda: 'PEN', fechaEmision: FECHA, ...extra });

test('gravado con precio sin IGV', () => {
  const r = calcular({ lineas: [linea({ cantidad: 2, precio: 50 })] });
  assert.equal(r.lineas[0].valorUnitario, '50.0000000000');
  assert.equal(r.lineas[0].precioUnitario, '59.0000000000');
  assert.equal(r.totales.gravadas, '100.00');
  assert.equal(r.totales.igv, '18.00');
  assert.equal(r.totales.total, '118.00');
  assert.deepEqual(r.leyendas[0], { codigo: '1000', valor: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES' });
  assert.equal(r.formaPago, 'Contado');
});

test('precio con IGV se desagrega', () => {
  const r = calcular({ lineas: [linea({ precio: 118, precioIncluyeIgv: true })] });
  assert.equal(r.lineas[0].valorUnitario, '100.0000000000');
  assert.equal(r.totales.igv, '18.00');
  assert.equal(r.totales.total, '118.00');
});

test('el IGV total es la suma de los IGV redondeados por línea', () => {
  const r = calcular({ lineas: [linea({ precio: 0.1 }), linea({ precio: 0.1 }), linea({ precio: 0.1 })] });
  assert.equal(r.totales.igv, '0.06');
  assert.equal(r.totales.total, '0.36');
});

test('descuento por línea reduce el valor de venta', () => {
  const r = calcular({ lineas: [linea({ precio: 100, descuento: 10 })] });
  assert.equal(r.lineas[0].valorBruto, '100.00');
  assert.equal(r.lineas[0].valorVenta, '90.00');
  assert.equal(r.totales.descuento, '10.00');
  assert.equal(r.totales.total, '106.20');
});

test('mixto: gravado, exonerado e inafecto', () => {
  const r = calcular({ lineas: [linea(), linea({ precio: 50, afectacion: '20' }), linea({ precio: 30, afectacion: '30' })] });
  assert.equal(r.totales.gravadas, '100.00');
  assert.equal(r.totales.exoneradas, '50.00');
  assert.equal(r.totales.inafectas, '30.00');
  assert.equal(r.totales.igv, '18.00');
  assert.equal(r.totales.total, '198.00');
});

test('exportación: todo en afectación 40, sin IGV', () => {
  const r = calcular({ tipoOperacion: '0200', moneda: 'USD', lineas: [linea({ precio: 1000, afectacion: '40' })] });
  assert.equal(r.totales.exportacion, '1000.00');
  assert.equal(r.totales.igv, '0.00');
  assert.match(r.leyendas[0].valor, /DÓLARES AMERICANOS$/);
  assert.throws(() => calcular({ tipoOperacion: '0200', lineas: [linea()] }), ErrorCalculo);
  assert.throws(() => calcular({ lineas: [linea({ afectacion: '40' })] }), /exportación/);
});

test('detracción 037 al 12 % redondeada a soles', () => {
  const r = calcular({ tipoOperacion: '1001', detraccion: { codigo: '037' }, lineas: [linea({ precio: 1000 })] });
  assert.equal(r.totales.total, '1180.00');
  assert.deepEqual(r.detraccion, { codigo: '037', porcentaje: '12', monto: '142.00', montoMoneda: '142.00' });
  assert.equal(r.netoPendiente, '1038.00');
  assert.equal(r.leyendas[1].codigo, '2006');
});

test('detracción: umbral y tipo de operación', () => {
  assert.throws(() => calcular({ tipoOperacion: '1001', detraccion: { codigo: '037' }, lineas: [linea({ precio: 500 })] }), /mayores a S\/ 700/);
  assert.throws(() => calcular({ detraccion: { codigo: '037' }, lineas: [linea({ precio: 1000 })] }), /1001/);
  assert.throws(() => calcular({ tipoOperacion: '1001', lineas: [linea({ precio: 1000 })] }), /código de bien o servicio/);
});

test('percepción régimen 51 al 2 %', () => {
  const r = calcular({ percepcion: { regimen: '51' }, lineas: [linea()] });
  assert.deepEqual(r.percepcion, { regimen: '51', porcentaje: '2', base: '118.00', monto: '2.36', total: '120.36' });
});

test('retención del 3 % solo sobre S/ 700', () => {
  const r = calcular({ retencion: true, lineas: [linea({ precio: 1000 })] });
  assert.deepEqual(r.retencion, { porcentaje: '3', base: '1180.00', monto: '35.40' });
  assert.equal(r.netoPendiente, '1144.60');
  assert.equal(calcular({ retencion: true, lineas: [linea()] }).retencion, null);
});

test('crédito: las cuotas deben sumar el neto pendiente', () => {
  const r = calcular({
    lineas: [linea()],
    formaPago: { tipo: 'Credito', cuotas: [{ monto: 59, fechaVencimiento: '2026-12-01' }, { monto: 59, fechaVencimiento: '2027-01-01' }] },
  });
  assert.equal(r.formaPago, 'Credito');
  assert.deepEqual(r.cuotas[1], { numero: 2, monto: '59.00', fechaVencimiento: '2027-01-01' });
  assert.throws(
    () => calcular({ lineas: [linea()], formaPago: { tipo: 'Credito', cuotas: [{ monto: 100, fechaVencimiento: '2026-12-01' }] } }),
    /suma de las cuotas \(100.00\).*\(118.00\)/,
  );
});

test('ICBPER por bolsa', () => {
  const r = calcular({ lineas: [linea({ descripcion: 'Bolsa', precio: 0.2, bolsasIcbper: 2 })] });
  assert.equal(r.lineas[0].icbper, '1.00');
  assert.equal(r.totales.icbper, '1.00');
  assert.equal(r.totales.totalImpuestos, '1.04');
  assert.equal(r.totales.total, '1.24');
});

test('errores de entrada', () => {
  assert.throws(() => calcular({ lineas: [] }), /al menos una línea/);
  assert.throws(() => calcular({ lineas: [linea({ cantidad: 0 })] }), /mayor que cero/);
  assert.throws(() => calcular({ lineas: [linea({ descuento: 200 })] }), /supera/);
  assert.throws(() => calcular({ lineas: [linea({ afectacion: '99' })] }), /no soportada/);
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `node --test test/unit/sunat/calcular.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar**

```js
const Decimal = require('decimal.js');
const {
  AFECTACION_IGV, TIPO_OPERACION, DETRACCION_CODIGOS, PERCEPCION_REGIMENES, LEYENDAS, TEXTO_LEYENDA_DETRACCION,
} = require('../catalogos');
const { parametro } = require('../catalogos/parametros');
const { montoEnLetras } = require('./montoEnLetras');

class ErrorCalculo extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorCalculo'; }
}

const r2 = (d) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const s2 = (d) => r2(d).toFixed(2);
const s10 = (d) => d.toDecimalPlaces(10, Decimal.ROUND_HALF_UP).toFixed(10);
const dec = (v) => new Decimal(String(v ?? 0));

function calcularLinea(linea, tasaIgv, tarifaIcbper) {
  const afectacion = linea.afectacion || AFECTACION_IGV.GRAVADO;
  if (!Object.values(AFECTACION_IGV).includes(afectacion)) {
    throw new ErrorCalculo(`Afectación de IGV no soportada: ${afectacion}`);
  }
  const tasa = afectacion === AFECTACION_IGV.GRAVADO ? dec(tasaIgv).div(100) : new Decimal(0);
  const cantidad = dec(linea.cantidad);
  if (cantidad.lte(0)) throw new ErrorCalculo(`La cantidad de «${linea.descripcion}» debe ser mayor que cero`);
  const precio = dec(linea.precio);
  if (precio.lt(0)) throw new ErrorCalculo(`El precio de «${linea.descripcion}» no puede ser negativo`);

  const valorUnitario = linea.precioIncluyeIgv ? precio.div(tasa.plus(1)) : precio;
  const precioUnitario = linea.precioIncluyeIgv ? precio : precio.mul(tasa.plus(1));
  const descuento = r2(dec(linea.descuento));
  const valorBruto = r2(cantidad.mul(valorUnitario));
  if (descuento.gt(valorBruto)) throw new ErrorCalculo(`El descuento de «${linea.descripcion}» supera el valor de la línea`);
  const valorVenta = r2(valorBruto.minus(descuento));
  const igv = r2(valorVenta.mul(tasa));
  const bolsasIcbper = Number(linea.bolsasIcbper || 0);
  const icbper = r2(dec(tarifaIcbper).mul(bolsasIcbper));

  return {
    descripcion: linea.descripcion,
    codigoProducto: linea.codigoProducto || null,
    unidad: linea.unidad || 'NIU',
    cantidad: cantidad.toString(),
    afectacion,
    porcentajeIgv: tasa.mul(100).toString(),
    precioIncluyeIgv: Boolean(linea.precioIncluyeIgv),
    precio: precio.toString(),
    valorUnitario: s10(valorUnitario),
    precioUnitario: s10(precioUnitario),
    valorBruto: s2(valorBruto),
    descuento: s2(descuento),
    valorVenta: s2(valorVenta),
    igv: s2(igv),
    bolsasIcbper,
    icbper: s2(icbper),
    total: s2(valorVenta.plus(igv).plus(icbper)),
  };
}

function calcularComprobante(entrada) {
  const fecha = entrada.fechaEmision ? new Date(entrada.fechaEmision) : new Date();
  const moneda = entrada.moneda || 'PEN';
  const tipoOperacion = entrada.tipoOperacion || TIPO_OPERACION.VENTA_INTERNA;
  if (!entrada.lineas || entrada.lineas.length === 0) {
    throw new ErrorCalculo('El comprobante debe tener al menos una línea');
  }

  const tarifaIcbper = parametro('ICBPER_TARIFA', fecha);
  const lineas = entrada.lineas.map((l) => calcularLinea(l, entrada.tasaIgv ?? 18, tarifaIcbper));

  const esExportacion = tipoOperacion === TIPO_OPERACION.EXPORTACION;
  if (esExportacion && lineas.some((l) => l.afectacion !== AFECTACION_IGV.EXPORTACION)) {
    throw new ErrorCalculo('En una exportación todas las líneas deben tener afectación 40 (exportación)');
  }
  if (!esExportacion && lineas.some((l) => l.afectacion === AFECTACION_IGV.EXPORTACION)) {
    throw new ErrorCalculo('La afectación 40 solo se usa en operaciones de exportación');
  }

  const suma = (campo, filtro = () => true) =>
    lineas.filter(filtro).reduce((acc, l) => acc.plus(l[campo]), new Decimal(0));
  const porAfectacion = (afectacion) => suma('valorVenta', (l) => l.afectacion === afectacion);

  const gravadas = porAfectacion(AFECTACION_IGV.GRAVADO);
  const exoneradas = porAfectacion(AFECTACION_IGV.EXONERADO);
  const inafectas = porAfectacion(AFECTACION_IGV.INAFECTO);
  const exportacion = porAfectacion(AFECTACION_IGV.EXPORTACION);
  const igv = suma('igv');
  const icbper = suma('icbper');
  const valorVenta = gravadas.plus(exoneradas).plus(inafectas).plus(exportacion);
  const totalImpuestos = igv.plus(icbper);
  const total = valorVenta.plus(totalImpuestos);

  const tipoCambio = moneda === 'PEN' ? new Decimal(1) : dec(entrada.tipoCambio);
  const enSoles = (monto) => {
    if (tipoCambio.lte(0)) throw new ErrorCalculo('Indica el tipo de cambio para operar en moneda extranjera');
    return monto.mul(tipoCambio);
  };

  const leyendas = [{ codigo: LEYENDAS.MONTO_EN_LETRAS, valor: montoEnLetras(total, moneda) }];

  let detraccion = null;
  if (tipoOperacion === TIPO_OPERACION.DETRACCION) {
    const codigo = entrada.detraccion?.codigo;
    const definicion = DETRACCION_CODIGOS[codigo];
    if (!definicion) throw new ErrorCalculo('Indica el código de bien o servicio sujeto a detracción');
    const umbral = parametro('DETRACCION_UMBRAL', fecha);
    const totalSoles = enSoles(total);
    if (totalSoles.lte(umbral)) throw new ErrorCalculo(`La detracción solo aplica a operaciones mayores a S/ ${umbral}`);
    const montoSoles = totalSoles.mul(definicion.porcentaje).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    const montoMoneda = moneda === 'PEN' ? montoSoles : r2(total.mul(definicion.porcentaje).div(100));
    detraccion = { codigo, porcentaje: definicion.porcentaje, monto: montoSoles.toFixed(2), montoMoneda: s2(montoMoneda) };
    leyendas.push({ codigo: LEYENDAS.DETRACCION, valor: TEXTO_LEYENDA_DETRACCION });
  } else if (entrada.detraccion) {
    throw new ErrorCalculo('La detracción requiere el tipo de operación 1001');
  }

  let percepcion = null;
  if (entrada.percepcion) {
    const definicion = PERCEPCION_REGIMENES[entrada.percepcion.regimen];
    if (!definicion) throw new ErrorCalculo('Régimen de percepción no soportado');
    if (moneda !== 'PEN') throw new ErrorCalculo('La percepción se calcula en soles: emite el comprobante en PEN');
    const monto = r2(total.mul(definicion.porcentaje).div(100));
    percepcion = {
      regimen: entrada.percepcion.regimen, porcentaje: definicion.porcentaje,
      base: s2(total), monto: s2(monto), total: s2(total.plus(monto)),
    };
  }

  // SUNAT: si la operación está sujeta a detracción no se aplica retención.
  let retencion = null;
  if (entrada.retencion && !detraccion && enSoles(total).gt(parametro('RETENCION_UMBRAL', fecha))) {
    const porcentaje = parametro('RETENCION_PORCENTAJE', fecha);
    retencion = { porcentaje, base: s2(total), monto: s2(r2(total.mul(porcentaje).div(100))) };
  }

  const netoPendiente = total
    .minus(detraccion ? detraccion.montoMoneda : 0)
    .minus(retencion ? retencion.monto : 0);

  const formaPago = entrada.formaPago || { tipo: 'Contado' };
  let cuotas = [];
  if (formaPago.tipo === 'Credito') {
    if (!formaPago.cuotas || formaPago.cuotas.length === 0) {
      throw new ErrorCalculo('Una venta al crédito debe tener al menos una cuota');
    }
    cuotas = formaPago.cuotas.map((c, i) => {
      if (!c.fechaVencimiento) throw new ErrorCalculo(`La cuota ${i + 1} no tiene fecha de vencimiento`);
      return { numero: i + 1, monto: s2(dec(c.monto)), fechaVencimiento: c.fechaVencimiento };
    });
    const sumaCuotas = cuotas.reduce((acc, c) => acc.plus(c.monto), new Decimal(0));
    if (!sumaCuotas.eq(r2(netoPendiente))) {
      throw new ErrorCalculo(
        `La suma de las cuotas (${sumaCuotas.toFixed(2)}) debe ser igual al neto pendiente de pago (${s2(netoPendiente)})`,
      );
    }
  } else if (formaPago.tipo !== 'Contado') {
    throw new ErrorCalculo('La forma de pago debe ser Contado o Credito');
  }

  return {
    tipoOperacion,
    moneda,
    formaPago: formaPago.tipo,
    netoPendiente: s2(netoPendiente),
    lineas,
    totales: {
      gravadas: s2(gravadas),
      exoneradas: s2(exoneradas),
      inafectas: s2(inafectas),
      exportacion: s2(exportacion),
      igv: s2(igv),
      icbper: s2(icbper),
      descuento: s2(suma('descuento')),
      valorVenta: s2(valorVenta),
      totalImpuestos: s2(totalImpuestos),
      total: s2(total),
    },
    leyendas,
    detraccion,
    percepcion,
    retencion,
    cuotas,
  };
}

module.exports = { calcularComprobante, ErrorCalculo };
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `node --test test/unit/sunat/calcular.test.js`
Esperado: PASS (13 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/sunat/calculo/calcular.js test/unit/sunat/calcular.test.js
git commit -m "feat(sunat): cálculo tributario de comprobantes con decimal.js"
```

---

### Tarea 4: Cifrado de secretos

`Riesgo: alto` · `Delicado: sí` (seguridad) · `Permitidos: apps/backend/src/sunat/seguridad/cifrado.js, apps/backend/test/unit/sunat/cifrado.test.js, apps/backend/.env.example`

**Archivos:**
- Crear: `src/sunat/seguridad/cifrado.js`
- Modificar: `apps/backend/.env.example` (agregar `SUNAT_MASTER_KEY=`)
- Prueba: `test/unit/sunat/cifrado.test.js`

**Interfaces que produce:** `cifrar(dato: string|Buffer, llave?) → 'v1:iv:tag:datos'`; `descifrar(texto, llave?) → Buffer`; `obtenerLlave(env?) → Buffer`.

- [ ] **Paso 1: escribir la prueba que falla**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { cifrar, descifrar, obtenerLlave } = require('../../../src/sunat/seguridad/cifrado');

const LLAVE = Buffer.alloc(32, 7);

test('cifra y descifra textos y buffers', () => {
  assert.equal(descifrar(cifrar('moddatos', LLAVE), LLAVE).toString('utf8'), 'moddatos');
  const binario = Buffer.from([0, 1, 2, 250]);
  assert.deepEqual(descifrar(cifrar(binario, LLAVE), LLAVE), binario);
});

test('dos cifrados del mismo texto son distintos', () => {
  assert.notEqual(cifrar('x', LLAVE), cifrar('x', LLAVE));
});

test('un dato alterado no se descifra', () => {
  const partes = cifrar('secreto', LLAVE).split(':');
  partes[3] = Buffer.from('otro').toString('base64');
  assert.throws(() => descifrar(partes.join(':'), LLAVE));
});

test('obtenerLlave exige 32 bytes en base64', () => {
  assert.throws(() => obtenerLlave({}), /Falta SUNAT_MASTER_KEY/);
  assert.throws(() => obtenerLlave({ SUNAT_MASTER_KEY: Buffer.alloc(16).toString('base64') }), /32 bytes/);
  assert.equal(obtenerLlave({ SUNAT_MASTER_KEY: LLAVE.toString('base64') }).length, 32);
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `node --test test/unit/sunat/cifrado.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar**

```js
const crypto = require('node:crypto');

// Secretos del emisor (clave SOL, .pfx y su contraseña) cifrados con AES-256-GCM.
// Formato: v1:<iv base64>:<tag base64>:<datos base64>
const VERSION = 'v1';

function obtenerLlave(env = process.env) {
  const base64 = env.SUNAT_MASTER_KEY;
  if (!base64) throw new Error('Falta SUNAT_MASTER_KEY (32 bytes en base64)');
  const llave = Buffer.from(base64, 'base64');
  if (llave.length !== 32) throw new Error('SUNAT_MASTER_KEY debe tener 32 bytes en base64');
  return llave;
}

function cifrar(dato, llave = obtenerLlave()) {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', llave, iv);
  const plano = Buffer.isBuffer(dato) ? dato : Buffer.from(String(dato), 'utf8');
  const datos = Buffer.concat([cifrador.update(plano), cifrador.final()]);
  return [VERSION, iv.toString('base64'), cifrador.getAuthTag().toString('base64'), datos.toString('base64')].join(':');
}

function descifrar(texto, llave = obtenerLlave()) {
  const [version, iv, tag, datos] = String(texto).split(':');
  if (version !== VERSION || !iv || !tag || !datos) throw new Error('Formato de dato cifrado inválido');
  const descifrador = crypto.createDecipheriv('aes-256-gcm', llave, Buffer.from(iv, 'base64'));
  descifrador.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([descifrador.update(Buffer.from(datos, 'base64')), descifrador.final()]);
}

module.exports = { cifrar, descifrar, obtenerLlave };
```

Agregar a `apps/backend/.env.example`:

```
# SUNAT (Perú) — llave maestra de 32 bytes en base64: openssl rand -base64 32
SUNAT_MASTER_KEY=
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `node --test test/unit/sunat/cifrado.test.js`
Esperado: PASS (4 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/sunat/seguridad test/unit/sunat/cifrado.test.js .env.example
git commit -m "feat(sunat): cifrado AES-256-GCM de secretos del emisor"
```

---

### Tarea 5: Esquema Prisma, migración y base de pruebas

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/backend/prisma/schema.prisma, apps/backend/prisma/migrations/20261101000000_sunat_nucleo/**, apps/backend/test/db/**`

**Archivos:**
- Modificar: `prisma/schema.prisma`
- Crear: `prisma/migrations/20261101000000_sunat_nucleo/migration.sql` (generado)
- Crear: `test/db/ayuda.js`, `test/db/esquema.test.js`

**Nota sobre el spec:** se reutiliza el modelo existente `ConfiguracionSeries` (con `tipoDocumento` = `'01'|'03'|'07'|'08'`) en lugar de crear `Serie`. Y `Cliente.tipoDocumento` **no se migra**: `codigoDocIdentidad()` lee tanto el texto antiguo como el código, así los clientes de EE. UU. no cambian.

**Interfaces que produce:** modelos `EmisorSunat`, `CuotaFactura`, `ProcesoSunat`, `ProcesoSunatItem` y `EnvioSunat`, y los campos nuevos de `Empresa`, `Cliente`, `Factura` y `DetalleFactura` (abajo). Desde ahora `Factura.numero` es `Int?`.
`test/db/ayuda.js`: `prisma`, `limpiar()`, `crearEmpresaPeru({ ruc? }) → { user, empresa, cliente, clienteDni }`, `crearAceptado({ empresa, cliente, tipo, serie, numero, fechaEmision }) → factura`.

- [ ] **Paso 1: levantar el Postgres de pruebas**

```bash
docker run -d --name invoiceapp-pg-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=invoiceapp_test -p 5436:5432 postgres:16
```

- [ ] **Paso 2: guardar el esquema anterior para generar la migración** (los pasos 2 a 5 van en la misma terminal: usan `$ESQUEMA_ANTERIOR`)

```bash
ESQUEMA_ANTERIOR=$(mktemp -t esquema).prisma
git show HEAD:apps/backend/prisma/schema.prisma > "$ESQUEMA_ANTERIOR"
echo "$ESQUEMA_ANTERIOR"
```

- [ ] **Paso 3: editar `prisma/schema.prisma`**

En `model Empresa`, después de `setupCompleted`:

```prisma
  pais            String    @default("US") // "US" | "PE": "PE" activa la facturación electrónica SUNAT
```

y en sus relaciones, después de `subscription    Subscription?`:

```prisma
  emisorSunat     EmisorSunat?
  procesosSunat   ProcesoSunat[]
```

En `model Cliente`, después de `activo`:

```prisma
  esAgenteRetencion Boolean @default(false) @map("es_agente_retencion")
```

En `model Factura`, cambiar `numero            Int` por:

```prisma
  numero            Int?      // null mientras es borrador SUNAT; se asigna al emitir
```

y antes de `proformaOrigenId` agregar:

```prisma
  // Facturación electrónica SUNAT (solo empresas con pais = "PE")
  tipoComprobante       String    @default("01") @map("tipo_comprobante")
  tipoOperacion         String    @default("0101") @map("tipo_operacion")
  estadoSunat           String?   @map("estado_sunat")
  totalGravadas         Decimal   @default(0) @map("total_gravadas") @db.Decimal(12, 2)
  totalExoneradas       Decimal   @default(0) @map("total_exoneradas") @db.Decimal(12, 2)
  totalInafectas        Decimal   @default(0) @map("total_inafectas") @db.Decimal(12, 2)
  totalExportacion      Decimal   @default(0) @map("total_exportacion") @db.Decimal(12, 2)
  totalIcbper           Decimal   @default(0) @map("total_icbper") @db.Decimal(12, 2)
  montoEnLetras         String?   @map("monto_en_letras")
  detraccionCodigo      String?   @map("detraccion_codigo")
  detraccionPorcentaje  Decimal?  @map("detraccion_porcentaje") @db.Decimal(5, 2)
  detraccionMonto       Decimal?  @map("detraccion_monto") @db.Decimal(12, 2)
  percepcionRegimen     String?   @map("percepcion_regimen")
  percepcionPorcentaje  Decimal?  @map("percepcion_porcentaje") @db.Decimal(5, 2)
  percepcionBase        Decimal?  @map("percepcion_base") @db.Decimal(12, 2)
  percepcionMonto       Decimal?  @map("percepcion_monto") @db.Decimal(12, 2)
  retencionPorcentaje   Decimal?  @map("retencion_porcentaje") @db.Decimal(5, 2)
  retencionMonto        Decimal?  @map("retencion_monto") @db.Decimal(12, 2)
  netoPendiente         Decimal?  @map("neto_pendiente") @db.Decimal(12, 2)
  docRelacionadoId      String?   @map("doc_relacionado_id")
  docRelacionadoTipo    String?   @map("doc_relacionado_tipo")
  docRelacionadoSerie   String?   @map("doc_relacionado_serie")
  docRelacionadoNumero  Int?      @map("doc_relacionado_numero")
  motivoCodigo          String?   @map("motivo_codigo")
  motivoDescripcion     String?   @map("motivo_descripcion")
  xmlKey                String?   @map("xml_key")
  cdrKey                String?   @map("cdr_key")
  codigoRespuestaSunat  String?   @map("codigo_respuesta_sunat")
  mensajeRespuestaSunat String?   @map("mensaje_respuesta_sunat") @db.Text
  observacionesSunat    Json?     @map("observaciones_sunat")
  intentosEnvio         Int       @default(0) @map("intentos_envio")
  fechaEnvioSunat       DateTime? @map("fecha_envio_sunat")
```

En las relaciones de `Factura`, después de `signatureRequests SignatureRequest[]`:

```prisma
  cuotas            CuotaFactura[]
  envios            EnvioSunat[]
  procesoItems      ProcesoSunatItem[]
```

y junto a los demás índices de `Factura`:

```prisma
  @@index([estadoSunat], map: "idx_factura_estado_sunat")
```

En `model DetalleFactura`, después de `orden`:

```prisma
  codigoUnidadSunat    String   @default("NIU") @map("codigo_unidad_sunat")
  tipoAfectacionIgv    String   @default("10") @map("tipo_afectacion_igv")
  precioIncluyeIgv     Boolean  @default(false) @map("precio_incluye_igv")
  valorUnitario        Decimal? @map("valor_unitario") @db.Decimal(22, 10)
  precioUnitarioIgv    Decimal? @map("precio_unitario_igv") @db.Decimal(22, 10)
  icbper               Decimal  @default(0) @db.Decimal(10, 2)
  cantidadBolsasIcbper Int      @default(0) @map("cantidad_bolsas_icbper")
  codigoProductoSunat  String?  @map("codigo_producto_sunat")
```

Al final del archivo, los modelos nuevos:

```prisma
// 🇵🇪 Emisor SUNAT (1:1 con la empresa). Los secretos van cifrados (src/sunat/seguridad/cifrado.js).
model EmisorSunat {
  id                      String    @id @default(uuid())
  empresaId               String    @unique @map("empresa_id")
  ubigeo                  String
  departamento            String
  provincia               String
  distrito                String
  urbanizacion            String?
  direccionFiscal         String    @map("direccion_fiscal")
  codigoEstablecimiento   String    @default("0000") @map("codigo_establecimiento")
  ambiente                String    @default("BETA") // BETA | PRODUCCION
  solUsuario              String?   @map("sol_usuario")
  solClaveCifrada         String?   @map("sol_clave_cifrada") @db.Text
  certificadoCifrado      String?   @map("certificado_cifrado") @db.Text
  certificadoClaveCifrada String?   @map("certificado_clave_cifrada") @db.Text
  certificadoVence        DateTime? @map("certificado_vence")
  cuentaDetracciones      String?   @map("cuenta_detracciones")
  esAgenteRetencion       Boolean   @default(false) @map("es_agente_retencion")
  esAgentePercepcion      Boolean   @default(false) @map("es_agente_percepcion")
  greClientId             String?   @map("gre_client_id") // subproyecto 3 (guías)
  greSecretCifrado        String?   @map("gre_secret_cifrado") @db.Text
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  empresa                 Empresa   @relation(fields: [empresaId], references: [id], onDelete: Cascade)

  @@map("emisores_sunat")
}

model CuotaFactura {
  id               String   @id @default(uuid())
  facturaId        String   @map("factura_id")
  numero           Int
  monto            Decimal  @db.Decimal(12, 2)
  fechaVencimiento DateTime @map("fecha_vencimiento")

  factura          Factura  @relation(fields: [facturaId], references: [id], onDelete: Cascade)

  @@unique([facturaId, numero])
  @@map("cuotas_factura")
}

// Resumen diario (RC) y comunicación de baja (RA)
model ProcesoSunat {
  id               String    @id @default(uuid())
  empresaId        String    @map("empresa_id")
  tipo             String    // RC | RA
  fechaGeneracion  DateTime  @map("fecha_generacion") @db.Date
  fechaReferencia  DateTime  @map("fecha_referencia") @db.Date
  correlativo      Int
  ticket           String?
  estado           String    @default("ENVIADO") // ENVIADO | ACEPTADO | RECHAZADO
  xmlKey           String?   @map("xml_key")
  cdrKey           String?   @map("cdr_key")
  codigoRespuesta  String?   @map("codigo_respuesta")
  mensajeRespuesta String?   @map("mensaje_respuesta") @db.Text
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  empresa          Empresa   @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  items            ProcesoSunatItem[]
  envios           EnvioSunat[]

  @@unique([empresaId, tipo, fechaGeneracion, correlativo])
  @@index([estado])
  @@map("procesos_sunat")
}

model ProcesoSunatItem {
  id           String       @id @default(uuid())
  procesoId    String       @map("proceso_id")
  facturaId    String       @map("factura_id")
  motivo       String?
  estadoPrevio String       @map("estado_previo")

  proceso      ProcesoSunat @relation(fields: [procesoId], references: [id], onDelete: Cascade)
  factura      Factura      @relation(fields: [facturaId], references: [id])

  @@index([facturaId])
  @@map("proceso_sunat_items")
}

// Bitácora de cada intento contra SUNAT
model EnvioSunat {
  id         String        @id @default(uuid())
  facturaId  String?       @map("factura_id")
  procesoId  String?       @map("proceso_id")
  operacion  String        // sendBill | getStatusCdr | getStatus
  codigo     String?
  mensaje    String?       @db.Text
  exito      Boolean
  duracionMs Int           @map("duracion_ms")
  createdAt  DateTime      @default(now()) @map("created_at")

  factura    Factura?      @relation(fields: [facturaId], references: [id], onDelete: Cascade)
  proceso    ProcesoSunat? @relation(fields: [procesoId], references: [id], onDelete: Cascade)

  @@index([facturaId])
  @@index([procesoId])
  @@map("envios_sunat")
}
```

- [ ] **Paso 4: validar y generar el cliente**

Correr: `npx prisma validate && npx prisma generate`
Esperado: `The schema at prisma/schema.prisma is valid` y el cliente generado.

- [ ] **Paso 5: generar el SQL de la migración**

```bash
mkdir -p prisma/migrations/20261101000000_sunat_nucleo
npx prisma migrate diff --from-schema-datamodel "$ESQUEMA_ANTERIOR" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261101000000_sunat_nucleo/migration.sql
```

Revisar el archivo: debe tener `ALTER TABLE "facturas" ALTER COLUMN "numero" DROP NOT NULL`, los `ADD COLUMN` y los `CREATE TABLE` de los cinco modelos. **No debe tener ningún `DROP TABLE` ni `DROP COLUMN`.** Si aparece alguno, el esquema anterior no era el de `HEAD`: detenerse y revisar.

- [ ] **Paso 6: aplicar el esquema a la BD de pruebas**

```bash
DATABASE_URL=postgresql://postgres:test@localhost:5436/invoiceapp_test npx prisma db push --skip-generate
```

Esperado: `Your database is now in sync with your Prisma schema`.

- [ ] **Paso 7: escribir el helper y la prueba**

`test/db/ayuda.js`:

```js
// Helper de pruebas con BD real (Postgres de pruebas en el puerto 5436). Ver tarea 5 del plan.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5436/invoiceapp_test';
process.env.SUNAT_MASTER_KEY = process.env.SUNAT_MASTER_KEY || Buffer.alloc(32, 7).toString('base64');

const prisma = require('../../src/utils/prisma');
const { cifrar } = require('../../src/sunat/seguridad/cifrado');

async function limpiar() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE envios_sunat, proceso_sunat_items, procesos_sunat, cuotas_factura,
    detalles_factura, pagos_factura, facturas, configuracion_series, clientes, emisores_sunat, empresas, user_profiles
    RESTART IDENTITY CASCADE`);
}

async function crearEmpresaPeru({ ruc = '20000000001' } = {}) {
  const user = await prisma.userProfile.create({ data: { email: `u-${Date.now()}-${Math.random()}@test.pe` } });
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Empresa Beta', razonSocial: 'EMPRESA BETA SAC', ruc, pais: 'PE', moneda: 'PEN', currency: 'PEN',
      taxRate: 18, taxName: 'IGV', userId: user.id,
      emisorSunat: {
        create: {
          ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', direccionFiscal: 'AV. PRUEBA 123',
          solUsuario: 'MODDATOS', solClaveCifrada: cifrar('moddatos'),
          certificadoCifrado: cifrar(Buffer.from('pfx-de-prueba')), certificadoClaveCifrada: cifrar('clave'),
          certificadoVence: new Date('2030-01-01T00:00:00Z'), cuentaDetracciones: '00-000-000001',
        },
      },
    },
    include: { emisorSunat: true },
  });
  for (const [tipoDocumento, serie] of [['01', 'F001'], ['03', 'B001'], ['07', 'FC01'], ['08', 'FD01'], ['07', 'BC01']]) {
    await prisma.configuracionSeries.create({ data: { empresaId: empresa.id, tipoDocumento, serie, ultimoNumero: 0 } });
  }
  const cliente = await prisma.cliente.create({
    data: { empresaId: empresa.id, tipoDocumento: '6', numeroDocumento: '20131312955', razonSocial: 'CLIENTE SAC', email: 'cliente@test.pe' },
  });
  const clienteDni = await prisma.cliente.create({
    data: { empresaId: empresa.id, tipoDocumento: '1', numeroDocumento: '12345678', razonSocial: 'JUAN PEREZ' },
  });
  return { user, empresa, cliente, clienteDni };
}

// Crea directamente un comprobante ya aceptado por SUNAT (para probar anulaciones y notas).
async function crearAceptado({ empresa, cliente, tipo = '01', serie = 'F001', numero = 1, fechaEmision = new Date() }) {
  return prisma.factura.create({
    data: {
      empresaId: empresa.id, clienteId: cliente.id, userId: empresa.userId, tipoComprobante: tipo, serie, numero,
      fechaEmision, estadoSunat: 'ACEPTADO', moneda: 'PEN', subtotal: 100, igv: 18, total: 118, totalGravadas: 100,
      montoEnLetras: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES', formaPago: 'Contado', xmlKey: `sunat/x/${serie}-${numero}.xml`,
      detalles: {
        create: [{
          descripcion: 'Servicio', cantidad: 1, unidadMedida: 'NIU', precioUnitario: 100, subtotal: 100, igv: 18, total: 118,
          valorUnitario: 100, precioUnitarioIgv: 118,
        }],
      },
    },
  });
}

module.exports = { prisma, limpiar, crearEmpresaPeru, crearAceptado };
```

`test/db/esquema.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');

test.before(limpiar);
test.after(() => prisma.$disconnect());

test('dos borradores de la misma serie pueden convivir sin número', async () => {
  const { empresa, cliente } = await crearEmpresaPeru();
  const base = {
    empresaId: empresa.id, clienteId: cliente.id, userId: empresa.userId, serie: 'F001', numero: null,
    fechaEmision: new Date(), estadoSunat: 'BORRADOR', subtotal: 0, igv: 0, total: 0,
  };
  await prisma.factura.create({ data: base });
  await prisma.factura.create({ data: base });
  assert.equal(await prisma.factura.count({ where: { empresaId: empresa.id, numero: null } }), 2);
});

test('las empresas existentes quedan como US', async () => {
  const user = await prisma.userProfile.create({ data: { email: `us-${Date.now()}@test.com` } });
  const empresa = await prisma.empresa.create({ data: { nombre: 'Acme', ruc: `US-${Date.now()}`, userId: user.id } });
  assert.equal(empresa.pais, 'US');
});
```

- [ ] **Paso 8: correr las pruebas de BD**

Correr: `npm run test:db`
Esperado: PASS (2 pruebas).

- [ ] **Paso 9: commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261101000000_sunat_nucleo test/db
git commit -m "feat(sunat): modelo de datos de facturación electrónica y BD de pruebas"
```

**Ojo para producción (no se hace en esta tarea):** antes de desplegar, Opus corre `npx prisma migrate status` contra la BD de producción con el OK de Miguel. Hay migraciones `.sql` sueltas aplicadas a mano, y `migrate deploy` podría no estar alineado.

---

### Tarea 6: Almacén privado en R2

`Riesgo: medio` · `Delicado: no` · `Permitidos: apps/backend/src/sunat/almacen.js, apps/backend/src/utils/storage.js, apps/backend/test/unit/sunat/almacen.test.js, apps/backend/package.json, apps/backend/package-lock.json, apps/backend/.env.example`

**Archivos:**
- Crear: `src/sunat/almacen.js`
- Modificar: `src/utils/storage.js` (exportar `getR2Client`) y `.env.example` (`R2_PRIVATE_BUCKET=`)
- Prueba: `test/unit/sunat/almacen.test.js`

**Interfaces que produce:** `crearAlmacenPrivado({ client?, bucket?, firmar? }) → { guardar(key, cuerpo: Buffer, contentType) → key, leer(key) → Buffer, urlFirmada(key, segundos = 300) → Promise<string> }`.

- [ ] **Paso 1: instalar el presigner**

```bash
npm install @aws-sdk/s3-request-presigner@^3.922.0
```

- [ ] **Paso 2: escribir la prueba que falla**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearAlmacenPrivado } = require('../../../src/sunat/almacen');

function clienteFalso() {
  const objetos = new Map();
  return {
    objetos,
    async send(comando) {
      const { Bucket, Key, Body } = comando.input;
      if (comando.constructor.name === 'PutObjectCommand') { objetos.set(`${Bucket}/${Key}`, Body); return {}; }
      const cuerpo = objetos.get(`${Bucket}/${Key}`);
      return { Body: { transformToByteArray: async () => new Uint8Array(cuerpo) } };
    },
  };
}

test('guarda y lee en el bucket privado', async () => {
  const client = clienteFalso();
  const almacen = crearAlmacenPrivado({ client, bucket: 'privado' });
  await almacen.guardar('sunat/a.xml', Buffer.from('<xml/>'), 'application/xml');
  assert.ok(client.objetos.has('privado/sunat/a.xml'));
  assert.equal((await almacen.leer('sunat/a.xml')).toString(), '<xml/>');
});

test('la URL firmada usa el bucket privado y el tiempo pedido', async () => {
  let recibido;
  const almacen = crearAlmacenPrivado({
    client: clienteFalso(), bucket: 'privado',
    firmar: async (_c, comando, opciones) => { recibido = { ...comando.input, ...opciones }; return 'https://firmada'; },
  });
  assert.equal(await almacen.urlFirmada('sunat/a.xml', 60), 'https://firmada');
  assert.deepEqual(recibido, { Bucket: 'privado', Key: 'sunat/a.xml', expiresIn: 60 });
});

test('sin bucket privado no arranca', () => {
  assert.throws(() => crearAlmacenPrivado({ client: clienteFalso(), bucket: '' }), /R2_PRIVATE_BUCKET/);
});
```

- [ ] **Paso 3: correr y ver que falla**

Correr: `node --test test/unit/sunat/almacen.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 4: implementar**

En `src/utils/storage.js`, agregar `getR2Client` al `module.exports`:

```js
module.exports = {
  getStorageProvider,
  getR2Client,
  uploadFile,
  deleteFile,
  getPublicUrl,
  extractStorageKeyFromUrl,
};
```

`src/sunat/almacen.js`:

```js
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// XML y CDR de SUNAT: bucket R2 PRIVADO (el bucket de fotos y logos es público).
function crearAlmacenPrivado({ client, bucket = process.env.R2_PRIVATE_BUCKET, firmar = getSignedUrl } = {}) {
  if (!bucket) throw new Error('Falta R2_PRIVATE_BUCKET: los XML y CDR de SUNAT van en un bucket privado');
  const cliente = () => client || require('../utils/storage').getR2Client();

  return {
    async guardar(key, cuerpo, contentType) {
      await cliente().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: cuerpo, ContentType: contentType }));
      return key;
    },
    async leer(key) {
      const respuesta = await cliente().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await respuesta.Body.transformToByteArray());
    },
    urlFirmada(key, segundos = 300) {
      return firmar(cliente(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: segundos });
    },
  };
}

module.exports = { crearAlmacenPrivado };
```

Agregar a `.env.example`:

```
# Bucket R2 privado para XML/CDR de SUNAT (sin acceso público)
R2_PRIVATE_BUCKET=
```

- [ ] **Paso 5: correr y ver que pasa**

Correr: `node --test test/unit/sunat/almacen.test.js`
Esperado: PASS (3 pruebas).

- [ ] **Paso 6: commit**

```bash
git add src/sunat/almacen.js src/utils/storage.js test/unit/sunat/almacen.test.js package.json package-lock.json .env.example
git commit -m "feat(sunat): almacén privado R2 con URL firmada"
```

---

### Tarea 7: Borradores (guardar, previsualizar, reconstruir)

`Riesgo: alto` · `Delicado: sí` (dinero) · `Permitidos: apps/backend/src/sunat/emision/borradores.js, apps/backend/test/db/borradores.test.js`

**Archivos:**
- Crear: `src/sunat/emision/borradores.js`
- Prueba: `test/db/borradores.test.js`

**Interfaces:**
- Usa: `calcularComprobante`, `codigoUnidad`, `MOTIVOS_*`, `fechaLima`, `ErrorBorrador`.
- Produce:
  - `comprobanteSchema` (Zod)
  - `INCLUDE_COMPROBANTE` (uso interno: incluye `empresa.emisorSunat`, **nunca** se responde)
  - `INCLUDE_RESPUESTA` (`detalles`, `cliente`, `cuotas`)
  - `entradaCalculo(datos, empresa, cliente, fecha) → entrada de calcularComprobante`
  - `datosDesdeFactura(factura con detalles y cuotas) → datos que valida comprobanteSchema`
  - `previsualizar({ prisma, empresa, datos }) → resultado de calcularComprobante`
  - `guardarBorrador({ prisma, empresa, userId, datos, facturaId? }) → factura con INCLUDE_RESPUESTA`

- [ ] **Paso 1: escribir la prueba que falla**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { guardarBorrador, previsualizar, datosDesdeFactura, INCLUDE_COMPROBANTE } = require('../../src/sunat/emision/borradores');

let ctx;
test.before(async () => { await limpiar(); ctx = await crearEmpresaPeru(); });
test.after(() => prisma.$disconnect());

const datosFactura = (extra = {}) => ({
  tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id,
  lineas: [{ descripcion: 'Servicio', cantidad: 2, precio: 59, precioIncluyeIgv: true }],
  ...extra,
});

test('guarda un borrador con totales calculados y sin número', async () => {
  const f = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  assert.equal(f.estadoSunat, 'BORRADOR');
  assert.equal(f.numero, null);
  assert.equal(f.total.toFixed(2), '118.00');
  assert.equal(f.totalGravadas.toFixed(2), '100.00');
  assert.equal(f.detalles[0].valorUnitario.toFixed(10), '50.0000000000');
  assert.equal(f.detalles[0].codigoUnidadSunat, 'NIU');
  assert.equal(f.montoEnLetras, 'SON: CIENTO DIECIOCHO CON 00/100 SOLES');
  assert.equal(f.empresa, undefined);
});

test('guarda cuotas de una venta al crédito', async () => {
  const f = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({ formaPago: { tipo: 'Credito', cuotas: [{ monto: 118, fechaVencimiento: '2026-12-15' }] } }),
  });
  assert.equal(f.formaPago, 'Credito');
  assert.equal(f.cuotas.length, 1);
  assert.equal(f.netoPendiente.toFixed(2), '118.00');
});

test('editar solo funciona en borrador y reemplaza las líneas', async () => {
  const f = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  const editada = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id,
    datos: datosFactura({ lineas: [{ descripcion: 'Otro', cantidad: 1, precio: 10, precioIncluyeIgv: false }] }),
  });
  assert.equal(editada.detalles.length, 1);
  assert.equal(editada.total.toFixed(2), '11.80');
  await prisma.factura.update({ where: { id: f.id }, data: { estadoSunat: 'ACEPTADO' } });
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id, datos: datosFactura() }),
    /Solo se puede editar un comprobante en borrador/,
  );
});

test('rechaza series no configuradas y notas sin documento aceptado', async () => {
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura({ serie: 'F999' }) }),
    /no está configurada/,
  );
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura({ tipoComprobante: '07', serie: 'FC01' }) }),
    /comprobante que modifica/,
  );
});

test('una nota de crédito copia la referencia del documento aceptado', async () => {
  const aceptada = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 50 });
  const nc = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({ tipoComprobante: '07', serie: 'FC01', documentoAfectado: { facturaId: aceptada.id, motivoCodigo: '01' } }),
  });
  assert.equal(nc.docRelacionadoSerie, 'F001');
  assert.equal(nc.docRelacionadoNumero, 50);
  assert.equal(nc.motivoDescripcion, 'Anulación de la operación');
});

test('percepción exige que el emisor sea agente de percepción', async () => {
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura({ percepcion: { regimen: '51' } }) }),
    /agente de percepción/,
  );
});

test('previsualizar no guarda nada', async () => {
  const antes = await prisma.factura.count();
  const r = await previsualizar({ prisma, empresa: ctx.empresa, datos: datosFactura() });
  assert.equal(r.totales.total, '118.00');
  assert.equal(await prisma.factura.count(), antes);
});

test('datosDesdeFactura reconstruye datos equivalentes', async () => {
  const f = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({ formaPago: { tipo: 'Credito', cuotas: [{ monto: 118, fechaVencimiento: '2026-12-15' }] } }),
  });
  const completa = await prisma.factura.findUnique({ where: { id: f.id }, include: INCLUDE_COMPROBANTE });
  const r = await previsualizar({ prisma, empresa: ctx.empresa, datos: datosDesdeFactura(completa) });
  assert.equal(r.totales.total, '118.00');
  assert.equal(r.cuotas[0].fechaVencimiento, '2026-12-15');
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `node --test test/db/borradores.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar**

```js
const { z } = require('zod');
const { calcularComprobante } = require('../calculo/calcular');
const { codigoUnidad, MOTIVOS_NOTA_CREDITO, MOTIVOS_NOTA_DEBITO } = require('../catalogos');
const { fechaLima } = require('../fechas');
const { ErrorBorrador } = require('../errores');

const ESTADOS_ACEPTADOS = ['ACEPTADO', 'ACEPTADO_CON_OBS'];

// Uso interno: trae los secretos cifrados del emisor. NUNCA se envía en una respuesta HTTP.
const INCLUDE_COMPROBANTE = {
  detalles: { orderBy: { orden: 'asc' } },
  cliente: true,
  cuotas: { orderBy: { numero: 'asc' } },
  empresa: { include: { emisorSunat: true } },
};

const INCLUDE_RESPUESTA = {
  detalles: { orderBy: { orden: 'asc' } },
  cliente: true,
  cuotas: { orderBy: { numero: 'asc' } },
};

const lineaSchema = z.object({
  productoId: z.string().uuid().optional(),
  codigoProducto: z.string().max(30).optional(),
  descripcion: z.string().min(1).max(500),
  cantidad: z.number().positive(),
  unidad: z.string().default('NIU'),
  precio: z.number().min(0),
  precioIncluyeIgv: z.boolean().default(true),
  descuento: z.number().min(0).default(0),
  afectacion: z.enum(['10', '20', '30', '40']).default('10'),
  bolsasIcbper: z.number().int().min(0).default(0),
});

const comprobanteSchema = z.object({
  tipoComprobante: z.enum(['01', '03', '07', '08']),
  serie: z.string().regex(/^[FB][A-Z0-9]{3}$/, 'La serie debe tener 4 caracteres y empezar con F o B'),
  clienteId: z.string().uuid(),
  tipoOperacion: z.enum(['0101', '0200', '1001']).default('0101'),
  moneda: z.enum(['PEN', 'USD', 'EUR']).default('PEN'),
  tipoCambio: z.number().positive().optional(),
  observaciones: z.string().max(1000).optional(),
  fechaVencimiento: z.string().datetime().optional(),
  lineas: z.array(lineaSchema).min(1),
  detraccion: z.object({ codigo: z.string() }).optional(),
  percepcion: z.object({ regimen: z.string() }).optional(),
  formaPago: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('Contado') }),
    z.object({
      tipo: z.literal('Credito'),
      cuotas: z.array(z.object({
        monto: z.number().positive(),
        fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato AAAA-MM-DD'),
      })).min(1),
    }),
  ]).default({ tipo: 'Contado' }),
  documentoAfectado: z.object({
    facturaId: z.string().uuid(),
    motivoCodigo: z.string(),
    motivoDescripcion: z.string().max(250).optional(),
  }).optional(),
});

function entradaCalculo(datos, empresa, cliente, fecha = new Date()) {
  return {
    tipoOperacion: datos.tipoOperacion,
    tasaIgv: Number(empresa.taxRate ?? 18),
    moneda: datos.moneda,
    tipoCambio: datos.tipoCambio,
    fechaEmision: fecha,
    retencion: Boolean(cliente?.esAgenteRetencion),
    lineas: datos.lineas,
    detraccion: datos.detraccion,
    percepcion: datos.percepcion,
    formaPago: datos.formaPago,
  };
}

function datosDesdeFactura(f) {
  const datos = {
    tipoComprobante: f.tipoComprobante,
    serie: f.serie,
    clienteId: f.clienteId,
    tipoOperacion: f.tipoOperacion,
    moneda: f.moneda,
    lineas: f.detalles.map((d) => ({
      ...(d.productoId ? { productoId: d.productoId } : {}),
      ...(d.codigoProductoSunat ? { codigoProducto: d.codigoProductoSunat } : {}),
      descripcion: d.descripcion,
      cantidad: Number(d.cantidad),
      unidad: d.codigoUnidadSunat,
      precio: Number(d.precioUnitario),
      precioIncluyeIgv: d.precioIncluyeIgv,
      descuento: Number(d.descuento),
      afectacion: d.tipoAfectacionIgv,
      bolsasIcbper: d.cantidadBolsasIcbper,
    })),
    formaPago: f.formaPago === 'Credito'
      ? { tipo: 'Credito', cuotas: f.cuotas.map((c) => ({ monto: Number(c.monto), fechaVencimiento: fechaLima(c.fechaVencimiento) })) }
      : { tipo: 'Contado' },
  };
  if (f.tipoCambio) datos.tipoCambio = Number(f.tipoCambio);
  if (f.observaciones) datos.observaciones = f.observaciones;
  if (f.detraccionCodigo) datos.detraccion = { codigo: f.detraccionCodigo };
  if (f.percepcionRegimen) datos.percepcion = { regimen: f.percepcionRegimen };
  if (f.docRelacionadoId) {
    datos.documentoAfectado = {
      facturaId: f.docRelacionadoId,
      motivoCodigo: f.motivoCodigo,
      ...(f.motivoDescripcion ? { motivoDescripcion: f.motivoDescripcion } : {}),
    };
  }
  return datos;
}

async function cargarContexto(prisma, empresa, datos) {
  const cliente = await prisma.cliente.findFirst({ where: { id: datos.clienteId, empresaId: empresa.id } });
  if (!cliente) throw new ErrorBorrador('Cliente no encontrado');
  const emisor = await prisma.emisorSunat.findUnique({ where: { empresaId: empresa.id } });
  if (datos.percepcion && !emisor?.esAgentePercepcion) {
    throw new ErrorBorrador('Solo un agente de percepción puede cobrar percepción');
  }
  return { cliente, emisor };
}

async function previsualizar({ prisma, empresa, datos }) {
  const d = comprobanteSchema.parse(datos);
  const { cliente } = await cargarContexto(prisma, empresa, d);
  return calcularComprobante(entradaCalculo(d, empresa, cliente));
}

function motivoDescripcion(d) {
  if (!d.documentoAfectado) return null;
  const catalogo = d.tipoComprobante === '07' ? MOTIVOS_NOTA_CREDITO : MOTIVOS_NOTA_DEBITO;
  const descripcion = d.documentoAfectado.motivoDescripcion || catalogo[d.documentoAfectado.motivoCodigo];
  if (!descripcion) throw new ErrorBorrador('Motivo de la nota no válido');
  return descripcion;
}

function camposFactura(d, calculo, afectado) {
  const t = calculo.totales;
  return {
    tipoComprobante: d.tipoComprobante,
    serie: d.serie,
    clienteId: d.clienteId,
    tipoOperacion: calculo.tipoOperacion,
    moneda: d.moneda,
    tipoCambio: d.tipoCambio ?? null,
    observaciones: d.observaciones ?? null,
    fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : null,
    formaPago: calculo.formaPago,
    subtotal: t.valorVenta,
    descuento: t.descuento,
    igv: t.igv,
    total: t.total,
    totalGravadas: t.gravadas,
    totalExoneradas: t.exoneradas,
    totalInafectas: t.inafectas,
    totalExportacion: t.exportacion,
    totalIcbper: t.icbper,
    montoEnLetras: calculo.leyendas[0].valor,
    detraccionCodigo: calculo.detraccion?.codigo ?? null,
    detraccionPorcentaje: calculo.detraccion?.porcentaje ?? null,
    detraccionMonto: calculo.detraccion?.monto ?? null,
    percepcionRegimen: calculo.percepcion?.regimen ?? null,
    percepcionPorcentaje: calculo.percepcion?.porcentaje ?? null,
    percepcionBase: calculo.percepcion?.base ?? null,
    percepcionMonto: calculo.percepcion?.monto ?? null,
    retencionPorcentaje: calculo.retencion?.porcentaje ?? null,
    retencionMonto: calculo.retencion?.monto ?? null,
    netoPendiente: calculo.netoPendiente,
    docRelacionadoId: afectado?.id ?? null,
    docRelacionadoTipo: afectado?.tipoComprobante ?? null,
    docRelacionadoSerie: afectado?.serie ?? null,
    docRelacionadoNumero: afectado?.numero ?? null,
    motivoCodigo: d.documentoAfectado?.motivoCodigo ?? null,
    motivoDescripcion: motivoDescripcion(d),
  };
}

function detallesFactura(d, calculo) {
  return calculo.lineas.map((l, i) => ({
    productoId: d.lineas[i].productoId ?? null,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    unidadMedida: l.unidad,
    codigoUnidadSunat: codigoUnidad(l.unidad),
    precioUnitario: l.precio,
    precioIncluyeIgv: l.precioIncluyeIgv,
    valorUnitario: l.valorUnitario,
    precioUnitarioIgv: l.precioUnitario,
    descuento: l.descuento,
    subtotal: l.valorVenta,
    igv: l.igv,
    icbper: l.icbper,
    cantidadBolsasIcbper: l.bolsasIcbper,
    total: l.total,
    tipoAfectacionIgv: l.afectacion,
    codigoProductoSunat: l.codigoProducto,
    orden: i,
  }));
}

function cuotasFactura(calculo) {
  return calculo.cuotas.map((c) => ({
    numero: c.numero,
    monto: c.monto,
    // Mediodía en Lima para que fechaLima() devuelva siempre el mismo día.
    fechaVencimiento: new Date(`${c.fechaVencimiento}T12:00:00-05:00`),
  }));
}

async function guardarBorrador({ prisma, empresa, userId, datos, facturaId = null }) {
  const d = comprobanteSchema.parse(datos);
  const { cliente } = await cargarContexto(prisma, empresa, d);

  const serie = await prisma.configuracionSeries.findFirst({
    where: { empresaId: empresa.id, tipoDocumento: d.tipoComprobante, serie: d.serie, activa: true },
  });
  if (!serie) throw new ErrorBorrador(`La serie ${d.serie} no está configurada para este tipo de comprobante`);

  let afectado = null;
  if (d.documentoAfectado) {
    afectado = await prisma.factura.findFirst({ where: { id: d.documentoAfectado.facturaId, empresaId: empresa.id } });
    if (!afectado || !ESTADOS_ACEPTADOS.includes(afectado.estadoSunat)) {
      throw new ErrorBorrador('El comprobante que modifica la nota debe estar aceptado por SUNAT');
    }
  }
  if (['07', '08'].includes(d.tipoComprobante) && !afectado) {
    throw new ErrorBorrador('Una nota debe indicar el comprobante que modifica');
  }

  const calculo = calcularComprobante(entradaCalculo(d, empresa, cliente));
  const campos = camposFactura(d, calculo, afectado);
  const detalles = detallesFactura(d, calculo);
  const cuotas = cuotasFactura(calculo);

  if (facturaId) {
    const actual = await prisma.factura.findFirst({ where: { id: facturaId, empresaId: empresa.id } });
    if (!actual) throw new ErrorBorrador('Comprobante no encontrado');
    if (actual.estadoSunat !== 'BORRADOR') throw new ErrorBorrador('Solo se puede editar un comprobante en borrador');
    return prisma.$transaction(async (tx) => {
      await tx.detalleFactura.deleteMany({ where: { facturaId } });
      await tx.cuotaFactura.deleteMany({ where: { facturaId } });
      return tx.factura.update({
        where: { id: facturaId },
        data: { ...campos, detalles: { create: detalles }, cuotas: { create: cuotas } },
        include: INCLUDE_RESPUESTA,
      });
    });
  }

  return prisma.factura.create({
    data: {
      ...campos,
      empresaId: empresa.id,
      userId,
      estadoSunat: 'BORRADOR',
      numero: null,
      fechaEmision: new Date(),
      detalles: { create: detalles },
      cuotas: { create: cuotas },
    },
    include: INCLUDE_RESPUESTA,
  });
}

module.exports = {
  comprobanteSchema,
  INCLUDE_COMPROBANTE,
  INCLUDE_RESPUESTA,
  entradaCalculo,
  datosDesdeFactura,
  previsualizar,
  guardarBorrador,
};
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `node --test test/db/borradores.test.js`
Esperado: PASS (8 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/sunat/emision/borradores.js test/db/borradores.test.js
git commit -m "feat(sunat): borradores de comprobantes con cálculo y validación"
```

---

### Tarea 8: Microservicio `sunat-engine` (PHP + Greenter)

`Riesgo: alto` · `Delicado: sí` (certificados y credenciales) · `Permitidos: apps/sunat-engine/**`

**Archivos (todos nuevos):**
- `apps/sunat-engine/composer.json`, `Dockerfile`, `.dockerignore`, `docker/openssl-legacy.cnf`
- `apps/sunat-engine/public/index.php`, `public/.htaccess`
- `apps/sunat-engine/src/ErrorDatos.php`, `Certificado.php`, `Emisor.php`, `Mapper.php`, `Respuesta.php`, `Rutas.php`
- `apps/sunat-engine/tests/smoke.sh` y `tests/fixtures/*.json`

**Contrato HTTP** (todo es `POST`, salvo `GET /salud`; cabecera `X-Engine-Token`; errores de datos → 422 `{error}`; fallas internas → 500 `{error}`):

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `/certificado/inspeccionar` | `{pfxBase64, clave}` | `{ruc, vence, sujeto}` |
| `/comprobantes/firmar` | `{emisor, comprobante}` | `{xmlBase64, hash, nombre}` |
| `/comprobantes/enviar` | `{emisor, tipoDoc, nombre, xmlBase64}` | `{codigo, descripcion, observaciones[], cdrZipBase64, excepcion}` |
| `/comprobantes/cdr` | `{emisor, tipoDoc, serie, correlativo}` | igual que `enviar` |
| `/resumenes/enviar` | `{emisor, resumen}` | `{ticket, xmlBase64, nombre, codigo?, descripcion?}` |
| `/bajas/enviar` | `{emisor, baja}` | igual que `resumenes` |
| `/tickets/consultar` | `{emisor, ticket}` | `{pendiente, codigo, descripcion, cdrZipBase64}` |

`codigo` se normaliza a solo dígitos sin ceros a la izquierda (`'0'`, `'1033'`, `'2800'`), o `null` si no hay código. Las formas de `emisor`, `comprobante`, `resumen` y `baja` son exactamente las que produce `src/sunat/engine/mapper.js` (tarea 9).

- [ ] **Paso 1: crear `composer.json`, Docker y la configuración de OpenSSL**

`apps/sunat-engine/composer.json`:

```json
{
  "name": "invoiceapp/sunat-engine",
  "description": "Motor sin estado que firma y envía comprobantes a SUNAT con Greenter",
  "type": "project",
  "require": {
    "php": ">=8.2",
    "ext-soap": "*",
    "ext-zip": "*",
    "ext-openssl": "*",
    "ext-dom": "*",
    "greenter/lite": "^5.0"
  },
  "autoload": { "psr-4": { "Engine\\": "src/" } },
  "config": { "sort-packages": true }
}
```

`apps/sunat-engine/Dockerfile`:

```dockerfile
FROM php:8.3-apache

RUN apt-get update \
 && apt-get install -y --no-install-recommends libxml2-dev libzip-dev unzip \
 && docker-php-ext-install soap zip \
 && a2enmod rewrite \
 && rm -rf /var/lib/apt/lists/*

# Muchos .pfx peruanos usan RC2/3DES: OpenSSL 3 necesita el proveedor legacy para abrirlos.
COPY docker/openssl-legacy.cnf /etc/ssl/openssl-legacy.cnf
ENV OPENSSL_CONF=/etc/ssl/openssl-legacy.cnf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts
COPY . .

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri -e 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

EXPOSE 80
```

`apps/sunat-engine/.dockerignore`:

```
vendor
tests
```

`apps/sunat-engine/docker/openssl-legacy.cnf`:

```
openssl_conf = openssl_init

[openssl_init]
providers = provider_sect

[provider_sect]
default = default_sect
legacy = legacy_sect

[default_sect]
activate = 1

[legacy_sect]
activate = 1
```

- [ ] **Paso 2: generar `composer.lock` con Docker (no hay PHP local)**

```bash
cd apps/sunat-engine
docker run --rm -v "$PWD":/app -w /app composer:2 install --ignore-platform-req=ext-soap --no-interaction
ls vendor/greenter
```

Esperado: aparecen carpetas de Greenter (`lite`, `core`, `ws`, `xml`, `xmldsig`…). `vendor/` no se commitea: agregar `apps/sunat-engine/vendor/` al `.gitignore` de la raíz.

- [ ] **Paso 3: escribir el código PHP**

`public/.htaccess`:

```
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [QSA,L]
```

`public/index.php`:

```php
<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Engine\ErrorDatos;
use Engine\Rutas;

header('Content-Type: application/json; charset=utf-8');
$ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($ruta === '/salud') {
    echo json_encode(['ok' => true]);
    exit;
}

$token = getenv('ENGINE_TOKEN') ?: '';
$recibido = $_SERVER['HTTP_X_ENGINE_TOKEN'] ?? '';
if ($token === '' || !hash_equals($token, $recibido)) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$cuerpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($cuerpo)) {
    http_response_code(422);
    echo json_encode(['error' => 'JSON inválido']);
    exit;
}

try {
    echo json_encode((new Rutas())->atender($ruta, $cuerpo), JSON_UNESCAPED_UNICODE);
} catch (ErrorDatos $e) {
    http_response_code(422);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    // Nunca se registran el cuerpo ni los secretos: solo el error.
    error_log(get_class($e) . ': ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del motor: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
```

`src/ErrorDatos.php`:

```php
<?php
declare(strict_types=1);

namespace Engine;

// Datos de entrada inválidos: el backend los recibe como 422 (ErrorConstruccion).
final class ErrorDatos extends \RuntimeException
{
}
```

`src/Certificado.php`:

```php
<?php
declare(strict_types=1);

namespace Engine;

final class Certificado
{
    /** @return array{pem: string, ruc: ?string, vence: string, sujeto: string} */
    public static function leer(string $pfxBase64, string $clave): array
    {
        $pfx = base64_decode($pfxBase64, true);
        if ($pfx === false || $pfx === '') {
            throw new ErrorDatos('El certificado no está en base64');
        }
        $certs = [];
        if (!openssl_pkcs12_read($pfx, $certs, $clave)) {
            throw new ErrorDatos('No se pudo abrir el certificado: clave incorrecta o formato no soportado');
        }
        $info = openssl_x509_parse($certs['cert']);
        if ($info === false) {
            throw new ErrorDatos('El certificado no es un X.509 válido');
        }
        $sujeto = json_encode($info['subject'] ?? [], JSON_UNESCAPED_UNICODE) ?: '';
        preg_match('/\b(10|15|17|20)\d{9}\b/', $sujeto, $m);

        return [
            'pem' => $certs['pkey'] . $certs['cert'],
            'ruc' => $m[0] ?? null,
            'vence' => gmdate('c', (int) $info['validTo_time_t']),
            'sujeto' => (string) ($info['name'] ?? ''),
        ];
    }
}
```

`src/Emisor.php`:

```php
<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\See;
use Greenter\Ws\Services\SunatEndpoints;

final class Emisor
{
    public static function see(array $e): See
    {
        foreach (['ruc', 'solUsuario', 'solClave', 'certificadoPfxBase64', 'certificadoClave', 'ambiente'] as $campo) {
            if (!isset($e[$campo]) || $e[$campo] === '') {
                throw new ErrorDatos("Falta emisor.$campo");
            }
        }
        $certificado = Certificado::leer($e['certificadoPfxBase64'], $e['certificadoClave']);

        $see = new See();
        $see->setCertificate($certificado['pem']);
        $see->setService($e['ambiente'] === 'PRODUCCION' ? SunatEndpoints::FE_PRODUCCION : SunatEndpoints::FE_BETA);
        $see->setClaveSOL($e['ruc'], $e['solUsuario'], $e['solClave']);

        return $see;
    }

    public static function compania(array $e): Company
    {
        $d = $e['direccion'] ?? throw new ErrorDatos('Falta emisor.direccion');

        return (new Company())
            ->setRuc($e['ruc'])
            ->setRazonSocial($e['razonSocial'])
            ->setNombreComercial($e['nombreComercial'] ?? $e['razonSocial'])
            ->setAddress((new Address())
                ->setUbigueo($d['ubigeo'])
                ->setDepartamento($d['departamento'])
                ->setProvincia($d['provincia'])
                ->setDistrito($d['distrito'])
                ->setUrbanizacion($d['urbanizacion'] ?? '-')
                ->setDireccion($d['direccion'])
                ->setCodLocal($d['codLocal'] ?? '0000'));
    }
}
```

`src/Mapper.php`:

```php
<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Client\Client;
use Greenter\Model\Sale\Charge;
use Greenter\Model\Sale\Cuota;
use Greenter\Model\Sale\Detraction;
use Greenter\Model\Sale\Document;
use Greenter\Model\Sale\FormaPagos\FormaPagoContado;
use Greenter\Model\Sale\FormaPagos\FormaPagoCredito;
use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Legend;
use Greenter\Model\Sale\Note;
use Greenter\Model\Sale\SaleDetail;
use Greenter\Model\Sale\SalePerception;
use Greenter\Model\Summary\Summary;
use Greenter\Model\Summary\SummaryDetail;
use Greenter\Model\Voided\Voided;
use Greenter\Model\Voided\VoidedDetail;

// JSON del backend (src/sunat/engine/mapper.js) → modelos Greenter.
final class Mapper
{
    public static function documento(array $e, array $c): Invoice|Note
    {
        $esNota = in_array($c['tipoDoc'] ?? '', ['07', '08'], true);
        $doc = $esNota ? new Note() : new Invoice();
        $t = $c['totales'] ?? throw new ErrorDatos('Falta comprobante.totales');

        $doc->setUblVersion('2.1')
            ->setTipoDoc($c['tipoDoc'])
            ->setSerie($c['serie'])
            ->setCorrelativo((string) $c['correlativo'])
            ->setFechaEmision(new \DateTime($c['fechaEmision']))
            ->setTipoMoneda($c['moneda'])
            ->setCompany(Emisor::compania($e))
            ->setClient(self::cliente($c['cliente']))
            ->setMtoOperGravadas((float) $t['gravadas'])
            ->setMtoOperExoneradas((float) $t['exoneradas'])
            ->setMtoOperInafectas((float) $t['inafectas'])
            ->setMtoOperExportacion((float) $t['exportacion'])
            ->setMtoIGV((float) $t['igv'])
            ->setIcbper((float) $t['icbper'])
            ->setTotalImpuestos((float) $t['totalImpuestos'])
            ->setValorVenta((float) $t['valorVenta'])
            ->setSubTotal((float) $t['subTotal'])
            ->setMtoImpVenta((float) $t['total'])
            ->setDetails(array_map([self::class, 'linea'], $c['lineas']))
            ->setLegends(array_map(
                fn (array $l) => (new Legend())->setCode($l['codigo'])->setValue($l['valor']),
                $c['leyendas']
            ));

        if ($doc instanceof Note) {
            $a = $c['documentoAfectado'] ?? throw new ErrorDatos('Una nota requiere documentoAfectado');
            $doc->setTipDocAfectado($a['tipoDoc'])
                ->setNumDocfectado($a['numero'])
                ->setCodMotivo($a['motivoCodigo'])
                ->setDesMotivo($a['motivoDescripcion']);
            return $doc;
        }

        $doc->setTipoOperacion($c['tipoOperacion']);
        self::formaPago($doc, $c['formaPago'] ?? ['tipo' => 'Contado'], $c['moneda']);

        if (!empty($c['detraccion'])) {
            $d = $c['detraccion'];
            $doc->setDetraccion((new Detraction())
                ->setCodBienDetraccion($d['codigo'])
                ->setCodMedioPago($d['medioPago'] ?? '001')
                ->setCtaBanco($d['cuentaBanco'])
                ->setPercent((float) $d['porcentaje'])
                ->setMount((float) $d['monto']));
        }
        if (!empty($c['percepcion'])) {
            $p = $c['percepcion'];
            $doc->setPerception((new SalePerception())
                ->setCodReg($p['regimen'])
                ->setPorcentaje((float) $p['porcentaje'] / 100)
                ->setMtoBase((float) $p['base'])
                ->setMto((float) $p['monto'])
                ->setMtoTotal((float) $p['total']));
        }
        if (!empty($c['retencion'])) {
            $r = $c['retencion'];
            $doc->setDescuentos([(new Charge())
                ->setCodTipo('62')
                ->setMontoBase((float) $r['base'])
                ->setFactor((float) $r['porcentaje'] / 100)
                ->setMonto((float) $r['monto'])]);
        }

        return $doc;
    }

    public static function resumen(array $e, array $r): Summary
    {
        return (new Summary())
            ->setFecGeneracion(new \DateTime($r['fecGeneracion']))
            ->setFecResumen(new \DateTime($r['fecResumen']))
            ->setCorrelativo((string) $r['correlativo'])
            ->setMoneda($r['moneda'] ?? 'PEN')
            ->setCompany(Emisor::compania($e))
            ->setDetails(array_map(function (array $d): SummaryDetail {
                $detalle = (new SummaryDetail())
                    ->setTipoDoc($d['tipoDoc'])
                    ->setSerieNro($d['serieNro'])
                    ->setEstado($d['estado'])
                    ->setClienteTipo($d['clienteTipo'])
                    ->setClienteNro($d['clienteNro'])
                    ->setTotal((float) $d['total'])
                    ->setMtoOperGravadas((float) $d['gravadas'])
                    ->setMtoOperExoneradas((float) $d['exoneradas'])
                    ->setMtoOperInafectas((float) $d['inafectas'])
                    ->setMtoOperExportacion((float) $d['exportacion'])
                    ->setMtoIGV((float) $d['igv']);
                if (!empty($d['docReferencia'])) {
                    $detalle->setDocReferencia((new Document())
                        ->setTipoDoc($d['docReferencia']['tipoDoc'])
                        ->setNroDoc($d['docReferencia']['numero']));
                }
                return $detalle;
            }, $r['detalles']));
    }

    public static function baja(array $e, array $b): Voided
    {
        return (new Voided())
            ->setCorrelativo((string) $b['correlativo'])
            ->setFecGeneracion(new \DateTime($b['fecGeneracion']))
            ->setFecComunicacion(new \DateTime($b['fecComunicacion']))
            ->setCompany(Emisor::compania($e))
            ->setDetails(array_map(
                fn (array $d) => (new VoidedDetail())
                    ->setTipoDoc($d['tipoDoc'])
                    ->setSerie($d['serie'])
                    ->setCorrelativo((string) $d['correlativo'])
                    ->setDesMotivoBaja($d['motivo']),
                $b['detalles']
            ));
    }

    private static function linea(array $l): SaleDetail
    {
        $d = (new SaleDetail())
            ->setCodProducto($l['codigo'] ?? null)
            ->setUnidad($l['unidad'])
            ->setCantidad((float) $l['cantidad'])
            ->setDescripcion($l['descripcion'])
            ->setMtoValorUnitario((float) $l['valorUnitario'])
            ->setMtoBaseIgv((float) $l['baseIgv'])
            ->setPorcentajeIgv((float) $l['porcentajeIgv'])
            ->setIgv((float) $l['igv'])
            ->setTipAfeIgv($l['afectacion'])
            ->setTotalImpuestos((float) $l['totalImpuestos'])
            ->setMtoValorVenta((float) $l['valorVenta'])
            ->setMtoPrecioUnitario((float) $l['precioUnitario']);

        if ((int) ($l['bolsas'] ?? 0) > 0) {
            $d->setFactorIcbper((float) $l['factorIcbper'])->setIcbper((float) $l['icbper']);
        }
        if ((float) ($l['descuento'] ?? 0) > 0) {
            $d->setDescuentos([(new Charge())
                ->setCodTipo('00')
                ->setMontoBase((float) $l['valorBruto'])
                ->setFactor(round((float) $l['descuento'] / (float) $l['valorBruto'], 5))
                ->setMonto((float) $l['descuento'])]);
        }

        return $d;
    }

    private static function formaPago(Invoice $doc, array $f, string $moneda): void
    {
        if (($f['tipo'] ?? 'Contado') !== 'Credito') {
            $doc->setFormaPago(new FormaPagoContado());
            return;
        }
        $doc->setFormaPago(new FormaPagoCredito((float) $f['monto'], $moneda));
        $doc->setCuotas(array_map(
            fn (array $q) => (new Cuota())->setMonto((float) $q['monto'])->setFechaPago(new \DateTime($q['fechaPago'])),
            $f['cuotas']
        ));
    }

    private static function cliente(array $c): Client
    {
        return (new Client())
            ->setTipoDoc($c['tipoDoc'])
            ->setNumDoc($c['numDoc'])
            ->setRznSocial($c['razonSocial']);
    }
}
```

`src/Respuesta.php`:

```php
<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Response\BaseResult;
use Greenter\Model\Response\StatusResult;

final class Respuesta
{
    // "soap-env:Client.1033" → "1033"; "0100" → "100"; "0" → "0"
    public static function codigo(?string $codigo): ?string
    {
        if ($codigo === null || $codigo === '') {
            return null;
        }
        return preg_match('/\d+/', $codigo, $m) ? (string) (int) $m[0] : null;
    }

    public static function deEnvio(BaseResult $r): array
    {
        if (!$r->isSuccess() || !method_exists($r, 'getCdrResponse') || $r->getCdrResponse() === null) {
            $error = $r->getError();
            return [
                'codigo' => self::codigo($error?->getCode()),
                'descripcion' => $error?->getMessage() ?? 'SUNAT no devolvió CDR',
                'observaciones' => [],
                'cdrZipBase64' => null,
                'excepcion' => true,
            ];
        }
        $cdr = $r->getCdrResponse();
        return [
            'codigo' => self::codigo((string) $cdr->getCode()),
            'descripcion' => $cdr->getDescription(),
            'observaciones' => $cdr->getNotes() ?? [],
            'cdrZipBase64' => $r->getCdrZip() ? base64_encode($r->getCdrZip()) : null,
            'excepcion' => false,
        ];
    }

    public static function deTicket(StatusResult $r): array
    {
        if ((string) $r->getCode() === '98') {
            return ['pendiente' => true, 'codigo' => '98', 'descripcion' => 'En proceso', 'cdrZipBase64' => null];
        }
        if (!$r->isSuccess()) {
            $error = $r->getError();
            $codigo = self::codigo($error?->getCode());
            return ['pendiente' => $codigo === '98', 'codigo' => $codigo, 'descripcion' => $error?->getMessage(), 'cdrZipBase64' => null];
        }
        $cdr = $r->getCdrResponse();
        return [
            'pendiente' => false,
            'codigo' => self::codigo((string) ($cdr?->getCode() ?? $r->getCode())),
            'descripcion' => $cdr?->getDescription(),
            'cdrZipBase64' => $r->getCdrZip() ? base64_encode($r->getCdrZip()) : null,
        ];
    }
}
```

`src/Rutas.php`:

```php
<?php
declare(strict_types=1);

namespace Engine;

use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Note;
use Greenter\Ws\Services\ConsultCdrService;
use Greenter\Ws\Services\SoapClient;

final class Rutas
{
    private const CONSULTA_CDR = 'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService?wsdl';

    public function atender(string $ruta, array $b): array
    {
        return match ($ruta) {
            '/certificado/inspeccionar' => $this->inspeccionar($b),
            '/comprobantes/firmar' => $this->firmar($b),
            '/comprobantes/enviar' => $this->enviar($b),
            '/comprobantes/cdr' => $this->cdr($b),
            '/resumenes/enviar' => $this->conTicket($b, 'resumen'),
            '/bajas/enviar' => $this->conTicket($b, 'baja'),
            '/tickets/consultar' => $this->ticket($b),
            default => throw new ErrorDatos("Ruta desconocida: $ruta"),
        };
    }

    private function inspeccionar(array $b): array
    {
        $c = Certificado::leer((string) ($b['pfxBase64'] ?? ''), (string) ($b['clave'] ?? ''));
        return ['ruc' => $c['ruc'], 'vence' => $c['vence'], 'sujeto' => $c['sujeto']];
    }

    private function firmar(array $b): array
    {
        $emisor = $b['emisor'] ?? throw new ErrorDatos('Falta emisor');
        $see = Emisor::see($emisor);
        $doc = Mapper::documento($emisor, $b['comprobante'] ?? throw new ErrorDatos('Falta comprobante'));
        $xml = $see->getXmlSigned($doc);
        return ['xmlBase64' => base64_encode($xml), 'hash' => self::hash($xml), 'nombre' => $doc->getName()];
    }

    private function enviar(array $b): array
    {
        $see = Emisor::see($b['emisor'] ?? throw new ErrorDatos('Falta emisor'));
        $xml = base64_decode((string) ($b['xmlBase64'] ?? ''), true);
        if ($xml === false || $xml === '') {
            throw new ErrorDatos('xmlBase64 inválido');
        }
        $clase = in_array($b['tipoDoc'] ?? '', ['07', '08'], true) ? Note::class : Invoice::class;
        return Respuesta::deEnvio($see->sendXml($clase, (string) $b['nombre'], $xml));
    }

    private function cdr(array $b): array
    {
        $e = $b['emisor'] ?? throw new ErrorDatos('Falta emisor');
        if (($e['ambiente'] ?? 'BETA') !== 'PRODUCCION') {
            return ['codigo' => null, 'descripcion' => 'La consulta de CDR no existe en beta', 'observaciones' => [], 'cdrZipBase64' => null, 'excepcion' => true];
        }
        $ws = new SoapClient(self::CONSULTA_CDR);
        $ws->setCredentials($e['ruc'] . $e['solUsuario'], $e['solClave']);
        $servicio = new ConsultCdrService();
        $servicio->setClient($ws);
        return Respuesta::deEnvio($servicio->getStatusCdr($e['ruc'], $b['tipoDoc'], $b['serie'], (int) $b['correlativo']));
    }

    private function conTicket(array $b, string $tipo): array
    {
        $emisor = $b['emisor'] ?? throw new ErrorDatos('Falta emisor');
        $see = Emisor::see($emisor);
        $doc = $tipo === 'resumen'
            ? Mapper::resumen($emisor, $b['resumen'] ?? throw new ErrorDatos('Falta resumen'))
            : Mapper::baja($emisor, $b['baja'] ?? throw new ErrorDatos('Falta baja'));
        $r = $see->send($doc);
        $xml = $see->getFactory()->getLastXml();
        if (!$r->isSuccess()) {
            return [
                'ticket' => null,
                'codigo' => Respuesta::codigo($r->getError()?->getCode()),
                'descripcion' => $r->getError()?->getMessage(),
                'xmlBase64' => $xml ? base64_encode($xml) : null,
                'nombre' => $doc->getName(),
            ];
        }
        return ['ticket' => $r->getTicket(), 'xmlBase64' => base64_encode($xml), 'nombre' => $doc->getName()];
    }

    private function ticket(array $b): array
    {
        $see = Emisor::see($b['emisor'] ?? throw new ErrorDatos('Falta emisor'));
        return Respuesta::deTicket($see->getStatus((string) ($b['ticket'] ?? throw new ErrorDatos('Falta ticket'))));
    }

    private static function hash(string $xml): string
    {
        $dom = new \DOMDocument();
        $dom->loadXML($xml);
        $xpath = new \DOMXPath($dom);
        $xpath->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        $nodo = $xpath->query('//ds:DigestValue')->item(0);
        if ($nodo === null) {
            throw new \RuntimeException('El XML firmado no tiene DigestValue');
        }
        return trim($nodo->nodeValue);
    }
}
```

- [ ] **Paso 4: escribir los fixtures**

Cada fixture usa `__PFX__` (el certificado en base64) y `__HOY__` (fecha de hoy, `AAAA-MM-DD`). `smoke.sh` los reemplaza.

`tests/fixtures/emisor.json`:

```json
{
  "ruc": "20000000001", "razonSocial": "EMPRESA BETA SAC", "nombreComercial": "EMPRESA BETA",
  "direccion": { "ubigeo": "150101", "departamento": "LIMA", "provincia": "LIMA", "distrito": "LIMA", "urbanizacion": "-", "direccion": "AV. PRUEBA 123", "codLocal": "0000" },
  "ambiente": "BETA", "solUsuario": "MODDATOS", "solClave": "moddatos",
  "certificadoPfxBase64": "__PFX__", "certificadoClave": "clave123"
}
```

`tests/fixtures/factura.json` (contado, gravado, 2 × 50):

```json
{
  "tipoDoc": "01", "serie": "F001", "correlativo": "1", "fechaEmision": "__HOY__T10:00:00-05:00",
  "tipoOperacion": "0101", "moneda": "PEN",
  "cliente": { "tipoDoc": "6", "numDoc": "20131312955", "razonSocial": "SUNAT", "direccion": null },
  "totales": { "gravadas": "100.00", "exoneradas": "0.00", "inafectas": "0.00", "exportacion": "0.00", "igv": "18.00", "icbper": "0.00", "totalImpuestos": "18.00", "valorVenta": "100.00", "subTotal": "118.00", "total": "118.00" },
  "lineas": [{ "codigo": "P001", "unidad": "NIU", "cantidad": "2", "descripcion": "Servicio de prueba", "valorUnitario": "50.0000000000", "precioUnitario": "59.0000000000", "valorBruto": "100.00", "descuento": "0.00", "valorVenta": "100.00", "baseIgv": "100.00", "porcentajeIgv": "18", "igv": "18.00", "afectacion": "10", "totalImpuestos": "18.00", "icbper": "0.00", "bolsas": 0, "factorIcbper": "0.00" }],
  "leyendas": [{ "codigo": "1000", "valor": "SON: CIENTO DIECIOCHO CON 00/100 SOLES" }],
  "formaPago": { "tipo": "Contado" }, "detraccion": null, "percepcion": null, "retencion": null, "documentoAfectado": null
}
```

`tests/fixtures/factura-credito-detraccion.json` (1 × 1000, operación 1001, crédito por el neto de 1038):

```json
{
  "tipoDoc": "01", "serie": "F001", "correlativo": "2", "fechaEmision": "__HOY__T10:00:00-05:00",
  "tipoOperacion": "1001", "moneda": "PEN",
  "cliente": { "tipoDoc": "6", "numDoc": "20131312955", "razonSocial": "SUNAT", "direccion": null },
  "totales": { "gravadas": "1000.00", "exoneradas": "0.00", "inafectas": "0.00", "exportacion": "0.00", "igv": "180.00", "icbper": "0.00", "totalImpuestos": "180.00", "valorVenta": "1000.00", "subTotal": "1180.00", "total": "1180.00" },
  "lineas": [{ "codigo": null, "unidad": "ZZ", "cantidad": "1", "descripcion": "Servicio sujeto a detracción", "valorUnitario": "1000.0000000000", "precioUnitario": "1180.0000000000", "valorBruto": "1000.00", "descuento": "0.00", "valorVenta": "1000.00", "baseIgv": "1000.00", "porcentajeIgv": "18", "igv": "180.00", "afectacion": "10", "totalImpuestos": "180.00", "icbper": "0.00", "bolsas": 0, "factorIcbper": "0.00" }],
  "leyendas": [{ "codigo": "1000", "valor": "SON: MIL CIENTO OCHENTA CON 00/100 SOLES" }, { "codigo": "2006", "valor": "Operación sujeta al Sistema de Pago de Obligaciones Tributarias" }],
  "formaPago": { "tipo": "Credito", "monto": "1038.00", "cuotas": [{ "monto": "1038.00", "fechaPago": "2030-12-31" }] },
  "detraccion": { "codigo": "037", "porcentaje": "12", "monto": "142.00", "cuentaBanco": "00-000-000001", "medioPago": "001" },
  "percepcion": null, "retencion": null, "documentoAfectado": null
}
```

`tests/fixtures/nota-credito.json`: copia de `factura.json` con estos cambios: `"tipoDoc": "07"`, `"serie": "FC01"`, `"formaPago": null` y `"documentoAfectado": { "tipoDoc": "01", "numero": "F001-1", "motivoCodigo": "01", "motivoDescripcion": "Anulación de la operación" }`.

`tests/fixtures/baja.json`:

```json
{ "correlativo": "1", "fecGeneracion": "__HOY__", "fecComunicacion": "__HOY__", "detalles": [{ "tipoDoc": "01", "serie": "F001", "correlativo": "1", "motivo": "Error en la emisión" }] }
```

- [ ] **Paso 5: escribir `tests/smoke.sh`**

```bash
#!/usr/bin/env bash
# Prueba de contrato del motor. Con BETA=1 también envía a SUNAT beta (usuario MODDATOS).
set -euo pipefail
cd "$(dirname "$0")/.."

TMP=$(mktemp -d)
HOY=$(TZ=America/Lima date +%Y-%m-%d)
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TMP/key.pem" -out "$TMP/cert.pem" -days 365 \
  -subj "/CN=EMPRESA BETA SAC/serialNumber=20000000001" 2>/dev/null
openssl pkcs12 -export -inkey "$TMP/key.pem" -in "$TMP/cert.pem" -out "$TMP/cert.pfx" -passout pass:clave123
PFX=$(base64 < "$TMP/cert.pfx" | tr -d '\n')

docker build -q -t sunat-engine:test . >/dev/null
docker rm -f sunat-engine-test >/dev/null 2>&1 || true
docker run -d --name sunat-engine-test -e ENGINE_TOKEN=prueba -p 8089:80 sunat-engine:test >/dev/null
trap 'docker rm -f sunat-engine-test >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 30); do curl -sf localhost:8089/salud >/dev/null && break; sleep 1; done

relleno() { sed -e "s|__PFX__|$PFX|g" -e "s|__HOY__|$HOY|g" "tests/fixtures/$1"; }
cuerpo() { printf '{"emisor":%s,"%s":%s}' "$(relleno emisor.json)" "$1" "$(relleno "$2")"; }
llamar() { curl -s -X POST "localhost:8089$1" -H 'content-type: application/json' -H 'x-engine-token: prueba' --data-binary @-; }
falla() { echo "FALLA: $1"; echo "$2"; exit 1; }

R=$(printf '{"pfxBase64":"%s","clave":"clave123"}' "$PFX" | llamar /certificado/inspeccionar)
echo "$R" | grep -q '"ruc":"20000000001"' || falla "inspeccionar" "$R"

R=$(curl -s -X POST localhost:8089/comprobantes/firmar -H 'x-engine-token: malo' -d '{}')
echo "$R" | grep -q 'No autorizado' || falla "token" "$R"

for f in factura.json factura-credito-detraccion.json nota-credito.json; do
  R=$(cuerpo comprobante "$f" | llamar /comprobantes/firmar)
  echo "$R" | grep -q '"hash":"[^"]' || falla "firmar $f" "$R"
done
echo "OK: contrato del motor (inspeccionar, token, firmar factura/crédito+detracción/nota)"

if [ "${BETA:-0}" = "1" ]; then
  FIRMA=$(cuerpo comprobante factura.json | llamar /comprobantes/firmar)
  XML=$(echo "$FIRMA" | sed -E 's/.*"xmlBase64":"([^"]+)".*/\1/' | sed 's|\\/|/|g')
  NOMBRE=$(echo "$FIRMA" | sed -E 's/.*"nombre":"([^"]+)".*/\1/')
  R=$(printf '{"emisor":%s,"tipoDoc":"01","nombre":"%s","xmlBase64":"%s"}' "$(relleno emisor.json)" "$NOMBRE" "$XML" | llamar /comprobantes/enviar)
  echo "SUNAT beta (factura): $R" | cut -c1-300
  echo "$R" | grep -qE '"codigo":"(0|4[0-9]{3})"' || falla "envío beta" "$R"
  R=$(cuerpo baja baja.json | llamar /bajas/enviar)
  echo "$R" | grep -q '"ticket":"[^"]' || falla "baja beta" "$R"
  echo "OK: SUNAT beta aceptó la factura y entregó ticket de baja"
fi
```

- [ ] **Paso 6: correr la prueba de contrato**

Correr: `chmod +x tests/smoke.sh && ./tests/smoke.sh`
Esperado: `OK: contrato del motor …`.

Si sale `Call to undefined method …` (un setter de Greenter con otro nombre en la versión instalada), buscar el nombre correcto con `grep -rn "public function set" vendor/greenter/core/src/Core/Model/<Clase>.php`, ajustar `Mapper.php` y volver a correr. Esa es justamente la verificación de este paso.

- [ ] **Paso 7: correr contra SUNAT beta**

Correr: `BETA=1 ./tests/smoke.sh`
Esperado: `OK: SUNAT beta aceptó la factura y entregó ticket de baja`.

Si beta rechaza el certificado autofirmado, usar el certificado de pruebas que publica Greenter (convertido a `.pfx` con `openssl pkcs12 -export`) y anotarlo en el HANDOFF.

- [ ] **Paso 8: commit**

```bash
cd ../..
echo "apps/sunat-engine/vendor/" >> .gitignore
git add .gitignore apps/sunat-engine
git commit -m "feat(sunat-engine): microservicio PHP con Greenter para firmar y enviar a SUNAT"
```

---

### Tarea 9: Cliente del engine y mapper

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/backend/src/sunat/engine/**, apps/backend/test/unit/sunat/engine*.test.js, apps/backend/.env.example`

**Archivos:**
- Crear: `src/sunat/engine/cliente.js`, `src/sunat/engine/mapper.js`
- Modificar: `.env.example` (`SUNAT_ENGINE_URL=`, `SUNAT_ENGINE_TOKEN=`)
- Pruebas: `test/unit/sunat/engineCliente.test.js`, `test/unit/sunat/engineMapper.test.js`

**Interfaces que produce:**
- `crearClienteEngine({ url?, token?, fetchImpl?, timeoutMs? }) → { inspeccionarCertificado(pfxBase64, clave), firmar(emisor, comprobante), enviar(emisor, { tipoDoc, nombre, xmlBase64 }), consultarCdr(emisor, { tipoDoc, serie, correlativo }), enviarResumen(emisor, resumen), enviarBaja(emisor, baja), consultarTicket(emisor, ticket) }`. Lanza `ErrorEngineNoDisponible` (red, 5xx, 401) o `ErrorConstruccion` (422).
- `armarEmisor(empresa, emisorSunat, descifrar) → emisor`; `armarComprobante(factura, { tasaIgv, cuentaDetracciones }) → comprobante`; `armarBaja({ correlativo, fechaGeneracion, fechaReferencia, items: [{ factura, motivo }] })`; `armarResumen({ … mismo … })`; `nombreBase(empresa, factura) → 'RUC-TT-SERIE-NUMERO'`.

- [ ] **Paso 1: escribir las pruebas que fallan**

`test/unit/sunat/engineCliente.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearClienteEngine } = require('../../../src/sunat/engine/cliente');
const { ErrorEngineNoDisponible, ErrorConstruccion } = require('../../../src/sunat/errores');

const respuesta = (status, cuerpo) => async () => ({ status, ok: status < 400, json: async () => cuerpo });

test('envía token y cuerpo JSON', async () => {
  let llamada;
  const engine = crearClienteEngine({
    url: 'http://engine', token: 't0k',
    fetchImpl: async (url, opciones) => { llamada = { url, ...opciones }; return { status: 200, ok: true, json: async () => ({ hash: 'h' }) }; },
  });
  assert.deepEqual(await engine.firmar({ ruc: '1' }, { serie: 'F001' }), { hash: 'h' });
  assert.equal(llamada.url, 'http://engine/comprobantes/firmar');
  assert.equal(llamada.headers['x-engine-token'], 't0k');
  assert.deepEqual(JSON.parse(llamada.body), { emisor: { ruc: '1' }, comprobante: { serie: 'F001' } });
});

test('422 es ErrorConstruccion; 500 y red son ErrorEngineNoDisponible', async () => {
  await assert.rejects(crearClienteEngine({ url: 'x', token: 't', fetchImpl: respuesta(422, { error: 'Falta emisor.ruc' }) }).firmar({}, {}), ErrorConstruccion);
  await assert.rejects(crearClienteEngine({ url: 'x', token: 't', fetchImpl: respuesta(500, {}) }).firmar({}, {}), ErrorEngineNoDisponible);
  await assert.rejects(crearClienteEngine({ url: 'x', token: 't', fetchImpl: async () => { throw new Error('ECONNREFUSED'); } }).firmar({}, {}), ErrorEngineNoDisponible);
});
```

`test/unit/sunat/engineMapper.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { armarComprobante, armarEmisor, armarBaja, armarResumen, nombreBase } = require('../../../src/sunat/engine/mapper');

const empresa = { ruc: '20000000001', razonSocial: 'EMPRESA BETA SAC', nombre: 'Beta', nombreComercial: null, taxRate: 18 };
const factura = (extra = {}) => ({
  tipoComprobante: '01', serie: 'F001', numero: 7, fechaEmision: new Date('2026-11-01T15:00:00Z'), tipoOperacion: '0101',
  moneda: 'PEN', formaPago: 'Contado', subtotal: '100.00', igv: '18.00', total: '118.00', totalGravadas: '100.00',
  totalExoneradas: '0', totalInafectas: '0', totalExportacion: '0', totalIcbper: '0', netoPendiente: '118.00',
  montoEnLetras: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES', cuotas: [],
  cliente: { tipoDocumento: 'RUC', numeroDocumento: '20131312955', razonSocial: 'SUNAT', direccion: null },
  detalles: [{ orden: 0, descripcion: 'Servicio', cantidad: '2', codigoUnidadSunat: 'NIU', valorUnitario: '50', precioUnitarioIgv: '59',
    descuento: '0', subtotal: '100', igv: '18', icbper: '0', cantidadBolsasIcbper: 0, tipoAfectacionIgv: '10', codigoProductoSunat: null }],
  ...extra,
});

test('armarComprobante produce el contrato del engine', () => {
  const c = armarComprobante(factura(), { tasaIgv: 18, cuentaDetracciones: null });
  assert.equal(c.correlativo, '7');
  assert.equal(c.fechaEmision, '2026-11-01T10:00:00-05:00');
  assert.deepEqual(c.cliente, { tipoDoc: '6', numDoc: '20131312955', razonSocial: 'SUNAT', direccion: null });
  assert.equal(c.totales.totalImpuestos, '18.00');
  assert.equal(c.lineas[0].valorUnitario, '50.0000000000');
  assert.equal(c.lineas[0].porcentajeIgv, '18');
  assert.equal(c.lineas[0].valorBruto, '100.00');
  assert.deepEqual(c.formaPago, { tipo: 'Contado' });
  assert.equal(c.documentoAfectado, null);
});

test('crédito, detracción, retención y nota', () => {
  const credito = armarComprobante(factura({
    formaPago: 'Credito', netoPendiente: '1038.00', detraccionCodigo: '037', detraccionPorcentaje: '12', detraccionMonto: '142',
    cuotas: [{ monto: '1038', fechaVencimiento: new Date('2026-12-15T17:00:00Z') }],
  }), { tasaIgv: 18, cuentaDetracciones: '00-000-000001' });
  assert.deepEqual(credito.formaPago, { tipo: 'Credito', monto: '1038.00', cuotas: [{ monto: '1038.00', fechaPago: '2026-12-15' }] });
  assert.deepEqual(credito.detraccion, { codigo: '037', porcentaje: '12', monto: '142.00', cuentaBanco: '00-000-000001', medioPago: '001' });
  assert.equal(credito.leyendas[1].codigo, '2006');

  const nota = armarComprobante(factura({ tipoComprobante: '07', serie: 'FC01', docRelacionadoTipo: '01', docRelacionadoSerie: 'F001',
    docRelacionadoNumero: 3, motivoCodigo: '01', motivoDescripcion: 'Anulación de la operación' }), { tasaIgv: 18 });
  assert.deepEqual(nota.documentoAfectado, { tipoDoc: '01', numero: 'F001-3', motivoCodigo: '01', motivoDescripcion: 'Anulación de la operación' });
  assert.equal(nota.formaPago, null);
});

test('armarEmisor descifra los secretos', () => {
  const descifrar = (t) => Buffer.from(t.replace('cifrado:', ''));
  const e = armarEmisor(empresa, {
    ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', urbanizacion: null, direccionFiscal: 'AV 1',
    codigoEstablecimiento: '0000', ambiente: 'BETA', solUsuario: 'MODDATOS', solClaveCifrada: 'cifrado:moddatos',
    certificadoCifrado: 'cifrado:PFX', certificadoClaveCifrada: 'cifrado:clave',
  }, descifrar);
  assert.equal(e.solClave, 'moddatos');
  assert.equal(e.certificadoPfxBase64, Buffer.from('PFX').toString('base64'));
  assert.equal(e.direccion.urbanizacion, '-');
  assert.equal(e.nombreComercial, 'Beta');
});

test('baja y resumen', () => {
  const datos = { correlativo: 2, fechaGeneracion: '2026-11-03', fechaReferencia: '2026-11-01', items: [{ factura: factura(), motivo: 'Error' }] };
  assert.deepEqual(armarBaja(datos), {
    correlativo: '2', fecGeneracion: '2026-11-01', fecComunicacion: '2026-11-03',
    detalles: [{ tipoDoc: '01', serie: 'F001', correlativo: '7', motivo: 'Error' }],
  });
  const resumen = armarResumen({ ...datos, items: [{ factura: factura({ tipoComprobante: '03', serie: 'B001' }) }] });
  assert.equal(resumen.fecResumen, '2026-11-03');
  assert.equal(resumen.detalles[0].serieNro, 'B001-7');
  assert.equal(resumen.detalles[0].estado, '3');
  assert.equal(nombreBase(empresa, factura()), '20000000001-01-F001-7');
});
```

- [ ] **Paso 2: correr y ver que fallan**

Correr: `node --test test/unit/sunat/engineCliente.test.js test/unit/sunat/engineMapper.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar**

`src/sunat/engine/cliente.js`:

```js
const { ErrorEngineNoDisponible, ErrorConstruccion } = require('../errores');

// Cliente HTTP del microservicio apps/sunat-engine (contrato en la tarea 8 del plan).
function crearClienteEngine({
  url = process.env.SUNAT_ENGINE_URL,
  token = process.env.SUNAT_ENGINE_TOKEN,
  fetchImpl = globalThis.fetch,
  timeoutMs = 60000,
} = {}) {
  async function llamar(ruta, cuerpo) {
    let respuesta;
    try {
      respuesta = await fetchImpl(`${url}${ruta}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-engine-token': token },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new ErrorEngineNoDisponible(`No se pudo contactar al motor SUNAT: ${error.message}`);
    }
    const json = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 422) throw new ErrorConstruccion(json.error || 'Datos inválidos para el motor SUNAT', json.detalle);
    if (!respuesta.ok) throw new ErrorEngineNoDisponible(json.error || `El motor SUNAT respondió ${respuesta.status}`);
    return json;
  }

  return {
    inspeccionarCertificado: (pfxBase64, clave) => llamar('/certificado/inspeccionar', { pfxBase64, clave }),
    firmar: (emisor, comprobante) => llamar('/comprobantes/firmar', { emisor, comprobante }),
    enviar: (emisor, { tipoDoc, nombre, xmlBase64 }) => llamar('/comprobantes/enviar', { emisor, tipoDoc, nombre, xmlBase64 }),
    consultarCdr: (emisor, { tipoDoc, serie, correlativo }) => llamar('/comprobantes/cdr', { emisor, tipoDoc, serie, correlativo }),
    enviarResumen: (emisor, resumen) => llamar('/resumenes/enviar', { emisor, resumen }),
    enviarBaja: (emisor, baja) => llamar('/bajas/enviar', { emisor, baja }),
    consultarTicket: (emisor, ticket) => llamar('/tickets/consultar', { emisor, ticket }),
  };
}

module.exports = { crearClienteEngine };
```

`src/sunat/engine/mapper.js`:

```js
const { aDecimal, dos } = require('../numeros');
const { isoLima, fechaLima } = require('../fechas');
const { codigoDocIdentidad, LEYENDAS, TEXTO_LEYENDA_DETRACCION } = require('../catalogos');

// Factura (Prisma) → JSON que entiende apps/sunat-engine. Usa los montos guardados: no recalcula.

function armarEmisor(empresa, emisor, descifrar) {
  return {
    ruc: empresa.ruc,
    razonSocial: empresa.razonSocial || empresa.nombre,
    nombreComercial: empresa.nombreComercial || empresa.nombre,
    direccion: {
      ubigeo: emisor.ubigeo,
      departamento: emisor.departamento,
      provincia: emisor.provincia,
      distrito: emisor.distrito,
      urbanizacion: emisor.urbanizacion || '-',
      direccion: emisor.direccionFiscal,
      codLocal: emisor.codigoEstablecimiento,
    },
    ambiente: emisor.ambiente,
    solUsuario: emisor.solUsuario,
    solClave: descifrar(emisor.solClaveCifrada).toString('utf8'),
    certificadoPfxBase64: descifrar(emisor.certificadoCifrado).toString('base64'),
    certificadoClave: descifrar(emisor.certificadoClaveCifrada).toString('utf8'),
  };
}

function armarLinea(d, tasaIgv) {
  const igv = aDecimal(d.igv);
  const icbper = aDecimal(d.icbper);
  const descuento = aDecimal(d.descuento);
  const valorVenta = aDecimal(d.subtotal);
  return {
    codigo: d.codigoProductoSunat || null,
    unidad: d.codigoUnidadSunat,
    cantidad: aDecimal(d.cantidad).toString(),
    descripcion: d.descripcion,
    valorUnitario: aDecimal(d.valorUnitario).toFixed(10),
    precioUnitario: aDecimal(d.precioUnitarioIgv).toFixed(10),
    valorBruto: dos(valorVenta.plus(descuento)),
    descuento: dos(descuento),
    valorVenta: dos(valorVenta),
    baseIgv: dos(valorVenta),
    porcentajeIgv: d.tipoAfectacionIgv === '10' ? aDecimal(tasaIgv).toString() : '0',
    igv: dos(igv),
    afectacion: d.tipoAfectacionIgv,
    totalImpuestos: dos(igv.plus(icbper)),
    icbper: dos(icbper),
    bolsas: d.cantidadBolsasIcbper,
    factorIcbper: d.cantidadBolsasIcbper > 0 ? icbper.div(d.cantidadBolsasIcbper).toFixed(2) : '0.00',
  };
}

function armarComprobante(f, { tasaIgv, cuentaDetracciones = null }) {
  const igv = aDecimal(f.igv);
  const icbper = aDecimal(f.totalIcbper);
  const total = aDecimal(f.total);
  const comprobante = {
    tipoDoc: f.tipoComprobante,
    serie: f.serie,
    correlativo: String(f.numero),
    fechaEmision: isoLima(f.fechaEmision),
    tipoOperacion: f.tipoOperacion,
    moneda: f.moneda,
    cliente: {
      tipoDoc: codigoDocIdentidad(f.cliente.tipoDocumento),
      numDoc: f.cliente.numeroDocumento || '-',
      razonSocial: f.cliente.razonSocial,
      direccion: f.cliente.direccion || null,
    },
    totales: {
      gravadas: dos(f.totalGravadas),
      exoneradas: dos(f.totalExoneradas),
      inafectas: dos(f.totalInafectas),
      exportacion: dos(f.totalExportacion),
      igv: dos(igv),
      icbper: dos(icbper),
      totalImpuestos: dos(igv.plus(icbper)),
      valorVenta: dos(f.subtotal),
      subTotal: dos(total),
      total: dos(total),
    },
    lineas: [...f.detalles].sort((a, b) => a.orden - b.orden).map((d) => armarLinea(d, tasaIgv)),
    leyendas: [{ codigo: LEYENDAS.MONTO_EN_LETRAS, valor: f.montoEnLetras }],
    formaPago: null,
    detraccion: null,
    percepcion: null,
    retencion: null,
    documentoAfectado: null,
  };

  if (f.tipoComprobante === '07' || f.tipoComprobante === '08') {
    comprobante.documentoAfectado = {
      tipoDoc: f.docRelacionadoTipo,
      numero: `${f.docRelacionadoSerie}-${f.docRelacionadoNumero}`,
      motivoCodigo: f.motivoCodigo,
      motivoDescripcion: f.motivoDescripcion,
    };
    return comprobante;
  }

  comprobante.formaPago = f.formaPago === 'Credito'
    ? {
      tipo: 'Credito',
      monto: dos(f.netoPendiente),
      cuotas: f.cuotas.map((c) => ({ monto: dos(c.monto), fechaPago: fechaLima(c.fechaVencimiento) })),
    }
    : { tipo: 'Contado' };

  if (f.detraccionCodigo) {
    comprobante.detraccion = {
      codigo: f.detraccionCodigo,
      porcentaje: aDecimal(f.detraccionPorcentaje).toString(),
      monto: dos(f.detraccionMonto),
      cuentaBanco: cuentaDetracciones,
      medioPago: '001',
    };
    comprobante.leyendas.push({ codigo: LEYENDAS.DETRACCION, valor: TEXTO_LEYENDA_DETRACCION });
  }
  if (f.percepcionRegimen) {
    comprobante.percepcion = {
      regimen: f.percepcionRegimen,
      porcentaje: aDecimal(f.percepcionPorcentaje).toString(),
      base: dos(f.percepcionBase),
      monto: dos(f.percepcionMonto),
      total: dos(total.plus(aDecimal(f.percepcionMonto))),
    };
  }
  if (f.retencionMonto) {
    comprobante.retencion = {
      porcentaje: aDecimal(f.retencionPorcentaje).toString(),
      base: dos(total),
      monto: dos(f.retencionMonto),
    };
  }
  return comprobante;
}

function armarBaja({ correlativo, fechaGeneracion, fechaReferencia, items }) {
  return {
    correlativo: String(correlativo),
    fecGeneracion: fechaReferencia,
    fecComunicacion: fechaGeneracion,
    detalles: items.map(({ factura, motivo }) => ({
      tipoDoc: factura.tipoComprobante, serie: factura.serie, correlativo: String(factura.numero), motivo,
    })),
  };
}

function armarResumen({ correlativo, fechaGeneracion, fechaReferencia, items }) {
  return {
    correlativo: String(correlativo),
    fecGeneracion: fechaReferencia,
    fecResumen: fechaGeneracion,
    moneda: items[0].factura.moneda,
    detalles: items.map(({ factura: f }) => ({
      tipoDoc: f.tipoComprobante,
      serieNro: `${f.serie}-${f.numero}`,
      estado: '3', // 3 = anulado
      clienteTipo: codigoDocIdentidad(f.cliente.tipoDocumento),
      clienteNro: f.cliente.numeroDocumento || '-',
      total: dos(f.total),
      gravadas: dos(f.totalGravadas),
      exoneradas: dos(f.totalExoneradas),
      inafectas: dos(f.totalInafectas),
      exportacion: dos(f.totalExportacion),
      igv: dos(f.igv),
      icbper: dos(f.totalIcbper),
      docReferencia: f.docRelacionadoSerie
        ? { tipoDoc: f.docRelacionadoTipo, numero: `${f.docRelacionadoSerie}-${f.docRelacionadoNumero}` }
        : null,
    })),
  };
}

function nombreBase(empresa, f) {
  return `${empresa.ruc}-${f.tipoComprobante}-${f.serie}-${f.numero}`;
}

module.exports = { armarEmisor, armarComprobante, armarBaja, armarResumen, nombreBase };
```

Agregar a `.env.example`:

```
# Motor SUNAT (apps/sunat-engine), solo en red interna
SUNAT_ENGINE_URL=
SUNAT_ENGINE_TOKEN=
```

- [ ] **Paso 4: correr y ver que pasan**

Correr: `npm test`
Esperado: PASS (todas las unitarias).

- [ ] **Paso 5: commit**

```bash
git add src/sunat/engine test/unit/sunat/engineCliente.test.js test/unit/sunat/engineMapper.test.js .env.example
git commit -m "feat(sunat): cliente HTTP del motor y mapeo de comprobantes"
```

---

### Tarea 10: Estados, plazos y validación previa

`Riesgo: medio` · `Delicado: no` · `Permitidos: apps/backend/src/sunat/emision/estados.js, apps/backend/src/sunat/emision/plazos.js, apps/backend/src/sunat/emision/validacion.js, apps/backend/test/unit/sunat/estados.test.js, apps/backend/test/unit/sunat/validacion.test.js`

**Interfaces que produce:**
- `ESTADO` = `{ BORRADOR, PENDIENTE_ENVIO, ERROR_TEMPORAL, ACEPTADO, ACEPTADO_CON_OBS, RECHAZADO, ANULACION_PENDIENTE, ANULADO }`, con valores iguales a las claves.
- `clasificarRespuesta({ codigo, observaciones }) → ESTADO.* | 'CONSULTAR_CDR'`.
- `siguienteReintento(intentos) → segundos`.
- `dentroDePlazoEnvio(fechaEmision, ahora) → boolean`; `dentroDePlazoBaja(fechaEmision, ahora) → boolean`.
- `validarParaEmision(factura con cliente, detalles y cuotas, emisor, ahora) → string[]`.

- [ ] **Paso 1: escribir las pruebas que fallan**

`test/unit/sunat/estados.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { ESTADO, clasificarRespuesta, siguienteReintento } = require('../../../src/sunat/emision/estados');
const { dentroDePlazoEnvio, dentroDePlazoBaja } = require('../../../src/sunat/emision/plazos');

test('clasifica por rango de código SUNAT', () => {
  assert.equal(clasificarRespuesta({ codigo: '0', observaciones: [] }), ESTADO.ACEPTADO);
  assert.equal(clasificarRespuesta({ codigo: '0', observaciones: ['4252 - obs'] }), ESTADO.ACEPTADO_CON_OBS);
  assert.equal(clasificarRespuesta({ codigo: '4252' }), ESTADO.ACEPTADO_CON_OBS);
  assert.equal(clasificarRespuesta({ codigo: '2800' }), ESTADO.RECHAZADO);
  assert.equal(clasificarRespuesta({ codigo: '3999' }), ESTADO.RECHAZADO);
  assert.equal(clasificarRespuesta({ codigo: '1033' }), 'CONSULTAR_CDR');
  assert.equal(clasificarRespuesta({ codigo: '100' }), ESTADO.ERROR_TEMPORAL);
  assert.equal(clasificarRespuesta({ codigo: null }), ESTADO.ERROR_TEMPORAL);
});

test('reintentos: 1, 5, 15, 60 min y luego cada hora', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(siguienteReintento), [60, 300, 900, 3600, 3600, 3600]);
});

test('plazos de envío (3 días) y de baja (7 días) en hora de Lima', () => {
  const emision = new Date('2026-11-01T15:00:00Z');
  assert.equal(dentroDePlazoEnvio(emision, new Date('2026-11-04T20:00:00Z')), true);
  assert.equal(dentroDePlazoEnvio(emision, new Date('2026-11-05T15:00:00Z')), false);
  assert.equal(dentroDePlazoBaja(emision, new Date('2026-11-08T15:00:00Z')), true);
  assert.equal(dentroDePlazoBaja(emision, new Date('2026-11-09T15:00:00Z')), false);
});
```

`test/unit/sunat/validacion.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarParaEmision } = require('../../../src/sunat/emision/validacion');

const AHORA = new Date('2026-11-01T15:00:00Z');
const emisor = (extra = {}) => ({ solUsuario: 'MODDATOS', solClaveCifrada: 'x', certificadoCifrado: 'x', certificadoVence: new Date('2030-01-01'), cuentaDetracciones: '00-1', ...extra });
const factura = (extra = {}) => ({
  tipoComprobante: '01', serie: 'F001', tipoOperacion: '0101', total: '118.00', formaPago: 'Contado', cuotas: [],
  detalles: [{}], cliente: { tipoDocumento: '6', numeroDocumento: '20131312955' }, ...extra,
});

test('una factura correcta no tiene errores', () => {
  assert.deepEqual(validarParaEmision(factura(), emisor(), AHORA), []);
});

test('emisor sin configurar o con certificado vencido', () => {
  assert.match(validarParaEmision(factura(), null, AHORA)[0], /Configura los datos del emisor/);
  assert.match(validarParaEmision(factura(), emisor({ certificadoVence: new Date('2026-01-01') }), AHORA).join(), /vencido/);
  assert.match(validarParaEmision(factura(), emisor({ solUsuario: null }), AHORA).join(), /clave SOL/);
});

test('factura exige RUC válido y serie F', () => {
  assert.match(validarParaEmision(factura({ cliente: { tipoDocumento: '1', numeroDocumento: '12345678' } }), emisor(), AHORA).join(), /requiere que el cliente tenga RUC/);
  assert.match(validarParaEmision(factura({ cliente: { tipoDocumento: '6', numeroDocumento: '123' } }), emisor(), AHORA).join(), /RUC del cliente no es válido/);
  assert.match(validarParaEmision(factura({ serie: 'B001' }), emisor(), AHORA).join(), /empezar con F/);
});

test('exportación permite cliente sin documento peruano', () => {
  assert.deepEqual(validarParaEmision(factura({ tipoOperacion: '0200', cliente: { tipoDocumento: '0', numeroDocumento: 'US-123' } }), emisor(), AHORA), []);
});

test('boleta mayor al umbral exige identificar al cliente', () => {
  const boleta = (extra) => factura({ tipoComprobante: '03', serie: 'B001', cliente: { tipoDocumento: '0', numeroDocumento: null }, ...extra });
  assert.deepEqual(validarParaEmision(boleta({ total: '100.00' }), emisor(), AHORA), []);
  assert.match(validarParaEmision(boleta({ total: '800.00' }), emisor(), AHORA).join(), /mayor a S\/ 700/);
});

test('notas, crédito y detracción', () => {
  assert.match(validarParaEmision(factura({ tipoComprobante: '07', serie: 'FC01' }), emisor(), AHORA).join(), /comprobante que modifica/);
  assert.match(validarParaEmision(factura({ tipoComprobante: '07', serie: 'BC01', docRelacionadoId: 'x', docRelacionadoSerie: 'F001', motivoCodigo: '01' }), emisor(), AHORA).join(), /misma letra/);
  assert.match(validarParaEmision(factura({ formaPago: 'Credito' }), emisor(), AHORA).join(), /cuotas/);
  assert.match(validarParaEmision(factura({ tipoOperacion: '1001' }), emisor({ cuentaDetracciones: null }), AHORA).join(), /cuenta de detracciones/);
});
```

- [ ] **Paso 2: correr y ver que fallan**

Correr: `node --test test/unit/sunat/estados.test.js test/unit/sunat/validacion.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar**

`src/sunat/emision/estados.js`:

```js
const ESTADO = Object.freeze({
  BORRADOR: 'BORRADOR',
  PENDIENTE_ENVIO: 'PENDIENTE_ENVIO',
  ERROR_TEMPORAL: 'ERROR_TEMPORAL',
  ACEPTADO: 'ACEPTADO',
  ACEPTADO_CON_OBS: 'ACEPTADO_CON_OBS',
  RECHAZADO: 'RECHAZADO',
  ANULACION_PENDIENTE: 'ANULACION_PENDIENTE',
  ANULADO: 'ANULADO',
});

// Rangos SUNAT: 0100-1999 excepción (reintentar), 2000-3999 rechazo, 4000+ observaciones.
function clasificarRespuesta({ codigo, observaciones = [] }) {
  if (codigo === null || codigo === undefined || codigo === '') return ESTADO.ERROR_TEMPORAL;
  const n = Number(codigo);
  if (n === 0) return observaciones.length ? ESTADO.ACEPTADO_CON_OBS : ESTADO.ACEPTADO;
  if (n === 1033) return 'CONSULTAR_CDR'; // ya registrado: se consulta el CDR en vez de reenviar
  if (n >= 100 && n <= 1999) return ESTADO.ERROR_TEMPORAL;
  if (n >= 2000 && n <= 3999) return ESTADO.RECHAZADO;
  if (n >= 4000) return ESTADO.ACEPTADO_CON_OBS;
  return ESTADO.ERROR_TEMPORAL;
}

const ESPERAS_SEGUNDOS = [60, 300, 900, 3600];

function siguienteReintento(intentos) {
  return ESPERAS_SEGUNDOS[Math.min(intentos, ESPERAS_SEGUNDOS.length) - 1];
}

module.exports = { ESTADO, clasificarRespuesta, siguienteReintento };
```

`src/sunat/emision/plazos.js`:

```js
const { parametro } = require('../catalogos/parametros');
const { fechaLima, diasCalendario } = require('../fechas');

function diasDesdeEmision(fechaEmision, ahora) {
  return diasCalendario(fechaLima(fechaEmision), fechaLima(ahora));
}

function dentroDePlazoEnvio(fechaEmision, ahora = new Date()) {
  return diasDesdeEmision(fechaEmision, ahora) <= Number(parametro('PLAZO_ENVIO_DIAS', ahora));
}

function dentroDePlazoBaja(fechaEmision, ahora = new Date()) {
  return diasDesdeEmision(fechaEmision, ahora) <= Number(parametro('PLAZO_BAJA_DIAS', ahora));
}

module.exports = { dentroDePlazoEnvio, dentroDePlazoBaja, diasDesdeEmision };
```

`src/sunat/emision/validacion.js`:

```js
const { codigoDocIdentidad, TIPO_OPERACION } = require('../catalogos');
const { parametro } = require('../catalogos/parametros');
const { aDecimal } = require('../numeros');

// Reglas previas a pedir la firma. Mensajes para el usuario, no códigos de SUNAT.
function validarParaEmision(f, emisor, ahora = new Date()) {
  if (!emisor) return ['Configura los datos del emisor SUNAT antes de emitir'];
  const errores = [];

  if (!emisor.solUsuario || !emisor.solClaveCifrada) errores.push('Falta el usuario o la clave SOL del emisor');
  if (!emisor.certificadoCifrado) errores.push('Falta el certificado digital del emisor');
  else if (!emisor.certificadoVence || new Date(emisor.certificadoVence) <= ahora) errores.push('El certificado digital está vencido');

  const tipoDoc = codigoDocIdentidad(f.cliente?.tipoDocumento);
  const numero = f.cliente?.numeroDocumento || '';
  const prefijo = f.serie[0];
  const esExportacion = f.tipoOperacion === TIPO_OPERACION.EXPORTACION;

  if (tipoDoc === '6' && !/^(10|15|17|20)\d{9}$/.test(numero)) errores.push('El RUC del cliente no es válido');
  if (tipoDoc === '1' && !/^\d{8}$/.test(numero)) errores.push('El DNI del cliente debe tener 8 dígitos');

  if (f.tipoComprobante === '01') {
    if (tipoDoc !== '6' && !esExportacion) errores.push('Una factura requiere que el cliente tenga RUC');
    if (prefijo !== 'F') errores.push('La serie de una factura debe empezar con F');
  }

  if (f.tipoComprobante === '03') {
    if (prefijo !== 'B') errores.push('La serie de una boleta debe empezar con B');
    const umbral = parametro('BOLETA_UMBRAL_IDENTIFICACION', ahora);
    if (aDecimal(f.total).gt(umbral) && (tipoDoc === '0' || !numero)) {
      errores.push(`Una boleta mayor a S/ ${umbral} debe identificar al cliente con DNI, RUC u otro documento`);
    }
  }

  if (f.tipoComprobante === '07' || f.tipoComprobante === '08') {
    if (!f.docRelacionadoId) errores.push('La nota debe indicar el comprobante que modifica');
    else if (prefijo !== f.docRelacionadoSerie?.[0]) {
      errores.push('La serie de la nota debe empezar con la misma letra que el comprobante que modifica');
    }
    if (!f.motivoCodigo) errores.push('Indica el motivo de la nota');
  }

  if (f.formaPago === 'Credito' && !f.cuotas?.length) errores.push('Una venta al crédito debe tener cuotas');
  if (!f.detalles?.length) errores.push('El comprobante no tiene líneas');
  if (f.tipoOperacion === TIPO_OPERACION.DETRACCION && !emisor.cuentaDetracciones) {
    errores.push('Configura la cuenta de detracciones del Banco de la Nación');
  }

  return errores;
}

module.exports = { validarParaEmision };
```

- [ ] **Paso 4: correr y ver que pasan**

Correr: `npm test`
Esperado: PASS.

- [ ] **Paso 5: commit**

```bash
git add src/sunat/emision/estados.js src/sunat/emision/plazos.js src/sunat/emision/validacion.js test/unit/sunat/estados.test.js test/unit/sunat/validacion.test.js
git commit -m "feat(sunat): estados, plazos y validación previa a la emisión"
```

---

### Tarea 11: Servicio de emisión

`Riesgo: alto` · `Delicado: sí` (correlativos y dinero) · `Permitidos: apps/backend/src/sunat/emision/servicio.js, apps/backend/test/db/servicio.test.js, apps/backend/test/db/falsos.js`

**Interfaces:**
- Usa: `INCLUDE_COMPROBANTE`, `entradaCalculo`, `datosDesdeFactura`, `calcularComprobante`, `validarParaEmision`, `armarEmisor`, `armarComprobante`, `nombreBase`, `clasificarRespuesta`, `ESTADO`, las clases de error.
- Produce:
  - `crearServicioEmision({ prisma, engine, almacen, descifrar, cola, ahora? }) → { emitir(facturaId, empresaId) → factura, procesarEnvio(facturaId) → { estado, intentos, fechaEmision } | { omitido: true, estado } }`
  - `claveArchivo(empresa, factura, numero, extension) → 'sunat/<empresaId>/<ruc>-<tipo>-<serie>-<numero>.<extension>'`
- `test/db/falsos.js`: `engineFalso(respuestas?)`, `almacenFalso()`, `colaFalsa()`.

- [ ] **Paso 1: escribir los falsos y la prueba que falla**

`test/db/falsos.js`:

```js
// Dobles de prueba para el engine, el almacén y la cola.
function engineFalso({ envio = { codigo: '0', descripcion: 'Aceptada', observaciones: [], cdrZipBase64: Buffer.from('cdr').toString('base64') }, ...otros } = {}) {
  const llamadas = [];
  const registrar = (nombre, valor) => async (...args) => {
    llamadas.push({ nombre, args });
    const v = typeof valor === 'function' ? valor(...args) : valor;
    if (v instanceof Error) throw v;
    return v;
  };
  return {
    llamadas,
    firmar: registrar('firmar', otros.firma ?? ((_e, c) => ({ xmlBase64: Buffer.from(`<xml>${c.serie}-${c.correlativo}</xml>`).toString('base64'), hash: 'HASH=', nombre: 'n' }))),
    enviar: registrar('enviar', envio),
    consultarCdr: registrar('consultarCdr', otros.cdr ?? { codigo: '0', descripcion: 'Aceptada', observaciones: [], cdrZipBase64: null }),
    enviarBaja: registrar('enviarBaja', otros.baja ?? { ticket: 'T-RA', xmlBase64: Buffer.from('<ra/>').toString('base64'), nombre: 'ra' }),
    enviarResumen: registrar('enviarResumen', otros.resumen ?? { ticket: 'T-RC', xmlBase64: Buffer.from('<rc/>').toString('base64'), nombre: 'rc' }),
    consultarTicket: registrar('consultarTicket', otros.ticket ?? { pendiente: false, codigo: '0', descripcion: 'OK', cdrZipBase64: Buffer.from('cdr').toString('base64') }),
    inspeccionarCertificado: registrar('inspeccionarCertificado', otros.certificado ?? { ruc: '20000000001', vence: '2030-01-01T00:00:00Z' }),
  };
}

function almacenFalso() {
  const archivos = new Map();
  return {
    archivos,
    async guardar(key, cuerpo) { archivos.set(key, cuerpo); return key; },
    async leer(key) { if (!archivos.has(key)) throw new Error(`No existe ${key}`); return archivos.get(key); },
    async urlFirmada(key) { return `https://firmada/${key}`; },
  };
}

function colaFalsa() {
  const trabajos = [];
  return {
    trabajos,
    async encolarEnvio(facturaId, segundos = 0) { trabajos.push({ tipo: 'envio', facturaId, segundos }); },
    async encolarTicket(procesoId, segundos = 30) { trabajos.push({ tipo: 'ticket', procesoId, segundos }); },
  };
}

module.exports = { engineFalso, almacenFalso, colaFalsa };
```

`test/db/servicio.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const { engineFalso, almacenFalso, colaFalsa } = require('./falsos');
const { guardarBorrador } = require('../../src/sunat/emision/borradores');
const { crearServicioEmision } = require('../../src/sunat/emision/servicio');
const { descifrar } = require('../../src/sunat/seguridad/cifrado');
const { ErrorConstruccion, ErrorEngineNoDisponible, ErrorValidacion } = require('../../src/sunat/errores');

let ctx;
test.beforeEach(async () => { await limpiar(); ctx = await crearEmpresaPeru(); });
test.after(() => prisma.$disconnect());

const borrador = (extra = {}) => guardarBorrador({
  prisma, empresa: ctx.empresa, userId: ctx.user.id,
  datos: { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 118 }], ...extra },
});
const servicio = (engine = engineFalso(), almacen = almacenFalso(), cola = colaFalsa()) =>
  ({ engine, almacen, cola, s: crearServicioEmision({ prisma, engine, almacen, descifrar, cola }) });

test('emitir asigna correlativo, guarda el XML firmado y encola', async () => {
  const { s, almacen, cola } = servicio();
  const b = await borrador();
  const f = await s.emitir(b.id, ctx.empresa.id);
  assert.equal(f.numero, 1);
  assert.equal(f.estadoSunat, 'PENDIENTE_ENVIO');
  assert.equal(f.hashSunat, 'HASH=');
  assert.equal(f.xmlKey, `sunat/${ctx.empresa.id}/20000000001-01-F001-1.xml`);
  assert.equal(almacen.archivos.get(f.xmlKey).toString(), '<xml>F001-1</xml>');
  assert.deepEqual(cola.trabajos, [{ tipo: 'envio', facturaId: b.id, segundos: 0 }]);
});

test('emisiones concurrentes no repiten número', async () => {
  const { s } = servicio();
  const [a, b] = await Promise.all([borrador(), borrador()]);
  const emitidas = await Promise.all([s.emitir(a.id, ctx.empresa.id), s.emitir(b.id, ctx.empresa.id)]);
  assert.deepEqual(emitidas.map((f) => f.numero).sort(), [1, 2]);
});

test('si la firma falla, el borrador queda intacto y el número no se consume', async () => {
  const { s } = servicio(engineFalso({ firma: new ErrorConstruccion('Falta emisor.ruc') }));
  const b = await borrador();
  await assert.rejects(s.emitir(b.id, ctx.empresa.id), ErrorConstruccion);
  const f = await prisma.factura.findUnique({ where: { id: b.id } });
  assert.equal(f.estadoSunat, 'BORRADOR');
  assert.equal(f.numero, null);
  const serie = await prisma.configuracionSeries.findFirst({ where: { empresaId: ctx.empresa.id, serie: 'F001' } });
  assert.equal(serie.ultimoNumero, 0);
});

test('la validación previa bloquea una factura a cliente con DNI', async () => {
  const { s } = servicio();
  const b = await borrador({ clienteId: ctx.clienteDni.id });
  await assert.rejects(s.emitir(b.id, ctx.empresa.id), (e) => e instanceof ErrorValidacion && /RUC/.test(e.message));
});

test('procesarEnvio: aceptado guarda CDR y bitácora', async () => {
  const { s, almacen } = servicio();
  const b = await borrador();
  await s.emitir(b.id, ctx.empresa.id);
  const r = await s.procesarEnvio(b.id);
  assert.equal(r.estado, 'ACEPTADO');
  const f = await prisma.factura.findUnique({ where: { id: b.id } });
  assert.equal(f.codigoRespuestaSunat, '0');
  assert.equal(f.enviadoSunat, true);
  assert.equal(almacen.archivos.get(f.cdrKey).toString(), 'cdr');
  assert.equal(await prisma.envioSunat.count({ where: { facturaId: b.id } }), 1);
});

test('procesarEnvio: rechazo, error temporal y 1033', async () => {
  const casos = [
    [engineFalso({ envio: { codigo: '2800', descripcion: 'Rechazo', observaciones: [], cdrZipBase64: null } }), 'RECHAZADO'],
    [engineFalso({ envio: new ErrorEngineNoDisponible('caído') }), 'ERROR_TEMPORAL'],
    [engineFalso({ envio: { codigo: '1033', descripcion: 'Ya registrado', observaciones: [], cdrZipBase64: null } }), 'ACEPTADO'],
  ];
  for (const [engine, esperado] of casos) {
    const { s } = servicio(engine);
    const b = await borrador();
    await s.emitir(b.id, ctx.empresa.id);
    const r = await s.procesarEnvio(b.id);
    assert.equal(r.estado, esperado, `esperaba ${esperado}`);
    assert.equal(r.intentos, 1);
  }
});

test('procesarEnvio ignora comprobantes ya resueltos', async () => {
  const { s } = servicio();
  const b = await borrador();
  assert.deepEqual(await s.procesarEnvio(b.id), { omitido: true, estado: 'BORRADOR' });
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `node --test test/db/servicio.test.js`
Esperado: FAIL con `Cannot find module '../../src/sunat/emision/servicio'`.

- [ ] **Paso 3: implementar `src/sunat/emision/servicio.js`**

```js
const { calcularComprobante } = require('../calculo/calcular');
const { INCLUDE_COMPROBANTE, entradaCalculo, datosDesdeFactura } = require('./borradores');
const { validarParaEmision } = require('./validacion');
const { ESTADO, clasificarRespuesta } = require('./estados');
const { armarEmisor, armarComprobante, nombreBase } = require('../engine/mapper');
const { dos } = require('../numeros');
const {
  ErrorEstado, ErrorValidacion, ErrorEngineNoDisponible, ErrorConstruccion,
} = require('../errores');

const ACEPTADOS = [ESTADO.ACEPTADO, ESTADO.ACEPTADO_CON_OBS];

function claveArchivo(empresa, f, numero, extension) {
  return `sunat/${empresa.id}/${nombreBase(empresa, { ...f, numero })}.${extension}`;
}

function crearServicioEmision({ prisma, engine, almacen, descifrar, cola, ahora = () => new Date() }) {
  async function emitir(facturaId, empresaId) {
    const id = await prisma.$transaction(async (tx) => {
      const f = await tx.factura.findFirst({ where: { id: facturaId, empresaId }, include: INCLUDE_COMPROBANTE });
      if (!f) throw new ErrorEstado('Comprobante no encontrado');
      if (f.estadoSunat !== ESTADO.BORRADOR) throw new ErrorEstado('Solo se puede emitir un comprobante en borrador');

      const emisor = f.empresa.emisorSunat;
      const fecha = ahora();
      const errores = validarParaEmision(f, emisor, fecha);
      if (errores.length) throw new ErrorValidacion(errores);

      // Los parámetros (p. ej. tarifa ICBPER) pudieron cambiar desde que se guardó el borrador.
      const recalculo = calcularComprobante(entradaCalculo(datosDesdeFactura(f), f.empresa, f.cliente, fecha));
      if (recalculo.totales.total !== dos(f.total)) {
        throw new ErrorValidacion(['Los montos cambiaron con los parámetros vigentes: vuelve a guardar el borrador antes de emitir']);
      }

      const filas = await tx.$queryRaw`
        SELECT id, ultimo_numero FROM configuracion_series
        WHERE empresa_id = ${empresaId} AND tipo_documento = ${f.tipoComprobante} AND serie = ${f.serie} AND activa = true
        FOR UPDATE`;
      if (filas.length === 0) throw new ErrorValidacion([`La serie ${f.serie} no está configurada`]);
      const numero = Number(filas[0].ultimo_numero) + 1;
      await tx.configuracionSeries.update({ where: { id: filas[0].id }, data: { ultimoNumero: numero } });

      const comprobante = armarComprobante(
        { ...f, numero, fechaEmision: fecha },
        { tasaIgv: f.empresa.taxRate, cuentaDetracciones: emisor.cuentaDetracciones },
      );
      // Si el motor falla aquí, la transacción se revierte y el número no se consume.
      const firma = await engine.firmar(armarEmisor(f.empresa, emisor, descifrar), comprobante);
      const xmlKey = claveArchivo(f.empresa, f, numero, 'xml');
      await almacen.guardar(xmlKey, Buffer.from(firma.xmlBase64, 'base64'), 'application/xml');

      await tx.factura.update({
        where: { id: f.id },
        data: { numero, fechaEmision: fecha, estadoSunat: ESTADO.PENDIENTE_ENVIO, hashSunat: firma.hash, xmlKey },
      });
      return f.id;
    }, { timeout: 30000 });

    await cola.encolarEnvio(id);
    return prisma.factura.findUnique({ where: { id } });
  }

  async function llamarRegistrando(facturaId, operacion, llamada) {
    const inicio = Date.now();
    let respuesta;
    try {
      respuesta = await llamada();
    } catch (error) {
      if (!(error instanceof ErrorEngineNoDisponible || error instanceof ErrorConstruccion)) throw error;
      respuesta = { codigo: null, descripcion: error.message, observaciones: [], cdrZipBase64: null, excepcion: true };
    }
    const estado = clasificarRespuesta(respuesta);
    await prisma.envioSunat.create({
      data: {
        facturaId,
        operacion,
        codigo: respuesta.codigo ?? null,
        mensaje: respuesta.descripcion ?? null,
        exito: ACEPTADOS.includes(estado),
        duracionMs: Date.now() - inicio,
      },
    });
    return { respuesta, estado };
  }

  async function procesarEnvio(facturaId) {
    const f = await prisma.factura.findUnique({ where: { id: facturaId }, include: INCLUDE_COMPROBANTE });
    if (!f || ![ESTADO.PENDIENTE_ENVIO, ESTADO.ERROR_TEMPORAL].includes(f.estadoSunat)) {
      return { omitido: true, estado: f?.estadoSunat ?? null };
    }

    const emisor = armarEmisor(f.empresa, f.empresa.emisorSunat, descifrar);
    const xml = await almacen.leer(f.xmlKey);
    let { respuesta, estado } = await llamarRegistrando(f.id, 'sendBill', () => engine.enviar(emisor, {
      tipoDoc: f.tipoComprobante, nombre: nombreBase(f.empresa, f), xmlBase64: xml.toString('base64'),
    }));

    if (estado === 'CONSULTAR_CDR') {
      ({ respuesta, estado } = await llamarRegistrando(f.id, 'getStatusCdr', () => engine.consultarCdr(emisor, {
        tipoDoc: f.tipoComprobante, serie: f.serie, correlativo: String(f.numero),
      })));
      if (estado === 'CONSULTAR_CDR') estado = ESTADO.ERROR_TEMPORAL;
    }

    let { cdrKey } = f;
    if (respuesta.cdrZipBase64) {
      cdrKey = claveArchivo(f.empresa, f, f.numero, 'cdr.zip');
      await almacen.guardar(cdrKey, Buffer.from(respuesta.cdrZipBase64, 'base64'), 'application/zip');
    }

    const intentos = f.intentosEnvio + 1;
    await prisma.factura.update({
      where: { id: f.id },
      data: {
        estadoSunat: estado,
        codigoRespuestaSunat: respuesta.codigo ?? null,
        mensajeRespuestaSunat: respuesta.descripcion ?? null,
        ...(respuesta.observaciones?.length ? { observacionesSunat: respuesta.observaciones } : {}),
        cdrKey,
        intentosEnvio: intentos,
        fechaEnvioSunat: ahora(),
        enviadoSunat: ACEPTADOS.includes(estado),
      },
    });
    return { estado, intentos, fechaEmision: f.fechaEmision };
  }

  return { emitir, procesarEnvio };
}

module.exports = { crearServicioEmision, claveArchivo };
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `node --test test/db/servicio.test.js`
Esperado: PASS (7 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/sunat/emision/servicio.js test/db/servicio.test.js test/db/falsos.js
git commit -m "feat(sunat): servicio de emisión con correlativo bloqueado y envío con CDR"
```

---

### Tarea 12: Anulación (baja y resumen diario)

`Riesgo: alto` · `Delicado: sí` · `Permitidos: apps/backend/src/sunat/emision/anulacion.js, apps/backend/test/db/anulacion.test.js`

**Interfaces:**
- Usa: `armarEmisor`, `armarBaja`, `armarResumen`, `dentroDePlazoBaja`, `fechaLima`, `ESTADO`, `INCLUDE_COMPROBANTE`, los errores.
- Produce: `crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola, ahora? }) → { solicitarAnulacion(facturaId, empresaId, motivo) → procesoId, procesarTicket(procesoId) → { omitido } | { pendiente: true } | { pendiente: false, aceptado } }`.

**Reglas:** las series que empiezan con `B` (boletas y sus notas) se anulan por resumen diario (RC, estado `'3'`); las que empiezan con `F`, por comunicación de baja (RA). Cada anulación es su propio proceso, con un correlativo diario por empresa y tipo.

- [ ] **Paso 1: escribir la prueba que falla**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { engineFalso, almacenFalso, colaFalsa } = require('./falsos');
const { crearServicioAnulacion } = require('../../src/sunat/emision/anulacion');
const { descifrar } = require('../../src/sunat/seguridad/cifrado');
const { ErrorFueraDePlazo, ErrorEstado } = require('../../src/sunat/errores');

let ctx;
test.beforeEach(async () => { await limpiar(); ctx = await crearEmpresaPeru(); });
test.after(() => prisma.$disconnect());

const servicio = (engine = engineFalso()) => {
  const cola = colaFalsa();
  return { cola, engine, s: crearServicioAnulacion({ prisma, engine, almacen: almacenFalso(), descifrar, cola }) };
};

test('una factura aceptada se anula por comunicación de baja', async () => {
  const { s, cola, engine } = servicio();
  const f = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente });
  const procesoId = await s.solicitarAnulacion(f.id, ctx.empresa.id, 'Error en la emisión');
  const proceso = await prisma.procesoSunat.findUnique({ where: { id: procesoId } });
  assert.equal(proceso.tipo, 'RA');
  assert.equal(proceso.correlativo, 1);
  assert.equal(proceso.ticket, 'T-RA');
  assert.equal((await prisma.factura.findUnique({ where: { id: f.id } })).estadoSunat, 'ANULACION_PENDIENTE');
  assert.deepEqual(cola.trabajos, [{ tipo: 'ticket', procesoId, segundos: 30 }]);
  assert.equal(engine.llamadas[0].nombre, 'enviarBaja');
});

test('una boleta se anula por resumen diario y los correlativos avanzan', async () => {
  const { s, engine } = servicio();
  const b1 = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.clienteDni, tipo: '03', serie: 'B001', numero: 1 });
  const b2 = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.clienteDni, tipo: '03', serie: 'B001', numero: 2 });
  await s.solicitarAnulacion(b1.id, ctx.empresa.id, 'Error');
  const id2 = await s.solicitarAnulacion(b2.id, ctx.empresa.id, 'Error');
  const p2 = await prisma.procesoSunat.findUnique({ where: { id: id2 } });
  assert.equal(p2.tipo, 'RC');
  assert.equal(p2.correlativo, 2);
  assert.equal(engine.llamadas[0].nombre, 'enviarResumen');
  assert.equal(engine.llamadas[0].args[1].detalles[0].estado, '3');
});

test('fuera de plazo pide nota de crédito; no aceptado no se anula', async () => {
  const { s } = servicio();
  const vieja = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, fechaEmision: new Date(Date.now() - 10 * 86400000) });
  await assert.rejects(s.solicitarAnulacion(vieja.id, ctx.empresa.id, 'x'), ErrorFueraDePlazo);
  const otra = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 2 });
  await prisma.factura.update({ where: { id: otra.id }, data: { estadoSunat: 'RECHAZADO' } });
  await assert.rejects(s.solicitarAnulacion(otra.id, ctx.empresa.id, 'x'), ErrorEstado);
});

test('procesarTicket: pendiente, aceptado y rechazado', async () => {
  const pendiente = servicio(engineFalso({ ticket: { pendiente: true, codigo: '98' } }));
  const f = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente });
  const id = await pendiente.s.solicitarAnulacion(f.id, ctx.empresa.id, 'x');
  assert.deepEqual(await pendiente.s.procesarTicket(id), { pendiente: true });

  const ok = servicio();
  assert.deepEqual(await ok.s.procesarTicket(id), { pendiente: false, aceptado: true });
  const anulada = await prisma.factura.findUnique({ where: { id: f.id } });
  assert.equal(anulada.estadoSunat, 'ANULADO');
  assert.equal(anulada.estado, 'anulada');

  const g = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 9 });
  const rechazo = servicio(engineFalso({ ticket: { pendiente: false, codigo: '2105', descripcion: 'No existe', cdrZipBase64: null } }));
  const id2 = await rechazo.s.solicitarAnulacion(g.id, ctx.empresa.id, 'x');
  assert.deepEqual(await rechazo.s.procesarTicket(id2), { pendiente: false, aceptado: false });
  const restaurada = await prisma.factura.findUnique({ where: { id: g.id } });
  assert.equal(restaurada.estadoSunat, 'ACEPTADO');
  assert.match(restaurada.mensajeRespuestaSunat, /Anulación rechazada/);
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `node --test test/db/anulacion.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar `src/sunat/emision/anulacion.js`**

```js
const { INCLUDE_COMPROBANTE } = require('./borradores');
const { ESTADO } = require('./estados');
const { dentroDePlazoBaja } = require('./plazos');
const { armarEmisor, armarBaja, armarResumen } = require('../engine/mapper');
const { fechaLima } = require('../fechas');
const {
  ErrorEstado, ErrorFueraDePlazo, ErrorValidacion, ErrorEngineNoDisponible,
} = require('../errores');

const ACEPTADOS = [ESTADO.ACEPTADO, ESTADO.ACEPTADO_CON_OBS];

function crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola, ahora = () => new Date() }) {
  async function solicitarAnulacion(facturaId, empresaId, motivo) {
    const motivoLimpio = String(motivo || '').trim();
    if (!motivoLimpio) throw new ErrorValidacion(['Indica el motivo de la anulación']);

    const procesoId = await prisma.$transaction(async (tx) => {
      const f = await tx.factura.findFirst({ where: { id: facturaId, empresaId }, include: INCLUDE_COMPROBANTE });
      if (!f) throw new ErrorEstado('Comprobante no encontrado');
      if (!ACEPTADOS.includes(f.estadoSunat)) throw new ErrorEstado('Solo se puede anular un comprobante aceptado por SUNAT');
      const fecha = ahora();
      if (!dentroDePlazoBaja(f.fechaEmision, fecha)) {
        throw new ErrorFueraDePlazo('El plazo para dar de baja este comprobante venció: emite una nota de crédito por anulación');
      }

      const tipo = f.serie.startsWith('B') ? 'RC' : 'RA';
      const fechaGeneracion = fechaLima(fecha);
      const fechaReferencia = fechaLima(f.fechaEmision);

      // Correlativo diario por empresa y tipo, serializado con un candado de transacción.
      await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext(${`${empresaId}:${tipo}`}))) AS candado`;
      const [{ siguiente }] = await tx.$queryRaw`
        SELECT (COALESCE(MAX(correlativo), 0) + 1)::int AS siguiente FROM procesos_sunat
        WHERE empresa_id = ${empresaId} AND tipo = ${tipo} AND fecha_generacion = ${fechaGeneracion}::date`;

      const emisor = armarEmisor(f.empresa, f.empresa.emisorSunat, descifrar);
      const datos = { correlativo: siguiente, fechaGeneracion, fechaReferencia, items: [{ factura: f, motivo: motivoLimpio }] };
      const r = tipo === 'RC'
        ? await engine.enviarResumen(emisor, armarResumen(datos))
        : await engine.enviarBaja(emisor, armarBaja(datos));
      if (!r.ticket) {
        throw new ErrorValidacion([`SUNAT no recibió la anulación: ${r.descripcion || 'sin detalle'}`]);
      }

      const xmlKey = `sunat/${empresaId}/${f.empresa.ruc}-${tipo}-${fechaGeneracion.replaceAll('-', '')}-${siguiente}.xml`;
      if (r.xmlBase64) await almacen.guardar(xmlKey, Buffer.from(r.xmlBase64, 'base64'), 'application/xml');

      const proceso = await tx.procesoSunat.create({
        data: {
          empresaId,
          tipo,
          fechaGeneracion: new Date(`${fechaGeneracion}T00:00:00Z`),
          fechaReferencia: new Date(`${fechaReferencia}T00:00:00Z`),
          correlativo: siguiente,
          ticket: r.ticket,
          estado: 'ENVIADO',
          xmlKey,
          items: { create: [{ facturaId: f.id, motivo: motivoLimpio, estadoPrevio: f.estadoSunat }] },
        },
      });
      await tx.factura.update({ where: { id: f.id }, data: { estadoSunat: ESTADO.ANULACION_PENDIENTE } });
      return proceso.id;
    }, { timeout: 60000 });

    await cola.encolarTicket(procesoId, 30);
    return procesoId;
  }

  async function procesarTicket(procesoId) {
    const p = await prisma.procesoSunat.findUnique({
      where: { id: procesoId },
      include: { items: true, empresa: { include: { emisorSunat: true } } },
    });
    if (!p || p.estado !== 'ENVIADO') return { omitido: true };

    const emisor = armarEmisor(p.empresa, p.empresa.emisorSunat, descifrar);
    const inicio = Date.now();
    let r;
    try {
      r = await engine.consultarTicket(emisor, p.ticket);
    } catch (error) {
      if (error instanceof ErrorEngineNoDisponible) return { pendiente: true };
      throw error;
    }
    await prisma.envioSunat.create({
      data: {
        procesoId: p.id, operacion: 'getStatus', codigo: r.codigo ?? null, mensaje: r.descripcion ?? null,
        exito: r.codigo === '0', duracionMs: Date.now() - inicio,
      },
    });
    if (r.pendiente) return { pendiente: true };

    let cdrKey = null;
    if (r.cdrZipBase64) {
      cdrKey = p.xmlKey.replace(/\.xml$/, '.cdr.zip');
      await almacen.guardar(cdrKey, Buffer.from(r.cdrZipBase64, 'base64'), 'application/zip');
    }
    const aceptado = r.codigo === '0';
    await prisma.$transaction([
      prisma.procesoSunat.update({
        where: { id: p.id },
        data: { estado: aceptado ? 'ACEPTADO' : 'RECHAZADO', codigoRespuesta: r.codigo ?? null, mensajeRespuesta: r.descripcion ?? null, cdrKey },
      }),
      ...p.items.map((item) => prisma.factura.update({
        where: { id: item.facturaId },
        data: aceptado
          ? { estadoSunat: ESTADO.ANULADO, estado: 'anulada' }
          : { estadoSunat: item.estadoPrevio, mensajeRespuestaSunat: `Anulación rechazada: ${r.descripcion || r.codigo}` },
      })),
    ]);
    return { pendiente: false, aceptado };
  }

  return { solicitarAnulacion, procesarTicket };
}

module.exports = { crearServicioAnulacion };
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `node --test test/db/anulacion.test.js`
Esperado: PASS (4 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/sunat/emision/anulacion.js test/db/anulacion.test.js
git commit -m "feat(sunat): anulación por comunicación de baja y resumen diario con ticket"
```

---

### Tarea 13: Cola pg-boss y manejadores

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/backend/src/sunat/cola/**, apps/backend/test/unit/sunat/manejadores.test.js, apps/backend/package.json, apps/backend/package-lock.json`

**Interfaces:**
- `crearManejadores({ servicioEmision, servicioAnulacion, notificador, encolarEnvio, encolarTicket, ahora? }) → { manejarEnvio({ facturaId }), manejarTicket({ procesoId }) }`
- `crearCola({ connectionString }) → { iniciar(), encolarEnvio(facturaId, segundos = 0), encolarTicket(procesoId, segundos = 30), trabajar(manejadores), detener() }`
- El arranque (`src/sunat/index.js`) va en la tarea 14, porque necesita el notificador.

- [ ] **Paso 1: instalar pg-boss**

```bash
npm install pg-boss@10.4.2
```

- [ ] **Paso 2: escribir la prueba que falla (manejadores)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearManejadores } = require('../../../src/sunat/cola/manejadores');

function preparar(resultadoEnvio, resultadoTicket = { pendiente: false }) {
  const encolados = [];
  const avisos = [];
  const m = crearManejadores({
    servicioEmision: { procesarEnvio: async () => resultadoEnvio },
    servicioAnulacion: { procesarTicket: async () => resultadoTicket },
    notificador: { comprobanteAceptado: async (id) => { avisos.push(id); } },
    encolarEnvio: async (id, s) => encolados.push(['envio', id, s]),
    encolarTicket: async (id, s) => encolados.push(['ticket', id, s]),
    ahora: () => new Date('2026-11-02T15:00:00Z'),
  });
  return { m, encolados, avisos };
}

test('error temporal dentro de plazo se reintenta con espera creciente', async () => {
  const { m, encolados } = preparar({ estado: 'ERROR_TEMPORAL', intentos: 2, fechaEmision: new Date('2026-11-01T15:00:00Z') });
  await m.manejarEnvio({ facturaId: 'f1' });
  assert.deepEqual(encolados, [['envio', 'f1', 300]]);
});

test('error temporal fuera de plazo ya no se reintenta', async () => {
  const { m, encolados } = preparar({ estado: 'ERROR_TEMPORAL', intentos: 9, fechaEmision: new Date('2026-10-20T15:00:00Z') });
  await m.manejarEnvio({ facturaId: 'f1' });
  assert.deepEqual(encolados, []);
});

test('aceptado notifica por correo; si el correo falla no rompe el trabajo', async () => {
  const { m, avisos } = preparar({ estado: 'ACEPTADO', intentos: 1, fechaEmision: new Date() });
  await m.manejarEnvio({ facturaId: 'f1' });
  assert.deepEqual(avisos, ['f1']);

  const falla = crearManejadores({
    servicioEmision: { procesarEnvio: async () => ({ estado: 'ACEPTADO', intentos: 1 }) },
    servicioAnulacion: {}, notificador: { comprobanteAceptado: async () => { throw new Error('Resend caído'); } },
    encolarEnvio: async () => {}, encolarTicket: async () => {},
  });
  await assert.doesNotReject(falla.manejarEnvio({ facturaId: 'f1' }));
});

test('ticket pendiente se vuelve a consultar en 60 s', async () => {
  const { m, encolados } = preparar(null, { pendiente: true });
  await m.manejarTicket({ procesoId: 'p1' });
  assert.deepEqual(encolados, [['ticket', 'p1', 60]]);
});
```

- [ ] **Paso 3: correr y ver que falla**

Correr: `node --test test/unit/sunat/manejadores.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 4: implementar**

`src/sunat/cola/manejadores.js`:

```js
const { ESTADO, siguienteReintento } = require('../emision/estados');
const { dentroDePlazoEnvio } = require('../emision/plazos');

function crearManejadores({
  servicioEmision, servicioAnulacion, notificador, encolarEnvio, encolarTicket, ahora = () => new Date(),
}) {
  async function manejarEnvio({ facturaId }) {
    const r = await servicioEmision.procesarEnvio(facturaId);
    if (r.omitido) return r;
    if (r.estado === ESTADO.ERROR_TEMPORAL) {
      // Fuera de plazo se deja de reintentar: la alerta del dashboard lo muestra.
      if (dentroDePlazoEnvio(r.fechaEmision, ahora())) await encolarEnvio(facturaId, siguienteReintento(r.intentos));
    } else if (r.estado === ESTADO.ACEPTADO || r.estado === ESTADO.ACEPTADO_CON_OBS) {
      await notificador.comprobanteAceptado(facturaId).catch((error) => {
        console.error('[SUNAT] No se pudo enviar el correo del comprobante', facturaId, error.message);
      });
    }
    return r;
  }

  async function manejarTicket({ procesoId }) {
    const r = await servicioAnulacion.procesarTicket(procesoId);
    if (r.pendiente) await encolarTicket(procesoId, 60);
    return r;
  }

  return { manejarEnvio, manejarTicket };
}

module.exports = { crearManejadores };
```

`src/sunat/cola/index.js`:

```js
const PgBoss = require('pg-boss');

const COLAS = Object.freeze({ ENVIAR: 'sunat-enviar', TICKET: 'sunat-ticket' });

// pg-boss sobre el Postgres existente. Usar una conexión directa (no el pooler en modo transacción).
function crearCola({ connectionString }) {
  const boss = new PgBoss({ connectionString, schema: 'pgboss' });
  boss.on('error', (error) => console.error('[SUNAT] pg-boss:', error.message));

  return {
    async iniciar() {
      await boss.start();
      for (const nombre of Object.values(COLAS)) {
        if (!(await boss.getQueue(nombre))) await boss.createQueue(nombre);
      }
    },
    encolarEnvio: (facturaId, segundos = 0) => boss.send(COLAS.ENVIAR, { facturaId }, { startAfter: segundos, retryLimit: 0 }),
    encolarTicket: (procesoId, segundos = 30) => boss.send(COLAS.TICKET, { procesoId }, { startAfter: segundos, retryLimit: 0 }),
    async trabajar({ manejarEnvio, manejarTicket }) {
      await boss.work(COLAS.ENVIAR, async ([trabajo]) => manejarEnvio(trabajo.data));
      await boss.work(COLAS.TICKET, async ([trabajo]) => manejarTicket(trabajo.data));
    },
    detener: () => boss.stop(),
  };
}

module.exports = { crearCola, COLAS };
```


- [ ] **Paso 5: correr y ver que pasan los manejadores**

Correr: `node --test test/unit/sunat/manejadores.test.js`
Esperado: PASS (4 pruebas).

- [ ] **Paso 6: commit**

```bash
git add src/sunat/cola test/unit/sunat/manejadores.test.js package.json package-lock.json
git commit -m "feat(sunat): cola pg-boss con reintentos y consulta de tickets"
```

---

### Tarea 14: PDF con QR, notificador por correo y arranque del módulo

`Riesgo: medio` · `Delicado: no` · `Permitidos: apps/backend/src/sunat/pdf/**, apps/backend/src/sunat/notificador.js, apps/backend/src/sunat/index.js, apps/backend/test/unit/sunat/pdf.test.js, apps/backend/test/unit/sunat/notificador.test.js, apps/backend/package.json, apps/backend/package-lock.json`

**Interfaces que produce:**
- `NOMBRES_COMPROBANTE` (`'01' → 'FACTURA ELECTRÓNICA'`…)
- `textoQr(factura con empresa y cliente) → 'RUC|TIPO|SERIE|NUMERO|IGV|TOTAL|AAAA-MM-DD|TIPODOC|NUMDOC|HASH|'`
- `generarPdf(factura con INCLUDE_COMPROBANTE) → Buffer`
- `crearNotificador({ prisma, almacen, enviarCorreo, generar? }) → { comprobanteAceptado(facturaId) → { enviado } }`
- `iniciarSunat({ prisma }) → null | { engine, almacen, servicioEmision, servicioAnulacion }` (en `src/sunat/index.js`)

- [ ] **Paso 1: instalar qrcode**

```bash
npm install qrcode@^1.5.4
```

- [ ] **Paso 2: escribir las pruebas que fallan**

`test/unit/sunat/pdf.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { generarPdf, textoQr } = require('../../../src/sunat/pdf/representacion');

const factura = {
  tipoComprobante: '01', serie: 'F001', numero: 7, fechaEmision: new Date('2026-11-01T15:00:00Z'), moneda: 'PEN',
  formaPago: 'Credito', igv: '18.00', total: '118.00', subtotal: '100.00', totalGravadas: '100.00', totalExoneradas: '0',
  totalInafectas: '0', totalExportacion: '0', totalIcbper: '0', hashSunat: 'abc123=', montoEnLetras: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES',
  detraccionCodigo: '037', detraccionMonto: '142.00', percepcionMonto: null, retencionMonto: null,
  cuotas: [{ numero: 1, monto: '118.00', fechaVencimiento: new Date('2026-12-15T17:00:00Z') }],
  empresa: { ruc: '20000000001', razonSocial: 'EMPRESA BETA SAC', emisorSunat: { direccionFiscal: 'AV. PRUEBA 123' } },
  cliente: { tipoDocumento: 'RUC', numeroDocumento: '20131312955', razonSocial: 'SUNAT' },
  detalles: Array.from({ length: 45 }, (_, i) => ({ orden: i, cantidad: '1', codigoUnidadSunat: 'NIU', descripcion: `Línea ${i} – ítem`, valorUnitario: '2.2222222222', subtotal: '2.22' })),
};

test('textoQr sigue el formato de SUNAT', () => {
  assert.equal(textoQr(factura), '20000000001|01|F001|7|18.00|118.00|2026-11-01|6|20131312955|abc123=|');
});

test('genera un PDF de varias páginas sin romperse con caracteres especiales', async () => {
  const pdf = await generarPdf(factura);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 2000);
});
```

`test/unit/sunat/notificador.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearNotificador } = require('../../../src/sunat/notificador');

const prismaCon = (factura) => ({ factura: { findUnique: async () => factura } });
const base = {
  id: 'f1', tipoComprobante: '01', serie: 'F001', numero: 3, moneda: 'PEN', total: '118.00', xmlKey: 'k.xml',
  empresa: { ruc: '20000000001', razonSocial: 'EMPRESA BETA SAC' }, cliente: { email: 'cliente@test.pe' },
};

test('envía PDF y XML al correo del cliente', async () => {
  const enviados = [];
  const n = crearNotificador({
    prisma: prismaCon(base), almacen: { leer: async () => Buffer.from('<xml/>') },
    enviarCorreo: async (c) => enviados.push(c), generar: async () => Buffer.from('%PDF'),
  });
  assert.deepEqual(await n.comprobanteAceptado('f1'), { enviado: true });
  assert.equal(enviados[0].to, 'cliente@test.pe');
  assert.deepEqual(enviados[0].attachments.map((a) => a.filename), ['20000000001-01-F001-3.pdf', '20000000001-01-F001-3.xml']);
});

test('sin correo del cliente no envía nada', async () => {
  const n = crearNotificador({
    prisma: prismaCon({ ...base, cliente: { email: null } }), almacen: {},
    enviarCorreo: async () => { throw new Error('no debería'); },
  });
  assert.deepEqual(await n.comprobanteAceptado('f1'), { enviado: false });
});
```

- [ ] **Paso 3: correr y ver que fallan**

Correr: `node --test test/unit/sunat/pdf.test.js test/unit/sunat/notificador.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 4: implementar**

`src/sunat/pdf/representacion.js`:

```js
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const { fechaLima } = require('../fechas');
const { dos, aDecimal } = require('../numeros');
const { codigoDocIdentidad } = require('../catalogos');

const NOMBRES_COMPROBANTE = Object.freeze({
  '01': 'FACTURA ELECTRÓNICA',
  '03': 'BOLETA DE VENTA ELECTRÓNICA',
  '07': 'NOTA DE CRÉDITO ELECTRÓNICA',
  '08': 'NOTA DE DÉBITO ELECTRÓNICA',
});

// Las fuentes estándar de pdf-lib solo codifican WinAnsi (Latin-1).
const limpiar = (texto) => String(texto ?? '').replace(/[^\x20-\x7E -ÿ]/g, '-');

function textoQr(f) {
  return `${[
    f.empresa.ruc, f.tipoComprobante, f.serie, f.numero, dos(f.igv), dos(f.total), fechaLima(f.fechaEmision),
    codigoDocIdentidad(f.cliente.tipoDocumento), f.cliente.numeroDocumento || '-', f.hashSunat || '',
  ].join('|')}|`;
}

async function generarPdf(f) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ANCHO = 595.28;
  const ALTO = 841.89;
  const IZQ = 40;
  let pagina = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - 40;

  const texto = (t, x, opciones = {}) => pagina.drawText(limpiar(t), {
    x, y, size: opciones.size ?? 9, font: opciones.bold ? negrita : normal, color: rgb(0, 0, 0),
  });
  const bajar = (n = 12) => {
    y -= n;
    if (y < 180) { pagina = pdf.addPage([ANCHO, ALTO]); y = ALTO - 40; }
  };

  // Cabecera: emisor a la izquierda, recuadro del comprobante a la derecha.
  pagina.drawRectangle({ x: 380, y: ALTO - 112, width: 175, height: 80, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  const yCabecera = y;
  y = ALTO - 50; texto(`RUC ${f.empresa.ruc}`, 392, { bold: true, size: 10 });
  y = ALTO - 68; texto(NOMBRES_COMPROBANTE[f.tipoComprobante], 392, { bold: true });
  y = ALTO - 88; texto(`${f.serie}-${String(f.numero).padStart(8, '0')}`, 392, { bold: true, size: 12 });
  y = yCabecera;
  texto(f.empresa.razonSocial || f.empresa.nombre, IZQ, { bold: true, size: 12 }); bajar(16);
  texto(`RUC ${f.empresa.ruc}`, IZQ); bajar();
  texto(f.empresa.emisorSunat?.direccionFiscal, IZQ); bajar(40);

  texto(`Cliente: ${f.cliente.razonSocial}`, IZQ); bajar();
  texto(`Documento: ${f.cliente.numeroDocumento || '-'}`, IZQ); bajar();
  texto(`Fecha de emisión: ${fechaLima(f.fechaEmision)}   Moneda: ${f.moneda}   Forma de pago: ${f.formaPago}`, IZQ); bajar();
  if (f.docRelacionadoSerie) {
    texto(`Modifica: ${f.docRelacionadoSerie}-${f.docRelacionadoNumero}   Motivo: ${f.motivoDescripcion}`, IZQ); bajar();
  }
  bajar(10);

  texto('Cant.', IZQ, { bold: true }); texto('Unidad', 85, { bold: true }); texto('Descripción', 130, { bold: true });
  texto('V. unitario', 400, { bold: true }); texto('Valor venta', 480, { bold: true }); bajar(14);
  for (const d of [...f.detalles].sort((a, b) => a.orden - b.orden)) {
    texto(aDecimal(d.cantidad).toString(), IZQ);
    texto(d.codigoUnidadSunat, 85);
    texto(String(d.descripcion).slice(0, 55), 130);
    texto(aDecimal(d.valorUnitario).toFixed(2), 400);
    texto(dos(d.subtotal), 480);
    bajar();
  }
  bajar(10);

  const filas = [
    ['Op. gravadas', f.totalGravadas], ['Op. exoneradas', f.totalExoneradas], ['Op. inafectas', f.totalInafectas],
    ['Exportación', f.totalExportacion], ['IGV', f.igv], ['ICBPER', f.totalIcbper], ['IMPORTE TOTAL', f.total],
  ];
  if (f.percepcionMonto) filas.push(['Percepción', f.percepcionMonto]);
  if (f.retencionMonto) filas.push(['Retención', f.retencionMonto]);
  if (f.detraccionMonto) filas.push(['Detracción (S/)', f.detraccionMonto]);
  for (const [etiqueta, valor] of filas) {
    texto(etiqueta, 380, { bold: etiqueta === 'IMPORTE TOTAL' });
    texto(`${f.moneda} ${dos(valor)}`, 480, { bold: etiqueta === 'IMPORTE TOTAL' });
    bajar();
  }
  bajar(6);
  texto(f.montoEnLetras, IZQ, { bold: true }); bajar();
  if (f.detraccionCodigo) { texto('Operación sujeta al Sistema de Pago de Obligaciones Tributarias', IZQ); bajar(); }
  for (const c of f.cuotas || []) {
    texto(`Cuota ${c.numero}: ${f.moneda} ${dos(c.monto)} — vence ${fechaLima(c.fechaVencimiento)}`, IZQ); bajar();
  }

  const qr = await pdf.embedPng(await QRCode.toBuffer(textoQr(f), { width: 200, margin: 0 }));
  pagina.drawImage(qr, { x: IZQ, y: 50, width: 100, height: 100 });
  y = 120; texto(`Representación impresa de la ${NOMBRES_COMPROBANTE[f.tipoComprobante].toLowerCase()}`, 155);
  y = 106; texto(`Hash: ${f.hashSunat || ''}`, 155);

  return Buffer.from(await pdf.save());
}

module.exports = { generarPdf, textoQr, NOMBRES_COMPROBANTE };
```

`src/sunat/notificador.js`:

```js
const { INCLUDE_COMPROBANTE } = require('./emision/borradores');
const { generarPdf, NOMBRES_COMPROBANTE } = require('./pdf/representacion');
const { nombreBase } = require('./engine/mapper');
const { dos } = require('./numeros');

function crearNotificador({ prisma, almacen, enviarCorreo, generar = generarPdf }) {
  return {
    async comprobanteAceptado(facturaId) {
      const f = await prisma.factura.findUnique({ where: { id: facturaId }, include: INCLUDE_COMPROBANTE });
      if (!f?.cliente?.email) return { enviado: false };
      const nombre = nombreBase(f.empresa, f);
      const tipo = NOMBRES_COMPROBANTE[f.tipoComprobante];
      const [pdf, xml] = await Promise.all([generar(f), almacen.leer(f.xmlKey)]);
      await enviarCorreo({
        to: f.cliente.email,
        subject: `${tipo} ${f.serie}-${f.numero} — ${f.empresa.razonSocial || f.empresa.nombre}`,
        text: `Adjuntamos la ${tipo.toLowerCase()} ${f.serie}-${f.numero} por ${f.moneda} ${dos(f.total)}.`,
        attachments: [
          { filename: `${nombre}.pdf`, content: pdf },
          { filename: `${nombre}.xml`, content: xml },
        ],
      });
      return { enviado: true };
    },
  };
}

module.exports = { crearNotificador };
```

`src/sunat/index.js`:

```js
const { crearCola } = require('./cola');
const { crearManejadores } = require('./cola/manejadores');
const { crearClienteEngine } = require('./engine/cliente');
const { crearAlmacenPrivado } = require('./almacen');
const { crearServicioEmision } = require('./emision/servicio');
const { crearServicioAnulacion } = require('./emision/anulacion');
const { crearNotificador } = require('./notificador');
const { descifrar, obtenerLlave } = require('./seguridad/cifrado');
const { sendEmail } = require('../services/emailService');

// Arranca el módulo SUNAT solo si está configurado. Sin SUNAT_ENGINE_URL, InvoiceApp sigue igual que hoy.
async function iniciarSunat({ prisma }) {
  if (!process.env.SUNAT_ENGINE_URL) {
    console.log('[SUNAT] SUNAT_ENGINE_URL no definido: módulo SUNAT desactivado');
    return null;
  }
  obtenerLlave(); // falla temprano si SUNAT_MASTER_KEY no es válida

  const cola = crearCola({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await cola.iniciar();

  const engine = crearClienteEngine();
  const almacen = crearAlmacenPrivado();
  const servicioEmision = crearServicioEmision({ prisma, engine, almacen, descifrar, cola });
  const servicioAnulacion = crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola });
  const notificador = crearNotificador({ prisma, almacen, enviarCorreo: sendEmail });

  await cola.trabajar(crearManejadores({
    servicioEmision,
    servicioAnulacion,
    notificador,
    encolarEnvio: cola.encolarEnvio,
    encolarTicket: cola.encolarTicket,
  }));
  console.log('[SUNAT] Módulo SUNAT iniciado');
  return { engine, almacen, servicioEmision, servicioAnulacion };
}

module.exports = { iniciarSunat };
```

- [ ] **Paso 5: correr todas las unitarias y comprobar que el módulo carga**

Correr: `npm test && node -e "require('./src/sunat'); console.log('módulo ok')"`
Esperado: PASS y `módulo ok`.

- [ ] **Paso 6: commit**

```bash
git add src/sunat/pdf src/sunat/notificador.js src/sunat/index.js test/unit/sunat/pdf.test.js test/unit/sunat/notificador.test.js package.json package-lock.json
git commit -m "feat(sunat): representación impresa con QR y correo al cliente"
```

---

### Tarea 15: API (comprobantes, emisor, series, alertas) y bloqueo en `/api/facturas`

`Riesgo: alto` · `Delicado: sí` (credenciales y autorización) · `Permitidos: apps/backend/src/sunat/http.js, apps/backend/src/routes/comprobantes.js, apps/backend/src/routes/sunat.js, apps/backend/src/routes/facturas.js, apps/backend/app.js, apps/backend/test/db/rutas.test.js, apps/backend/test/unit/sunat/http.test.js`

**Interfaces:**
- `src/sunat/http.js`: `responderError(res, error)`, `soloPeru(req, res, next)`, `bloquearElectronicos(prisma) → middleware`.
- `crearRouterComprobantes({ prisma, obtenerSunat, auth?, limites? })` en `/api/comprobantes`:
  - `POST /preview`, `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
  - `POST /:id/emitir`, `POST /:id/anular {motivo}`, `POST /:id/corregir`
  - `GET /:id/xml`, `GET /:id/cdr` (302 a una URL firmada), `GET /:id/pdf`
- `crearRouterSunat({ prisma, obtenerSunat, auth? })` en `/api/sunat`: `GET /emisor`, `PUT /emisor`, `GET /series`, `POST /series`, `GET /alertas`.

**Códigos HTTP:**

| Error | Código |
|---|---|
| Zod | 400 `{error, detalles}` |
| `ErrorCalculo` / `ErrorBorrador` | 400 |
| `ErrorValidacion` | 422 `{error, errores}` |
| `ErrorConstruccion` | 422 |
| `ErrorEstado` | 409 |
| `ErrorFueraDePlazo` | 409 `{error, accion: 'EMITIR_NOTA_CREDITO'}` |
| `ErrorEngineNoDisponible` | 503 |
| Empresa que no es de Perú | 403 |

- [ ] **Paso 1: escribir las pruebas que fallan**

`test/unit/sunat/http.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { responderError, soloPeru, bloquearElectronicos } = require('../../../src/sunat/http');
const { ErrorFueraDePlazo, ErrorValidacion } = require('../../../src/sunat/errores');

const resFalsa = () => ({ code: null, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

test('responderError traduce errores del módulo', () => {
  let res = resFalsa(); responderError(res, new ErrorFueraDePlazo('vencido'));
  assert.deepEqual([res.code, res.body.accion], [409, 'EMITIR_NOTA_CREDITO']);
  res = resFalsa(); responderError(res, new ErrorValidacion(['a', 'b']));
  assert.deepEqual([res.code, res.body.errores], [422, ['a', 'b']]);
});

test('soloPeru deja pasar solo empresas PE', () => {
  const res = resFalsa();
  let siguio = false;
  soloPeru({ empresa: { pais: 'US' } }, res, () => { siguio = true; });
  assert.equal(res.code, 403);
  soloPeru({ empresa: { pais: 'PE' } }, resFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});

test('bloquearElectronicos impide editar comprobantes SUNAT', async () => {
  const prisma = { factura: { findFirst: async ({ where }) => (where.id === 'e' ? { estadoSunat: 'ACEPTADO' } : { estadoSunat: null }) } };
  const mw = bloquearElectronicos(prisma);
  const res = resFalsa();
  await mw({ params: { id: 'e' }, empresa: { id: 'x' } }, res, () => {});
  assert.equal(res.code, 409);
  let siguio = false;
  await mw({ params: { id: 'n' }, empresa: { id: 'x' } }, resFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});
```

`test/db/rutas.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const { engineFalso, almacenFalso, colaFalsa } = require('./falsos');
const { crearRouterComprobantes } = require('../../src/routes/comprobantes');
const { crearRouterSunat } = require('../../src/routes/sunat');
const { crearServicioEmision } = require('../../src/sunat/emision/servicio');
const { crearServicioAnulacion } = require('../../src/sunat/emision/anulacion');
const { descifrar } = require('../../src/sunat/seguridad/cifrado');

let ctx; let servidor; let base; let engine;

test.before(async () => {
  await limpiar();
  ctx = await crearEmpresaPeru();
  engine = engineFalso();
  const almacen = almacenFalso();
  const cola = colaFalsa();
  const sunat = {
    engine, almacen,
    servicioEmision: crearServicioEmision({ prisma, engine, almacen, descifrar, cola }),
    servicioAnulacion: crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola }),
  };
  const auth = [async (req, _res, next) => {
    req.user = { id: ctx.user.id };
    req.empresa = await prisma.empresa.findUnique({ where: { id: ctx.empresa.id } });
    next();
  }];
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  const limites = { verificar: (_q, _s, n) => n(), incrementar: async () => {} };
  app.use('/api/comprobantes', crearRouterComprobantes({ prisma, obtenerSunat: async () => sunat, auth, limites }));
  app.use('/api/sunat', crearRouterSunat({ prisma, obtenerSunat: async () => sunat, auth }));
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => { servidor.close(); await prisma.$disconnect(); });

const pedir = async (metodo, ruta, cuerpo) => {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo, redirect: 'manual', headers: { 'content-type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, texto, json: texto && r.headers.get('content-type')?.includes('json') ? JSON.parse(texto) : null, headers: r.headers };
};
const datos = () => ({ tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 118 }] });

test('crear, editar, previsualizar y emitir un comprobante', async () => {
  const pre = await pedir('POST', '/api/comprobantes/preview', datos());
  assert.equal(pre.json.totales.total, '118.00');

  const creado = await pedir('POST', '/api/comprobantes', datos());
  assert.equal(creado.status, 201);
  assert.equal(creado.json.estadoSunat, 'BORRADOR');
  assert.doesNotMatch(creado.texto, /Cifrad/);

  const editado = await pedir('PUT', `/api/comprobantes/${creado.json.id}`, { ...datos(), lineas: [{ descripcion: 'X', cantidad: 2, precio: 118 }] });
  assert.equal(editado.json.total, '236');

  const emitido = await pedir('POST', `/api/comprobantes/${creado.json.id}/emitir`);
  assert.equal(emitido.status, 200);
  assert.equal(emitido.json.estadoSunat, 'PENDIENTE_ENVIO');

  assert.equal((await pedir('PUT', `/api/comprobantes/${creado.json.id}`, datos())).status, 400);
  assert.equal((await pedir('DELETE', `/api/comprobantes/${creado.json.id}`)).status, 409);

  const xml = await pedir('GET', `/api/comprobantes/${creado.json.id}/xml`);
  assert.equal(xml.status, 302);
  const pdf = await pedir('GET', `/api/comprobantes/${creado.json.id}/pdf`);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
});

test('errores de validación llegan como 422 con la lista', async () => {
  const creado = await pedir('POST', '/api/comprobantes', { ...datos(), clienteId: ctx.clienteDni.id });
  const r = await pedir('POST', `/api/comprobantes/${creado.json.id}/emitir`);
  assert.equal(r.status, 422);
  assert.ok(r.json.errores.some((e) => /RUC/.test(e)));
});

test('emisor: no expone secretos, exige confirmar producción y valida el RUC del certificado', async () => {
  const vista = await pedir('GET', '/api/sunat/emisor');
  assert.equal(vista.json.tieneCertificado, true);
  assert.doesNotMatch(vista.texto, /Cifrad|moddatos/);

  const direccion = { ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', direccionFiscal: 'AV 1' };
  assert.equal((await pedir('PUT', '/api/sunat/emisor', { ...direccion, ambiente: 'PRODUCCION' })).status, 400);

  engine.inspeccionarCertificado = async () => ({ ruc: '20999999999', vence: '2030-01-01T00:00:00Z' });
  const otroRuc = await pedir('PUT', '/api/sunat/emisor', { ...direccion, certificado: { pfxBase64: 'eA==', clave: 'c' } });
  assert.equal(otroRuc.status, 400);
  assert.match(otroRuc.json.error, /20999999999/);

  engine.inspeccionarCertificado = async () => ({ ruc: '20000000001', vence: '2031-01-01T00:00:00Z' });
  const ok = await pedir('PUT', '/api/sunat/emisor', { ...direccion, solClave: 'nueva', certificado: { pfxBase64: 'eA==', clave: 'c' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.certificadoVence, '2031-01-01T00:00:00.000Z');
});

test('series y alertas', async () => {
  assert.equal((await pedir('POST', '/api/sunat/series', { tipoComprobante: '03', serie: 'F002' })).status, 400);
  assert.equal((await pedir('POST', '/api/sunat/series', { tipoComprobante: '03', serie: 'B002' })).status, 201);
  assert.equal((await pedir('POST', '/api/sunat/series', { tipoComprobante: '03', serie: 'B002' })).status, 409);
  const alertas = await pedir('GET', '/api/sunat/alertas');
  assert.ok(Array.isArray(alertas.json.comprobantesPendientes));
});
```

- [ ] **Paso 2: correr y ver que fallan**

Correr: `node --test test/unit/sunat/http.test.js test/db/rutas.test.js`
Esperado: FAIL con `Cannot find module`.

- [ ] **Paso 3: implementar `src/sunat/http.js`**

```js
const { z } = require('zod');
const { ErrorCalculo } = require('./calculo/calcular');
const {
  ErrorValidacion, ErrorEstado, ErrorFueraDePlazo, ErrorBorrador, ErrorEngineNoDisponible, ErrorConstruccion,
} = require('./errores');

function responderError(res, error) {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', detalles: error.issues });
  if (error instanceof ErrorCalculo || error instanceof ErrorBorrador) return res.status(400).json({ error: error.message });
  if (error instanceof ErrorValidacion) return res.status(422).json({ error: error.message, errores: error.errores });
  if (error instanceof ErrorConstruccion) return res.status(422).json({ error: error.message });
  if (error instanceof ErrorEstado) return res.status(409).json({ error: error.message });
  if (error instanceof ErrorFueraDePlazo) return res.status(409).json({ error: error.message, accion: 'EMITIR_NOTA_CREDITO' });
  if (error instanceof ErrorEngineNoDisponible) {
    return res.status(503).json({ error: 'El motor SUNAT no está disponible: intenta en unos minutos' });
  }
  console.error('[SUNAT]', error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

function soloPeru(req, res, next) {
  if (req.empresa?.pais === 'PE') return next();
  return res.status(403).json({ error: 'La facturación electrónica SUNAT solo está disponible para empresas de Perú' });
}

function bloquearElectronicos(prisma) {
  return async (req, res, next) => {
    try {
      const f = await prisma.factura.findFirst({
        where: { id: req.params.id, empresaId: req.empresa.id },
        select: { estadoSunat: true },
      });
      if (f?.estadoSunat) {
        return res.status(409).json({
          error: 'Los comprobantes electrónicos SUNAT se gestionan desde /api/comprobantes y no se editan una vez emitidos',
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { responderError, soloPeru, bloquearElectronicos };
```

- [ ] **Paso 4: implementar `src/routes/comprobantes.js`**

```js
const express = require('express');
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const { checkLimit, incrementUsage } = require('../middleware/subscription');
const {
  guardarBorrador, previsualizar, datosDesdeFactura, INCLUDE_COMPROBANTE, INCLUDE_RESPUESTA,
} = require('../sunat/emision/borradores');
const { responderError, soloPeru } = require('../sunat/http');
const { ErrorEstado } = require('../sunat/errores');
const { generarPdf } = require('../sunat/pdf/representacion');
const { nombreBase } = require('../sunat/engine/mapper');

function crearRouterComprobantes({
  prisma,
  obtenerSunat,
  auth = [authenticateToken, getEmpresaFromUser],
  limites = { verificar: checkLimit('invoice'), incrementar: incrementUsage },
}) {
  const router = express.Router();
  router.use(...auth, soloPeru);

  const manejar = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) { responderError(res, error); }
  };
  const servicios = async (res) => {
    const sunat = await obtenerSunat();
    if (!sunat) res.status(503).json({ error: 'El módulo SUNAT no está disponible' });
    return sunat;
  };
  const buscar = (req, include = INCLUDE_RESPUESTA) => prisma.factura.findFirst({
    where: { id: req.params.id, empresaId: req.empresa.id, estadoSunat: { not: null } },
    include,
  });

  router.post('/preview', manejar(async (req, res) => {
    res.json(await previsualizar({ prisma, empresa: req.empresa, datos: req.body }));
  }));

  router.get('/', manejar(async (req, res) => {
    const where = { empresaId: req.empresa.id, estadoSunat: req.query.estadoSunat ? String(req.query.estadoSunat) : { not: null } };
    if (req.query.tipoComprobante) where.tipoComprobante = String(req.query.tipoComprobante);
    res.json(await prisma.factura.findMany({ where, include: { cliente: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
  }));

  router.get('/:id', manejar(async (req, res) => {
    const f = await buscar(req, { ...INCLUDE_RESPUESTA, envios: { orderBy: { createdAt: 'desc' } } });
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    return res.json(f);
  }));

  router.post('/', limites.verificar, manejar(async (req, res) => {
    const f = await guardarBorrador({ prisma, empresa: req.empresa, userId: req.user.id, datos: req.body });
    await limites.incrementar(req.empresa.id, 'invoice');
    res.status(201).json(f);
  }));

  router.put('/:id', manejar(async (req, res) => {
    res.json(await guardarBorrador({ prisma, empresa: req.empresa, userId: req.user.id, datos: req.body, facturaId: req.params.id }));
  }));

  router.delete('/:id', manejar(async (req, res) => {
    const f = await buscar(req);
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (f.estadoSunat !== 'BORRADOR') throw new ErrorEstado('Solo se puede eliminar un borrador: un comprobante emitido se anula');
    await prisma.factura.delete({ where: { id: f.id } });
    return res.status(204).end();
  }));

  router.post('/:id/emitir', manejar(async (req, res) => {
    const sunat = await servicios(res);
    if (!sunat) return;
    res.json(await sunat.servicioEmision.emitir(req.params.id, req.empresa.id));
  }));

  router.post('/:id/anular', manejar(async (req, res) => {
    const sunat = await servicios(res);
    if (!sunat) return;
    const procesoId = await sunat.servicioAnulacion.solicitarAnulacion(req.params.id, req.empresa.id, req.body?.motivo);
    res.status(202).json({ procesoId });
  }));

  router.post('/:id/corregir', manejar(async (req, res) => {
    const f = await buscar(req, INCLUDE_COMPROBANTE);
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (f.estadoSunat !== 'RECHAZADO') throw new ErrorEstado('Solo se corrige un comprobante rechazado por SUNAT');
    const nuevo = await guardarBorrador({ prisma, empresa: req.empresa, userId: req.user.id, datos: datosDesdeFactura(f) });
    return res.status(201).json(nuevo);
  }));

  for (const [ruta, campo] of [['xml', 'xmlKey'], ['cdr', 'cdrKey']]) {
    router.get(`/:id/${ruta}`, manejar(async (req, res) => {
      const f = await buscar(req);
      if (!f?.[campo]) return res.status(404).json({ error: 'Archivo no disponible' });
      const sunat = await servicios(res);
      if (!sunat) return undefined;
      return res.redirect(302, await sunat.almacen.urlFirmada(f[campo]));
    }));
  }

  router.get('/:id/pdf', manejar(async (req, res) => {
    const f = await buscar(req, INCLUDE_COMPROBANTE);
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (!f.xmlKey) return res.status(409).json({ error: 'El PDF está disponible cuando el comprobante ya fue emitido' });
    const pdf = await generarPdf(f);
    return res
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename="${nombreBase(f.empresa, f)}.pdf"`)
      .send(pdf);
  }));

  return router;
}

module.exports = { crearRouterComprobantes };
```

- [ ] **Paso 5: implementar `src/routes/sunat.js`**

```js
const express = require('express');
const { z } = require('zod');
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const { responderError, soloPeru } = require('../sunat/http');
const { cifrar } = require('../sunat/seguridad/cifrado');
const { parametro } = require('../sunat/catalogos/parametros');
const { diasDesdeEmision } = require('../sunat/emision/plazos');

const emisorSchema = z.object({
  ubigeo: z.string().regex(/^\d{6}$/, 'El ubigeo tiene 6 dígitos'),
  departamento: z.string().min(1),
  provincia: z.string().min(1),
  distrito: z.string().min(1),
  urbanizacion: z.string().optional(),
  direccionFiscal: z.string().min(1),
  codigoEstablecimiento: z.string().regex(/^\d{4}$/).default('0000'),
  ambiente: z.enum(['BETA', 'PRODUCCION']).default('BETA'),
  confirmarProduccion: z.boolean().optional(),
  solUsuario: z.string().min(1).optional(),
  solClave: z.string().min(1).optional(),
  certificado: z.object({ pfxBase64: z.string().min(1), clave: z.string() }).optional(),
  cuentaDetracciones: z.string().optional(),
  esAgenteRetencion: z.boolean().optional(),
  esAgentePercepcion: z.boolean().optional(),
});

const serieSchema = z.object({
  tipoComprobante: z.enum(['01', '03', '07', '08']),
  serie: z.string().regex(/^[FB][A-Z0-9]{3}$/, 'La serie debe tener 4 caracteres y empezar con F o B'),
});

// Solo datos no sensibles: nunca los campos *Cifrad*.
function vistaEmisor(emisor) {
  if (!emisor) return { configurado: false };
  return {
    configurado: true,
    ubigeo: emisor.ubigeo,
    departamento: emisor.departamento,
    provincia: emisor.provincia,
    distrito: emisor.distrito,
    urbanizacion: emisor.urbanizacion,
    direccionFiscal: emisor.direccionFiscal,
    codigoEstablecimiento: emisor.codigoEstablecimiento,
    ambiente: emisor.ambiente,
    solUsuario: emisor.solUsuario,
    tieneClaveSol: Boolean(emisor.solClaveCifrada),
    tieneCertificado: Boolean(emisor.certificadoCifrado),
    certificadoVence: emisor.certificadoVence,
    cuentaDetracciones: emisor.cuentaDetracciones,
    esAgenteRetencion: emisor.esAgenteRetencion,
    esAgentePercepcion: emisor.esAgentePercepcion,
  };
}

function crearRouterSunat({ prisma, obtenerSunat, auth = [authenticateToken, getEmpresaFromUser] }) {
  const router = express.Router();
  router.use(...auth);
  const manejar = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) { responderError(res, error); }
  };

  router.get('/emisor', manejar(async (req, res) => {
    res.json(vistaEmisor(await prisma.emisorSunat.findUnique({ where: { empresaId: req.empresa.id } })));
  }));

  // Configurar el emisor es lo que convierte a la empresa en "PE": no lleva soloPeru.
  router.put('/emisor', manejar(async (req, res) => {
    const d = emisorSchema.parse(req.body);
    if (d.ambiente === 'PRODUCCION' && d.confirmarProduccion !== true) {
      return res.status(400).json({ error: 'Para pasar a producción confirma explícitamente (confirmarProduccion: true)' });
    }
    const datos = {
      ubigeo: d.ubigeo,
      departamento: d.departamento,
      provincia: d.provincia,
      distrito: d.distrito,
      urbanizacion: d.urbanizacion ?? null,
      direccionFiscal: d.direccionFiscal,
      codigoEstablecimiento: d.codigoEstablecimiento,
      ambiente: d.ambiente,
      ...(d.cuentaDetracciones !== undefined ? { cuentaDetracciones: d.cuentaDetracciones } : {}),
      ...(d.esAgenteRetencion !== undefined ? { esAgenteRetencion: d.esAgenteRetencion } : {}),
      ...(d.esAgentePercepcion !== undefined ? { esAgentePercepcion: d.esAgentePercepcion } : {}),
      ...(d.solUsuario ? { solUsuario: d.solUsuario } : {}),
      ...(d.solClave ? { solClaveCifrada: cifrar(d.solClave) } : {}),
    };

    if (d.certificado) {
      const sunat = await obtenerSunat();
      if (!sunat) return res.status(503).json({ error: 'El módulo SUNAT no está disponible para validar el certificado' });
      const info = await sunat.engine.inspeccionarCertificado(d.certificado.pfxBase64, d.certificado.clave);
      if (!info.ruc) return res.status(400).json({ error: 'No se encontró el RUC dentro del certificado' });
      if (info.ruc !== req.empresa.ruc) {
        return res.status(400).json({ error: `El certificado pertenece al RUC ${info.ruc}, no al de la empresa (${req.empresa.ruc})` });
      }
      if (new Date(info.vence) <= new Date()) return res.status(400).json({ error: 'El certificado está vencido' });
      datos.certificadoCifrado = cifrar(Buffer.from(d.certificado.pfxBase64, 'base64'));
      datos.certificadoClaveCifrada = cifrar(d.certificado.clave);
      datos.certificadoVence = new Date(info.vence);
    }

    const [emisor] = await prisma.$transaction([
      prisma.emisorSunat.upsert({ where: { empresaId: req.empresa.id }, create: { empresaId: req.empresa.id, ...datos }, update: datos }),
      prisma.empresa.update({ where: { id: req.empresa.id }, data: { pais: 'PE' } }),
    ]);
    return res.json(vistaEmisor(emisor));
  }));

  router.get('/series', soloPeru, manejar(async (req, res) => {
    res.json(await prisma.configuracionSeries.findMany({
      where: { empresaId: req.empresa.id, tipoDocumento: { in: ['01', '03', '07', '08'] } },
      orderBy: [{ tipoDocumento: 'asc' }, { serie: 'asc' }],
    }));
  }));

  router.post('/series', soloPeru, manejar(async (req, res) => {
    const d = serieSchema.parse(req.body);
    const prefijos = { '01': ['F'], '03': ['B'], '07': ['F', 'B'], '08': ['F', 'B'] };
    if (!prefijos[d.tipoComprobante].includes(d.serie[0])) {
      return res.status(400).json({ error: `La serie ${d.serie} no corresponde a este tipo de comprobante` });
    }
    try {
      const serie = await prisma.configuracionSeries.create({
        data: { empresaId: req.empresa.id, tipoDocumento: d.tipoComprobante, serie: d.serie, ultimoNumero: 0 },
      });
      return res.status(201).json(serie);
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ error: `La serie ${d.serie} ya existe` });
      throw error;
    }
  }));

  router.get('/alertas', soloPeru, manejar(async (req, res) => {
    const ahora = new Date();
    const emisor = await prisma.emisorSunat.findUnique({ where: { empresaId: req.empresa.id } });
    const plazo = Number(parametro('PLAZO_ENVIO_DIAS', ahora));
    const pendientes = await prisma.factura.findMany({
      where: { empresaId: req.empresa.id, estadoSunat: { in: ['PENDIENTE_ENVIO', 'ERROR_TEMPORAL'] } },
      select: { id: true, serie: true, numero: true, fechaEmision: true, estadoSunat: true, mensajeRespuestaSunat: true },
      orderBy: { fechaEmision: 'asc' },
    });
    const tickets = await prisma.procesoSunat.findMany({
      where: { empresaId: req.empresa.id, estado: 'ENVIADO', updatedAt: { lt: new Date(ahora.getTime() - 3600000) } },
      select: { id: true, tipo: true, ticket: true, createdAt: true },
    });
    const venceEn = emisor?.certificadoVence ? emisor.certificadoVence.getTime() - ahora.getTime() : null;
    res.json({
      certificadoPorVencer: venceEn !== null && venceEn < 30 * 86400000 ? { vence: emisor.certificadoVence } : null,
      comprobantesPendientes: pendientes.map((f) => ({ ...f, diasRestantes: plazo - diasDesdeEmision(f.fechaEmision, ahora) })),
      ticketsAtascados: tickets,
    });
  }));

  return router;
}

module.exports = { crearRouterSunat };
```

- [ ] **Paso 6: bloquear la edición en `src/routes/facturas.js`**

Agregar arriba, después de los `require` existentes:

```js
const { bloquearElectronicos } = require('../sunat/http');
const bloquearSiSunat = bloquearElectronicos(prisma);
```

Agregar `bloquearSiSunat` como middleware, justo después de `getEmpresaFromUser`, en estas rutas (las declaraciones existentes cambian solo en eso):

```js
router.put('/:id', authenticateToken, getEmpresaFromUser, bloquearSiSunat, async (req, res) => {
router.delete('/:id', authenticateToken, getEmpresaFromUser, bloquearSiSunat, async (req, res) => {
router.put('/:id/dates', authenticateToken, getEmpresaFromUser, bloquearSiSunat, async (req, res) => {
router.put('/:id/observations', authenticateToken, getEmpresaFromUser, bloquearSiSunat, async (req, res) => {
router.put('/:id/order-type', authenticateToken, getEmpresaFromUser, bloquearSiSunat, async (req, res) => {
router.put('/:id/job-info', authenticateToken, getEmpresaFromUser, bloquearSiSunat, async (req, res) => {
router.put('/:id/payment-summary', authenticateToken, getEmpresaFromUser, bloquearSiSunat, async (req, res) => {
```

En `router.post('/', …)`, como primera línea dentro del `try`:

```js
    if (req.empresa.pais === 'PE') {
      return res.status(409).json({ error: 'Las empresas de Perú emiten comprobantes desde /api/comprobantes' });
    }
```

En `router.post('/:id/pagos', …)`, después del bloque `if (factura.estado === 'anulada') { … }`:

```js
    if (factura.estadoSunat === 'BORRADOR') {
      return res.status(400).json({ error: 'No se pueden registrar pagos en un comprobante que aún no se emite' });
    }
```

- [ ] **Paso 7: montar el módulo en `app.js`**

Después de la línea `app.use('/api/subscriptions', limiter, authenticateToken, subscriptionsRoutes);`:

```js
// 🇵🇪 Facturación electrónica SUNAT (se activa con SUNAT_ENGINE_URL)
const prismaSunat = require('./src/utils/prisma');
const { iniciarSunat } = require('./src/sunat');
const { crearRouterComprobantes } = require('./src/routes/comprobantes');
const { crearRouterSunat } = require('./src/routes/sunat');

const sunatListo = iniciarSunat({ prisma: prismaSunat }).catch((error) => {
  console.error('[SUNAT] No se pudo iniciar el módulo:', error.message);
  return null;
});
const obtenerSunat = () => sunatListo;
app.use('/api/comprobantes', limiter, crearRouterComprobantes({ prisma: prismaSunat, obtenerSunat }));
app.use('/api/sunat', limiter, crearRouterSunat({ prisma: prismaSunat, obtenerSunat }));
```

- [ ] **Paso 8: correr todas las suites**

Correr: `npm test && npm run test:db`
Esperado: PASS en todas.

- [ ] **Paso 9: comprobar que el backend arranca sin SUNAT**

Correr: `SUNAT_ENGINE_URL= node app.js & PID=$!; sleep 6; kill $PID`
Esperado: aparece `[SUNAT] SUNAT_ENGINE_URL no definido: módulo SUNAT desactivado` y el servidor escucha sin errores.

- [ ] **Paso 10: commit**

```bash
git add src/sunat/http.js src/routes/comprobantes.js src/routes/sunat.js src/routes/facturas.js app.js test/unit/sunat/http.test.js test/db/rutas.test.js
git commit -m "feat(sunat): API de comprobantes, emisor, series y alertas; bloqueo de edición en facturas"
```

---

### Tarea 16: Prueba de punta a punta contra SUNAT beta, guía de despliegue y HANDOFF

`Riesgo: medio` · `Delicado: no` · la ejecuta **Opus** (habla con SUNAT y valida el criterio de terminado) · `Permitidos: apps/backend/scripts/sunat-beta-e2e.js, docs/sunat/DESPLIEGUE.md, docs/HANDOFF.md`

**Archivos:**
- Crear: `apps/backend/scripts/sunat-beta-e2e.js`, `docs/sunat/DESPLIEGUE.md`
- Modificar: `docs/HANDOFF.md`

- [ ] **Paso 1: escribir el script E2E**

```js
// Punta a punta contra SUNAT beta: BD de pruebas + motor real + almacén en disco.
// Uso: SUNAT_ENGINE_URL=http://localhost:8089 SUNAT_ENGINE_TOKEN=prueba SUNAT_E2E_PFX=/ruta/cert.pfx SUNAT_E2E_CLAVE=clave123 node scripts/sunat-beta-e2e.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { prisma, limpiar, crearEmpresaPeru } = require('../test/db/ayuda');
const { cifrar, descifrar } = require('../src/sunat/seguridad/cifrado');
const { crearClienteEngine } = require('../src/sunat/engine/cliente');
const { crearServicioEmision } = require('../src/sunat/emision/servicio');
const { crearServicioAnulacion } = require('../src/sunat/emision/anulacion');
const { guardarBorrador } = require('../src/sunat/emision/borradores');

function almacenLocal(dir) {
  return {
    async guardar(key, cuerpo) { const r = path.join(dir, key); fs.mkdirSync(path.dirname(r), { recursive: true }); fs.writeFileSync(r, cuerpo); return key; },
    async leer(key) { return fs.readFileSync(path.join(dir, key)); },
    async urlFirmada(key) { return `file://${path.join(dir, key)}`; },
  };
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sunat-e2e-'));
  await limpiar();
  const ctx = await crearEmpresaPeru();
  await prisma.emisorSunat.update({
    where: { empresaId: ctx.empresa.id },
    data: { certificadoCifrado: cifrar(fs.readFileSync(process.env.SUNAT_E2E_PFX)), certificadoClaveCifrada: cifrar(process.env.SUNAT_E2E_CLAVE) },
  });
  const cola = { encolarEnvio: async () => {}, encolarTicket: async () => {} };
  const engine = crearClienteEngine();
  const almacen = almacenLocal(dir);
  const emision = crearServicioEmision({ prisma, engine, almacen, descifrar, cola });
  const anulacion = crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola });
  const resultados = [];

  const emitirYEnviar = async (nombre, datos, esperado = /^ACEPTADO/) => {
    const b = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos });
    await emision.emitir(b.id, ctx.empresa.id);
    const r = await emision.procesarEnvio(b.id);
    const f = await prisma.factura.findUnique({ where: { id: b.id } });
    resultados.push({ caso: nombre, estado: r.estado, codigo: f.codigoRespuestaSunat, mensaje: f.mensajeRespuestaSunat, ok: esperado.test(r.estado) });
    return f;
  };
  const anular = async (nombre, f) => {
    const procesoId = await anulacion.solicitarAnulacion(f.id, ctx.empresa.id, 'Prueba E2E');
    let r = { pendiente: true };
    for (let i = 0; i < 20 && r.pendiente; i += 1) { await new Promise((ok) => setTimeout(ok, 3000)); r = await anulacion.procesarTicket(procesoId); }
    resultados.push({ caso: nombre, estado: r.aceptado ? 'ANULADO' : 'NO ANULADO', ok: r.aceptado === true });
  };

  const linea = [{ descripcion: 'Servicio E2E', cantidad: 1, precio: 118, precioIncluyeIgv: true }];
  const factura = await emitirYEnviar('Factura contado', { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: linea });
  await emitirYEnviar('Factura crédito + detracción', {
    tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, tipoOperacion: '1001', detraccion: { codigo: '037' },
    lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 1000, precioIncluyeIgv: false }],
    formaPago: { tipo: 'Credito', cuotas: [{ monto: 1038, fechaVencimiento: '2030-12-31' }] },
  });
  const boleta = await emitirYEnviar('Boleta', { tipoComprobante: '03', serie: 'B001', clienteId: ctx.clienteDni.id, lineas: linea });
  await emitirYEnviar('Nota de crédito', { tipoComprobante: '07', serie: 'FC01', clienteId: ctx.cliente.id, lineas: linea, documentoAfectado: { facturaId: factura.id, motivoCodigo: '07' } });
  await emitirYEnviar('Nota de débito', { tipoComprobante: '08', serie: 'FD01', clienteId: ctx.cliente.id, lineas: linea, documentoAfectado: { facturaId: factura.id, motivoCodigo: '01' } });
  const paraBaja = await emitirYEnviar('Factura para baja', { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: linea });
  await anular('Baja de factura (RA)', paraBaja);
  await anular('Anulación de boleta (RC)', boleta);

  console.table(resultados);
  console.log(`Archivos en ${dir}`);
  await prisma.$disconnect();
  process.exit(resultados.every((r) => r.ok) ? 0 : 1);
}

main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
```

- [ ] **Paso 2: correr el E2E contra beta**

```bash
cd apps/sunat-engine && docker build -q -t sunat-engine:test . && docker run -d --name sunat-engine-e2e -e ENGINE_TOKEN=prueba -p 8089:80 sunat-engine:test
cd ../backend
SUNAT_ENGINE_URL=http://localhost:8089 SUNAT_ENGINE_TOKEN=prueba SUNAT_E2E_PFX=<ruta del .pfx de prueba de la tarea 8> SUNAT_E2E_CLAVE=clave123 node scripts/sunat-beta-e2e.js
docker rm -f sunat-engine-e2e
```

Esperado: una tabla con 8 casos, todos con `ok: true`, y código de salida 0.

En cada rechazo, leer `codigo` y `mensaje`. La lista de códigos de error de SUNAT dice qué campo corregir, normalmente en `Mapper.php` o `mapper.js`. Hay que anotar en `docs/HANDOFF.md` cuál de los «supuestos a verificar en beta» del spec quedó confirmado y cuál cambió.

- [ ] **Paso 3: escribir `docs/sunat/DESPLIEGUE.md`**

```markdown
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
```

- [ ] **Paso 4: actualizar `docs/HANDOFF.md`**

Actualizar «Estado actual», «Última sesión» y «Próximos pasos». Los próximos pasos son: el plan del frontend para empresas `PE`, el despliegue según `docs/sunat/DESPLIEGUE.md` y el diseño de los subproyectos 3 a 5. Agregar a «Gotchas»:

- Los setters de Greenter que no existían en la versión instalada y cómo se corrigieron (paso 6 de la tarea 8).
- Si beta aceptó o no el certificado autofirmado.
- Los supuestos de beta que se confirmaron o cambiaron.

- [ ] **Paso 5: commit**

```bash
git add apps/backend/scripts/sunat-beta-e2e.js docs/sunat/DESPLIEGUE.md docs/HANDOFF.md
git commit -m "test(sunat): E2E contra SUNAT beta y guía de despliegue"
```

---

## Cobertura del spec

| Requisito del spec | Tarea |
|---|---|
| Arquitectura engine sin estado, cola pg-boss, R2 privado | 6, 8, 13 |
| `EmisorSunat`, series, cuotas, procesos, bitácora, campos de `Factura`/`DetalleFactura` | 5 |
| Catálogos y parámetros versionados | 1 |
| Ciclo de vida, correlativo al emitir, reversión si falla la firma | 10, 11 |
| Reintentos 1/5/15/60 min, 1033 → consulta CDR, rechazo quema número, «corregir» | 10, 11, 13, 15 |
| Anulación RA/RC con ticket; fuera de plazo → NC | 12, 15 |
| Cálculo: gravado/exonerado/inafecto/exportación, ICBPER, detracción, percepción, retención, cuotas, monto en letras | 2, 3 |
| Vista previa desde el backend | 7, 15 |
| Validación previa con mensajes de usuario | 10 |
| Secretos cifrados que no salen del backend; producción con confirmación | 4, 15 |
| PDF con QR y hash; correo con PDF y XML al aceptarse | 14 |
| Alertas: certificado, plazos, tickets atascados | 15 (`GET /api/sunat/alertas`, calculado al leer en lugar de un trabajo diario: mismo resultado, menos piezas) |
| Pruebas: unitarias, contrato del engine, estados con engine falso, beta, regresión US | 1–16 (la regresión US: tareas 5 y 15) |
| Criterio de terminado | 16 |

**Diferencias con el spec, decididas en este plan:**
1. Se reutiliza `ConfiguracionSeries` en lugar de crear `Serie`.
2. `Cliente.tipoDocumento` no se migra: se lee con `codigoDocIdentidad()`.
3. La prueba de contrato del engine valida aceptándolo en SUNAT beta, no contra el XSD.
4. Las alertas se calculan al consultarlas, sin un trabajo diario.
