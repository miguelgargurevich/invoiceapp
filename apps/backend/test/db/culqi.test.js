process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_falsa';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { crearServicioCulqi } = require('../../src/pagos/culqi/suscripciones');
const { ErrorCulqi } = require('../../src/pagos/culqi/cliente');
const { crearRouterCulqi } = require('../../src/routes/subscriptionsCulqi');

const AHORA = new Date('2026-11-10T15:00:00Z');
const facturacion = { nombre: 'Ana María', apellido: 'Pérez 2', telefono: '999888777', direccion: 'Av. Prueba 123', ciudad: 'Lima' };

function culqiFalso(sobre = {}) {
  const llamadas = [];
  const reg = (nombre, valor) => async (...args) => {
    llamadas.push({ nombre, args });
    const v = typeof valor === 'function' ? valor(...args) : valor;
    if (v instanceof Error) throw v;
    return v;
  };
  return {
    llamadas,
    crearCliente: reg('crearCliente', sobre.crearCliente ?? { id: 'cus_test_1' }),
    buscarClientePorEmail: reg('buscarClientePorEmail', sobre.buscarClientePorEmail ?? null),
    crearTarjeta: reg('crearTarjeta', sobre.crearTarjeta ?? { id: 'crd_test_1' }),
    crearSuscripcion: reg('crearSuscripcion', sobre.crearSuscripcion ?? { id: 'sxn_test_1', status: 1 }),
    consultarSuscripcion: reg('consultarSuscripcion', sobre.consultarSuscripcion ?? { id: 'sxn_test_1', status: 3, next_billing_date: 1765400000 }),
    cambiarTarjetaSuscripcion: reg('cambiarTarjetaSuscripcion', { id: 'sxn_test_1' }),
    cancelarSuscripcion: reg('cancelarSuscripcion', sobre.cancelarSuscripcion ?? { id: 'sxn_test_1', delete: true }),
    consultarEvento: reg('consultarEvento', sobre.consultarEvento ?? null),
  };
}

let ctx; let planes;
test.beforeEach(async () => {
  await limpiar();
  await prisma.eventoCulqi.deleteMany();
  planes = await sembrarPlanesPe();
  await prisma.plan.updateMany({ where: { pais: 'PE' }, data: { culqiPlanIdMensual: null, culqiPlanIdAnual: null } });
  await prisma.plan.update({ where: { slug: 'pe-negocio' }, data: { culqiPlanIdMensual: 'pln_test_negocio_m', culqiPlanIdAnual: 'pln_test_negocio_a' } });
  ctx = await crearEmpresaPeru();
  await prisma.subscription.create({ data: { empresaId: ctx.empresa.id, planId: planes['pe-gratis'].id, status: 'ACTIVE' } });
});
test.after(async () => {
  await prisma.plan.updateMany({ where: { pais: 'PE' }, data: { culqiPlanIdMensual: null, culqiPlanIdAnual: null } });
  await prisma.$disconnect();
});

const servicio = (culqi) => crearServicioCulqi({ prisma, culqi, ahora: () => AHORA });
const suscribir = (s, extra = {}) => s.suscribir({
  empresa: ctx.empresa, email: ctx.user.email, planSlug: 'pe-negocio', intervalo: 'MONTH', tokenId: 'tkn_test_1', facturacion, ...extra,
});

test('suscribir crea cliente, tarjeta y suscripción en Culqi y activa el plan', async () => {
  const culqi = culqiFalso();
  const r = await suscribir(servicio(culqi));
  assert.equal(r.subscription.plan.slug, 'pe-negocio');
  assert.equal(r.subscription.status, 'ACTIVE');
  assert.equal(r.subscription.proveedorPago, 'culqi');
  assert.equal(r.subscription.culqiSubscriptionId, 'sxn_test_1');
  assert.equal(r.subscription.billingInterval, 'MONTH');
  const cliente = culqi.llamadas.find((l) => l.nombre === 'crearCliente').args[0];
  assert.equal(cliente.first_name, 'Ana María');
  assert.equal(cliente.last_name, 'Pérez'); // solo letras y espacios
  assert.equal(cliente.country_code, 'PE');
  const sus = culqi.llamadas.find((l) => l.nombre === 'crearSuscripcion').args[0];
  assert.deepEqual(sus, { card_id: 'crd_test_1', plan_id: 'pln_test_negocio_m', tyc: true, metadata: { empresa_id: ctx.empresa.id } });
});

