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
