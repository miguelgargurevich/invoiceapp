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