test('si Culqi pide 3DS no crea la suscripción y guarda el cliente para el reintento', async () => {
  const culqi = culqiFalso({ crearTarjeta: { requiere3DS: true } });
  assert.deepEqual(await suscribir(servicio(culqi)), { requiere3DS: true });
  assert.equal(culqi.llamadas.some((l) => l.nombre === 'crearSuscripcion'), false);
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } });
  assert.equal(s.culqiCustomerId, 'cus_test_1');
  // Reintento con 3DS: no vuelve a crear el cliente y manda los parámetros.
  const culqi2 = culqiFalso();
  await suscribir(servicio(culqi2), { authentication3DS: { eci: '05', xid: 'x', cavv: 'c', protocolVersion: '2.1.0', directoryServerTransactionId: 'd' } });
  assert.equal(culqi2.llamadas.some((l) => l.nombre === 'crearCliente'), false);
  assert.equal(culqi2.llamadas.find((l) => l.nombre === 'crearTarjeta').args[0].authentication_3DS.eci, '05');
});

test('dos pagos simultáneos de la misma empresa: el segundo se rechaza y Culqi recibe una sola suscripción', async () => {
  let soltar;
  // Solo la primera tarjeta queda esperando a que la soltemos; las siguientes responden al instante.
  const culqi = culqiFalso({
    crearTarjeta: () => (soltar ? { id: 'crd_test_2' } : new Promise((r) => { soltar = () => r({ id: 'crd_test_1' }); })),
  });
  const s = servicio(culqi);
  const primero = suscribir(s);
  for (let i = 0; !soltar && i < 300; i += 1) await new Promise((r) => setTimeout(r, 10)); // el primero ya espera a Culqi
  assert.ok(soltar, 'el primer pago no llegó a crear la tarjeta');
  await assert.rejects(suscribir(s), /pago en curso/);
  soltar();
  await primero;
  assert.equal(culqi.llamadas.filter((l) => l.nombre === 'crearSuscripcion').length, 1);
  await suscribir(s, { intervalo: 'YEAR' }); // terminado el primero, se puede volver a pagar
});

test('una tarjeta rechazada deja el plan como estaba', async () => {
  const culqi = culqiFalso({ crearTarjeta: new ErrorCulqi({ status: 402, tipo: 'card_error', mensajeUsuario: 'Fondos insuficientes' }) });
  await assert.rejects(suscribir(servicio(culqi)), ErrorCulqi);
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(s.plan.slug, 'pe-gratis');
});

test('no se puede contratar un plan sin id de Culqi, gratis o de otro país', async () => {
  for (const planSlug of ['pe-emprendedor', 'pe-gratis', 'free']) {
    await assert.rejects(suscribir(servicio(culqiFalso()), { planSlug }), /no se puede contratar/i);
  }
});

test('cambiar de plan crea la nueva suscripción y después cancela la anterior', async () => {
  await suscribir(servicio(culqiFalso()));
  const culqi = culqiFalso({ crearSuscripcion: { id: 'sxn_test_2', status: 1 } });
  await suscribir(servicio(culqi), { intervalo: 'YEAR' });
  const nombres = culqi.llamadas.map((l) => l.nombre);
  assert.ok(nombres.indexOf('crearSuscripcion') < nombres.indexOf('cancelarSuscripcion'));
  assert.equal(culqi.llamadas.find((l) => l.nombre === 'cancelarSuscripcion').args[0], 'sxn_test_1');
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } });
  assert.equal(s.culqiSubscriptionId, 'sxn_test_2');
  assert.equal(s.billingInterval, 'YEAR');
});

test('cancelar cancela en Culqi y conserva el plan hasta el fin del período', async () => {
  await suscribir(servicio(culqiFalso()));
  const culqi = culqiFalso();
  await servicio(culqi).cancelar(ctx.empresa.id);
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(s.cancelAtPeriodEnd, true);
  assert.equal(s.plan.slug, 'pe-negocio');
  assert.equal(culqi.llamadas[0].nombre, 'cancelarSuscripcion');
});

test('el webhook reconsulta el evento y la suscripción, y es idempotente', async () => {
  await suscribir(servicio(culqiFalso()));
  const evento = { id: 'evt_test_1', type: 'subscription.charge.succeeded', data: JSON.stringify({ subscription_id: 'sxn_test_1' }) };
  const culqi = culqiFalso({ consultarEvento: evento, consultarSuscripcion: { id: 'sxn_test_1', status: 3, next_billing_date: 1767000000 } });
  const s = servicio(culqi);
  assert.equal((await s.procesarEvento('evt_test_1')).procesado, true);
  assert.equal((await s.procesarEvento('evt_test_1')).procesado, false); // ya estaba
  assert.equal(culqi.llamadas.filter((l) => l.nombre === 'consultarEvento').length, 1);
  const sub = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } });
  assert.equal(sub.currentPeriodEnd.getTime(), 1767000000 * 1000);
  assert.equal(sub.status, 'ACTIVE');
});

