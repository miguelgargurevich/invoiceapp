# Frontend SUNAT (Perú) — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).
> **Regla de Miguel que manda sobre lo anterior:** la construcción se delega con la skill `delegar` (pestaña de terminal visible, worktree en `.claude/worktrees/<tema>`). Cada tarea trae su línea `Riesgo:` / `Delicado:` / `Permitidos:`. La verificación la hace Opus.

**Objetivo:** que una empresa de Perú configure su emisor, cree, emita, siga, anule y descargue comprobantes SUNAT desde la web, sin cambiar las pantallas de EE. UU.

**Arquitectura:** sección nueva `/comprobantes` con lógica pura en `apps/frontend/lib/sunat/` (probada con `node --test`) y componentes en `apps/frontend/components/sunat/`. Cuatro ajustes chicos al backend: clientes, catálogos, descargas servidas por el backend y almacén local para desarrollo.

**Stack:** Next.js 14.2 (App Router, `'use client'`), React 18, next-intl 4, Tailwind, lucide-react, componentes de `@/components/common`. Backend Express 5 + Prisma 5.22 (CommonJS).

**Spec:** `docs/superpowers/specs/2026-11-01-sunat-frontend-design.md`

## Restricciones globales

- Base: rama `feat/sunat-frontend`, que contiene toda la API SUNAT (`/api/comprobantes`, `/api/sunat`).
- El frontend **no calcula montos**. Los totales siempre vienen de `POST /api/comprobantes/preview` o del comprobante guardado.
- Textos con next-intl, en el namespace `sunat` de `apps/frontend/messages/es.json` y `en.json` (los crea la tarea 3). Ningún texto visible queda fijo en el código, salvo los nombres de los tipos de documento de EE. UU. que ya existen.
- Sin dependencias nuevas en el frontend. Las pruebas usan `node --test` sobre `.ts` (Node 26 borra los tipos).
- Los archivos `lib/sunat/{estados,formato,errores,formulario}.ts` **no importan código en tiempo de ejecución**: solo `import type`. Los `.test.ts` importan el archivo probado con extensión (`./estados.ts`). Nada de enums, `namespace` ni parámetros de propiedad.
- Navegación con `router.push(\`/${locale}/...\`)`, como el resto del repo. Las páginas reciben `params: { locale }`.
- Secretos: la clave SOL y la clave del certificado nunca se muestran ni se guardan en el estado más allá del formulario. Después de guardar, se limpian.
- Frontend desde `apps/frontend/`: `npm test`, `npx tsc --noEmit`, `npx next lint --file <archivos>`. Backend desde `apps/backend/`: `npm test`, `npm run test:db` (Postgres de pruebas en el 5436).
- Cada worktree necesita `npm ci` en `apps/frontend` (y en `apps/backend` si la tarea lo toca).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `apps/backend/src/routes/clientes.js` | + `esAgenteRetencion` |
| `apps/backend/src/routes/sunat.js` | + `GET /catalogos` |
| `apps/backend/src/routes/comprobantes.js` | XML/CDR servidos por el backend |
| `apps/backend/src/sunat/almacenLocal.js`, `src/sunat/index.js` | Almacén en disco para desarrollo |
| `apps/frontend/lib/api.ts` | `ApiError` (status y cuerpo), 204, `getBlob` |
| `apps/frontend/lib/sunat/tipos.ts` | Tipos de la API |
| `apps/frontend/lib/sunat/estados.ts` | Etiqueta, color y acciones por estado |
| `apps/frontend/lib/sunat/formato.ts` | Montos, fechas, números, filas de totales y nombres de archivo |
| `apps/frontend/lib/sunat/errores.ts` | Normaliza los errores de la API |
| `apps/frontend/lib/sunat/formulario.ts` | Estado del formulario, payload, cuotas y visibilidad |
| `apps/frontend/lib/sunat/api.ts`, `hooks.ts` | Llamadas a la API y hooks de catálogos y emisor |
| `apps/frontend/components/sunat/*` | Componentes de la sección |
| `apps/frontend/app/[locale]/(dashboard)/comprobantes/**` | Páginas |

**Orden:** primero las tareas 1, 2 y 3 en paralelo (archivos distintos). La 4 necesita la 3. La 5, la 6 y la 8 necesitan la 4 y pueden ir en paralelo. La 7 necesita la 5 y la 6. La 9 necesita la 5. La 10 la hace Opus al final.

---

### Tarea 1: Backend — clientes con «agente de retención» y catálogos para la interfaz

`Riesgo: medio` · `Permitidos: apps/backend/src/routes/clientes.js, apps/backend/src/routes/sunat.js, apps/backend/test/db/sunat-catalogos-clientes.test.js, docs/HANDOFF.md`

**Archivos:**
- Modificar: `apps/backend/src/routes/clientes.js` (esquema, POST y PUT)
- Modificar: `apps/backend/src/routes/sunat.js` (ruta nueva `GET /catalogos`)
- Prueba: `apps/backend/test/db/sunat-catalogos-clientes.test.js`

**Produce:** `GET /api/sunat/catalogos` → `{ afectaciones, tiposOperacion, unidades, motivosNotaCredito, motivosNotaDebito, detracciones, percepciones }`. Todas las listas son `{ codigo, descripcion }`; `detracciones` y `percepciones` también traen `porcentaje`. Además, `POST`/`PUT /api/clientes` aceptan `esAgenteRetencion: boolean`.

- [ ] **Paso 1: escribir la prueba que falla** (`test/db/sunat-catalogos-clientes.test.js`)

```js
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const express = require('express');
const { crearRouterSunat } = require('../../src/routes/sunat');
const { generateAccessToken } = require('../../src/middleware/auth');
const clientesRouter = require('../../src/routes/clientes');

let ctx; let servidor; let base; let empresaUs;

test.before(async () => {
  await limpiar();
  ctx = await crearEmpresaPeru();
  const userUs = await prisma.userProfile.create({ data: { email: `us-${Date.now()}@test.com` } });
  empresaUs = await prisma.empresa.create({ data: { nombre: 'Acme', ruc: `US-${Date.now()}`, userId: userUs.id } });
  await prisma.plan.upsert({ where: { slug: 'prueba-rutas' }, update: {}, create: { name: 'Prueba', slug: 'prueba-rutas', priceMonthly: 0, priceYearly: 0 } });

  const authCon = (empresaId) => [async (req, _res, next) => {
    req.user = { id: ctx.user.id };
    req.empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    next();
  }];
  const app = express();
  app.use(express.json());
  app.use('/api/sunat', crearRouterSunat({ prisma, obtenerSunat: async () => null, auth: authCon(ctx.empresa.id) }));
  app.use('/api/sunat-us', crearRouterSunat({ prisma, obtenerSunat: async () => null, auth: authCon(empresaUs.id) }));
  app.use('/api/clientes', clientesRouter);
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => { servidor.close(); await prisma.$disconnect(); });

const pedir = async (metodo, ruta, cuerpo) => {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${generateAccessToken(ctx.user)}` },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, json: texto ? JSON.parse(texto) : null };
};

test('GET /api/sunat/catalogos devuelve los catálogos de la interfaz', async () => {
  const r = await pedir('GET', '/api/sunat/catalogos');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.afectaciones.map((a) => a.codigo), ['10', '20', '30', '40']);
  assert.deepEqual(r.json.tiposOperacion.map((a) => a.codigo), ['0101', '0200', '1001']);
  assert.ok(r.json.unidades.some((u) => u.codigo === 'NIU' && u.descripcion));
  assert.ok(r.json.motivosNotaCredito.some((m) => m.codigo === '01'));
  assert.ok(r.json.motivosNotaDebito.some((m) => m.codigo === '01'));
  assert.deepEqual(r.json.detracciones.find((d) => d.codigo === '037'), {
    codigo: '037', descripcion: 'Demás servicios gravados con el IGV', porcentaje: '12',
  });
  assert.ok(r.json.percepciones.some((p) => p.codigo === '51' && p.porcentaje === '2'));
});

test('los catálogos son solo para empresas de Perú', async () => {
  assert.equal((await pedir('GET', '/api/sunat-us/catalogos')).status, 403);
});

