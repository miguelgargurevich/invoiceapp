// Una empresa que cambia a Perú con una suscripción de Stripe: se cancela en Stripe y baja a pe-gratis.
// Nunca se llama a Stripe real: el cancelador se inyecta o se sustituye en el módulo.
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_falsa';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { getOrCreateSubscription } = require('../../src/middleware/subscription');
const stripePlanes = require('../../src/planes/stripe');
const { pasarAGratis } = require('../../src/planes/gratis');

const FUTURO = new Date('2099-01-01T00:00:00Z');
let ctx; let planUs;

test.beforeEach(async () => {
  await limpiar();
  await sembrarPlanesPe();
  planUs = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: { pais: 'US', priceMonthly: 0, isActive: true },
    create: { name: 'Free', slug: 'free', priceMonthly: 0, priceYearly: 0, currency: 'USD', pais: 'US', maxInvoicesPerMonth: -1, hasRegimenesSunat: false },
  });
  ctx = await crearEmpresaPeru(); // pais PE: la fila de EE. UU. que sigue es la de una empresa que acaba de cambiar a Perú
});
test.after(async () => { await prisma.$disconnect(); });

const conPlanUs = (extra = {}) => prisma.subscription.create({
  data: { empresaId: ctx.empresa.id, planId: planUs.id, status: 'ACTIVE', stripeCustomerId: 'cus_falsa', trialEnd: FUTURO, currentPeriodEnd: FUTURO, ...extra },
});
const fila = () => prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });

// Captura console.error mientras corre `fn` y devuelve lo registrado.
async function capturandoErrores(fn) {
  const original = console.error;
  const lineas = [];
  console.error = (...args) => { lineas.push(args.map(String).join(' ')); };
  try { await fn(); } finally { console.error = original; }
  return lineas;
}

test('cambio a PE con suscripción de Stripe: se cancela ese id y la fila queda en pe-gratis sin id de Stripe', async () => {
  await conPlanUs({ stripeSubscriptionId: 'sub_us_1' });
  const llamadas = [];
  const sub = await getOrCreateSubscription(ctx.empresa.id, prisma, { cancelarStripe: async (id) => { llamadas.push(id); } });
  assert.deepEqual(llamadas, ['sub_us_1']);
  assert.equal(sub.plan.slug, 'pe-gratis');
  const guardada = await fila();
  assert.equal(guardada.plan.slug, 'pe-gratis');
  assert.equal(guardada.stripeSubscriptionId, null);
  assert.equal(guardada.status, 'ACTIVE');
});

test('si Stripe falla la fila baja a pe-gratis igual y el log no lleva claves ni el id de Stripe', async () => {
  await conPlanUs({ stripeSubscriptionId: 'sub_us_2' });
  const cancelarStripe = async () => { throw new Error('Invalid API Key provided: sk_test_desactivado123'); };
  let sub;
  const lineas = await capturandoErrores(async () => { sub = await getOrCreateSubscription(ctx.empresa.id, prisma, { cancelarStripe }); });
  assert.equal(sub.plan.slug, 'pe-gratis');
  const guardada = await fila();
  assert.equal(guardada.plan.slug, 'pe-gratis');
  assert.equal(guardada.stripeSubscriptionId, null);
  const log = lineas.join('\n');
  assert.match(log, new RegExp(ctx.empresa.id));
  assert.match(log, /Invalid API Key/);
  assert.doesNotMatch(log, /sk_test_desactivado123/);
  assert.doesNotMatch(log, /sub_us_2/);
});

test('sin cliente de Stripe real (clave ausente) la cancelación falla y la baja al gratis sigue', async () => {
  await conPlanUs({ stripeSubscriptionId: 'sub_us_3' });
  const clave = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    const lineas = await capturandoErrores(async () => { await getOrCreateSubscription(ctx.empresa.id); });
    assert.match(lineas.join('\n'), /STRIPE_SECRET_KEY no está configurada/);
  } finally { process.env.STRIPE_SECRET_KEY = clave; }
  const guardada = await fila();
  assert.equal(guardada.plan.slug, 'pe-gratis');
  assert.equal(guardada.stripeSubscriptionId, null);
});

test('por defecto usa planes/stripe.js (sustituible en el módulo) y no se llama si no hay id de Stripe', async () => {
  const original = stripePlanes.cancelarStripe;
  const llamadas = [];
  stripePlanes.cancelarStripe = async (id) => { llamadas.push(id); };
  try {
    await conPlanUs({ stripeSubscriptionId: 'sub_us_4' });
    await getOrCreateSubscription(ctx.empresa.id);
    assert.deepEqual(llamadas, ['sub_us_4']);

    // Segunda lectura: ya es pe-gratis y sin id → no hay nada que cancelar.
    await getOrCreateSubscription(ctx.empresa.id);
    assert.deepEqual(llamadas, ['sub_us_4']);

    // Cambio de país sin Stripe (prueba gratuita de EE. UU.): baja sin llamar a Stripe.
    await prisma.subscription.update({ where: { empresaId: ctx.empresa.id }, data: { planId: planUs.id, status: 'TRIALING' } });
    await getOrCreateSubscription(ctx.empresa.id);
    assert.deepEqual(llamadas, ['sub_us_4']);
    assert.equal((await fila()).plan.slug, 'pe-gratis');
  } finally { stripePlanes.cancelarStripe = original; }
});

test('pasarAGratis solo borra el id de Stripe cuando se pide (Culqi no lo toca)', async () => {
  const s = await conPlanUs({ stripeSubscriptionId: 'sub_us_5' });
  await pasarAGratis(prisma, s, { pais: 'PE' });
  assert.equal((await fila()).stripeSubscriptionId, 'sub_us_5');
  await pasarAGratis(prisma, s, { pais: 'PE', limpiarStripe: true });
  assert.equal((await fila()).stripeSubscriptionId, null);
});