test('cobro fallido marca PAST_DUE y una cancelación de Culqi pasa a pe-gratis', async () => {
  await suscribir(servicio(culqiFalso()));
  const fallo = culqiFalso({
    consultarEvento: { id: 'evt_test_2', type: 'subscription.charge.failed', data: { id: 'sxn_test_1' } },
    consultarSuscripcion: { id: 'sxn_test_1', status: 3, next_billing_date: 1767000000 },
  });
  await servicio(fallo).procesarEvento('evt_test_2');
  assert.equal((await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id } })).status, 'PAST_DUE');

  const cancel = culqiFalso({
    consultarEvento: { id: 'evt_test_3', type: 'subscription.cancel.succeeded', data: { id: 'sxn_test_1' } },
    consultarSuscripcion: { id: 'sxn_test_1', status: 4 },
  });
  await servicio(cancel).procesarEvento('evt_test_3');
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(s.plan.slug, 'pe-gratis');
  assert.equal(s.status, 'ACTIVE');
  assert.equal(s.culqiSubscriptionId, null);
});

test('un evento de una suscripción ajena a la BD se registra y no toca nada', async () => {
  const culqi = culqiFalso({ consultarEvento: { id: 'evt_test_4', type: 'subscription.charge.succeeded', data: { id: 'sxn_test_otra' } } });
  assert.equal((await servicio(culqi).procesarEvento('evt_test_4')).procesado, true);
  assert.equal(culqi.llamadas.some((l) => l.nombre === 'consultarSuscripcion'), false);
});

test('si falla el procesamiento se borra la marca para que Culqi reintente', async () => {
  await suscribir(servicio(culqiFalso()));
  const roto = culqiFalso({
    consultarEvento: { id: 'evt_test_5', type: 'subscription.charge.succeeded', data: { id: 'sxn_test_1' } },
    consultarSuscripcion: new Error('Culqi caído'),
  });
  await assert.rejects(servicio(roto).procesarEvento('evt_test_5'), /Culqi caído/);
  assert.equal(await prisma.eventoCulqi.count({ where: { id: 'evt_test_5' } }), 0);
});

test('una cancelación hecha por el usuario no baja el plan antes del fin del período', async () => {
  await suscribir(servicio(culqiFalso()));
  await prisma.subscription.update({
    where: { empresaId: ctx.empresa.id },
    data: { cancelAtPeriodEnd: true, currentPeriodEnd: new Date('2026-12-01T00:00:00Z') },
  });
  const culqi = culqiFalso({
    consultarEvento: { id: 'evt_test_6', type: 'subscription.cancel.succeeded', data: { id: 'sxn_test_1' } },
    consultarSuscripcion: { id: 'sxn_test_1', status: 4 },
  });
  await servicio(culqi).procesarEvento('evt_test_6');
  const s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(s.plan.slug, 'pe-negocio');
});

