process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
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
const { generateAccessToken } = require('../../src/middleware/auth');
const facturasRouter = require('../../src/routes/facturas');

let ctx; let ctx2; let servidor; let servidorFacturas; let base; let baseFacturas; let engine; let usuarioActual;

test.before(async () => {
  await limpiar();
  ctx = await crearEmpresaPeru();
  ctx2 = await crearEmpresaPeru({ ruc: '20000000002' });
  usuarioActual = ctx;
  engine = engineFalso();
  const almacen = almacenFalso();
  const cola = colaFalsa();
  const sunat = {
    engine, almacen,
    servicioEmision: crearServicioEmision({ prisma, engine, almacen, descifrar, cola }),
    servicioAnulacion: crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola }),
  };
  const auth = [async (req, _res, next) => {
    req.user = { id: usuarioActual.user.id };
    req.empresa = await prisma.empresa.findUnique({ where: { id: usuarioActual.empresa.id } });
    next();
  }];
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  const limites = { verificar: (_q, _s, n) => n(), incrementar: async () => {} };
  app.use('/api/comprobantes', crearRouterComprobantes({ prisma, obtenerSunat: async () => sunat, auth, limites }));
  app.use('/api/sunat', crearRouterSunat({ prisma, obtenerSunat: async () => sunat, auth }));
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;

  // Router real de /api/facturas con su autenticación real (JWT), para probar el bloqueo de comprobantes SUNAT.
  const appFacturas = express();
  appFacturas.use(express.json());
  appFacturas.use('/api/facturas', facturasRouter);
  await new Promise((r) => { servidorFacturas = appFacturas.listen(0, r); });
  baseFacturas = `http://127.0.0.1:${servidorFacturas.address().port}`;
});
test.after(async () => { servidor.close(); servidorFacturas.close(); await prisma.$disconnect(); });

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
  assert.doesNotMatch(creado.texto, /Cifrad|v1:/);

  const editado = await pedir('PUT', `/api/comprobantes/${creado.json.id}`, { ...datos(), lineas: [{ descripcion: 'X', cantidad: 2, precio: 118 }] });
  assert.equal(editado.json.total, '236');
  assert.doesNotMatch(editado.texto, /Cifrad|v1:/);

  const emitido = await pedir('POST', `/api/comprobantes/${creado.json.id}/emitir`);
  assert.equal(emitido.status, 200);
  assert.equal(emitido.json.estadoSunat, 'PENDIENTE_ENVIO');
  assert.doesNotMatch(emitido.texto, /Cifrad|v1:/);

  assert.equal((await pedir('PUT', `/api/comprobantes/${creado.json.id}`, datos())).status, 400);
  assert.equal((await pedir('DELETE', `/api/comprobantes/${creado.json.id}`)).status, 409);

  const xml = await pedir('GET', `/api/comprobantes/${creado.json.id}/xml`);
  assert.equal(xml.status, 200);
  assert.match(xml.headers.get('content-type'), /application\/xml/);
  assert.match(xml.headers.get('content-disposition'), /attachment; filename="20000000001-01-F001-1\.xml"/);
  assert.match(xml.texto, /<xml>F001-1<\/xml>/);
  assert.equal((await pedir('GET', `/api/comprobantes/${creado.json.id}/cdr`)).status, 404);
  const pdf = await pedir('GET', `/api/comprobantes/${creado.json.id}/pdf`);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
});

test('ninguna respuesta (detalle ni lista) incluye secretos del emisor', async () => {
  const creado = await pedir('POST', '/api/comprobantes', datos());
  const detalle = await pedir('GET', `/api/comprobantes/${creado.json.id}`);
  assert.equal(detalle.status, 200);
  assert.doesNotMatch(detalle.texto, /Cifrad|v1:|emisorSunat/);
  const lista = await pedir('GET', '/api/comprobantes');
  assert.equal(lista.status, 200);
  assert.ok(lista.json.length > 0);
  assert.doesNotMatch(lista.texto, /Cifrad|v1:|emisorSunat/);
});

