// Seguridad de planes: el cupo y los regímenes fallan CERRADOS y la suscripción siempre es la vigente.
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_falsa';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { engineFalso, almacenFalso, colaFalsa } = require('./falsos');
const { guardarBorrador } = require('../../src/sunat/emision/borradores');
const { crearServicioEmision } = require('../../src/sunat/emision/servicio');
const { descifrar } = require('../../src/sunat/seguridad/cifrado');
const { ErrorPlan } = require('../../src/sunat/errores');
const { getOrCreateSubscription, checkFeature } = require('../../src/middleware/subscription');
const { crearRouterSunat } = require('../../src/routes/sunat');
const { generateAccessToken } = require('../../src/middleware/auth');
const empresaRouter = require('../../src/routes/empresa');
const subscriptionsRouter = require('../../src/routes/subscriptions');
const signaturesRouter = require('../../src/routes/signatures');

const AHORA = new Date('2026-11-15T17:00:00Z');
const PASADO = new Date('2020-01-01T00:00:00Z');
const FUTURO = new Date('2099-01-01T00:00:00Z');

let ctx; let planes; let planUs; let servidor; let base;
let usuarioActual;

// El cambio de país cancela la suscripción de Stripe: aquí nunca se llama a Stripe real.
const stripePlanes = require('../../src/planes/stripe');
const cancelarStripeOriginal = stripePlanes.cancelarStripe;
stripePlanes.cancelarStripe = async () => {};

test.before(async () => {
  const sunat = { engine: engineFalso(), almacen: almacenFalso() };
  const auth = [async (req, _res, next) => {
    req.user = { id: usuarioActual.user.id };
    req.empresa = await prisma.empresa.findUnique({ where: { id: usuarioActual.empresa.id } });
    next();
  }];
  const app = express();
  app.use(express.json());
  app.use('/api/sunat', crearRouterSunat({ prisma, obtenerSunat: async () => sunat, auth }));
  app.use('/api/empresas', empresaRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/signatures', (req, _res, next) => { req.user = { id: usuarioActual.user.id }; next(); }, signaturesRouter);
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.beforeEach(async () => {
  await limpiar();
  planes = await sembrarPlanesPe();
  planUs = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: { pais: 'US', priceMonthly: 0, isActive: true },
    create: { name: 'Free', slug: 'free', priceMonthly: 0, priceYearly: 0, currency: 'USD', pais: 'US', maxInvoicesPerMonth: -1, hasRegimenesSunat: false },
  });
  ctx = await crearEmpresaPeru();
  usuarioActual = ctx;
});
test.after(async () => { stripePlanes.cancelarStripe = cancelarStripeOriginal; servidor.close(); await prisma.$disconnect(); });

const suscribirA = (slug, extra = {}) => prisma.subscription.create({
  data: { empresaId: ctx.empresa.id, planId: planes[slug].id, status: 'ACTIVE', ...extra },
});
const suscripcion = () => prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
const borrador = (extra = {}) => guardarBorrador({
  prisma, empresa: ctx.empresa, userId: ctx.user.id,
  datos: { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 118 }], ...extra },
});
const servicio = () => crearServicioEmision({ prisma, engine: engineFalso(), almacen: almacenFalso(), descifrar, cola: colaFalsa(), ahora: () => AHORA });
async function emitidas(n, fecha = AHORA) {
  for (let i = 1; i <= n; i += 1) await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 1000 + i, fechaEmision: fecha });
}
const esFeature403 = (e) => e instanceof ErrorPlan && e.status === 403 && e.codigo === 'FEATURE_NOT_AVAILABLE';
const detraccion = () => borrador({ detraccion: { codigo: '037' }, tipoOperacion: '1001', lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 1000 }] });

// Ejecuta el middleware checkFeature con una empresa y devuelve { status, cuerpo } (o { pasa: true }).
async function middlewareFeature(feature) {
  let res; let pasa = false;
  const req = { empresa: { id: ctx.empresa.id } };
  await new Promise((resolve) => {
    res = { status(c) { this.codigo = c; return this; }, json(c) { this.cuerpo = c; resolve(); } };
    checkFeature(feature)(req, res, () => { pasa = true; resolve(); });
  });
  return pasa ? { pasa: true } : { status: res.codigo, cuerpo: res.cuerpo };
}
const pedirFirma = async () => {
  const factura = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 77 });
  const r = await fetch(`${base}/api/signatures/request`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ documentType: 'INVOICE', documentId: factura.id, signerEmail: 'firma@test.pe', sendEmail: false }),
  });
  return { status: r.status, json: await r.json() };
};