async function conServidor(montar, fn) {
  const app = express();
  app.use(express.json());
  montar(app);
  const servidor = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try { return await fn(`http://127.0.0.1:${servidor.address().port}`); } finally { await new Promise((r) => servidor.close(r)); }
}
const post = (base, ruta, cuerpo) => fetch(`${base}${ruta}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
});

test('POST /api/webhooks/culqi rechaza ids inválidos con 400 y no consulta a Culqi', async () => {
  const webhooks = require('../../src/routes/webhooks');
  await conServidor((app) => app.use('/api/webhooks', webhooks), async (base) => {
    for (const cuerpo of [{ id: 'no-valido' }, {}, { id: 123 }, { id: 'evt_test_x/../y' }]) {
      assert.equal((await post(base, '/api/webhooks/culqi', cuerpo)).status, 400);
    }
  });
});

test('POST /api/webhooks/culqi responde 500 (Culqi reintenta) si no se puede procesar, sin tumbar la app', async () => {
  const webhooks = require('../../src/routes/webhooks');
  const previa = process.env.CULQI_SECRET_KEY;
  delete process.env.CULQI_SECRET_KEY;
  try {
    await conServidor((app) => app.use('/api/webhooks', webhooks), async (base) => {
      const r = await post(base, '/api/webhooks/culqi', { id: 'evt_test_abc123' });
      assert.equal(r.status, 500);
      assert.deepEqual(await r.json(), { error: 'No se pudo procesar el evento' });
    });
  } finally { if (previa !== undefined) process.env.CULQI_SECRET_KEY = previa; }
});

test('rutas de Culqi: solo empresas de Perú, validan el cuerpo y traducen los errores de Culqi', async () => {
  const cuerpoValido = { planSlug: 'pe-negocio', intervalo: 'MONTH', tokenId: 'tkn_test_1', facturacion };
  const montar = (empresa, servicioFalso) => (app) => app.use('/s', crearRouterCulqi({
    prisma,
    obtenerServicio: () => servicioFalso,
    auth: [(req, res, next) => { req.user = { id: ctx.user.id }; req.empresa = empresa; next(); }],
  }));

  await conServidor(montar({ ...ctx.empresa, pais: 'US' }, {}), async (base) => {
    assert.equal((await post(base, '/s/suscribir', cuerpoValido)).status, 403);
  });
  await conServidor(montar(ctx.empresa, { suscribir: async () => { throw new Error('no debe llamarse'); } }), async (base) => {
    assert.equal((await post(base, '/s/suscribir', { ...cuerpoValido, tokenId: 'cualquiera' })).status, 400);
    assert.equal((await post(base, '/s/suscribir', { planSlug: 'pe-negocio' })).status, 400);
  });
  const rechazo = new ErrorCulqi({ status: 402, tipo: 'card_error', mensajeUsuario: 'Su tarjeta no tiene fondos suficientes.', mensajeComercio: 'detalle interno' });
  await conServidor(montar(ctx.empresa, { suscribir: async () => { throw rechazo; } }), async (base) => {
    const r = await post(base, '/s/suscribir', cuerpoValido);
    assert.equal(r.status, 402);
    assert.deepEqual(await r.json(), { error: 'Su tarjeta no tiene fondos suficientes.' });
  });
  let recibido;
  await conServidor(montar(ctx.empresa, { suscribir: async (d) => { recibido = d; return { requiere3DS: true }; } }), async (base) => {
    const r = await post(base, '/s/suscribir', cuerpoValido);
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { requiere3DS: true });
    assert.equal(recibido.email, ctx.user.email);
    assert.equal(recibido.empresa.id, ctx.empresa.id);
  });
});

test('cancelar, reactivar y pasar a gratis con Culqi usan Culqi y nunca Stripe', async () => {
  await suscribir(servicio(culqiFalso()));
  const culqi = culqiFalso();
  const indice = require('../../src/pagos/culqi');
  const original = indice.obtenerServicioCulqi;
  indice.obtenerServicioCulqi = () => servicio(culqi); // las rutas lo piden al usarse
  const { generateAccessToken } = require('../../src/middleware/auth');
  const cabeceras = { Authorization: `Bearer ${generateAccessToken(ctx.user)}`, 'Content-Type': 'application/json' };
  const llamar = (base, ruta) => fetch(`${base}/api/subscriptions${ruta}`, { method: 'POST', headers: cabeceras, body: '{}' });
  try {
    await conServidor((app) => app.use('/api/subscriptions', require('../../src/routes/subscriptions')), async (base) => {
      const cancelar = await llamar(base, '/cancel');
      assert.equal(cancelar.status, 200);
      let s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
      assert.equal(s.cancelAtPeriodEnd, true);
      assert.equal(s.plan.slug, 'pe-negocio');
      assert.deepEqual(culqi.llamadas.map((l) => l.nombre), ['cancelarSuscripcion']);

      const reactivar = await llamar(base, '/reactivate');
      assert.equal(reactivar.status, 400);
      assert.match((await reactivar.json()).error, /no se puede deshacer/);

      const gratis = await llamar(base, '/switch-to-free');
      assert.equal(gratis.status, 200);
      s = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
      assert.equal(s.plan.slug, 'pe-gratis');
      assert.equal(s.culqiSubscriptionId, null);
      assert.equal(culqi.llamadas.filter((l) => l.nombre === 'cancelarSuscripcion').length, 2);

      // Sin suscripción de Culqi vigente, cancelar responde 400 (no 500).
      assert.equal((await llamar(base, '/cancel')).status, 400);
    });
  } finally { indice.obtenerServicioCulqi = original; }
});