test('clientes guardan y editan esAgenteRetencion', async () => {
  const creado = await pedir('POST', '/api/clientes', {
    tipoDocumento: 'RUC', numeroDocumento: '20100070970', razonSocial: 'AGENTE SA', telefono: '999', esAgenteRetencion: true,
  });
  assert.equal(creado.status, 201, JSON.stringify(creado.json));
  assert.equal(creado.json.esAgenteRetencion, true);

  const editado = await pedir('PUT', `/api/clientes/${creado.json.id}`, { esAgenteRetencion: false, telefono: '999' });
  assert.equal(editado.status, 200, JSON.stringify(editado.json));
  assert.equal((await prisma.cliente.findUnique({ where: { id: creado.json.id } })).esAgenteRetencion, false);

  await pedir('PUT', `/api/clientes/${creado.json.id}`, { esAgenteRetencion: true, telefono: '999' });
  await pedir('PUT', `/api/clientes/${creado.json.id}`, { telefono: '888' });
  assert.equal((await prisma.cliente.findUnique({ where: { id: creado.json.id } })).esAgenteRetencion, true);
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `node --test test/db/sunat-catalogos-clientes.test.js` (desde `apps/backend`)
Esperado: FAIL (404 en `/catalogos` y `esAgenteRetencion` undefined).

- [ ] **Paso 3: implementar**

En `src/routes/clientes.js`, dentro de `clienteSchema`, después de `notas: z.string().optional().nullable()`, cambiar a:

```js
  notas: z.string().optional().nullable(),
  esAgenteRetencion: z.boolean().optional()
});
```

En `router.post('/', …)`, dentro de `mappedData`, después de `notas: req.body.notas || null`, cambiar a:

```js
      notas: req.body.notas || null,
      esAgenteRetencion: req.body.esAgenteRetencion === true
```

En `router.put('/:id', …)`, dentro de `mappedData`, después de `notas: req.body.notas`, cambiar a:

```js
      notas: req.body.notas,
      esAgenteRetencion: typeof req.body.esAgenteRetencion === 'boolean' ? req.body.esAgenteRetencion : undefined
```

En `src/routes/sunat.js`, después de la línea `const { diasDesdeEmision } = require('../sunat/emision/plazos');`:

```js
const {
  UNIDADES, MOTIVOS_NOTA_CREDITO, MOTIVOS_NOTA_DEBITO, DETRACCION_CODIGOS, PERCEPCION_REGIMENES,
} = require('../sunat/catalogos');

const aLista = (mapa) => Object.entries(mapa).map(([codigo, descripcion]) => ({ codigo, descripcion }));
const conPorcentaje = (mapa) => Object.entries(mapa).map(([codigo, d]) => ({ codigo, descripcion: d.descripcion, porcentaje: d.porcentaje }));

// Catálogos que muestra la interfaz: salen de src/sunat/catalogos para que el frontend no tenga una copia.
const CATALOGOS_INTERFAZ = Object.freeze({
  afectaciones: [
    { codigo: '10', descripcion: 'Gravado' },
    { codigo: '20', descripcion: 'Exonerado' },
    { codigo: '30', descripcion: 'Inafecto' },
    { codigo: '40', descripcion: 'Exportación' },
  ],
  tiposOperacion: [
    { codigo: '0101', descripcion: 'Venta interna' },
    { codigo: '0200', descripcion: 'Exportación' },
    { codigo: '1001', descripcion: 'Operación sujeta a detracción' },
  ],
  unidades: aLista(UNIDADES),
  motivosNotaCredito: aLista(MOTIVOS_NOTA_CREDITO),
  motivosNotaDebito: aLista(MOTIVOS_NOTA_DEBITO),
  detracciones: conPorcentaje(DETRACCION_CODIGOS),
  percepciones: conPorcentaje(PERCEPCION_REGIMENES),
});
```

Y antes de `router.get('/alertas', soloPeru, …)`:

```js
  router.get('/catalogos', soloPeru, (req, res) => res.json(CATALOGOS_INTERFAZ));
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `node --test test/db/sunat-catalogos-clientes.test.js && npm test && npm run test:db`
Esperado: PASS en las tres (la nueva con 3 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/routes/clientes.js src/routes/sunat.js test/db/sunat-catalogos-clientes.test.js
git commit -m "feat(sunat): catálogos para la interfaz y clientes agentes de retención"
```

---

### Tarea 2: Backend — XML y CDR servidos por el backend y almacén local para desarrollo

`Riesgo: medio` · `Permitidos: apps/backend/src/routes/comprobantes.js, apps/backend/src/sunat/almacenLocal.js, apps/backend/src/sunat/index.js, apps/backend/test/db/rutas.test.js, apps/backend/test/unit/sunat/almacenLocal.test.js, apps/backend/.env.example, docs/HANDOFF.md`

**Produce:**
- `GET /api/comprobantes/:id/xml` → `200 application/xml` con `Content-Disposition: attachment; filename="<RUC>-<TT>-<SERIE>-<NUM>.xml"`.
- `GET /api/comprobantes/:id/cdr` → `200 application/zip`, archivo `<…>.cdr.zip`.
- `crearAlmacenLocal(dir) → { guardar, leer, urlFirmada }`.
- `crearAlmacen(env) → almacén`: si `SUNAT_ALMACEN_DIR` está definido, usa el local; si además `NODE_ENV === 'production'`, lanza error.

- [ ] **Paso 1: escribir las pruebas que fallan**

`test/unit/sunat/almacenLocal.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crearAlmacenLocal } = require('../../../src/sunat/almacenLocal');

test('guarda y lee archivos dentro de la carpeta', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-'));
  const almacen = crearAlmacenLocal(dir);
  await almacen.guardar('sunat/x/a.xml', Buffer.from('<xml/>'), 'application/xml');
  assert.equal((await almacen.leer('sunat/x/a.xml')).toString(), '<xml/>');
  assert.ok(fs.existsSync(path.join(dir, 'sunat/x/a.xml')));
});

test('rechaza claves que salen de la carpeta', async () => {
  const almacen = crearAlmacenLocal(fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-')));
  await assert.rejects(almacen.guardar('../fuera.xml', Buffer.from('x')), /inválida/);
  await assert.rejects(almacen.leer('../../etc/passwd'), /inválida/);
});

test('crearAlmacen usa el local en desarrollo y se niega en producción', () => {
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
  const { crearAlmacen } = require('../../../src/sunat');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-'));
  assert.equal(typeof crearAlmacen({ SUNAT_ALMACEN_DIR: dir }).leer, 'function');
  assert.throws(() => crearAlmacen({ SUNAT_ALMACEN_DIR: dir, NODE_ENV: 'production' }), /producción/);
  assert.throws(() => crearAlmacen({}), /R2_PRIVATE_BUCKET/);
});
```

En `test/db/rutas.test.js`, cambiar el bloque:

```js
  const xml = await pedir('GET', `/api/comprobantes/${creado.json.id}/xml`);
  assert.equal(xml.status, 302);
```

por:

```js
  const xml = await pedir('GET', `/api/comprobantes/${creado.json.id}/xml`);
  assert.equal(xml.status, 200);
  assert.match(xml.headers.get('content-type'), /application\/xml/);
  assert.match(xml.headers.get('content-disposition'), /attachment; filename="20000000001-01-F001-1\.xml"/);
  assert.match(xml.texto, /<xml>F001-1<\/xml>/);
  assert.equal((await pedir('GET', `/api/comprobantes/${creado.json.id}/cdr`)).status, 404);
```

Si el número que emite esa prueba no es `1` (depende del orden de las pruebas del archivo), ajusta el nombre esperado al número real y dilo.

- [ ] **Paso 2: correr y ver que fallan**

Correr: `node --test test/unit/sunat/almacenLocal.test.js` y `node --test test/db/rutas.test.js`
Esperado: FAIL (no existe `almacenLocal`; el XML responde 302).

- [ ] **Paso 3: implementar**

`src/sunat/almacenLocal.js`:

```js
const fs = require('node:fs/promises');
const path = require('node:path');

// Solo para desarrollo (SUNAT_ALMACEN_DIR): XML y CDR en disco en lugar del bucket R2 privado.
function crearAlmacenLocal(dir) {
  const raiz = path.resolve(dir);
  const ruta = (key) => {
    const destino = path.resolve(raiz, key);
    if (!destino.startsWith(raiz + path.sep)) throw new Error('Clave de archivo inválida');
    return destino;
  };

  return {
    async guardar(key, cuerpo) {
      const destino = ruta(key);
      await fs.mkdir(path.dirname(destino), { recursive: true });
      await fs.writeFile(destino, cuerpo);
      return key;
    },
    async leer(key) {
      return fs.readFile(ruta(key));
    },
    async urlFirmada() {
      throw new Error('El almacén local no genera URL firmadas');
    },
  };
}

module.exports = { crearAlmacenLocal };
```

**Ojo:** `guardar` y `leer` son `async`, así que el error de `ruta()` llega como promesa rechazada, que es lo que esperan las pruebas.

En `src/sunat/index.js`, después de `const { crearAlmacenPrivado } = require('./almacen');`:

```js
const { crearAlmacenLocal } = require('./almacenLocal');

function crearAlmacen(env = process.env) {
  if (env.SUNAT_ALMACEN_DIR) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SUNAT_ALMACEN_DIR no se permite en producción: usa R2_PRIVATE_BUCKET');
    }
    console.log('[SUNAT] Almacén local en', env.SUNAT_ALMACEN_DIR);
    return crearAlmacenLocal(env.SUNAT_ALMACEN_DIR);
  }
  // `|| ''` evita que el valor por defecto de crearAlmacenPrivado lea process.env cuando se pasa otro env.
  return crearAlmacenPrivado({ bucket: env.R2_PRIVATE_BUCKET || '' });
}
```

Dentro de `iniciarSunat`, cambiar `const almacen = crearAlmacenPrivado();` por `const almacen = crearAlmacen();`, y el `module.exports` por `module.exports = { iniciarSunat, crearAlmacen };`.

En `src/routes/comprobantes.js`, reemplazar el bloque completo:

```js
  for (const [ruta, campo] of [['xml', 'xmlKey'], ['cdr', 'cdrKey']]) {
    router.get(`/:id/${ruta}`, manejar(async (req, res) => {
      const f = await buscar(req);
      if (!f?.[campo]) return res.status(404).json({ error: 'Archivo no disponible' });
      const sunat = await servicios(res);
      if (!sunat) return undefined;
      return res.redirect(302, await sunat.almacen.urlFirmada(f[campo]));
    }));
  }
```

por:

```js
  // El backend lee el archivo y lo envía: el fetch autenticado del navegador no sigue bien una
  // redirección a otro dominio, y así no se expone ninguna URL del bucket privado.
  const ARCHIVOS = {
    xml: { campo: 'xmlKey', tipo: 'application/xml', extension: 'xml' },
    cdr: { campo: 'cdrKey', tipo: 'application/zip', extension: 'cdr.zip' },
  };
  for (const [ruta, archivo] of Object.entries(ARCHIVOS)) {
    router.get(`/:id/${ruta}`, manejar(async (req, res) => {
      const f = await buscar(req, INCLUDE_COMPROBANTE);
      if (!f?.[archivo.campo]) return res.status(404).json({ error: 'Archivo no disponible' });
      const sunat = await servicios(res);
      if (!sunat) return undefined;
      const contenido = await sunat.almacen.leer(f[archivo.campo]);
      return res
        .type(archivo.tipo)
        .set('Content-Disposition', `attachment; filename="${nombreBase(f.empresa, f)}.${archivo.extension}"`)
        .send(contenido);
    }));
  }
```

`INCLUDE_COMPROBANTE` y `nombreBase` ya están importados en ese archivo (los usa la ruta del PDF). Compruébalo y, si falta alguno, agrégalo al `require`.

En `apps/backend/.env.example`, agregar:

```
# Solo desarrollo: guarda XML/CDR de SUNAT en esta carpeta en lugar de R2 (prohibido con NODE_ENV=production)
SUNAT_ALMACEN_DIR=
```

- [ ] **Paso 4: correr y ver que pasa**

Correr: `npm test && npm run test:db`
Esperado: PASS en las dos suites.

- [ ] **Paso 5: commit**

```bash
git add src/routes/comprobantes.js src/sunat/almacenLocal.js src/sunat/index.js test/db/rutas.test.js test/unit/sunat/almacenLocal.test.js .env.example
git commit -m "feat(sunat): XML y CDR servidos por el backend y almacén local para desarrollo"
```

---

### Tarea 3: Frontend — base (cliente de API, tipos, estados, formato, errores e i18n)

`Riesgo: medio` · `Permitidos: apps/frontend/lib/api.ts, apps/frontend/lib/sunat/tipos.ts, apps/frontend/lib/sunat/estados.ts, apps/frontend/lib/sunat/estados.test.ts, apps/frontend/lib/sunat/formato.ts, apps/frontend/lib/sunat/formato.test.ts, apps/frontend/lib/sunat/errores.ts, apps/frontend/lib/sunat/errores.test.ts, apps/frontend/contexts/AuthContext.tsx, apps/frontend/messages/es.json, apps/frontend/messages/en.json, apps/frontend/tsconfig.json, apps/frontend/package.json, docs/HANDOFF.md`

**Produce:**
- `lib/api.ts`: `export class ApiError extends Error { status: number; body: any }`; `apiClient.getBlob(endpoint): Promise<Blob>`; los métodos devuelven `undefined` en un 204.
- `lib/sunat/tipos.ts`: tipos exportados (ver código).
- `lib/sunat/estados.ts`: `ESTADOS_SUNAT`, `etiquetaEstado(estado) → 'estados.<ESTADO>'`, `colorEstado(estado) → VarianteEstado`, `accionesPermitidas(estado) → AccionComprobante[]`, `estaEnProceso(estado) → boolean`.
- `lib/sunat/formato.ts`: `formatearMonto(valor, moneda)`, `fechaCorta(iso)`, `numeroComprobante(c)`, `nombreArchivo(ruc, c, tipo)`, `filasDesdeVista(v)`, `filasDesdeComprobante(c)`, `type FilaTotal = { clave: string; monto: string }`.
- `lib/sunat/errores.ts`: `normalizarError(error, mensajeNoDisponible) → { mensaje, errores, accion, status }`.
- `Empresa.pais?: string` en `AuthContext`.
- Namespace i18n `sunat` y la clave `navigation.vouchers`.

- [ ] **Paso 1: preparar las pruebas**

En `apps/frontend/package.json`, dentro de `"scripts"`, agregar:

```json
    "test": "node --test \"lib/**/*.test.ts\"",
```

En `apps/frontend/tsconfig.json`, dentro de `compilerOptions`, después de `"noEmit": true,`:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Paso 2: escribir las pruebas que fallan**

`lib/sunat/estados.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTADOS_SUNAT, accionesPermitidas, colorEstado, estaEnProceso, etiquetaEstado } from './estados.ts';

test('los ocho estados tienen etiqueta, color y acciones', () => {
  assert.equal(ESTADOS_SUNAT.length, 8);
  for (const estado of ESTADOS_SUNAT) {
    assert.equal(etiquetaEstado(estado), `estados.${estado}`);
    assert.ok(colorEstado(estado));
    assert.ok(Array.isArray(accionesPermitidas(estado)));
  }
});

test('acciones según el estado', () => {
  assert.deepEqual(accionesPermitidas('BORRADOR'), ['editar', 'eliminar', 'emitir']);
  assert.deepEqual(accionesPermitidas('ACEPTADO'), ['pdf', 'xml', 'cdr', 'anular', 'notaCredito', 'notaDebito']);
  assert.deepEqual(accionesPermitidas('ACEPTADO_CON_OBS'), ['pdf', 'xml', 'cdr', 'anular', 'notaCredito', 'notaDebito']);
  assert.deepEqual(accionesPermitidas('RECHAZADO'), ['corregir']);
  assert.deepEqual(accionesPermitidas('ANULADO'), ['pdf', 'xml', 'cdr']);
  assert.deepEqual(accionesPermitidas('PENDIENTE_ENVIO'), []);
  assert.deepEqual(accionesPermitidas('ANULACION_PENDIENTE'), []);
});

test('estados en proceso', () => {
  assert.deepEqual(ESTADOS_SUNAT.filter(estaEnProceso), ['PENDIENTE_ENVIO', 'ERROR_TEMPORAL', 'ANULACION_PENDIENTE']);
});

test('colores', () => {
  assert.equal(colorEstado('ACEPTADO'), 'success');
  assert.equal(colorEstado('RECHAZADO'), 'danger');
  assert.equal(colorEstado('BORRADOR'), 'neutral');
});

test('accionesPermitidas devuelve una copia', () => {
  accionesPermitidas('BORRADOR').push('anular');
  assert.deepEqual(accionesPermitidas('BORRADOR'), ['editar', 'eliminar', 'emitir']);
});
```

`lib/sunat/formato.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { fechaCorta, filasDesdeComprobante, filasDesdeVista, formatearMonto, nombreArchivo, numeroComprobante } from './formato.ts';

test('formatearMonto usa el formato peruano', () => {
  const soles = formatearMonto('1180', 'PEN');
  assert.match(soles, /S\//);
  assert.match(soles, /1,180\.00/);
  assert.match(formatearMonto(null, 'USD'), /0\.00/);
  assert.match(formatearMonto('abc', 'PEN'), /0\.00/);
});

test('fechaCorta usa la hora de Lima', () => {
  assert.equal(fechaCorta('2026-11-02T03:00:00.000Z'), '01/11/2026');
});

test('numeroComprobante y nombreArchivo', () => {
  assert.equal(numeroComprobante({ serie: 'F001', numero: 7 }), 'F001-7');
  assert.equal(numeroComprobante({ serie: 'F001', numero: null }), null);
  const c = { tipoComprobante: '01' as const, serie: 'F001', numero: 7 };
  assert.equal(nombreArchivo('20000000001', c, 'pdf'), '20000000001-01-F001-7.pdf');
  assert.equal(nombreArchivo('20000000001', c, 'xml'), '20000000001-01-F001-7.xml');
  assert.equal(nombreArchivo('20000000001', c, 'cdr'), '20000000001-01-F001-7.cdr.zip');
});

test('filasDesdeVista solo muestra lo que no es cero', () => {
  const filas = filasDesdeVista({
    totales: { gravadas: '1000.00', exoneradas: '0.00', inafectas: '0.00', exportacion: '0.00', igv: '180.00', icbper: '0.00', total: '1180.00' },
    detraccion: { monto: '142.00' }, percepcion: null, retencion: null, netoPendiente: '1038.00',
  });
  assert.deepEqual(filas, [
    { clave: 'gravadas', monto: '1000.00' },
    { clave: 'igv', monto: '180.00' },
    { clave: 'detraccion', monto: '142.00' },
    { clave: 'neto', monto: '1038.00' },
  ]);
});

test('filasDesdeComprobante lee los campos guardados', () => {
  const filas = filasDesdeComprobante({
    totalGravadas: '100', totalExoneradas: '50', totalInafectas: '0', totalExportacion: '0', igv: '18', totalIcbper: '0',
    detraccionMonto: null, percepcionMonto: null, retencionMonto: null, netoPendiente: '168',
  });
  assert.deepEqual(filas, [
    { clave: 'gravadas', monto: '100' },
    { clave: 'exoneradas', monto: '50' },
    { clave: 'igv', monto: '18' },
  ]);
});
```

`lib/sunat/errores.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarError } from './errores.ts';

const conCuerpo = (status: number, body: unknown, message = 'x') => Object.assign(new Error(message), { status, body });

test('422 trae la lista de errores', () => {
  const n = normalizarError(conCuerpo(422, { error: 'Falta RUC. Serie mal', errores: ['Falta RUC', 'Serie mal'] }), 'caído');
  assert.deepEqual(n, { mensaje: 'Falta RUC. Serie mal', errores: ['Falta RUC', 'Serie mal'], accion: null, status: 422 });
});

test('409 de fuera de plazo trae la acción', () => {
  const n = normalizarError(conCuerpo(409, { error: 'venció', accion: 'EMITIR_NOTA_CREDITO' }), 'caído');
  assert.equal(n.accion, 'EMITIR_NOTA_CREDITO');
});

test('503 usa el mensaje de no disponible', () => {
  assert.equal(normalizarError(conCuerpo(503, { error: 'interno' }), 'SUNAT no disponible').mensaje, 'SUNAT no disponible');
});

test('errores comunes y vacíos', () => {
  assert.equal(normalizarError(new Error('red caída'), 'x').mensaje, 'red caída');
  assert.deepEqual(normalizarError(null, 'x'), { mensaje: 'Error', errores: [], accion: null, status: null });
});
```

- [ ] **Paso 3: correr y ver que fallan**

Correr: `npm test` (desde `apps/frontend`)
Esperado: FAIL con `Cannot find module …/estados.ts`.

- [ ] **Paso 4: implementar**

`lib/sunat/tipos.ts`:

```ts
// Tipos de la API SUNAT del backend (/api/comprobantes y /api/sunat). Los montos llegan como string (Decimal de Prisma).
export type EstadoSunat =
  | 'BORRADOR' | 'PENDIENTE_ENVIO' | 'ERROR_TEMPORAL' | 'ACEPTADO' | 'ACEPTADO_CON_OBS'
  | 'RECHAZADO' | 'ANULACION_PENDIENTE' | 'ANULADO';
export type TipoComprobante = '01' | '03' | '07' | '08';
export type Afectacion = '10' | '20' | '30' | '40';
export type TipoOperacion = '0101' | '0200' | '1001';
export type Moneda = 'PEN' | 'USD' | 'EUR';
export type Monto = string;

export interface ClienteResumen {
  id: string;
  razonSocial: string;
  nombre?: string;
  tipoDocumento: string;
  numeroDocumento: string | null;
  email?: string | null;
  esAgenteRetencion?: boolean;
}

export interface ProductoResumen {
  id: string;
  codigo: string | null;
  nombre: string;
  unidadMedida: string;
  precioUnitario: Monto | number;
  precioConIgv: boolean;
}

export interface LineaComprobante {
  id: string;
  orden: number;
  productoId: string | null;
  codigoProductoSunat: string | null;
  descripcion: string;
  cantidad: Monto;
  unidadMedida: string;
  codigoUnidadSunat: string;
  precioUnitario: Monto;
  precioIncluyeIgv: boolean;
  valorUnitario: Monto | null;
  descuento: Monto;
  subtotal: Monto;
  igv: Monto;
  icbper: Monto;
  cantidadBolsasIcbper: number;
  total: Monto;
  tipoAfectacionIgv: Afectacion;
}

export interface CuotaComprobante {
  id: string;
  numero: number;
  monto: Monto;
  fechaVencimiento: string;
}

export interface EnvioSunat {
  id: string;
  operacion: string;
  codigo: string | null;
  mensaje: string | null;
  exito: boolean;
  createdAt: string;
}

export interface Comprobante {
  id: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  numero: number | null;
  fechaEmision: string;
  estadoSunat: EstadoSunat;
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  tipoCambio: Monto | null;
  formaPago: 'Contado' | 'Credito';
  observaciones: string | null;
  subtotal: Monto;
  descuento: Monto;
  igv: Monto;
  total: Monto;
  totalGravadas: Monto;
  totalExoneradas: Monto;
  totalInafectas: Monto;
  totalExportacion: Monto;
  totalIcbper: Monto;
  montoEnLetras: string | null;
  detraccionCodigo: string | null;
  detraccionMonto: Monto | null;
  percepcionRegimen: string | null;
  percepcionMonto: Monto | null;
  retencionMonto: Monto | null;
  netoPendiente: Monto | null;
  docRelacionadoId: string | null;
  docRelacionadoTipo: TipoComprobante | null;
  docRelacionadoSerie: string | null;
  docRelacionadoNumero: number | null;
  motivoCodigo: string | null;
  motivoDescripcion: string | null;
  codigoRespuestaSunat: string | null;
  mensajeRespuestaSunat: string | null;
  hashSunat: string | null;
  xmlKey: string | null;
  cdrKey: string | null;
  clienteId: string;
  cliente: ClienteResumen;
  detalles: LineaComprobante[];
  cuotas: CuotaComprobante[];
  envios?: EnvioSunat[];
}

export interface LineaPayload {
  productoId?: string;
  codigoProducto?: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio: number;
  precioIncluyeIgv: boolean;
  descuento: number;
  afectacion: Afectacion;
  bolsasIcbper: number;
}

export type FormaPagoPayload =
  | { tipo: 'Contado' }
  | { tipo: 'Credito'; cuotas: { monto: number; fechaVencimiento: string }[] };

export interface ComprobantePayload {
  tipoComprobante: TipoComprobante;
  serie: string;
  clienteId: string;
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  tipoCambio?: number;
  observaciones?: string;
  lineas: LineaPayload[];
  detraccion?: { codigo: string };
  percepcion?: { regimen: string };
  formaPago: FormaPagoPayload;
  documentoAfectado?: { facturaId: string; motivoCodigo: string; motivoDescripcion?: string };
}

export interface VistaPrevia {
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  formaPago: 'Contado' | 'Credito';
  netoPendiente: Monto;
  totales: {
    gravadas: Monto; exoneradas: Monto; inafectas: Monto; exportacion: Monto; igv: Monto; icbper: Monto;
    descuento: Monto; valorVenta: Monto; totalImpuestos: Monto; total: Monto;
  };
  leyendas: { codigo: string; valor: string }[];
  detraccion: { codigo: string; porcentaje: string; monto: Monto; montoMoneda: Monto } | null;
  percepcion: { regimen: string; porcentaje: string; base: Monto; monto: Monto; total: Monto } | null;
  retencion: { porcentaje: string; base: Monto; monto: Monto } | null;
  cuotas: { numero: number; monto: Monto; fechaVencimiento: string }[];
}

export interface EmisorVista {
  configurado: boolean;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  urbanizacion?: string | null;
  direccionFiscal?: string;
  codigoEstablecimiento?: string;
  ambiente?: 'BETA' | 'PRODUCCION';
  solUsuario?: string | null;
  tieneClaveSol?: boolean;
  tieneCertificado?: boolean;
  certificadoVence?: string | null;
  cuentaDetracciones?: string | null;
  esAgenteRetencion?: boolean;
  esAgentePercepcion?: boolean;
}

export interface EmisorPayload {
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  urbanizacion?: string;
  direccionFiscal: string;
  codigoEstablecimiento: string;
  ambiente: 'BETA' | 'PRODUCCION';
  confirmarProduccion?: boolean;
  solUsuario?: string;
  solClave?: string;
  certificado?: { pfxBase64: string; clave: string };
  cuentaDetracciones?: string;
  esAgenteRetencion?: boolean;
  esAgentePercepcion?: boolean;
}

export interface Serie {
  id: string;
  tipoDocumento: string;
  serie: string;
  ultimoNumero: number;
  activa: boolean;
}

export interface AlertasSunat {
  certificadoPorVencer: { vence: string } | null;
  comprobantesPendientes: {
    id: string; serie: string; numero: number | null; fechaEmision: string; estadoSunat: EstadoSunat;
    mensajeRespuestaSunat: string | null; diasRestantes: number;
  }[];
  ticketsAtascados: { id: string; tipo: string; ticket: string | null; createdAt: string }[];
}

export interface OpcionCatalogo {
  codigo: string;
  descripcion: string;
  porcentaje?: string;
}

export interface CatalogosSunat {
  afectaciones: OpcionCatalogo[];
  tiposOperacion: OpcionCatalogo[];
  unidades: OpcionCatalogo[];
  motivosNotaCredito: OpcionCatalogo[];
  motivosNotaDebito: OpcionCatalogo[];
  detracciones: OpcionCatalogo[];
  percepciones: OpcionCatalogo[];
}
```

`lib/sunat/estados.ts`:

```ts
import type { EstadoSunat } from './tipos';

export type VarianteEstado = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'amber' | 'violet';
export type AccionComprobante =
  | 'editar' | 'eliminar' | 'emitir' | 'pdf' | 'xml' | 'cdr' | 'anular' | 'notaCredito' | 'notaDebito' | 'corregir';

interface Definicion {
  variante: VarianteEstado;
  acciones: AccionComprobante[];
  enProceso: boolean;
}

const ACEPTADO: AccionComprobante[] = ['pdf', 'xml', 'cdr', 'anular', 'notaCredito', 'notaDebito'];

const DEFINICIONES: Record<EstadoSunat, Definicion> = {
  BORRADOR: { variante: 'neutral', acciones: ['editar', 'eliminar', 'emitir'], enProceso: false },
  PENDIENTE_ENVIO: { variante: 'info', acciones: [], enProceso: true },
  ERROR_TEMPORAL: { variante: 'warning', acciones: [], enProceso: true },
  ACEPTADO: { variante: 'success', acciones: ACEPTADO, enProceso: false },
  ACEPTADO_CON_OBS: { variante: 'amber', acciones: ACEPTADO, enProceso: false },
  RECHAZADO: { variante: 'danger', acciones: ['corregir'], enProceso: false },
  ANULACION_PENDIENTE: { variante: 'violet', acciones: [], enProceso: true },
  ANULADO: { variante: 'neutral', acciones: ['pdf', 'xml', 'cdr'], enProceso: false },
};

export const ESTADOS_SUNAT = Object.keys(DEFINICIONES) as EstadoSunat[];

// Clave i18n dentro del namespace «sunat».
export function etiquetaEstado(estado: EstadoSunat): string {
  return `estados.${estado}`;
}

export function colorEstado(estado: EstadoSunat): VarianteEstado {
  return DEFINICIONES[estado]?.variante ?? 'neutral';
}

export function accionesPermitidas(estado: EstadoSunat): AccionComprobante[] {
  return [...(DEFINICIONES[estado]?.acciones ?? [])];
}

export function estaEnProceso(estado: EstadoSunat): boolean {
  return DEFINICIONES[estado]?.enProceso ?? false;
}
```

`lib/sunat/formato.ts`:

```ts
import type { TipoComprobante } from './tipos';

export interface FilaTotal {
  clave: string;
  monto: string;
}

const esCero = (valor: unknown): boolean => {
  const n = Number(valor ?? 0);
  return !Number.isFinite(n) || n === 0;
};

export function formatearMonto(valor: string | number | null | undefined, moneda = 'PEN'): string {
  const n = Number(valor ?? 0);
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda, minimumFractionDigits: 2 })
    .format(Number.isFinite(n) ? n : 0);
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(iso));
}

export function numeroComprobante(c: { serie: string; numero: number | null }): string | null {
  return c.numero == null ? null : `${c.serie}-${c.numero}`;
}

export function nombreArchivo(
  ruc: string,
  c: { tipoComprobante: TipoComprobante; serie: string; numero: number | null },
  tipo: 'pdf' | 'xml' | 'cdr',
): string {
  return `${ruc}-${c.tipoComprobante}-${c.serie}-${c.numero}.${tipo === 'cdr' ? 'cdr.zip' : tipo}`;
}

function filas(pares: [string, unknown][]): FilaTotal[] {
  return pares.filter(([, monto]) => !esCero(monto)).map(([clave, monto]) => ({ clave, monto: String(monto) }));
}

export function filasDesdeVista(v: {
  totales: { gravadas: string; exoneradas: string; inafectas: string; exportacion: string; igv: string; icbper: string };
  detraccion: { monto: string } | null;
  percepcion: { monto: string } | null;
  retencion: { monto: string } | null;
  netoPendiente: string;
}): FilaTotal[] {
  const t = v.totales;
  const conNeto = Boolean(v.detraccion || v.retencion);
  return filas([
    ['gravadas', t.gravadas], ['exoneradas', t.exoneradas], ['inafectas', t.inafectas], ['exportacion', t.exportacion],
    ['igv', t.igv], ['icbper', t.icbper], ['detraccion', v.detraccion?.monto], ['percepcion', v.percepcion?.monto],
    ['retencion', v.retencion?.monto], ['neto', conNeto ? v.netoPendiente : null],
  ]);
}

export function filasDesdeComprobante(c: {
  totalGravadas: string; totalExoneradas: string; totalInafectas: string; totalExportacion: string; igv: string;
  totalIcbper: string; detraccionMonto: string | null; percepcionMonto: string | null; retencionMonto: string | null;
  netoPendiente: string | null;
}): FilaTotal[] {
  const conNeto = !esCero(c.detraccionMonto) || !esCero(c.retencionMonto);
  return filas([
    ['gravadas', c.totalGravadas], ['exoneradas', c.totalExoneradas], ['inafectas', c.totalInafectas],
    ['exportacion', c.totalExportacion], ['igv', c.igv], ['icbper', c.totalIcbper], ['detraccion', c.detraccionMonto],
    ['percepcion', c.percepcionMonto], ['retencion', c.retencionMonto], ['neto', conNeto ? c.netoPendiente : null],
  ]);
}
```

`lib/sunat/errores.ts`:

```ts
export interface ErrorNormalizado {
  mensaje: string;
  errores: string[];
  accion: string | null;
  status: number | null;
}

// Lee un ApiError (lib/api.ts) sin importarlo: basta con que tenga status y body.
export function normalizarError(error: unknown, mensajeNoDisponible: string): ErrorNormalizado {
  const e = error as { message?: string; status?: number; body?: { error?: string; errores?: unknown; accion?: string } } | null;
  const status = typeof e?.status === 'number' ? e.status : null;
  if (status === 503) return { mensaje: mensajeNoDisponible, errores: [], accion: null, status };
  const lista = e?.body?.errores;
  const errores = Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [];
  return {
    mensaje: e?.body?.error || e?.message || 'Error',
    errores,
    accion: typeof e?.body?.accion === 'string' ? e.body.accion : null,
    status,
  };
}
```

Reemplazar `apps/frontend/lib/api.ts` completo por:

```ts
// Ensure API_URL ends with /api
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

// Error de la API: conserva el código HTTP y el cuerpo (p. ej. `errores[]` y `accion` de SUNAT).
export class ApiError extends Error {
  status: number;
  body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async fallar(response: Response): Promise<never> {
    let body: any = null;
    let errorMessage = 'Error en la petición';
    try {
      body = await response.json();
      errorMessage = body.error || body.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new ApiError(errorMessage, response.status, body);
  }

  private async leer<T>(response: Response): Promise<T> {
    if (!response.ok) return this.fallar(response);
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.leer<T>(response);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.leer<T>(response);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.leer<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.leer<T>(response);
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.leer<T>(response);
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.leer<T>(response);
  }

  // Descarga binaria (PDF, XML, CDR) con el token.
  async getBlob(endpoint: string): Promise<Blob> {
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });
    if (!response.ok) return this.fallar(response);
    return response.blob();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
```

En `contexts/AuthContext.tsx`, dentro de `interface Empresa`, después de `serieProforma: string;`:

```ts
  pais?: string; // 'US' | 'PE': 'PE' activa la facturación electrónica SUNAT
```

En `messages/es.json`, dentro del objeto `"navigation"`, agregar `"vouchers": "Comprobantes"`. Al final del archivo (como última clave del objeto raíz, con la coma que corresponda), agregar:

```json
  "sunat": {
    "titulo": "Comprobantes electrónicos",
    "subtitulo": "Facturas, boletas y notas enviadas a SUNAT",
    "nuevo": "Nuevo comprobante",
    "editar": "Editar comprobante",
    "nuevaNota": "Nueva nota",
    "borrador": "Borrador",
    "volver": "Volver",
    "tipos": { "01": "Factura", "03": "Boleta", "07": "Nota de crédito", "08": "Nota de débito" },
    "estados": {
      "BORRADOR": "Borrador",
      "PENDIENTE_ENVIO": "Pendiente de envío",
      "ERROR_TEMPORAL": "Reintentando",
      "ACEPTADO": "Aceptado",
      "ACEPTADO_CON_OBS": "Aceptado con observaciones",
      "RECHAZADO": "Rechazado",
      "ANULACION_PENDIENTE": "Anulación en proceso",
      "ANULADO": "Anulado"
    },
    "columnas": { "numero": "Número", "tipo": "Tipo", "cliente": "Cliente", "fecha": "Fecha", "total": "Total", "estado": "Estado" },
    "filtros": { "todosTipos": "Todos los tipos", "todosEstados": "Todos los estados" },
    "vacio": "Todavía no hay comprobantes",
    "vacioDescripcion": "Crea tu primer comprobante electrónico",
    "form": {
      "tipoComprobante": "Tipo de comprobante",
      "serie": "Serie",
      "seleccionaSerie": "Selecciona una serie",
      "sinSeries": "No hay series para este tipo. Créalas en Configuración › SUNAT.",
      "cliente": "Cliente",
      "seleccionaCliente": "Selecciona un cliente",
      "buscarCliente": "Buscar cliente…",
      "operacion": "Operación",
      "moneda": "Moneda",
      "tipoCambio": "Tipo de cambio",
      "observaciones": "Observaciones",
      "lineas": "Líneas",
      "linea": "Línea {n}",
      "agregarLinea": "Agregar línea",
      "producto": "Producto (opcional)",
      "sinProducto": "Sin producto",
      "codigo": "Código",
      "descripcion": "Descripción",
      "cantidad": "Cantidad",
      "unidad": "Unidad",
      "precio": "Precio",
      "incluyeIgv": "El precio incluye IGV",
      "descuento": "Descuento (sin IGV)",
      "afectacion": "Afectación",
      "bolsas": "Bolsas ICBPER",
      "quitar": "Quitar",
      "detraccion": "Código de detracción",
      "seleccionaDetraccion": "Selecciona el servicio",
      "percepcion": "Régimen de percepción",
      "sinPercepcion": "Sin percepción",
      "formaPago": "Forma de pago",
      "contado": "Contado",
      "credito": "Crédito",
      "cuotas": "Cuotas",
      "numeroCuotas": "Número de cuotas",
      "primeraFecha": "Primer vencimiento",
      "repartir": "Repartir",
      "agregarCuota": "Agregar cuota",
      "monto": "Monto",
      "vencimiento": "Vencimiento",
      "faltaCuotas": "Faltan {monto} para el neto pendiente",
      "sobraCuotas": "Sobran {monto} sobre el neto pendiente",
      "esperaTotales": "Completa el comprobante para ver el neto pendiente",
      "documentoAfectado": "Comprobante que modifica",
      "motivo": "Motivo",
      "seleccionaMotivo": "Selecciona el motivo",
      "motivoDescripcion": "Detalle del motivo (opcional)",
      "guardarBorrador": "Guardar borrador",
      "guardarEmitir": "Guardar y emitir",
      "confirmarEmitirTitulo": "¿Emitir el comprobante?",
      "confirmarEmitir": "Se enviará a SUNAT y ya no se podrá editar.",
      "emitir": "Emitir",
      "guardado": "Borrador guardado",
      "emitido": "Comprobante enviado a SUNAT",
      "revisa": "Revisa lo siguiente:"
    },
    "totales": {
      "titulo": "Totales",
      "gravadas": "Op. gravadas",
      "exoneradas": "Op. exoneradas",
      "inafectas": "Op. inafectas",
      "exportacion": "Exportación",
      "igv": "IGV",
      "icbper": "ICBPER",
      "detraccion": "Detracción (S/)",
      "percepcion": "Percepción",
      "retencion": "Retención",
      "neto": "Neto pendiente",
      "total": "Importe total",
      "calculando": "Calculando…",
      "sinDatos": "Completa cliente, serie y líneas para ver los totales"
    },
    "detalle": {
      "mensajeSunat": "Respuesta de SUNAT",
      "enProceso": "SUNAT está procesando el comprobante…",
      "actualizar": "Actualizar",
      "modifica": "Modifica a {documento}",
      "motivo": "Motivo: {motivo}",
      "lineas": "Detalle",
      "historial": "Historial de envíos",
      "operacion": "Operación",
      "codigo": "Código",
      "mensaje": "Mensaje",
      "fecha": "Fecha",
      "sinEnvios": "Sin envíos todavía",
      "noEncontrado": "No se encontró el comprobante"
    },
    "acciones": {
      "editar": "Editar",
      "eliminar": "Eliminar",
      "emitir": "Emitir",
      "pdf": "PDF",
      "xml": "XML",
      "cdr": "CDR",
      "anular": "Anular",
      "notaCredito": "Nota de crédito",
      "notaDebito": "Nota de débito",
      "corregir": "Corregir y emitir nuevo",
      "confirmarEliminarTitulo": "¿Eliminar el borrador?",
      "confirmarEliminar": "El borrador se borrará definitivamente."
    },
    "anular": {
      "titulo": "Anular comprobante",
      "motivo": "Motivo de la anulación",
      "confirmar": "Anular",
      "fueraPlazoTitulo": "El plazo de baja venció",
      "fueraPlazo": "Para anular este comprobante emite una nota de crédito por anulación.",
      "emitirNc": "Emitir nota de crédito por anulación",
      "enviado": "Anulación enviada a SUNAT"
    },
    "errores": {
      "noDisponible": "SUNAT o el motor no están disponibles, intenta en unos minutos"
    },
    "emisor": {
      "pestana": "SUNAT",
      "titulo": "Facturación electrónica SUNAT",
      "activarTitulo": "¿Facturas en Perú?",
      "activarDescripcion": "Activa la facturación electrónica SUNAT configurando los datos de tu emisor.",
      "activar": "Activar facturación electrónica",
      "datosFiscales": "Datos fiscales",
      "ubigeo": "Ubigeo",
      "departamento": "Departamento",
      "provincia": "Provincia",
      "distrito": "Distrito",
      "urbanizacion": "Urbanización",
      "direccionFiscal": "Dirección fiscal",
      "codigoEstablecimiento": "Código de establecimiento",
      "ambiente": "Ambiente",
      "beta": "Beta (pruebas)",
      "produccion": "Producción",
      "confirmarProduccion": "Escribe tu RUC ({ruc}) para pasar a producción",
      "credenciales": "Credenciales SOL y certificado",
      "solUsuario": "Usuario SOL secundario",
      "solClave": "Clave SOL",
      "configurada": "Configurada ✓",
      "cambiar": "Cambiar",
      "certificado": "Certificado digital (.pfx)",
      "certificadoClave": "Clave del certificado",
      "certificadoVence": "Certificado vigente hasta el {fecha}",
      "sinCertificado": "Sin certificado",
      "otros": "Detracción, retención y percepción",
      "cuentaDetracciones": "Cuenta de detracciones (Banco de la Nación)",
      "agenteRetencion": "Soy agente de retención",
      "agentePercepcion": "Soy agente de percepción",
      "guardar": "Guardar",
      "guardado": "Emisor guardado"
    },
    "series": {
      "titulo": "Series",
      "tipo": "Tipo",
      "serie": "Serie",
      "ultimoNumero": "Último número",
      "agregar": "Agregar serie",
      "creada": "Serie creada",
      "letraInvalida": "La serie debe tener 4 caracteres y empezar con {letras}",
      "vacio": "Todavía no hay series"
    },
    "alertas": {
      "titulo": "Alertas SUNAT",
      "certificado": "Tu certificado digital vence el {fecha}",
      "pendiente": "{numero}: quedan {dias} días de plazo para enviarlo",
      "tickets": "{n} anulaciones sin respuesta de SUNAT",
      "ver": "Ver"
    },
    "clientes": {
      "agenteRetencion": "Agente de retención",
      "tiposDoc": { "RUC": "RUC", "DNI": "DNI", "CE": "Carné de extranjería", "PASAPORTE": "Pasaporte", "OTHER": "Sin documento / del exterior" }
    }
  }
```

En `messages/en.json`: la misma estructura de claves y en el mismo lugar, con estos textos en inglés: `navigation.vouchers` = "E-invoices"; `sunat.titulo` = "Electronic invoices (SUNAT)"; `tipos` = Invoice / Receipt / Credit note / Debit note; `estados` = Draft / Pending / Retrying / Accepted / Accepted with notes / Rejected / Voiding / Voided. El resto, con una traducción literal y breve de cada texto en español, manteniendo los mismos marcadores `{n}`, `{monto}`, `{ruc}`, `{fecha}`, `{numero}`, `{dias}`, `{documento}`, `{motivo}` y `{letras}`. Comprueba que las dos versiones tengan exactamente las mismas claves:

```bash
node -e "const a=require('./messages/es.json').sunat,b=require('./messages/en.json').sunat;const k=(o,p='')=>Object.entries(o).flatMap(([x,v])=>typeof v==='object'?k(v,p+x+'.'):[p+x]);const ka=k(a).sort().join(),kb=k(b).sort().join();console.log(ka===kb?'claves iguales':'DIFIEREN');process.exit(ka===kb?0:1)"
```

- [ ] **Paso 5: correr pruebas y tipos**

Correr: `npm test && npx tsc --noEmit`
Esperado: PASS (14 pruebas) y `tsc` sin errores. Si `formatearMonto` no da exactamente `S/` y `1,180.00` con el ICU de tu Node, ajusta la aserción a la salida real y dilo.

- [ ] **Paso 6: commit**

```bash
git add lib/api.ts lib/sunat package.json tsconfig.json contexts/AuthContext.tsx messages/es.json messages/en.json
git commit -m "feat(sunat): base del frontend SUNAT: tipos, estados, formato, errores e i18n"
```

---

### Tarea 4: Frontend — formulario, cliente de API y hooks

`Riesgo: alto` · `Delicado: sí` (montos y cuotas) · `Permitidos: apps/frontend/lib/sunat/formulario.ts, apps/frontend/lib/sunat/formulario.test.ts, apps/frontend/lib/sunat/api.ts, apps/frontend/lib/sunat/hooks.ts, docs/HANDOFF.md`

**Consume:** los tipos de `tipos.ts` y `apiClient` de `lib/api.ts` (tarea 3).

**Produce:**
- `formulario.ts`:
  - Tipos: `LineaFormulario`, `CuotaFormulario`, `FormularioComprobante`, `CamposVisibles`.
  - Funciones: `nuevaClave()`, `esNota(tipo)`, `esRuc(tipoDocumento)`, `codigoUnidad(unidad)`, `lineaVacia()`, `formularioInicial(tipo)`, `formularioDesdeComprobante(c)`, `formularioParaNota(afectado, tipo, motivo)`, `aPayload(f)`, `payloadVistaPrevia(f)`, `listoParaVistaPrevia(f)`, `sumarMeses(fecha, meses)`, `repartirCuotas(neto, n, primeraFecha)`, `diferenciaCuotas(cuotas, neto)`, `camposVisibles(f, emisor)`, `validarSerie(tipo, serie)`, `seriesDeTipo(series, tipo)`, `clientesPermitidos(clientes, f)`.
- `api.ts`: `sunatApi` (ver código) y `guardarArchivo(id, tipo, nombre)`.
- `hooks.ts`: `useCatalogosSunat() → CatalogosSunat | null` y `useEmisorSunat() → { emisor, recargar }`.

- [ ] **Paso 1: escribir la prueba que falla** (`lib/sunat/formulario.test.ts`)

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aPayload, camposVisibles, clientesPermitidos, codigoUnidad, diferenciaCuotas, esRuc, formularioDesdeComprobante,
  formularioInicial, formularioParaNota, lineaVacia, listoParaVistaPrevia, payloadVistaPrevia, repartirCuotas,
  seriesDeTipo, sumarMeses, validarSerie, type FormularioComprobante,
} from './formulario.ts';
import type { Comprobante } from './tipos';

const base = (extra: Partial<FormularioComprobante> = {}): FormularioComprobante => ({
  ...formularioInicial('01'),
  serie: 'F001',
  clienteId: 'c1',
  lineas: [{ ...lineaVacia(), descripcion: 'Servicio', cantidad: '2', precio: '59', precioIncluyeIgv: true }],
  ...extra,
});

test('factura al contado', () => {
  const p = aPayload(base());
  assert.deepEqual(p, {
    tipoComprobante: '01', serie: 'F001', clienteId: 'c1', tipoOperacion: '0101', moneda: 'PEN',
    lineas: [{ descripcion: 'Servicio', cantidad: 2, unidad: 'NIU', precio: 59, precioIncluyeIgv: true, descuento: 0, afectacion: '10', bolsasIcbper: 0 }],
    formaPago: { tipo: 'Contado' },
  });
});

test('crédito con cuotas y tipo de cambio solo fuera de PEN', () => {
  const p = aPayload(base({
    moneda: 'USD', tipoCambio: '3.75', formaPago: 'Credito',
    cuotas: [{ clave: 'a', monto: '59.00', fechaVencimiento: '2026-12-01' }, { clave: 'b', monto: '59,00', fechaVencimiento: '2027-01-01' }],
  }));
  assert.equal(p.tipoCambio, 3.75);
  assert.deepEqual(p.formaPago, { tipo: 'Credito', cuotas: [{ monto: 59, fechaVencimiento: '2026-12-01' }, { monto: 59, fechaVencimiento: '2027-01-01' }] });
  assert.equal(aPayload(base({ tipoCambio: '3.75' })).tipoCambio, undefined);
});

test('detracción solo con operación 1001; percepción si se elige', () => {
  assert.deepEqual(aPayload(base({ tipoOperacion: '1001', detraccionCodigo: '037' })).detraccion, { codigo: '037' });
  assert.equal(aPayload(base({ tipoOperacion: '0101', detraccionCodigo: '037' })).detraccion, undefined);
  assert.deepEqual(aPayload(base({ percepcionRegimen: '51' })).percepcion, { regimen: '51' });
});

test('exportación fuerza afectación 40', () => {
  assert.equal(aPayload(base({ tipoOperacion: '0200' })).lineas[0].afectacion, '40');
});

test('producto y código solo si existen; observaciones recortadas', () => {
  const p = aPayload(base({
    observaciones: '  nota  ',
    lineas: [{ ...lineaVacia(), productoId: 'p1', codigoProducto: ' P-01 ', descripcion: ' Caja ', cantidad: '1', precio: '10', descuento: '', bolsasIcbper: '2' }],
  }));
  assert.equal(p.observaciones, 'nota');
  assert.deepEqual(p.lineas[0], { productoId: 'p1', codigoProducto: 'P-01', descripcion: 'Caja', cantidad: 1, unidad: 'NIU', precio: 10, precioIncluyeIgv: true, descuento: 0, afectacion: '10', bolsasIcbper: 2 });
});

test('nota de crédito: documento afectado, contado y sin detracción ni percepción', () => {
  const p = aPayload(base({
    tipoComprobante: '07', serie: 'FC01', tipoOperacion: '1001', detraccionCodigo: '037', percepcionRegimen: '51',
    formaPago: 'Credito', cuotas: [{ clave: 'a', monto: '1', fechaVencimiento: '2026-12-01' }],
    documentoAfectadoId: 'f1', motivoCodigo: '01', motivoDescripcion: '',
  }));
  assert.equal(p.tipoOperacion, '0101');
  assert.deepEqual(p.formaPago, { tipo: 'Contado' });
  assert.equal(p.detraccion, undefined);
  assert.equal(p.percepcion, undefined);
  assert.deepEqual(p.documentoAfectado, { facturaId: 'f1', motivoCodigo: '01' });
});

test('la vista previa siempre se pide al contado (el neto no depende de las cuotas)', () => {
  assert.deepEqual(payloadVistaPrevia(base({ formaPago: 'Credito', cuotas: [] })).formaPago, { tipo: 'Contado' });
});

test('listoParaVistaPrevia', () => {
  assert.equal(listoParaVistaPrevia(base()), true);
  assert.equal(listoParaVistaPrevia(base({ clienteId: '' })), false);
  assert.equal(listoParaVistaPrevia(base({ lineas: [{ ...lineaVacia(), descripcion: '', precio: '1' }] })), false);
  assert.equal(listoParaVistaPrevia(base({ lineas: [{ ...lineaVacia(), descripcion: 'x', precio: '' }] })), false);
  assert.equal(listoParaVistaPrevia(base({ tipoComprobante: '07', documentoAfectadoId: 'f1', motivoCodigo: '' })), false);
});

test('repartirCuotas suma exacto al céntimo y fechas mensuales', () => {
  const cuotas = repartirCuotas('100.00', 3, '2026-12-31');
  assert.deepEqual(cuotas.map((c) => c.monto), ['33.33', '33.33', '33.34']);
  assert.deepEqual(cuotas.map((c) => c.fechaVencimiento), ['2026-12-31', '2027-01-31', '2027-02-28']);
  assert.deepEqual(repartirCuotas('1038.00', 2, '2026-12-15').map((c) => c.monto), ['519.00', '519.00']);
  assert.deepEqual(repartirCuotas('0', 2, '2026-12-15'), []);
  assert.equal(new Set(cuotas.map((c) => c.clave)).size, 3);
});

test('sumarMeses respeta el último día del mes', () => {
  assert.equal(sumarMeses('2027-01-31', 1), '2027-02-28');
  assert.equal(sumarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(sumarMeses('2026-11-15', 0), '2026-11-15');
});

test('diferenciaCuotas: positivo falta, negativo sobra', () => {
  const c = (monto: string) => ({ clave: monto, monto, fechaVencimiento: '2026-12-01' });
  assert.equal(diferenciaCuotas([c('50.00')], '118.00'), '68.00');
  assert.equal(diferenciaCuotas([c('59.00'), c('59.00')], '118.00'), '0.00');
  assert.equal(diferenciaCuotas([c('120.50')], '118.00'), '-2.50');
});

test('camposVisibles', () => {
  assert.deepEqual(camposVisibles(base(), null), { operacion: true, detraccion: false, percepcion: false, formaPago: true, cuotas: false, tipoCambio: false, documentoAfectado: false });
  assert.equal(camposVisibles(base({ tipoOperacion: '1001' }), null).detraccion, true);
  assert.equal(camposVisibles(base(), { esAgentePercepcion: true }).percepcion, true);
  assert.equal(camposVisibles(base({ formaPago: 'Credito' }), null).cuotas, true);
  assert.equal(camposVisibles(base({ moneda: 'USD' }), null).tipoCambio, true);
  const nota = camposVisibles(base({ tipoComprobante: '07', tipoOperacion: '1001', formaPago: 'Credito' }), { esAgentePercepcion: true });
  assert.deepEqual(nota, { operacion: false, detraccion: false, percepcion: false, formaPago: false, cuotas: false, tipoCambio: false, documentoAfectado: true });
});

test('validarSerie', () => {
  assert.equal(validarSerie('01', 'F002'), null);
  assert.equal(validarSerie('01', 'B002'), 'F');
  assert.equal(validarSerie('03', 'b001'), null);
  assert.equal(validarSerie('07', 'BC01'), null);
  assert.equal(validarSerie('07', 'X001'), 'F o B');
  assert.equal(validarSerie('03', 'B01'), 'B');
});

test('esRuc, codigoUnidad, seriesDeTipo y clientesPermitidos', () => {
  assert.equal(esRuc('RUC'), true);
  assert.equal(esRuc('6'), true);
  assert.equal(esRuc('DNI'), false);
  assert.equal(codigoUnidad('UND'), 'NIU');
  assert.equal(codigoUnidad('serv'), 'ZZ');
  assert.equal(codigoUnidad('kgm'), 'KGM');
  assert.equal(codigoUnidad(''), 'NIU');
  const series = [
    { id: '1', tipoDocumento: '01', serie: 'F001', ultimoNumero: 0, activa: true },
    { id: '2', tipoDocumento: '03', serie: 'B001', ultimoNumero: 0, activa: true },
    { id: '3', tipoDocumento: '01', serie: 'F009', ultimoNumero: 0, activa: false },
  ];
  assert.deepEqual(seriesDeTipo(series, '01').map((s) => s.serie), ['F001']);
  const clientes = [
    { id: 'a', razonSocial: 'A', tipoDocumento: 'RUC', numeroDocumento: '20100070970' },
    { id: 'b', razonSocial: 'B', tipoDocumento: 'DNI', numeroDocumento: '12345678' },
  ];
  assert.deepEqual(clientesPermitidos(clientes, base()).map((c) => c.id), ['a']);
  assert.deepEqual(clientesPermitidos(clientes, base({ tipoComprobante: '03' })).map((c) => c.id), ['a', 'b']);
  assert.deepEqual(clientesPermitidos(clientes, base({ tipoOperacion: '0200' })).map((c) => c.id), ['a', 'b']);
});

const comprobante = {
  id: 'f1', tipoComprobante: '01', serie: 'F001', numero: 3, tipoOperacion: '1001', moneda: 'PEN', tipoCambio: null,
  formaPago: 'Credito', observaciones: 'obs', clienteId: 'c1', detraccionCodigo: '037', percepcionRegimen: null,
  docRelacionadoId: null, motivoCodigo: null, motivoDescripcion: null,
  detalles: [
    { orden: 1, productoId: null, codigoProductoSunat: null, descripcion: 'B', cantidad: '1', codigoUnidadSunat: 'ZZ', precioUnitario: '10.0000', precioIncluyeIgv: false, descuento: '0', tipoAfectacionIgv: '10', cantidadBolsasIcbper: 0 },
    { orden: 0, productoId: 'p1', codigoProductoSunat: 'P1', descripcion: 'A', cantidad: '2', codigoUnidadSunat: 'NIU', precioUnitario: '59', precioIncluyeIgv: true, descuento: '1', tipoAfectacionIgv: '10', cantidadBolsasIcbper: 0 },
  ],
  cuotas: [{ numero: 1, monto: '1038', fechaVencimiento: '2026-12-15T17:00:00.000Z' }],
} as unknown as Comprobante;

test('formularioDesdeComprobante reconstruye el borrador ordenado', () => {
  const f = formularioDesdeComprobante(comprobante);
  assert.deepEqual(f.lineas.map((l) => l.descripcion), ['A', 'B']);
  assert.equal(f.lineas[0].precio, '59');
  assert.equal(f.lineas[0].productoId, 'p1');
  assert.deepEqual(f.cuotas.map((c) => [c.monto, c.fechaVencimiento]), [['1038', '2026-12-15']]);
  assert.equal(f.detraccionCodigo, '037');
  assert.equal(f.observaciones, 'obs');
});

test('formularioParaNota copia cliente y líneas y limpia lo que no aplica', () => {
  const f = formularioParaNota(comprobante, '07', '01');
  assert.equal(f.tipoComprobante, '07');
  assert.equal(f.serie, '');
  assert.equal(f.tipoOperacion, '0101');
  assert.equal(f.clienteId, 'c1');
  assert.equal(f.lineas.length, 2);
  assert.equal(f.detraccionCodigo, '');
  assert.equal(f.formaPago, 'Contado');
  assert.deepEqual(f.cuotas, []);
  assert.equal(f.documentoAfectadoId, 'f1');
  assert.equal(f.motivoCodigo, '01');
  assert.equal(formularioParaNota({ ...comprobante, tipoOperacion: '0200' } as Comprobante, '07').tipoOperacion, '0200');
});
```

- [ ] **Paso 2: correr y ver que falla**

Correr: `npm test` (desde `apps/frontend`)
Esperado: FAIL con `Cannot find module …/formulario.ts`.

- [ ] **Paso 3: implementar**

`lib/sunat/formulario.ts`:

```ts
import type {
  Afectacion, ClienteResumen, Comprobante, ComprobantePayload, LineaPayload, Moneda, Serie, TipoComprobante, TipoOperacion,
} from './tipos';

export interface LineaFormulario {
  clave: string;
  productoId: string;
  codigoProducto: string;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precio: string;
  precioIncluyeIgv: boolean;
  descuento: string;
  afectacion: Afectacion;
  bolsasIcbper: string;
}

export interface CuotaFormulario {
  clave: string;
  monto: string;
  fechaVencimiento: string;
}

export interface FormularioComprobante {
  tipoComprobante: TipoComprobante;
  serie: string;
  clienteId: string;
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  tipoCambio: string;
  observaciones: string;
  lineas: LineaFormulario[];
  detraccionCodigo: string;
  percepcionRegimen: string;
  formaPago: 'Contado' | 'Credito';
  cuotas: CuotaFormulario[];
  documentoAfectadoId: string;
  motivoCodigo: string;
  motivoDescripcion: string;
}

export interface CamposVisibles {
  operacion: boolean;
  detraccion: boolean;
  percepcion: boolean;
  formaPago: boolean;
  cuotas: boolean;
  tipoCambio: boolean;
  documentoAfectado: boolean;
}

let contador = 0;
export function nuevaClave(): string {
  contador += 1;
  return `k${contador}`;
}

export function esNota(tipo: TipoComprobante): boolean {
  return tipo === '07' || tipo === '08';
}

export function esRuc(tipoDocumento: string | null | undefined): boolean {
  return ['RUC', '6'].includes(String(tipoDocumento ?? '').trim().toUpperCase());
}

const UNIDADES_LEGADAS: Record<string, string> = { UND: 'NIU', UNIDAD: 'NIU', SERV: 'ZZ', SERVICIO: 'ZZ' };

export function codigoUnidad(unidad: string | null | undefined): string {
  const valor = String(unidad ?? '').trim().toUpperCase();
  if (!valor) return 'NIU';
  return UNIDADES_LEGADAS[valor] ?? valor;
}

export function lineaVacia(): LineaFormulario {
  return {
    clave: nuevaClave(), productoId: '', codigoProducto: '', descripcion: '', cantidad: '1', unidad: 'NIU', precio: '',
    precioIncluyeIgv: true, descuento: '0', afectacion: '10', bolsasIcbper: '0',
  };
}

export function formularioInicial(tipo: TipoComprobante = '01'): FormularioComprobante {
  return {
    tipoComprobante: tipo, serie: '', clienteId: '', tipoOperacion: '0101', moneda: 'PEN', tipoCambio: '', observaciones: '',
    lineas: [lineaVacia()], detraccionCodigo: '', percepcionRegimen: '', formaPago: 'Contado', cuotas: [],
    documentoAfectadoId: '', motivoCodigo: '', motivoDescripcion: '',
  };
}

export function formularioDesdeComprobante(c: Comprobante): FormularioComprobante {
  return {
    tipoComprobante: c.tipoComprobante,
    serie: c.serie,
    clienteId: c.clienteId,
    tipoOperacion: c.tipoOperacion,
    moneda: c.moneda,
    tipoCambio: c.tipoCambio ? String(c.tipoCambio) : '',
    observaciones: c.observaciones ?? '',
    lineas: [...c.detalles].sort((a, b) => a.orden - b.orden).map((d) => ({
      clave: nuevaClave(),
      productoId: d.productoId ?? '',
      codigoProducto: d.codigoProductoSunat ?? '',
      descripcion: d.descripcion,
      cantidad: String(d.cantidad),
      unidad: d.codigoUnidadSunat,
      precio: String(d.precioUnitario),
      precioIncluyeIgv: d.precioIncluyeIgv,
      descuento: String(d.descuento),
      afectacion: d.tipoAfectacionIgv,
      bolsasIcbper: String(d.cantidadBolsasIcbper),
    })),
    detraccionCodigo: c.detraccionCodigo ?? '',
    percepcionRegimen: c.percepcionRegimen ?? '',
    formaPago: c.formaPago,
    cuotas: c.cuotas.map((q) => ({ clave: nuevaClave(), monto: String(q.monto), fechaVencimiento: q.fechaVencimiento.slice(0, 10) })),
    documentoAfectadoId: c.docRelacionadoId ?? '',
    motivoCodigo: c.motivoCodigo ?? '',
    motivoDescripcion: c.motivoDescripcion ?? '',
  };
}

export function formularioParaNota(afectado: Comprobante, tipo: '07' | '08', motivoCodigo = ''): FormularioComprobante {
  return {
    ...formularioDesdeComprobante(afectado),
    tipoComprobante: tipo,
    serie: '',
    tipoOperacion: afectado.tipoOperacion === '0200' ? '0200' : '0101',
    observaciones: '',
    detraccionCodigo: '',
    percepcionRegimen: '',
    formaPago: 'Contado',
    cuotas: [],
    documentoAfectadoId: afectado.id,
    motivoCodigo,
    motivoDescripcion: '',
  };
}

const aNumero = (valor: string): number => Number(String(valor).trim().replace(',', '.'));

export function aPayload(f: FormularioComprobante): ComprobantePayload {
  const nota = esNota(f.tipoComprobante);
  const tipoOperacion: TipoOperacion = nota && f.tipoOperacion === '1001' ? '0101' : f.tipoOperacion;
  const exportacion = tipoOperacion === '0200';
  const payload: ComprobantePayload = {
    tipoComprobante: f.tipoComprobante,
    serie: f.serie,
    clienteId: f.clienteId,
    tipoOperacion,
    moneda: f.moneda,
    lineas: f.lineas.map((l): LineaPayload => ({
      ...(l.productoId ? { productoId: l.productoId } : {}),
      ...(l.codigoProducto.trim() ? { codigoProducto: l.codigoProducto.trim() } : {}),
      descripcion: l.descripcion.trim(),
      cantidad: aNumero(l.cantidad),
      unidad: l.unidad,
      precio: aNumero(l.precio || '0'),
      precioIncluyeIgv: l.precioIncluyeIgv,
      descuento: aNumero(l.descuento || '0'),
      afectacion: exportacion ? '40' : l.afectacion,
      bolsasIcbper: Number.parseInt(l.bolsasIcbper || '0', 10) || 0,
    })),
    formaPago: !nota && f.formaPago === 'Credito'
      ? { tipo: 'Credito', cuotas: f.cuotas.map((c) => ({ monto: aNumero(c.monto), fechaVencimiento: c.fechaVencimiento })) }
      : { tipo: 'Contado' },
  };
  if (f.moneda !== 'PEN' && f.tipoCambio.trim()) payload.tipoCambio = aNumero(f.tipoCambio);
  if (f.observaciones.trim()) payload.observaciones = f.observaciones.trim();
  if (!nota && tipoOperacion === '1001' && f.detraccionCodigo) payload.detraccion = { codigo: f.detraccionCodigo };
  if (!nota && f.percepcionRegimen) payload.percepcion = { regimen: f.percepcionRegimen };
  if (nota && f.documentoAfectadoId) {
    payload.documentoAfectado = {
      facturaId: f.documentoAfectadoId,
      motivoCodigo: f.motivoCodigo,
      ...(f.motivoDescripcion.trim() ? { motivoDescripcion: f.motivoDescripcion.trim() } : {}),
    };
  }
  return payload;
}

// El neto pendiente no depende de las cuotas: la vista previa se pide al contado para poder repartirlas.
export function payloadVistaPrevia(f: FormularioComprobante): ComprobantePayload {
  return { ...aPayload(f), formaPago: { tipo: 'Contado' } };
}

export function listoParaVistaPrevia(f: FormularioComprobante): boolean {
  const lineasOk = f.lineas.length > 0 && f.lineas.every((l) =>
    l.descripcion.trim() !== '' && aNumero(l.cantidad) > 0 && l.precio.trim() !== '' && Number.isFinite(aNumero(l.precio)));
  const notaOk = !esNota(f.tipoComprobante) || Boolean(f.documentoAfectadoId && f.motivoCodigo);
  return Boolean(f.clienteId && f.serie) && lineasOk && notaOk;
}

function aCentimos(valor: string): number {
  const limpio = String(valor).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return Number.NaN;
  const negativo = limpio.startsWith('-');
  const [entero, decimales = ''] = limpio.replace('-', '').split('.');
  const centimos = Number(entero) * 100 + Number(`${decimales}00`.slice(0, 2));
  return negativo ? -centimos : centimos;
}

function deCentimos(centimos: number): string {
  const absoluto = Math.abs(centimos);
  return `${centimos < 0 ? '-' : ''}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const objetivo = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(dia, ultimoDia));
  return objetivo.toISOString().slice(0, 10);
}

export function repartirCuotas(neto: string, n: number, primeraFecha: string): CuotaFormulario[] {
  const total = aCentimos(neto);
  if (!Number.isFinite(total) || total <= 0 || n < 1) return [];
  const base = Math.floor(total / n);
  const residuo = total - base * n;
  return Array.from({ length: n }, (_, i) => ({
    clave: nuevaClave(),
    monto: deCentimos(base + (i === n - 1 ? residuo : 0)),
    fechaVencimiento: sumarMeses(primeraFecha, i),
  }));
}

// Positivo: falta para llegar al neto. Negativo: sobra.
export function diferenciaCuotas(cuotas: CuotaFormulario[], neto: string): string {
  const suma = cuotas.reduce((acc, c) => {
    const centimos = aCentimos(c.monto);
    return acc + (Number.isFinite(centimos) ? centimos : 0);
  }, 0);
  return deCentimos(aCentimos(neto) - suma);
}

export function camposVisibles(f: FormularioComprobante, emisor: { esAgentePercepcion?: boolean } | null): CamposVisibles {
  const nota = esNota(f.tipoComprobante);
  return {
    operacion: !nota,
    detraccion: !nota && f.tipoOperacion === '1001',
    percepcion: !nota && Boolean(emisor?.esAgentePercepcion),
    formaPago: !nota,
    cuotas: !nota && f.formaPago === 'Credito',
    tipoCambio: f.moneda !== 'PEN',
    documentoAfectado: nota,
  };
}

// null si es válida; si no, las letras permitidas («F», «B» o «F o B»).
export function validarSerie(tipo: TipoComprobante, serie: string): string | null {
  const s = serie.trim().toUpperCase();
  const letras = tipo === '01' ? ['F'] : tipo === '03' ? ['B'] : ['F', 'B'];
  if (!/^[FB][A-Z0-9]{3}$/.test(s) || !letras.includes(s[0])) return letras.join(' o ');
  return null;
}

export function seriesDeTipo(series: Serie[], tipo: TipoComprobante): Serie[] {
  return series.filter((s) => s.tipoDocumento === tipo && s.activa);
}

export function clientesPermitidos<T extends Pick<ClienteResumen, 'tipoDocumento'>>(clientes: T[], f: FormularioComprobante): T[] {
  if (f.tipoComprobante === '01' && f.tipoOperacion !== '0200') return clientes.filter((c) => esRuc(c.tipoDocumento));
  return clientes;
}
```

`lib/sunat/api.ts`:

```ts
import api from '@/lib/api';
import type {
  AlertasSunat, CatalogosSunat, Comprobante, ComprobantePayload, EmisorPayload, EmisorVista, Serie, VistaPrevia,
} from './tipos';

const sinVacios = (filtros: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(filtros).filter((par): par is [string, string] => Boolean(par[1])));

export const sunatApi = {
  listar: (filtros: { estadoSunat?: string; tipoComprobante?: string } = {}) =>
    api.get<Comprobante[]>('/comprobantes', sinVacios(filtros)),
  obtener: (id: string) => api.get<Comprobante>(`/comprobantes/${id}`),
  vistaPrevia: (payload: ComprobantePayload) => api.post<VistaPrevia>('/comprobantes/preview', payload),
  crear: (payload: ComprobantePayload) => api.post<Comprobante>('/comprobantes', payload),
  actualizar: (id: string, payload: ComprobantePayload) => api.put<Comprobante>(`/comprobantes/${id}`, payload),
  eliminar: (id: string) => api.delete<void>(`/comprobantes/${id}`),
  emitir: (id: string) => api.post<Comprobante>(`/comprobantes/${id}/emitir`),
  anular: (id: string, motivo: string) => api.post<{ procesoId: string }>(`/comprobantes/${id}/anular`, { motivo }),
  corregir: (id: string) => api.post<Comprobante>(`/comprobantes/${id}/corregir`),
  descargar: (id: string, tipo: 'pdf' | 'xml' | 'cdr') => api.getBlob(`/comprobantes/${id}/${tipo}`),
  emisor: () => api.get<EmisorVista>('/sunat/emisor'),
  guardarEmisor: (datos: EmisorPayload) => api.put<EmisorVista>('/sunat/emisor', datos),
  series: () => api.get<Serie[]>('/sunat/series'),
  crearSerie: (datos: { tipoComprobante: string; serie: string }) => api.post<Serie>('/sunat/series', datos),
  alertas: () => api.get<AlertasSunat>('/sunat/alertas'),
  catalogos: () => api.get<CatalogosSunat>('/sunat/catalogos'),
};

export async function guardarArchivo(id: string, tipo: 'pdf' | 'xml' | 'cdr', nombre: string): Promise<void> {
  const blob = await sunatApi.descargar(id, tipo);
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

`lib/sunat/hooks.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { sunatApi } from './api';
import type { CatalogosSunat, EmisorVista } from './tipos';

let catalogosEnMemoria: CatalogosSunat | null = null;

export function useCatalogosSunat(): CatalogosSunat | null {
  const [catalogos, setCatalogos] = useState<CatalogosSunat | null>(catalogosEnMemoria);
  useEffect(() => {
    if (catalogosEnMemoria) return undefined;
    let vigente = true;
    sunatApi.catalogos()
      .then((r) => { catalogosEnMemoria = r; if (vigente) setCatalogos(r); })
      .catch(() => {});
    return () => { vigente = false; };
  }, []);
  return catalogos;
}

export function useEmisorSunat(): { emisor: EmisorVista | null; recargar: () => Promise<void> } {
  const [emisor, setEmisor] = useState<EmisorVista | null>(null);
  const recargar = useCallback(async () => {
    try {
      setEmisor(await sunatApi.emisor());
    } catch {
      setEmisor(null);
    }
  }, []);
  useEffect(() => { recargar(); }, [recargar]);
  return { emisor, recargar };
}
```

- [ ] **Paso 4: correr pruebas y tipos**

Correr: `npm test && npx tsc --noEmit`
Esperado: PASS (las 14 de la tarea 3 más las 16 nuevas) y `tsc` sin errores.

- [ ] **Paso 5: commit**

```bash
git add lib/sunat/formulario.ts lib/sunat/formulario.test.ts lib/sunat/api.ts lib/sunat/hooks.ts
git commit -m "feat(sunat): estado del formulario, payload, cuotas y cliente de la API SUNAT"
```

---

### Tarea 5: Frontend — componentes de estado, acciones, anulación, historial y alertas

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/frontend/components/sunat/EstadoSunatBadge.tsx, apps/frontend/components/sunat/HistorialEnvios.tsx, apps/frontend/components/sunat/AlertasSunat.tsx, apps/frontend/components/sunat/AnularModal.tsx, apps/frontend/components/sunat/AccionesComprobante.tsx, docs/HANDOFF.md`

**Consume:** `estados.ts`, `formato.ts`, `errores.ts`, `api.ts` y `tipos.ts`.

**Produce:**
- `<EstadoSunatBadge estado />`
- `<HistorialEnvios envios />`
- `<AlertasSunat locale />`
- `<AnularModal isOpen onClose comprobante locale onAnulado />`
- `<AccionesComprobante comprobante locale ruc onCambio />`

- [ ] **Paso 1: crear los componentes**

`components/sunat/EstadoSunatBadge.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/common';
import { colorEstado, etiquetaEstado } from '@/lib/sunat/estados';
import type { EstadoSunat } from '@/lib/sunat/tipos';

export function EstadoSunatBadge({ estado }: { estado: EstadoSunat }) {
  const t = useTranslations('sunat');
  return <Badge variant={colorEstado(estado)}>{t(etiquetaEstado(estado))}</Badge>;
}
```

`components/sunat/HistorialEnvios.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/common';
import { fechaCorta } from '@/lib/sunat/formato';
import type { EnvioSunat } from '@/lib/sunat/tipos';

export function HistorialEnvios({ envios }: { envios: EnvioSunat[] }) {
  const t = useTranslations('sunat.detalle');
  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('historial')}</h2>
      {envios.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('sinEnvios')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-2 pr-4">{t('fecha')}</th>
                <th className="py-2 pr-4">{t('operacion')}</th>
                <th className="py-2 pr-4">{t('codigo')}</th>
                <th className="py-2">{t('mensaje')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {envios.map((e) => (
                <tr key={e.id} className={e.exito ? '' : 'text-amber-700 dark:text-amber-400'}>
                  <td className="py-2 pr-4 whitespace-nowrap">{fechaCorta(e.createdAt)}</td>
                  <td className="py-2 pr-4">{e.operacion}</td>
                  <td className="py-2 pr-4">{e.codigo ?? '—'}</td>
                  <td className="py-2">{e.mensaje ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
```

`components/sunat/AlertasSunat.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/common';
import { sunatApi } from '@/lib/sunat/api';
import { fechaCorta, numeroComprobante } from '@/lib/sunat/formato';
import type { AlertasSunat as Alertas } from '@/lib/sunat/tipos';

export function AlertasSunat({ locale }: { locale: string }) {
  const t = useTranslations('sunat.alertas');
  const [alertas, setAlertas] = useState<Alertas | null>(null);

  useEffect(() => {
    sunatApi.alertas().then(setAlertas).catch(() => setAlertas(null));
  }, []);

  if (!alertas) return null;
  const { certificadoPorVencer, comprobantesPendientes, ticketsAtascados } = alertas;
  if (!certificadoPorVencer && comprobantesPendientes.length === 0 && ticketsAtascados.length === 0) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">{t('titulo')}</p>
          {certificadoPorVencer && <p>{t('certificado', { fecha: fechaCorta(certificadoPorVencer.vence) })}</p>}
          {comprobantesPendientes.map((c) => (
            <p key={c.id}>
              <Link href={`/${locale}/comprobantes/${c.id}`} className="underline">
                {t('pendiente', { numero: numeroComprobante(c) ?? c.serie, dias: c.diasRestantes })}
              </Link>
            </p>
          ))}
          {ticketsAtascados.length > 0 && <p>{t('tickets', { n: ticketsAtascados.length })}</p>}
        </div>
      </div>
    </Card>
  );
}
```

`components/sunat/AnularModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { Button, Modal, Textarea } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import type { Comprobante } from '@/lib/sunat/tipos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobante: Comprobante;
  locale: string;
  onAnulado: () => void;
}

export function AnularModal({ isOpen, onClose, comprobante, locale, onAnulado }: Props) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fueraDePlazo, setFueraDePlazo] = useState(false);

  const cerrar = () => { setMotivo(''); setFueraDePlazo(false); onClose(); };

  const anular = async () => {
    setEnviando(true);
    try {
      await sunatApi.anular(comprobante.id, motivo.trim());
      showSuccess(t('anular.enviado'));
      cerrar();
      onAnulado();
    } catch (error) {
      const n = normalizarError(error, t('errores.noDisponible'));
      if (n.accion === 'EMITIR_NOTA_CREDITO') setFueraDePlazo(true);
      else showError(n.mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const irANota = () => router.push(`/${locale}/comprobantes/nuevo?tipo=07&afecta=${comprobante.id}&motivo=01`);

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title={fueraDePlazo ? t('anular.fueraPlazoTitulo') : t('anular.titulo')}
      icon={XCircle}
      iconColor={fueraDePlazo ? 'warning' : 'danger'}
      size="sm"
      footer={fueraDePlazo ? (
        <Button onClick={irANota}>{t('anular.emitirNc')}</Button>
      ) : (
        <Button variant="danger" loading={enviando} disabled={!motivo.trim()} onClick={anular}>{t('anular.confirmar')}</Button>
      )}
    >
      {fueraDePlazo ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('anular.fueraPlazo')}</p>
      ) : (
        <Textarea label={t('anular.motivo')} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={100} />
      )}
    </Modal>
  );
}
```

`components/sunat/AccionesComprobante.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Edit, FileMinus, FilePlus, RotateCcw, Send, Trash2, XCircle } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { accionesPermitidas } from '@/lib/sunat/estados';
import { normalizarError } from '@/lib/sunat/errores';
import { nombreArchivo } from '@/lib/sunat/formato';
import { guardarArchivo, sunatApi } from '@/lib/sunat/api';
import type { Comprobante } from '@/lib/sunat/tipos';
import { AnularModal } from './AnularModal';

interface Props {
  comprobante: Comprobante;
  locale: string;
  ruc: string;
  onCambio: () => void;
}

export function AccionesComprobante({ comprobante, locale, ruc, onCambio }: Props) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError } = useToast();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<'emitir' | 'eliminar' | null>(null);
  const [anulando, setAnulando] = useState(false);
  const acciones = accionesPermitidas(comprobante.estadoSunat);
  const base = `/${locale}/comprobantes`;

  const ejecutar = async (clave: string, accion: () => Promise<void>) => {
    setOcupado(clave);
    try {
      await accion();
    } catch (error) {
      showError(normalizarError(error, t('errores.noDisponible')).mensaje);
    } finally {
      setOcupado(null);
      setConfirmar(null);
    }
  };

  const descargar = (tipo: 'pdf' | 'xml' | 'cdr') =>
    ejecutar(tipo, () => guardarArchivo(comprobante.id, tipo, nombreArchivo(ruc, comprobante, tipo)));

  return (
    <div className="flex flex-wrap gap-2">
      {acciones.includes('editar') && (
        <Button variant="outline" icon={<Edit className="w-4 h-4" />} onClick={() => router.push(`${base}/${comprobante.id}/editar`)}>
          {t('acciones.editar')}
        </Button>
      )}
      {acciones.includes('emitir') && (
        <Button icon={<Send className="w-4 h-4" />} onClick={() => setConfirmar('emitir')}>{t('acciones.emitir')}</Button>
      )}
      {acciones.includes('eliminar') && (
        <Button variant="ghost" icon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirmar('eliminar')}>{t('acciones.eliminar')}</Button>
      )}
      {(['pdf', 'xml', 'cdr'] as const).filter((tipo) => acciones.includes(tipo)).map((tipo) => (
        <Button
          key={tipo}
          variant="outline"
          icon={<Download className="w-4 h-4" />}
          loading={ocupado === tipo}
          disabled={tipo === 'cdr' && !comprobante.cdrKey}
          onClick={() => descargar(tipo)}
        >
          {t(`acciones.${tipo}`)}
        </Button>
      ))}
      {acciones.includes('notaCredito') && (
        <Button variant="outline" icon={<FileMinus className="w-4 h-4" />} onClick={() => router.push(`${base}/nuevo?tipo=07&afecta=${comprobante.id}`)}>
          {t('acciones.notaCredito')}
        </Button>
      )}
      {acciones.includes('notaDebito') && (
        <Button variant="outline" icon={<FilePlus className="w-4 h-4" />} onClick={() => router.push(`${base}/nuevo?tipo=08&afecta=${comprobante.id}`)}>
          {t('acciones.notaDebito')}
        </Button>
      )}
      {acciones.includes('anular') && (
        <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => setAnulando(true)}>{t('acciones.anular')}</Button>
      )}
      {acciones.includes('corregir') && (
        <Button
          icon={<RotateCcw className="w-4 h-4" />}
          loading={ocupado === 'corregir'}
          onClick={() => ejecutar('corregir', async () => {
            const nuevo = await sunatApi.corregir(comprobante.id);
            router.push(`${base}/${nuevo.id}/editar`);
          })}
        >
          {t('acciones.corregir')}
        </Button>
      )}

      <ConfirmDialog
        isOpen={confirmar === 'emitir'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => ejecutar('emitir', async () => { await sunatApi.emitir(comprobante.id); onCambio(); })}
        title={t('form.confirmarEmitirTitulo')}
        message={t('form.confirmarEmitir')}
        confirmLabel={t('form.emitir')}
        variant="warning"
        loading={ocupado === 'emitir'}
      />
      <ConfirmDialog
        isOpen={confirmar === 'eliminar'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => ejecutar('eliminar', async () => { await sunatApi.eliminar(comprobante.id); router.push(base); })}
        title={t('acciones.confirmarEliminarTitulo')}
        message={t('acciones.confirmarEliminar')}
        confirmLabel={t('acciones.eliminar')}
        variant="danger"
        loading={ocupado === 'eliminar'}
      />
      <AnularModal isOpen={anulando} onClose={() => setAnulando(false)} comprobante={comprobante} locale={locale} onAnulado={onCambio} />
    </div>
  );
}
```

- [ ] **Paso 2: tipos y lint**

Correr: `npx tsc --noEmit && npx next lint --file components/sunat/EstadoSunatBadge.tsx --file components/sunat/HistorialEnvios.tsx --file components/sunat/AlertasSunat.tsx --file components/sunat/AnularModal.tsx --file components/sunat/AccionesComprobante.tsx`
Esperado: sin errores. Si un ícono de `lucide-react` no existe en la versión instalada (0.562), reemplázalo por uno equivalente y dilo.

- [ ] **Paso 3: pruebas**

Correr: `npm test`
Esperado: PASS (la lógica ya está probada; estos componentes no traen pruebas propias).

- [ ] **Paso 4: commit**

```bash
git add components/sunat/EstadoSunatBadge.tsx components/sunat/HistorialEnvios.tsx components/sunat/AlertasSunat.tsx components/sunat/AnularModal.tsx components/sunat/AccionesComprobante.tsx
git commit -m "feat(sunat): componentes de estado, acciones, anulación, historial y alertas"
```

---

### Tarea 6: Frontend — formulario del comprobante

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/frontend/components/sunat/ComprobanteForm.tsx, apps/frontend/components/sunat/LineasEditor.tsx, apps/frontend/components/sunat/CuotasEditor.tsx, apps/frontend/components/sunat/PanelTotales.tsx, docs/HANDOFF.md`

**Consume:** `formulario.ts`, `formato.ts`, `errores.ts`, `api.ts`, `hooks.ts`, `tipos.ts` y `apiClient` (para `/clientes` y `/productos`).

**Produce:**
- `<ComprobanteForm locale inicial comprobanteId? documentoAfectado? />`
- `<LineasEditor lineas onChange productos unidades afectaciones exportacion />`
- `<CuotasEditor cuotas onChange neto moneda />`
- `<PanelTotales filas total montoEnLetras moneda cargando error />`

- [ ] **Paso 1: crear `components/sunat/PanelTotales.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card, LoadingSpinner } from '@/components/common';
import { formatearMonto, type FilaTotal } from '@/lib/sunat/formato';

interface Props {
  filas: FilaTotal[];
  total: string | null;
  montoEnLetras: string | null;
  moneda: string;
  cargando?: boolean;
  error?: string | null;
}

export function PanelTotales({ filas, total, montoEnLetras, moneda, cargando = false, error = null }: Props) {
  const t = useTranslations('sunat.totales');
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('titulo')}</h2>
        {cargando && <span className="flex items-center gap-2 text-xs text-gray-500"><LoadingSpinner size="xs" />{t('calculando')}</span>}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : total === null ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('sinDatos')}</p>
      ) : (
        <dl className="space-y-2 text-sm">
          {filas.map((f) => (
            <div key={f.clave} className="flex justify-between text-gray-600 dark:text-gray-300">
              <dt>{t(f.clave)}</dt>
              <dd className="tabular-nums">{formatearMonto(f.monto, f.clave === 'detraccion' ? 'PEN' : moneda)}</dd>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-base font-semibold text-gray-900 dark:text-gray-100">
            <dt>{t('total')}</dt>
            <dd className="tabular-nums">{formatearMonto(total, moneda)}</dd>
          </div>
          {montoEnLetras && <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">{montoEnLetras}</p>}
        </dl>
      )}
    </Card>
  );
}
```

- [ ] **Paso 2: crear `components/sunat/LineasEditor.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/common';
import { codigoUnidad, lineaVacia, type LineaFormulario } from '@/lib/sunat/formulario';
import type { Afectacion, OpcionCatalogo, ProductoResumen } from '@/lib/sunat/tipos';

interface Props {
  lineas: LineaFormulario[];
  onChange: (lineas: LineaFormulario[]) => void;
  productos: ProductoResumen[];
  unidades: OpcionCatalogo[];
  afectaciones: OpcionCatalogo[];
  exportacion: boolean;
}

export function LineasEditor({ lineas, onChange, productos, unidades, afectaciones, exportacion }: Props) {
  const t = useTranslations('sunat.form');
  const cambiar = (clave: string, cambios: Partial<LineaFormulario>) =>
    onChange(lineas.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));

  const elegirProducto = (clave: string, productoId: string) => {
    const p = productos.find((x) => x.id === productoId);
    if (!p) {
      cambiar(clave, { productoId: '' });
      return;
    }
    cambiar(clave, {
      productoId: p.id,
      codigoProducto: p.codigo ?? '',
      descripcion: p.nombre,
      precio: String(p.precioUnitario),
      precioIncluyeIgv: p.precioConIgv,
      unidad: codigoUnidad(p.unidadMedida),
    });
  };

  const opcionesProductos = [{ value: '', label: t('sinProducto') }, ...productos.map((p) => ({ value: p.id, label: p.nombre }))];
  const opcionesUnidades = unidades.map((u) => ({ value: u.codigo, label: `${u.codigo} · ${u.descripcion}` }));
  const opcionesAfectacion = afectaciones
    .filter((a) => (exportacion ? a.codigo === '40' : a.codigo !== '40'))
    .map((a) => ({ value: a.codigo, label: a.descripcion }));

  return (
    <div className="space-y-4">
      {lineas.map((l, i) => (
        <div key={l.clave} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('linea', { n: i + 1 })}</span>
            {lineas.length > 1 && (
              <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => onChange(lineas.filter((x) => x.clave !== l.clave))}>
                {t('quitar')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select label={t('producto')} options={opcionesProductos} value={l.productoId} onChange={(e) => elegirProducto(l.clave, e.target.value)} />
            <div className="md:col-span-2">
              <Input label={t('descripcion')} value={l.descripcion} onChange={(e) => cambiar(l.clave, { descripcion: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Input label={t('cantidad')} inputMode="decimal" value={l.cantidad} onChange={(e) => cambiar(l.clave, { cantidad: e.target.value })} />
            <Select label={t('unidad')} options={opcionesUnidades} value={l.unidad} onChange={(e) => cambiar(l.clave, { unidad: e.target.value })} />
            <Input label={t('precio')} inputMode="decimal" value={l.precio} onChange={(e) => cambiar(l.clave, { precio: e.target.value })} />
            <Input label={t('descuento')} inputMode="decimal" value={l.descuento} onChange={(e) => cambiar(l.clave, { descuento: e.target.value })} />
            <Select
              label={t('afectacion')}
              options={opcionesAfectacion}
              value={exportacion ? '40' : l.afectacion}
              disabled={exportacion}
              onChange={(e) => cambiar(l.clave, { afectacion: e.target.value as Afectacion })}
            />
            <Input label={t('bolsas')} inputMode="numeric" value={l.bolsasIcbper} onChange={(e) => cambiar(l.clave, { bolsasIcbper: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={l.precioIncluyeIgv} onChange={(e) => cambiar(l.clave, { precioIncluyeIgv: e.target.checked })} />
            {t('incluyeIgv')}
          </label>
        </div>
      ))}
      <Button
        variant="outline"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => onChange([...lineas, { ...lineaVacia(), afectacion: exportacion ? '40' : '10' }])}
      >
        {t('agregarLinea')}
      </Button>
    </div>
  );
}
```

- [ ] **Paso 3: crear `components/sunat/CuotasEditor.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { diferenciaCuotas, nuevaClave, repartirCuotas, sumarMeses, type CuotaFormulario } from '@/lib/sunat/formulario';
import { formatearMonto } from '@/lib/sunat/formato';

interface Props {
  cuotas: CuotaFormulario[];
  onChange: (cuotas: CuotaFormulario[]) => void;
  neto: string | null;
  moneda: string;
}

const hoy = () => new Date().toISOString().slice(0, 10);

export function CuotasEditor({ cuotas, onChange, neto, moneda }: Props) {
  const t = useTranslations('sunat.form');
  const [numero, setNumero] = useState('1');
  const [primera, setPrimera] = useState(() => sumarMeses(hoy(), 1));
  const cambiar = (clave: string, cambios: Partial<CuotaFormulario>) =>
    onChange(cuotas.map((c) => (c.clave === clave ? { ...c, ...cambios } : c)));
  const diferencia = neto ? diferenciaCuotas(cuotas, neto) : null;
  const n = Math.max(1, Math.min(36, Number.parseInt(numero, 10) || 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input label={t('numeroCuotas')} type="number" min={1} max={36} value={numero} onChange={(e) => setNumero(e.target.value)} className="w-28" />
        <Input label={t('primeraFecha')} type="date" value={primera} onChange={(e) => setPrimera(e.target.value)} />
        <Button variant="outline" disabled={!neto} onClick={() => neto && onChange(repartirCuotas(neto, n, primera))}>{t('repartir')}</Button>
      </div>
      {cuotas.map((c, i) => (
        <div key={c.clave} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-3">
          <span className="pb-3 text-sm text-gray-500">{i + 1}</span>
          <Input label={t('monto')} inputMode="decimal" value={c.monto} onChange={(e) => cambiar(c.clave, { monto: e.target.value })} />
          <Input label={t('vencimiento')} type="date" value={c.fechaVencimiento} onChange={(e) => cambiar(c.clave, { fechaVencimiento: e.target.value })} />
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => onChange(cuotas.filter((x) => x.clave !== c.clave))}>
            {''}
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => onChange([...cuotas, { clave: nuevaClave(), monto: '', fechaVencimiento: primera }])}
      >
        {t('agregarCuota')}
      </Button>
      {diferencia === null ? (
        <p className="text-xs text-gray-500">{t('esperaTotales')}</p>
      ) : diferencia !== '0.00' && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {diferencia.startsWith('-')
            ? t('sobraCuotas', { monto: formatearMonto(diferencia.slice(1), moneda) })
            : t('faltaCuotas', { monto: formatearMonto(diferencia, moneda) })}
        </p>
      )}
    </div>
  );
}
```

`Button` exige `children`: el botón de quitar cuota pasa `{''}` para cumplir el tipo sin texto visible. Si `className` no se aplica a `Input`, quita `className="w-28"`.

- [ ] **Paso 4: crear `components/sunat/ComprobanteForm.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Save, Send } from 'lucide-react';
import { Button, Card, ConfirmDialog, Input, SearchableSelect, Select, Textarea } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { sunatApi } from '@/lib/sunat/api';
import { useCatalogosSunat, useEmisorSunat } from '@/lib/sunat/hooks';
import { normalizarError } from '@/lib/sunat/errores';
import { filasDesdeVista, numeroComprobante } from '@/lib/sunat/formato';
import {
  aPayload, camposVisibles, clientesPermitidos, esNota, listoParaVistaPrevia, payloadVistaPrevia, seriesDeTipo,
  type FormularioComprobante,
} from '@/lib/sunat/formulario';
import type { ClienteResumen, Comprobante, Moneda, ProductoResumen, Serie, TipoComprobante, TipoOperacion, VistaPrevia } from '@/lib/sunat/tipos';
import { CuotasEditor } from './CuotasEditor';
import { LineasEditor } from './LineasEditor';
import { PanelTotales } from './PanelTotales';

interface Props {
  locale: string;
  inicial: FormularioComprobante;
  comprobanteId?: string;
  documentoAfectado?: Comprobante | null;
}

const comoLista = <T,>(r: T[] | { data: T[] }): T[] => (Array.isArray(r) ? r : r.data ?? []);

export function ComprobanteForm({ locale, inicial, comprobanteId, documentoAfectado = null }: Props) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const catalogos = useCatalogosSunat();
  const { emisor } = useEmisorSunat();
  const [f, setF] = useState<FormularioComprobante>(inicial);
  const [series, setSeries] = useState<Serie[]>([]);
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [productos, setProductos] = useState<ProductoResumen[]>([]);
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [errorVista, setErrorVista] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [guardando, setGuardando] = useState<'borrador' | 'emitir' | null>(null);
  const [confirmarEmision, setConfirmarEmision] = useState(false);
  const peticion = useRef(0);

  useEffect(() => {
    sunatApi.series().then(setSeries).catch(() => setSeries([]));
    api.get<ClienteResumen[] | { data: ClienteResumen[] }>('/clientes', { limit: '500' })
      .then((r) => setClientes(comoLista(r))).catch(() => setClientes([]));
    api.get<ProductoResumen[] | { data: ProductoResumen[] }>('/productos', { limit: '500' })
      .then((r) => setProductos(comoLista(r))).catch(() => setProductos([]));
  }, []);

  const nota = esNota(f.tipoComprobante);
  const visibles = camposVisibles(f, emisor);
  const seriesTipo = useMemo(() => seriesDeTipo(series, f.tipoComprobante), [series, f.tipoComprobante]);
  const opcionesClientes = useMemo(
    () => clientesPermitidos(clientes, f).map((c) => ({ value: c.id, label: c.razonSocial || c.nombre || '', description: c.numeroDocumento ?? undefined })),
    [clientes, f],
  );
  const cambiar = (cambios: Partial<FormularioComprobante>) => setF((actual) => ({ ...actual, ...cambios }));

  useEffect(() => {
    if (!f.serie && seriesTipo.length === 1) setF((actual) => ({ ...actual, serie: seriesTipo[0].serie }));
  }, [seriesTipo, f.serie]);

  const clavePayload = JSON.stringify(payloadVistaPrevia(f));
  useEffect(() => {
    if (!listoParaVistaPrevia(f)) {
      setVista(null);
      setErrorVista(null);
      setCalculando(false);
      return undefined;
    }
    const id = ++peticion.current;
    setCalculando(true);
    const temporizador = setTimeout(async () => {
      try {
        const r = await sunatApi.vistaPrevia(payloadVistaPrevia(f));
        if (id === peticion.current) { setVista(r); setErrorVista(null); }
      } catch (error) {
        if (id === peticion.current) { setVista(null); setErrorVista(normalizarError(error, t('errores.noDisponible')).mensaje); }
      } finally {
        if (id === peticion.current) setCalculando(false);
      }
    }, 500);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clavePayload]);

  const cambiarOperacion = (tipoOperacion: TipoOperacion) => setF((actual) => ({
    ...actual,
    tipoOperacion,
    lineas: actual.lineas.map((l) => ({
      ...l,
      afectacion: tipoOperacion === '0200' ? '40' : l.afectacion === '40' ? '10' : l.afectacion,
    })),
    detraccionCodigo: tipoOperacion === '1001' ? actual.detraccionCodigo : '',
  }));

  const guardar = async (emitir: boolean) => {
    setErrores([]);
    setGuardando(emitir ? 'emitir' : 'borrador');
    let id = comprobanteId;
    try {
      const payload = aPayload(f);
      const guardado = id ? await sunatApi.actualizar(id, payload) : await sunatApi.crear(payload);
      id = guardado.id;
      if (emitir) await sunatApi.emitir(id);
      showSuccess(emitir ? t('form.emitido') : t('form.guardado'));
      router.push(`/${locale}/comprobantes/${id}`);
    } catch (error) {
      const n = normalizarError(error, t('errores.noDisponible'));
      setErrores(n.errores.length ? n.errores : [n.mensaje]);
      showError(n.mensaje);
      // Si el borrador se creó pero la emisión falló, se va a su detalle para no duplicarlo al reintentar.
      if (id && id !== comprobanteId) router.push(`/${locale}/comprobantes/${id}`);
    } finally {
      setGuardando(null);
      setConfirmarEmision(false);
    }
  };

  const opcionesCatalogo = (lista: { codigo: string; descripcion: string }[] = []) =>
    lista.map((o) => ({ value: o.codigo, label: o.descripcion }));
  const motivos = f.tipoComprobante === '08' ? catalogos?.motivosNotaDebito : catalogos?.motivosNotaCredito;
  const opcionesTipo = (nota ? [f.tipoComprobante] : (['01', '03'] as TipoComprobante[]))
    .map((tipo) => ({ value: tipo, label: t(`tipos.${tipo}`) }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t('form.tipoComprobante')}
              options={opcionesTipo}
              value={f.tipoComprobante}
              disabled={nota || Boolean(comprobanteId)}
              onChange={(e) => cambiar({ tipoComprobante: e.target.value as TipoComprobante, serie: '' })}
            />
            <div>
              <Select
                label={t('form.serie')}
                placeholder={t('form.seleccionaSerie')}
                options={seriesTipo.map((s) => ({ value: s.serie, label: s.serie }))}
                value={f.serie}
                onChange={(e) => cambiar({ serie: e.target.value })}
              />
              {series.length > 0 && seriesTipo.length === 0 && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{t('form.sinSeries')}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <SearchableSelect
                label={t('form.cliente')}
                placeholder={t('form.seleccionaCliente')}
                searchPlaceholder={t('form.buscarCliente')}
                options={opcionesClientes}
                value={f.clienteId}
                disabled={nota}
                onChange={(clienteId) => cambiar({ clienteId })}
              />
            </div>
            {visibles.operacion && (
              <Select
                label={t('form.operacion')}
                options={opcionesCatalogo(catalogos?.tiposOperacion)}
                value={f.tipoOperacion}
                onChange={(e) => cambiarOperacion(e.target.value as TipoOperacion)}
              />
            )}
            <Select
              label={t('form.moneda')}
              options={[{ value: 'PEN', label: 'PEN' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]}
              value={f.moneda}
              disabled={nota}
              onChange={(e) => cambiar({ moneda: e.target.value as Moneda })}
            />
            {visibles.tipoCambio && (
              <Input label={t('form.tipoCambio')} inputMode="decimal" value={f.tipoCambio} disabled={nota} onChange={(e) => cambiar({ tipoCambio: e.target.value })} />
            )}
            {visibles.detraccion && (
              <Select
                label={t('form.detraccion')}
                placeholder={t('form.seleccionaDetraccion')}
                options={(catalogos?.detracciones ?? []).map((d) => ({ value: d.codigo, label: `${d.codigo} · ${d.descripcion} (${d.porcentaje} %)` }))}
                value={f.detraccionCodigo}
                onChange={(e) => cambiar({ detraccionCodigo: e.target.value })}
              />
            )}
            {visibles.percepcion && (
              <Select
                label={t('form.percepcion')}
                options={[{ value: '', label: t('form.sinPercepcion') }, ...(catalogos?.percepciones ?? []).map((p) => ({ value: p.codigo, label: `${p.descripcion} (${p.porcentaje} %)` }))]}
                value={f.percepcionRegimen}
                onChange={(e) => cambiar({ percepcionRegimen: e.target.value })}
              />
            )}
          </div>
        </Card>

        {visibles.documentoAfectado && (
          <Card>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('form.documentoAfectado')}</p>
            {documentoAfectado && (
              <p className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                {t(`tipos.${documentoAfectado.tipoComprobante}`)} {numeroComprobante(documentoAfectado)}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={t('form.motivo')}
                placeholder={t('form.seleccionaMotivo')}
                options={opcionesCatalogo(motivos)}
                value={f.motivoCodigo}
                onChange={(e) => cambiar({ motivoCodigo: e.target.value })}
              />
              <Input label={t('form.motivoDescripcion')} value={f.motivoDescripcion} maxLength={250} onChange={(e) => cambiar({ motivoDescripcion: e.target.value })} />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('form.lineas')}</h2>
          <LineasEditor
            lineas={f.lineas}
            onChange={(lineas) => cambiar({ lineas })}
            productos={productos}
            unidades={catalogos?.unidades ?? [{ codigo: 'NIU', descripcion: 'Unidad (bienes)' }]}
            afectaciones={catalogos?.afectaciones ?? []}
            exportacion={f.tipoOperacion === '0200'}
          />
        </Card>

        {visibles.formaPago && (
          <Card>
            <div className="max-w-xs">
              <Select
                label={t('form.formaPago')}
                options={[{ value: 'Contado', label: t('form.contado') }, { value: 'Credito', label: t('form.credito') }]}
                value={f.formaPago}
                onChange={(e) => cambiar({ formaPago: e.target.value as 'Contado' | 'Credito' })}
              />
            </div>
            {visibles.cuotas && (
              <div className="mt-4">
                <CuotasEditor cuotas={f.cuotas} onChange={(cuotas) => cambiar({ cuotas })} neto={vista?.netoPendiente ?? null} moneda={f.moneda} />
              </div>
            )}
          </Card>
        )}

        <Card>
          <Textarea label={t('form.observaciones')} value={f.observaciones} rows={2} maxLength={1000} onChange={(e) => cambiar({ observaciones: e.target.value })} />
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 self-start">
        <PanelTotales
          filas={vista ? filasDesdeVista(vista) : []}
          total={vista?.totales.total ?? null}
          montoEnLetras={vista?.leyendas[0]?.valor ?? null}
          moneda={f.moneda}
          cargando={calculando}
          error={errorVista}
        />
        {errores.length > 0 && (
          <Card className="border-red-300 dark:border-red-700">
            <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">{t('form.revisa')}</p>
            <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-400 space-y-1">
              {errores.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </Card>
        )}
        <div className="flex flex-col gap-2">
          <Button variant="outline" icon={<Save className="w-4 h-4" />} loading={guardando === 'borrador'} disabled={guardando !== null} onClick={() => guardar(false)}>
            {t('form.guardarBorrador')}
          </Button>
          <Button icon={<Send className="w-4 h-4" />} disabled={!vista || Boolean(errorVista) || guardando !== null} onClick={() => setConfirmarEmision(true)}>
            {t('form.guardarEmitir')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmarEmision}
        onClose={() => setConfirmarEmision(false)}
        onConfirm={() => guardar(true)}
        title={t('form.confirmarEmitirTitulo')}
        message={t('form.confirmarEmitir')}
        confirmLabel={t('form.emitir')}
        variant="warning"
        loading={guardando === 'emitir'}
      />
    </div>
  );
}
```

- [ ] **Paso 5: tipos, lint y pruebas**

Correr: `npx tsc --noEmit && npx next lint --file components/sunat/ComprobanteForm.tsx --file components/sunat/LineasEditor.tsx --file components/sunat/CuotasEditor.tsx --file components/sunat/PanelTotales.tsx && npm test`
Esperado: sin errores. Si una prop de un componente común no coincide con su firma real en `components/common/*.tsx` (p. ej. `placeholder` en `Select`, `description` en `SearchableSelect` o `className` en `Card`), ajústala a la firma real y dilo.

- [ ] **Paso 6: commit**

```bash
git add components/sunat/ComprobanteForm.tsx components/sunat/LineasEditor.tsx components/sunat/CuotasEditor.tsx components/sunat/PanelTotales.tsx
git commit -m "feat(sunat): formulario de comprobante con líneas, cuotas y vista previa del backend"
```

---

### Tarea 7: Frontend — páginas de comprobantes

`Riesgo: alto` · `Delicado: no` · `Permitidos: apps/frontend/app/[locale]/(dashboard)/comprobantes/**, docs/HANDOFF.md`

**Consume:** todos los componentes de `components/sunat/`, `formulario.ts`, `formato.ts`, `api.ts`, `estados.ts` y `useAuth()`.

**Produce:** las rutas `/comprobantes`, `/comprobantes/nuevo`, `/comprobantes/[id]` y `/comprobantes/[id]/editar`.

- [ ] **Paso 1: lista — `app/[locale]/(dashboard)/comprobantes/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, Plus } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, Select, type Column } from '@/components/common';
import { EstadoSunatBadge } from '@/components/sunat/EstadoSunatBadge';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { ESTADOS_SUNAT, etiquetaEstado } from '@/lib/sunat/estados';
import { normalizarError } from '@/lib/sunat/errores';
import { fechaCorta, formatearMonto, numeroComprobante } from '@/lib/sunat/formato';
import type { Comprobante } from '@/lib/sunat/tipos';

export default function ComprobantesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError } = useToast();
  const [items, setItems] = useState<Comprobante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    setCargando(true);
    sunatApi.listar({ tipoComprobante: tipo, estadoSunat: estado })
      .then(setItems)
      .catch((error) => showError(normalizarError(error, t('errores.noDisponible')).mensaje))
      .finally(() => setCargando(false));
  }, [tipo, estado, showError, t]);

  const columnas: Column<Comprobante>[] = [
    { key: 'numero', header: t('columnas.numero'), render: (c) => numeroComprobante(c) ?? t('borrador') },
    { key: 'tipo', header: t('columnas.tipo'), render: (c) => t(`tipos.${c.tipoComprobante}`) },
    { key: 'cliente', header: t('columnas.cliente'), render: (c) => c.cliente?.razonSocial ?? '' },
    { key: 'fecha', header: t('columnas.fecha'), render: (c) => fechaCorta(c.fechaEmision) },
    { key: 'total', header: t('columnas.total'), render: (c) => formatearMonto(c.total, c.moneda) },
    { key: 'estado', header: t('columnas.estado'), render: (c) => <EstadoSunatBadge estado={c.estadoSunat} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('titulo')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitulo')}</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/comprobantes/nuevo`)}>{t('nuevo')}</Button>
      </div>
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Select
            options={[{ value: '', label: t('filtros.todosTipos') }, ...(['01', '03', '07', '08'] as const).map((x) => ({ value: x, label: t(`tipos.${x}`) }))]}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
          <Select
            options={[{ value: '', label: t('filtros.todosEstados') }, ...ESTADOS_SUNAT.map((x) => ({ value: x, label: t(etiquetaEstado(x)) }))]}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          />
        </div>
        <DataTable
          data={items}
          columns={columnas}
          keyExtractor={(c) => c.id}
          isLoading={cargando}
          onRowClick={(c) => router.push(`/${locale}/comprobantes/${c.id}`)}
          emptyState={<EmptyState icon={<FileText className="w-6 h-6" />} title={t('vacio')} description={t('vacioDescripcion')} />}
        />
      </Card>
    </div>
  );
}
```

- [ ] **Paso 2: nuevo — `app/[locale]/(dashboard)/comprobantes/nuevo/page.tsx`**

```tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SkeletonFormPage } from '@/components/common';
import { ComprobanteForm } from '@/components/sunat/ComprobanteForm';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { formularioInicial, formularioParaNota, type FormularioComprobante } from '@/lib/sunat/formulario';
import type { Comprobante } from '@/lib/sunat/tipos';

function NuevoComprobante({ locale }: { locale: string }) {
  const t = useTranslations('sunat');
  const { showError } = useToast();
  const parametros = useSearchParams();
  const tipo = parametros.get('tipo') ?? '01';
  const afecta = parametros.get('afecta');
  const motivo = parametros.get('motivo') ?? '';
  const [inicial, setInicial] = useState<FormularioComprobante | null>(afecta ? null : formularioInicial(tipo === '03' ? '03' : '01'));
  const [afectado, setAfectado] = useState<Comprobante | null>(null);

  useEffect(() => {
    if (!afecta) return;
    sunatApi.obtener(afecta)
      .then((c) => { setAfectado(c); setInicial(formularioParaNota(c, tipo === '08' ? '08' : '07', motivo)); })
      .catch((error) => showError(normalizarError(error, t('errores.noDisponible')).mensaje));
  }, [afecta, tipo, motivo, showError, t]);

  if (!inicial) return <SkeletonFormPage />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{afecta ? t('nuevaNota') : t('nuevo')}</h1>
      <ComprobanteForm locale={locale} inicial={inicial} documentoAfectado={afectado} />
    </div>
  );
}

export default function NuevoComprobantePage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <Suspense fallback={<SkeletonFormPage />}>
      <NuevoComprobante locale={locale} />
    </Suspense>
  );
}
```

- [ ] **Paso 3: detalle — `app/[locale]/(dashboard)/comprobantes/[id]/page.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, LoadingSpinner, SkeletonDetailPage } from '@/components/common';
import { AccionesComprobante } from '@/components/sunat/AccionesComprobante';
import { EstadoSunatBadge } from '@/components/sunat/EstadoSunatBadge';
import { HistorialEnvios } from '@/components/sunat/HistorialEnvios';
import { PanelTotales } from '@/components/sunat/PanelTotales';
import { useAuth } from '@/contexts/AuthContext';
import { sunatApi } from '@/lib/sunat/api';
import { estaEnProceso } from '@/lib/sunat/estados';
import { normalizarError } from '@/lib/sunat/errores';
import { fechaCorta, filasDesdeComprobante, formatearMonto, numeroComprobante } from '@/lib/sunat/formato';
import type { Comprobante } from '@/lib/sunat/tipos';

const MAXIMO_REFRESCOS = 24; // 24 × 5 s = 2 min

export default function DetalleComprobantePage({ params: { locale, id } }: { params: { locale: string; id: string } }) {
  const t = useTranslations('sunat');
  const { empresa } = useAuth();
  const [c, setC] = useState<Comprobante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescos, setRefrescos] = useState(0);

  const cargar = useCallback(async () => {
    try {
      setC(await sunatApi.obtener(id));
      setError(null);
    } catch (e) {
      setError(normalizarError(e, t('errores.noDisponible')).mensaje);
    }
  }, [id, t]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!c || !estaEnProceso(c.estadoSunat) || refrescos >= MAXIMO_REFRESCOS) return undefined;
    const temporizador = setTimeout(() => { setRefrescos((n) => n + 1); cargar(); }, 5000);
    return () => clearTimeout(temporizador);
  }, [c, refrescos, cargar]);

  if (error && !c) return <EmptyState title={t('detalle.noEncontrado')} description={error} />;
  if (!c) return <SkeletonDetailPage />;

  const enProceso = estaEnProceso(c.estadoSunat);
  const afectado = c.docRelacionadoSerie ? `${c.docRelacionadoSerie}-${c.docRelacionadoNumero}` : null;

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/comprobantes`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" />{t('volver')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t(`tipos.${c.tipoComprobante}`)}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{numeroComprobante(c) ?? t('borrador')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{c.cliente?.razonSocial} · {fechaCorta(c.fechaEmision)}</p>
        </div>
        <EstadoSunatBadge estado={c.estadoSunat} />
      </div>

      {enProceso && (
        <Card className="border-blue-300 dark:border-blue-700">
          <div className="flex items-center justify-between gap-4 text-sm text-blue-800 dark:text-blue-300">
            <span className="flex items-center gap-2">
              {refrescos < MAXIMO_REFRESCOS && <LoadingSpinner size="sm" />}{t('detalle.enProceso')}
            </span>
            {refrescos >= MAXIMO_REFRESCOS && (
              <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { setRefrescos(0); cargar(); }}>
                {t('detalle.actualizar')}
              </Button>
            )}
          </div>
        </Card>
      )}

      {c.mensajeRespuestaSunat && (
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('detalle.mensajeSunat')}</p>
          <p className="text-gray-900 dark:text-gray-100">{c.mensajeRespuestaSunat}</p>
        </Card>
      )}

      <AccionesComprobante comprobante={c} locale={locale} ruc={empresa?.ruc ?? ''} onCambio={() => { setRefrescos(0); cargar(); }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          {afectado && (
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              <p>{t('detalle.modifica', { documento: afectado })}</p>
              {c.motivoDescripcion && <p>{t('detalle.motivo', { motivo: c.motivoDescripcion })}</p>}
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('detalle.lineas')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">{t('form.cantidad')}</th>
                  <th className="py-2 pr-4">{t('form.descripcion')}</th>
                  <th className="py-2 pr-4 text-right">{t('form.precio')}</th>
                  <th className="py-2 text-right">{t('columnas.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...c.detalles].sort((a, b) => a.orden - b.orden).map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">{Number(d.cantidad)} {d.codigoUnidadSunat}</td>
                    <td className="py-2 pr-4">{d.descripcion}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatearMonto(d.precioUnitario, c.moneda)}</td>
                    <td className="py-2 text-right tabular-nums">{formatearMonto(d.total, c.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <PanelTotales filas={filasDesdeComprobante(c)} total={c.total} montoEnLetras={c.montoEnLetras} moneda={c.moneda} />
      </div>

      <HistorialEnvios envios={c.envios ?? []} />
    </div>
  );
}
```

- [ ] **Paso 4: editar — `app/[locale]/(dashboard)/comprobantes/[id]/editar/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SkeletonFormPage } from '@/components/common';
import { ComprobanteForm } from '@/components/sunat/ComprobanteForm';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { formularioDesdeComprobante, type FormularioComprobante } from '@/lib/sunat/formulario';
import type { Comprobante } from '@/lib/sunat/tipos';

export default function EditarComprobantePage({ params: { locale, id } }: { params: { locale: string; id: string } }) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError } = useToast();
  const [inicial, setInicial] = useState<FormularioComprobante | null>(null);
  const [afectado, setAfectado] = useState<Comprobante | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await sunatApi.obtener(id);
        if (c.estadoSunat !== 'BORRADOR') {
          router.replace(`/${locale}/comprobantes/${id}`);
          return;
        }
        if (c.docRelacionadoId) setAfectado(await sunatApi.obtener(c.docRelacionadoId));
        setInicial(formularioDesdeComprobante(c));
      } catch (error) {
        showError(normalizarError(error, t('errores.noDisponible')).mensaje);
      }
    })();
  }, [id, locale, router, showError, t]);

  if (!inicial) return <SkeletonFormPage />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('editar')}</h1>
      <ComprobanteForm locale={locale} inicial={inicial} comprobanteId={id} documentoAfectado={afectado} />
    </div>
  );
}
```

- [ ] **Paso 5: tipos, lint, pruebas y build**

Correr: `npx tsc --noEmit && npx next lint --dir "app/[locale]/(dashboard)/comprobantes" && npm test && npx next build`
Esperado: sin errores. `next build` compila las rutas nuevas (`/[locale]/comprobantes`, `/nuevo`, `/[id]`, `/[id]/editar`). Si `useToast` devuelve funciones que cambian en cada render y eso hace que los `useEffect` con `showError` en las dependencias se repitan, sácalas de las dependencias con un comentario `eslint-disable-next-line react-hooks/exhaustive-deps` y dilo.

- [ ] **Paso 6: commit**

```bash
git add "app/[locale]/(dashboard)/comprobantes"
git commit -m "feat(sunat): páginas de lista, alta, detalle y edición de comprobantes"
```

---

### Tarea 8: Frontend — configuración del emisor y series

`Riesgo: alto` · `Delicado: sí` (credenciales SOL y certificado) · `Permitidos: apps/frontend/components/sunat/EmisorForm.tsx, apps/frontend/components/sunat/SeriesManager.tsx, apps/frontend/components/sunat/SunatTab.tsx, apps/frontend/app/[locale]/(dashboard)/configuracion/page.tsx, docs/HANDOFF.md`

**Consume:** `sunatApi`, `validarSerie`, `normalizarError`, `fechaCorta`, los tipos `EmisorVista`/`EmisorPayload`/`Serie`, y `useAuth()` (`empresa`, `refreshEmpresa`).

**Produce:** `<EmisorForm ruc onGuardado />`, `<SeriesManager />`, `<SunatTab ruc esPeru onGuardado />` y la pestaña `sunat` en Configuración.

- [ ] **Paso 1: crear `components/sunat/EmisorForm.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save } from 'lucide-react';
import { Button, Card, Input, Select, SkeletonCard } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { fechaCorta } from '@/lib/sunat/formato';
import type { EmisorPayload, EmisorVista } from '@/lib/sunat/tipos';

interface Props {
  ruc: string;
  onGuardado: () => void | Promise<void>;
}

const VACIO = {
  ubigeo: '', departamento: '', provincia: '', distrito: '', urbanizacion: '', direccionFiscal: '', codigoEstablecimiento: '0000',
  ambiente: 'BETA' as 'BETA' | 'PRODUCCION', solUsuario: '', cuentaDetracciones: '', esAgenteRetencion: false, esAgentePercepcion: false,
};

function leerBase64(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '');
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(archivo);
  });
}

export function EmisorForm({ ruc, onGuardado }: Props) {
  const t = useTranslations('sunat.emisor');
  const tErr = useTranslations('sunat.errores');
  const { showError, showSuccess } = useToast();
  const [emisor, setEmisor] = useState<EmisorVista | null>(null);
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState(VACIO);
  const [solClave, setSolClave] = useState('');
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [claveCertificado, setClaveCertificado] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const llenar = (e: EmisorVista) => {
    setEmisor(e);
    if (!e.configurado) return;
    setDatos({
      ubigeo: e.ubigeo ?? '', departamento: e.departamento ?? '', provincia: e.provincia ?? '', distrito: e.distrito ?? '',
      urbanizacion: e.urbanizacion ?? '', direccionFiscal: e.direccionFiscal ?? '', codigoEstablecimiento: e.codigoEstablecimiento ?? '0000',
      ambiente: e.ambiente ?? 'BETA', solUsuario: e.solUsuario ?? '', cuentaDetracciones: e.cuentaDetracciones ?? '',
      esAgenteRetencion: Boolean(e.esAgenteRetencion), esAgentePercepcion: Boolean(e.esAgentePercepcion),
    });
  };

  useEffect(() => {
    sunatApi.emisor().then(llenar).catch(() => setEmisor({ configurado: false })).finally(() => setCargando(false));
  }, []);

  const pasaAProduccion = datos.ambiente === 'PRODUCCION' && emisor?.ambiente !== 'PRODUCCION';
  const cambiar = (cambios: Partial<typeof VACIO>) => setDatos((d) => ({ ...d, ...cambios }));

  const guardar = async () => {
    if (pasaAProduccion && confirmacion.trim() !== ruc) {
      showError(t('confirmarProduccion', { ruc }));
      return;
    }
    setGuardando(true);
    try {
      const payload: EmisorPayload = {
        ubigeo: datos.ubigeo.trim(),
        departamento: datos.departamento.trim(),
        provincia: datos.provincia.trim(),
        distrito: datos.distrito.trim(),
        ...(datos.urbanizacion.trim() ? { urbanizacion: datos.urbanizacion.trim() } : {}),
        direccionFiscal: datos.direccionFiscal.trim(),
        codigoEstablecimiento: datos.codigoEstablecimiento.trim() || '0000',
        ambiente: datos.ambiente,
        ...(datos.ambiente === 'PRODUCCION' ? { confirmarProduccion: true } : {}),
        ...(datos.solUsuario.trim() ? { solUsuario: datos.solUsuario.trim() } : {}),
        ...(solClave ? { solClave } : {}),
        ...(archivo ? { certificado: { pfxBase64: await leerBase64(archivo), clave: claveCertificado } } : {}),
        cuentaDetracciones: datos.cuentaDetracciones.trim(),
        esAgenteRetencion: datos.esAgenteRetencion,
        esAgentePercepcion: datos.esAgentePercepcion,
      };
      llenar(await sunatApi.guardarEmisor(payload));
      setSolClave('');
      setCambiandoClave(false);
      setArchivo(null);
      setClaveCertificado('');
      setConfirmacion('');
      showSuccess(t('guardado'));
      await onGuardado();
    } catch (error) {
      showError(normalizarError(error, tErr('noDisponible')).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <SkeletonCard />;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('datosFiscales')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label={t('ubigeo')} value={datos.ubigeo} maxLength={6} inputMode="numeric" onChange={(e) => cambiar({ ubigeo: e.target.value })} />
          <Input label={t('codigoEstablecimiento')} value={datos.codigoEstablecimiento} maxLength={4} onChange={(e) => cambiar({ codigoEstablecimiento: e.target.value })} />
          <Input label={t('departamento')} value={datos.departamento} onChange={(e) => cambiar({ departamento: e.target.value })} />
          <Input label={t('provincia')} value={datos.provincia} onChange={(e) => cambiar({ provincia: e.target.value })} />
          <Input label={t('distrito')} value={datos.distrito} onChange={(e) => cambiar({ distrito: e.target.value })} />
          <Input label={t('urbanizacion')} value={datos.urbanizacion} onChange={(e) => cambiar({ urbanizacion: e.target.value })} />
          <div className="md:col-span-2">
            <Input label={t('direccionFiscal')} value={datos.direccionFiscal} onChange={(e) => cambiar({ direccionFiscal: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('credenciales')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={t('ambiente')}
            options={[{ value: 'BETA', label: t('beta') }, { value: 'PRODUCCION', label: t('produccion') }]}
            value={datos.ambiente}
            onChange={(e) => cambiar({ ambiente: e.target.value as 'BETA' | 'PRODUCCION' })}
          />
          {pasaAProduccion ? (
            <Input label={t('confirmarProduccion', { ruc })} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          ) : <div />}
          <Input label={t('solUsuario')} value={datos.solUsuario} autoComplete="off" onChange={(e) => cambiar({ solUsuario: e.target.value })} />
          {emisor?.tieneClaveSol && !cambiandoClave ? (
            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('solClave')}</p>
              <div className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-400">
                {t('configurada')}
                <Button variant="ghost" size="sm" onClick={() => setCambiandoClave(true)}>{t('cambiar')}</Button>
              </div>
            </div>
          ) : (
            <Input label={t('solClave')} type="password" autoComplete="new-password" value={solClave} onChange={(e) => setSolClave(e.target.value)} />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('certificado')}</label>
            <input type="file" accept=".pfx,.p12" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="text-sm" />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {emisor?.tieneCertificado && emisor.certificadoVence ? t('certificadoVence', { fecha: fechaCorta(emisor.certificadoVence) }) : t('sinCertificado')}
            </p>
          </div>
          {archivo && (
            <Input label={t('certificadoClave')} type="password" autoComplete="new-password" value={claveCertificado} onChange={(e) => setClaveCertificado(e.target.value)} />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('otros')}</h3>
        <div className="space-y-4">
          <Input label={t('cuentaDetracciones')} value={datos.cuentaDetracciones} onChange={(e) => cambiar({ cuentaDetracciones: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={datos.esAgenteRetencion} onChange={(e) => cambiar({ esAgenteRetencion: e.target.checked })} />
            {t('agenteRetencion')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={datos.esAgentePercepcion} onChange={(e) => cambiar({ esAgentePercepcion: e.target.checked })} />
            {t('agentePercepcion')}
          </label>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button icon={<Save className="w-4 h-4" />} loading={guardando} onClick={guardar}>{t('guardar')}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: crear `components/sunat/SeriesManager.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button, Card, Input, Select } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { validarSerie } from '@/lib/sunat/formulario';
import type { Serie, TipoComprobante } from '@/lib/sunat/tipos';

export function SeriesManager() {
  const t = useTranslations('sunat');
  const { showError, showSuccess } = useToast();
  const [series, setSeries] = useState<Serie[]>([]);
  const [tipo, setTipo] = useState<TipoComprobante>('01');
  const [serie, setSerie] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () => sunatApi.series().then(setSeries).catch(() => setSeries([]));
  useEffect(() => { cargar(); }, []);

  const letras = serie ? validarSerie(tipo, serie) : null;

  const crear = async () => {
    setGuardando(true);
    try {
      await sunatApi.crearSerie({ tipoComprobante: tipo, serie: serie.trim().toUpperCase() });
      showSuccess(t('series.creada'));
      setSerie('');
      await cargar();
    } catch (error) {
      showError(normalizarError(error, t('errores.noDisponible')).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('series.titulo')}</h3>
      {series.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('series.vacio')}</p>
      ) : (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="py-2 pr-4">{t('series.tipo')}</th>
              <th className="py-2 pr-4">{t('series.serie')}</th>
              <th className="py-2">{t('series.ultimoNumero')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {series.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-4">{t(`tipos.${s.tipoDocumento}`)}</td>
                <td className="py-2 pr-4 font-mono">{s.serie}</td>
                <td className="py-2">{s.ultimoNumero}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t('series.tipo')}
          options={(['01', '03', '07', '08'] as const).map((x) => ({ value: x, label: t(`tipos.${x}`) }))}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoComprobante)}
        />
        <Input
          label={t('series.serie')}
          value={serie}
          maxLength={4}
          onChange={(e) => setSerie(e.target.value.toUpperCase())}
          error={letras ? t('series.letraInvalida', { letras }) : undefined}
        />
        <Button icon={<Plus className="w-4 h-4" />} loading={guardando} disabled={!serie || Boolean(letras)} onClick={crear}>
          {t('series.agregar')}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Paso 3: crear `components/sunat/SunatTab.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Landmark } from 'lucide-react';
import { Button, Card } from '@/components/common';
import { EmisorForm } from './EmisorForm';
import { SeriesManager } from './SeriesManager';

interface Props {
  ruc: string;
  esPeru: boolean;
  onGuardado: () => void | Promise<void>;
}

export function SunatTab({ ruc, esPeru, onGuardado }: Props) {
  const t = useTranslations('sunat.emisor');
  const [activando, setActivando] = useState(false);

  if (!esPeru && !activando) {
    return (
      <Card>
        <div className="flex items-start gap-4">
          <Landmark className="w-8 h-8 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('activarTitulo')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('activarDescripcion')}</p>
            <Button onClick={() => setActivando(true)}>{t('activar')}</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('titulo')}</h2>
      <EmisorForm ruc={ruc} onGuardado={onGuardado} />
      {esPeru && <SeriesManager />}
    </div>
  );
}
```

- [ ] **Paso 4: agregar la pestaña en `app/[locale]/(dashboard)/configuracion/page.tsx`** (solo estos tres cambios)

1. Después de `import SubscriptionTab from '@/components/settings/SubscriptionTab';`:

```tsx
import { SunatTab } from '@/components/sunat/SunatTab';
```

y agregar `Landmark` a la lista del `import { … } from 'lucide-react'` existente.

2. Cambiar `type Tab = 'empresa' | 'usuario' | 'apariencia' | 'facturacion' | 'notificaciones' | 'suscripcion';` por:

```tsx
type Tab = 'empresa' | 'usuario' | 'apariencia' | 'facturacion' | 'notificaciones' | 'sunat' | 'suscripcion';
```

y dentro del componente, después de `const tSub = useTranslations('subscription');`:

```tsx
  const tSunat = useTranslations('sunat.emisor');
```

En el arreglo `tabs`, después de `{ id: 'notificaciones' as Tab, label: t('notifications'), icon: Bell },`:

```tsx
    { id: 'sunat' as Tab, label: tSunat('pestana'), icon: Landmark },
```

3. Justo antes de `{/* Subscription Settings */}`:

```tsx
          {activeTab === 'sunat' && (
            <SunatTab ruc={empresa?.ruc ?? ''} esPeru={empresa?.pais === 'PE'} onGuardado={refreshEmpresa} />
          )}
```

- [ ] **Paso 5: tipos, lint y pruebas**

Correr: `npx tsc --noEmit && npx next lint --file components/sunat/EmisorForm.tsx --file components/sunat/SeriesManager.tsx --file components/sunat/SunatTab.tsx --file "app/[locale]/(dashboard)/configuracion/page.tsx" && npm test`
Esperado: sin errores nuevos. Comprueba además con `grep -n "solClave\|claveCertificado" components/sunat/EmisorForm.tsx` que ninguno de los dos se imprime con `console` ni se guarda fuera del estado del formulario.

- [ ] **Paso 6: commit**

```bash
git add components/sunat/EmisorForm.tsx components/sunat/SeriesManager.tsx components/sunat/SunatTab.tsx "app/[locale]/(dashboard)/configuracion/page.tsx"
git commit -m "feat(sunat): configuración del emisor, certificado y series en Configuración"
```

---

### Tarea 9: Frontend — integración (menú, redirección, dashboard y clientes)

`Riesgo: medio` · `Permitidos: apps/frontend/components/global/Sidebar.tsx, apps/frontend/app/[locale]/(dashboard)/facturas/page.tsx, apps/frontend/app/[locale]/(dashboard)/dashboard/page.tsx, apps/frontend/app/[locale]/(dashboard)/clientes/nuevo/page.tsx, apps/frontend/app/[locale]/(dashboard)/clientes/[id]/page.tsx, docs/HANDOFF.md`

**Consume:** `<AlertasSunat locale />` (tarea 5), `empresa.pais` (tarea 3) y las claves `navigation.vouchers` y `sunat.clientes.*`.

- [ ] **Paso 1: menú — `components/global/Sidebar.tsx`**

Después de `const isAdmin = …;`:

```tsx
  // Empresas de Perú: «Comprobantes» (SUNAT) reemplaza a «Facturas».
  const items = empresa?.pais === 'PE'
    ? menuItems.map((item) => (item.href === '/facturas' ? { href: '/comprobantes', icon: Receipt, labelKey: 'vouchers' } : item))
    : menuItems;
```

y cambiar `{menuItems.map((item) => {` por `{items.map((item) => {`.

- [ ] **Paso 2: redirección — `app/[locale]/(dashboard)/facturas/page.tsx`**

Después de `const { empresa } = useAuth();` (línea ~100):

```tsx
  useEffect(() => {
    if (empresa?.pais === 'PE') router.replace(`/${locale}/comprobantes`);
  }, [empresa?.pais, locale, router]);
```

- [ ] **Paso 3: dashboard — `app/[locale]/(dashboard)/dashboard/page.tsx`**

Agregar el import `import { AlertasSunat } from '@/components/sunat/AlertasSunat';`. En el `return (` principal (línea ~356), inmediatamente después de la línea `<div className="space-y-6">`, agregar:

```tsx
      {empresa?.pais === 'PE' && <AlertasSunat locale={locale} />}
```

Si el componente no recibe `locale` en sus props, usa el que ya tenga disponible (`params.locale` o `useLocale()` de next-intl) y dilo.

- [ ] **Paso 4: clientes — `clientes/nuevo/page.tsx` y `clientes/[id]/page.tsx`**

En los dos archivos:

a) Agregar `const tSunat = useTranslations('sunat.clientes');` junto a los otros `useTranslations`.

b) En el estado inicial de `formData`, agregar `esAgenteRetencion: false,`. En `nuevo/page.tsx`, además, cambiar `tipoDocumento: 'OTHER',` por `tipoDocumento: empresa?.pais === 'PE' ? 'RUC' : 'OTHER',`.

c) En `clientes/[id]/page.tsx`, en el `setFormData({ … })` que carga la respuesta (línea ~69), agregar `esAgenteRetencion: Boolean(response.esAgenteRetencion),`. En la interfaz del cliente de ese archivo, agregar `esAgenteRetencion?: boolean;`.

d) Reemplazar las `<option>` del `<select>` de tipo de documento (desde `<option value="OTHER">` hasta `<option value="PASSPORT">Passport</option>`) por:

```tsx
                {empresa?.pais === 'PE' ? (
                  (['RUC', 'DNI', 'CE', 'PASAPORTE', 'OTHER'] as const).map((codigo) => (
                    <option key={codigo} value={codigo}>{tSunat(`tiposDoc.${codigo}`)}</option>
                  ))
                ) : (
                  <>
                    <option value="OTHER">Other / None</option>
                    <option value="SSN">SSN (Social Security Number)</option>
                    <option value="EIN">EIN (Employer ID Number)</option>
                    <option value="ITIN">ITIN (Individual Tax ID)</option>
                    <option value="DRIVER_LICENSE">Driver&apos;s License</option>
                    <option value="STATE_ID">State ID</option>
                    <option value="PASSPORT">Passport</option>
                  </>
                )}
```

Las opciones de EE. UU. deben quedar exactamente como estaban.

e) Después de la grilla de «tipo y número de documento», agregar:

```tsx
          {empresa?.pais === 'PE' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formData.esAgenteRetencion}
                onChange={(e) => setFormData({ ...formData, esAgenteRetencion: e.target.checked })}
              />
              {tSunat('agenteRetencion')}
            </label>
          )}
```

- [ ] **Paso 5: tipos, lint, pruebas y build**

Correr: `npx tsc --noEmit && npx next lint --file components/global/Sidebar.tsx --file "app/[locale]/(dashboard)/facturas/page.tsx" --file "app/[locale]/(dashboard)/dashboard/page.tsx" --file "app/[locale]/(dashboard)/clientes/nuevo/page.tsx" --file "app/[locale]/(dashboard)/clientes/[id]/page.tsx" && npm test && npx next build`
Esperado: sin errores nuevos. Como esos archivos ya existían, corre **antes del paso 1** el mismo `npx next lint --file …` y guarda su salida en tu scratchpad; al final compara y reporta solo los avisos nuevos.

- [ ] **Paso 6: commit**

```bash
git add components/global/Sidebar.tsx "app/[locale]/(dashboard)/facturas/page.tsx" "app/[locale]/(dashboard)/dashboard/page.tsx" "app/[locale]/(dashboard)/clientes/nuevo/page.tsx" "app/[locale]/(dashboard)/clientes/[id]/page.tsx"
git commit -m "feat(sunat): menú, redirección, alertas en el dashboard y clientes peruanos"
```

---

### Tarea 10: Verificación real en el navegador (la hace Opus)

`Riesgo: medio` · la ejecuta **Opus**, no se delega.

- [ ] **Paso 1: levantar el entorno local**

1. Postgres de pruebas (`invoiceapp-pg-test`, puerto 5436) con el esquema al día:

```bash
cd apps/backend
DATABASE_URL=postgresql://postgres:test@localhost:5436/invoiceapp_test npx prisma db push --skip-generate
```

2. Motor apuntando a beta:

```bash
cd apps/sunat-engine && docker build -q -t sunat-engine:dev . && docker run -d --name sunat-engine-dev -e ENGINE_TOKEN=prueba -p 8089:80 sunat-engine:dev
```

3. Backend en el puerto 4000, con variables de prueba (sin el `.env` real):

```bash
RESEND_API_KEY=re_prueba JWT_SECRET=dev STRIPE_SECRET_KEY=sk_test_x DATABASE_URL=postgresql://postgres:test@localhost:5436/invoiceapp_test SUNAT_ENGINE_URL=http://localhost:8089 SUNAT_ENGINE_TOKEN=prueba SUNAT_MASTER_KEY=<openssl rand -base64 32> SUNAT_ALMACEN_DIR=<scratchpad>/almacen PORT=4000 node app.js
```

4. Frontend: `cd apps/frontend && NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev`.

- [ ] **Paso 2: flujo en el navegador del panel**

Registrarse con una empresa de prueba con RUC `20000000001`. Luego:
1. **Activar SUNAT:** Configuración › SUNAT › Activar. Datos fiscales de Lima (ubigeo `150101`), usuario `MODDATOS`, clave `moddatos`, y el certificado autofirmado `.pfx` de la tarea 16 del backend. Guardar: el menú cambia a «Comprobantes».
2. **Series:** crear `F001`, `B001` y `FC01`.
3. **Clientes:** crear un cliente RUC `20131312955` y otro DNI `12345678`.
4. **Factura:** Comprobantes › Nuevo, con dos líneas. La vista previa debe mostrar los totales del backend. «Guardar y emitir» → el detalle pasa de «Pendiente de envío» a «Aceptado» solo, sin recargar.
5. **Descargas:** PDF, XML y CDR.
6. **Anular:** con motivo → «Anulación en proceso» → «Anulado».
7. **Boleta** al cliente con DNI y **nota de crédito** sobre otra factura aceptada.
8. **Factura a crédito:** «Repartir en 2 cuotas» deja la diferencia en 0.
9. **Regresión:** con una empresa `US`, el menú dice «Facturas» y `/facturas` funciona igual que antes.

- [ ] **Paso 3: limpieza, HANDOFF y commit**

Detener el motor (`docker rm -f sunat-engine-dev`) y los servidores. Actualizar `docs/HANDOFF.md` con el resultado y lo no verificado, y commitear.

---

## Cobertura del spec

| Requisito del spec | Tarea |
|---|---|
| Rutas `/comprobantes`, `/nuevo` (con `?tipo&afecta&motivo`), `/[id]`, `/[id]/editar` | 7 |
| Menú «Comprobantes» para `PE`, redirección de `/facturas` | 9 |
| Pestaña SUNAT con activación para empresas no `PE`; refresco de la empresa | 8 |
| Alertas en el dashboard | 5, 9 |
| Casilla «agente de retención» en clientes (+ tipos de documento peruanos) | 1, 9 |
| `lib/sunat/{tipos,api,estados,formulario}` (+ `formato`, `errores`, `hooks`) | 3, 4 |
| Formulario: tipo/serie/cliente/operación/moneda/líneas/detracción/percepción/cuotas/notas | 4, 6 |
| Vista previa del backend, sin cálculos en el frontend | 4, 6 |
| Detalle: acciones por estado, refresco 5 s × 2 min, anular → NC fuera de plazo, corregir, historial, descargas | 5, 7 |
| Emisor: datos fiscales, ambiente con confirmación de RUC, SOL oculta, `.pfx`, detracciones y agentes; series | 8 |
| Errores 422 en lista, 503 genérico, toasts | 3, 5, 6, 7, 8 |
| Backend: clientes, `GET /catalogos`, XML/CDR servidos, almacén local | 1, 2 |
| Pruebas `node --test` de la lógica pura, tipos, lint, build, navegador | 3, 4, 7, 9, 10 |

**Agregado al spec, decidido en este plan:** los formularios de clientes muestran los tipos de documento peruanos (RUC, DNI, CE, pasaporte, sin documento) para empresas `PE`. Sin eso no se podría registrar desde la web un cliente con RUC al cual facturar.