// ---------- Falla 1: sin suscripción peruana ----------

test('empresa PE sin suscripción: el cupo es el de pe-gratis (10) y la suscripción queda creada', async () => {
  assert.equal(await prisma.subscription.count({ where: { empresaId: ctx.empresa.id } }), 0);
  await emitidas(9);
  assert.equal((await servicio().emitir((await borrador()).id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO'); // el 10.º
  const b = await borrador();
  await assert.rejects(servicio().emitir(b.id, ctx.empresa.id), (e) => e instanceof ErrorPlan && e.status === 402 && /límite de comprobantes/.test(e.message));
  assert.equal((await suscripcion()).plan.slug, 'pe-gratis');
});

test('empresa PE sin suscripción: la detracción responde 403', async () => {
  await assert.rejects(detraccion(), esFeature403);
  assert.equal((await suscripcion()).plan.slug, 'pe-gratis');
});

test('sin ningún plan sembrado, emitir y la detracción fallan cerrados', async () => {
  await prisma.plan.deleteMany({ where: { pais: 'PE' } });
  const b = await borrador();
  await assert.rejects(servicio().emitir(b.id, ctx.empresa.id), (e) => e instanceof ErrorPlan);
  await assert.rejects(detraccion(), (e) => e instanceof ErrorPlan && e.status === 403);
});

test('empresa con plan de EE. UU. que pasa a PE por PUT /api/sunat/emisor queda en pe-gratis y el cupo aplica', async () => {
  await prisma.empresa.update({ where: { id: ctx.empresa.id }, data: { pais: 'US' } });
  await prisma.subscription.create({
    data: { empresaId: ctx.empresa.id, planId: planUs.id, status: 'ACTIVE', stripeSubscriptionId: 'sub_falsa_1', trialStart: new Date(), trialEnd: FUTURO, currentPeriodEnd: FUTURO },
  });
  const r = await fetch(`${base}/api/sunat/emisor`, {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', direccionFiscal: 'AV 1' }),
  });
  assert.equal(r.status, 200);
  const sub = await suscripcion();
  assert.equal((await prisma.empresa.findUnique({ where: { id: ctx.empresa.id } })).pais, 'PE');
  assert.equal(sub.plan.slug, 'pe-gratis');
  assert.equal(sub.trialEnd, null);
  assert.equal(sub.currentPeriodEnd, null);
  await emitidas(10);
  await assert.rejects(servicio().emitir((await borrador()).id, ctx.empresa.id), (e) => e instanceof ErrorPlan && e.status === 402);
});

test('PUT /api/empresas/mi-empresa con pais PE mueve la suscripción al plan gratis del país nuevo', async () => {
  const user = await prisma.userProfile.create({ data: { email: `us-${Date.now()}@test.com` } });
  const empresa = await prisma.empresa.create({ data: { nombre: 'Gringa LLC', razonSocial: 'GRINGA LLC', ruc: 'TEMP-1', pais: 'US', userId: user.id } });
  await prisma.subscription.create({ data: { empresaId: empresa.id, planId: planUs.id, status: 'ACTIVE' } });
  const r = await fetch(`${base}/api/empresas/mi-empresa`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${generateAccessToken(user)}` },
    body: JSON.stringify({ nombre: 'Gringa LLC', ruc: 'TEMP-1', pais: 'PE' }),
  });
  assert.equal(r.status, 200);
  const sub = await prisma.subscription.findUnique({ where: { empresaId: empresa.id }, include: { plan: true } });
  assert.equal(sub.plan.slug, 'pe-gratis');
});

test('getOrCreateSubscription corrige una fila cuyo plan es de otro país', async () => {
  await prisma.subscription.create({ data: { empresaId: ctx.empresa.id, planId: planUs.id, status: 'TRIALING', trialEnd: FUTURO } });
  const sub = await getOrCreateSubscription(ctx.empresa.id);
  assert.equal(sub.plan.slug, 'pe-gratis');
  assert.equal(sub.status, 'ACTIVE');
  assert.equal((await suscripcion()).plan.slug, 'pe-gratis');
});

test('GET /api/subscriptions/usage en una empresa PE sin suscripción crea pe-gratis (no un plan de EE. UU.)', async () => {
  const r = await fetch(`${base}/api/subscriptions/usage`, { headers: { authorization: `Bearer ${generateAccessToken(ctx.user)}` } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).limits.maxInvoices, 10);
  assert.equal((await suscripcion()).plan.slug, 'pe-gratis');
});

test('GET /api/subscriptions/current devuelve la suscripción vigente (la crea si falta) sin datos de la empresa embebidos', async () => {
  const r = await fetch(`${base}/api/subscriptions/current`, { headers: { authorization: `Bearer ${generateAccessToken(ctx.user)}` } });
  assert.equal(r.status, 200);
  const cuerpo = await r.json();
  assert.equal(cuerpo.subscription.plan.slug, 'pe-gratis');
  assert.equal(cuerpo.subscription.empresa, undefined);
});

// ---------- Falla 2: Culqi cancelado o con cobro fallido ----------

test('Culqi cancelada y vencida: se baja a pe-gratis en la base y se niegan regímenes, proformas y firma', async () => {
  await suscribirA('pe-negocio', { proveedorPago: 'culqi', culqiSubscriptionId: 'sxn_test_x', cancelAtPeriodEnd: true, currentPeriodEnd: PASADO });
  await assert.rejects(detraccion(), esFeature403);
  const sub = await suscripcion();
  assert.equal(sub.plan.slug, 'pe-gratis');
  assert.equal(sub.culqiSubscriptionId, null);
  assert.equal(sub.cancelAtPeriodEnd, false);
  assert.equal(sub.currentPeriodEnd, null);
  const prop = await middlewareFeature('hasProposals');
  assert.equal(prop.status, 403);
  assert.equal(prop.cuerpo.code, 'FEATURE_NOT_AVAILABLE');
  const firma = await pedirFirma();
  assert.equal(firma.status, 403);
  assert.equal(firma.json.code, 'FEATURE_NOT_AVAILABLE');
});

test('Culqi cancelada pero vigente conserva el plan pagado hasta el fin del período', async () => {
  await suscribirA('pe-negocio', { proveedorPago: 'culqi', culqiSubscriptionId: 'sxn_test_y', cancelAtPeriodEnd: true, currentPeriodEnd: FUTURO });
  const sub = await getOrCreateSubscription(ctx.empresa.id);
  assert.equal(sub.plan.slug, 'pe-negocio');
  assert.equal((await suscripcion()).plan.slug, 'pe-negocio');
  assert.deepEqual(await middlewareFeature('hasProposals'), { pasa: true });
  assert.ok((await detraccion()).id);
  // Pasa la compuerta del plan (la solicitud se crea ligada a facturaId; ver firmas-documento.test.js).
  assert.notEqual((await pedirFirma()).status, 403);
});

test('Culqi en PAST_DUE: límites y funciones son los de pe-gratis, pero la fila no se baja', async () => {
  await suscribirA('pe-empresa', { proveedorPago: 'culqi', culqiSubscriptionId: 'sxn_test_z', status: 'PAST_DUE', currentPeriodEnd: FUTURO });
  const sub = await getOrCreateSubscription(ctx.empresa.id);
  assert.equal(sub.plan.slug, 'pe-gratis');
  assert.equal(sub.planContratado.slug, 'pe-empresa');
  await assert.rejects(detraccion(), esFeature403);
  await emitidas(10);
  await assert.rejects(servicio().emitir((await borrador()).id, ctx.empresa.id), (e) => e instanceof ErrorPlan && e.status === 402);
  assert.equal((await middlewareFeature('hasProposals')).status, 403);
  assert.equal((await pedirFirma()).status, 403);
  const fila = await suscripcion();
  assert.equal(fila.plan.slug, 'pe-empresa');
  assert.equal(fila.status, 'PAST_DUE');
  assert.equal(fila.culqiSubscriptionId, 'sxn_test_z');
});

test('una suscripción de Stripe en PAST_DUE no se toca (solo Culqi tiene plan efectivo)', async () => {
  await prisma.empresa.update({ where: { id: ctx.empresa.id }, data: { pais: 'US' } });
  await prisma.subscription.create({ data: { empresaId: ctx.empresa.id, planId: planUs.id, status: 'PAST_DUE' } });
  const sub = await getOrCreateSubscription(ctx.empresa.id);
  assert.equal(sub.plan.slug, 'free');
  assert.equal(sub.planContratado, undefined);
});