test('una segunda empresa PE no puede tocar los comprobantes de la primera (404 en todo)', async () => {
  const creado = await pedir('POST', '/api/comprobantes', datos());
  const id = creado.json.id;
  const emitido = await pedir('POST', '/api/comprobantes', datos());
  await pedir('POST', `/api/comprobantes/${emitido.json.id}/emitir`);
  const eid = emitido.json.id;

  usuarioActual = ctx2;
  try {
    const datosAjenos = { ...datos(), clienteId: ctx2.cliente.id };
    const intentos = [
      ['GET', `/api/comprobantes/${id}`],
      ['PUT', `/api/comprobantes/${id}`, datosAjenos],
      ['DELETE', `/api/comprobantes/${id}`],
      ['POST', `/api/comprobantes/${id}/emitir`],
      ['POST', `/api/comprobantes/${eid}/anular`, { motivo: 'error en datos del comprobante' }],
      ['POST', `/api/comprobantes/${eid}/corregir`],
      ['GET', `/api/comprobantes/${eid}/xml`],
      ['GET', `/api/comprobantes/${eid}/cdr`],
      ['GET', `/api/comprobantes/${eid}/pdf`],
    ];
    for (const [metodo, ruta, cuerpo] of intentos) {
      const r = await pedir(metodo, ruta, cuerpo);
      assert.equal(r.status, 404, `${metodo} ${ruta} debería dar 404 y dio ${r.status}: ${r.texto}`);
    }
    const lista = await pedir('GET', '/api/comprobantes');
    assert.deepEqual(lista.json, []);
  } finally { usuarioActual = ctx; }

  // el comprobante de la primera sigue intacto
  assert.equal((await pedir('GET', `/api/comprobantes/${id}`)).status, 200);
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
  assert.doesNotMatch(vista.texto, /Cifrad|moddatos|v1:/);

  const direccion = { ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', direccionFiscal: 'AV 1' };
  assert.equal((await pedir('PUT', '/api/sunat/emisor', { ...direccion, ambiente: 'PRODUCCION' })).status, 400);

  engine.inspeccionarCertificado = async () => ({ ruc: '20999999999', vence: '2030-01-01T00:00:00Z' });
  const otroRuc = await pedir('PUT', '/api/sunat/emisor', { ...direccion, certificado: { pfxBase64: 'eA==', clave: 'c' } });
  assert.equal(otroRuc.status, 400);
  assert.match(otroRuc.json.error, /20999999999/);

  engine.inspeccionarCertificado = async () => ({ ruc: '20000000001', vence: '2020-01-01T00:00:00Z' });
  const vencido = await pedir('PUT', '/api/sunat/emisor', { ...direccion, certificado: { pfxBase64: 'eA==', clave: 'c' } });
  assert.equal(vencido.status, 400);
  assert.match(vencido.json.error, /vencido/);

  engine.inspeccionarCertificado = async () => ({ ruc: '20000000001', vence: '2031-01-01T00:00:00Z' });
  const ok = await pedir('PUT', '/api/sunat/emisor', { ...direccion, solClave: 'nueva', certificado: { pfxBase64: 'eA==', clave: 'c' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.certificadoVence, '2031-01-01T00:00:00.000Z');
  assert.doesNotMatch(ok.texto, /Cifrad|nueva|v1:/);
});

test('series y alertas', async () => {
  assert.equal((await pedir('POST', '/api/sunat/series', { tipoComprobante: '03', serie: 'F002' })).status, 400);
  assert.equal((await pedir('POST', '/api/sunat/series', { tipoComprobante: '03', serie: 'B002' })).status, 201);
  assert.equal((await pedir('POST', '/api/sunat/series', { tipoComprobante: '03', serie: 'B002' })).status, 409);
  const alertas = await pedir('GET', '/api/sunat/alertas');
  assert.ok(Array.isArray(alertas.json.comprobantesPendientes));
});

test('/api/facturas bloquea los comprobantes SUNAT, a las empresas PE y los pagos en borrador', async () => {
  const pedirFactura = async (metodo, ruta, cuerpo) => {
    const r = await fetch(`${baseFacturas}/api/facturas${ruta}`, {
      method: metodo,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${generateAccessToken(ctx.user)}` },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const texto = await r.text();
    return { status: r.status, texto, json: texto ? JSON.parse(texto) : null };
  };
  const borrador = (await pedir('POST', '/api/comprobantes', datos())).json;

  const rutas = [['PUT', ''], ['DELETE', ''], ['PUT', '/dates'], ['PUT', '/observations'], ['PUT', '/order-type'], ['PUT', '/job-info'], ['PUT', '/payment-summary']];
  for (const [metodo, sufijo] of rutas) {
    const r = await pedirFactura(metodo, `/${borrador.id}${sufijo}`, { observaciones: 'x', orderType: 'Contract', totalMaterials: 1, totalLabor: 1 });
    assert.equal(r.status, 409, `${metodo} /api/facturas/:id${sufijo} debería bloquearse y dio ${r.status}: ${r.texto}`);
    assert.match(r.json.error, /api\/comprobantes/);
  }
  const intacto = await prisma.factura.findUnique({ where: { id: borrador.id } });
  assert.equal(intacto.observaciones, null);
  assert.equal(intacto.estado, 'emitida');

  // una factura legada (sin estadoSunat) de la misma empresa sigue editable por el flujo anterior
  const legada = await prisma.factura.create({
    data: { empresaId: ctx.empresa.id, clienteId: ctx.cliente.id, userId: ctx.user.id, serie: 'L001', numero: 1, fechaEmision: new Date(), subtotal: 1, igv: 0, total: 1 },
  });
  assert.equal((await pedirFactura('PUT', `/${legada.id}/observations`, { observaciones: 'ok' })).status, 200);

  // las empresas PE no crean facturas por el flujo antiguo (el plan es indiferente: se crea uno si no hay)
  await prisma.plan.upsert({ where: { slug: 'prueba-rutas' }, update: {}, create: { name: 'Prueba', slug: 'prueba-rutas', priceMonthly: 0, priceYearly: 0 } });
  const creacion = await pedirFactura('POST', '', { clienteId: ctx.cliente.id, detalles: [{ descripcion: 'x', cantidad: 1, precioUnitario: 1 }] });
  assert.equal(creacion.status, 409);
  assert.match(creacion.json.error, /Perú/);

  // pagos: un borrador SUNAT no admite pagos
  const pago = await pedirFactura('POST', `/${borrador.id}/pagos`, { monto: 1, metodoPago: 'efectivo' });
  assert.equal(pago.status, 400);
  assert.match(pago.json.error, /aún no se emite/);
});
