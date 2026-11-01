const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { engineFalso, almacenFalso, colaFalsa } = require('./falsos');
const { guardarBorrador } = require('../../src/sunat/emision/borradores');
const { crearServicioEmision } = require('../../src/sunat/emision/servicio');
const { descifrar } = require('../../src/sunat/seguridad/cifrado');
const { ErrorPlan } = require('../../src/sunat/errores');
const { inicioMesLima } = require('../../src/planes/cupo');

const AHORA = new Date('2026-11-15T17:00:00Z');
let ctx; let planes;
test.beforeEach(async () => {
  await limpiar();
  planes = await sembrarPlanesPe();
  ctx = await crearEmpresaPeru();
});
test.after(() => prisma.$disconnect());

const suscribirA = (slug, extra = {}) => prisma.subscription.create({
  data: { empresaId: ctx.empresa.id, planId: planes[slug].id, status: 'ACTIVE', ...extra },
});
const borrador = (extra = {}) => guardarBorrador({
  prisma, empresa: ctx.empresa, userId: ctx.user.id,
  datos: { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 118 }], ...extra },
});
const servicio = () => crearServicioEmision({ prisma, engine: engineFalso(), almacen: almacenFalso(), descifrar, cola: colaFalsa(), ahora: () => AHORA });
async function emitidas(n, fecha = AHORA) {
  for (let i = 1; i <= n; i += 1) await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 1000 + i, fechaEmision: fecha });
}

test('inicioMesLima usa la medianoche de Lima', () => {
  assert.equal(inicioMesLima(new Date('2026-11-15T17:00:00Z')).toISOString(), '2026-11-01T05:00:00.000Z');
  assert.equal(inicioMesLima(new Date('2026-12-01T03:00:00Z')).toISOString(), '2026-11-01T05:00:00.000Z'); // aún 30/11 en Lima
});

test('con el cupo agotado emitir responde ErrorPlan 402 y el borrador queda igual', async () => {
  await suscribirA('pe-gratis');
  await emitidas(10);
  const b = await borrador();
  await assert.rejects(servicio().emitir(b.id, ctx.empresa.id), (e) => e instanceof ErrorPlan && e.status === 402
    && /límite de comprobantes/.test(e.message));
  assert.equal((await prisma.factura.findUnique({ where: { id: b.id } })).estadoSunat, 'BORRADOR');
});

test('lo emitido el mes anterior no cuenta', async () => {
  await suscribirA('pe-gratis');
  await emitidas(10, new Date('2026-10-20T15:00:00Z'));
  const b = await borrador();
  assert.equal((await servicio().emitir(b.id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO');
});

test('los borradores no gastan cupo', async () => {
  await suscribirA('pe-gratis');
  await emitidas(9);
  for (let i = 0; i < 3; i += 1) await borrador();
  const b = await borrador();
  assert.equal((await servicio().emitir(b.id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO');
});

// La premisa anterior («sin suscripción no hay tope») era la falla: ahora sin suscripción rige pe-gratis (ver seguridad-planes.test.js).
test('un plan ilimitado no tiene tope', async () => {
  await suscribirA('pe-empresa');
  await emitidas(12);
  assert.equal((await servicio().emitir((await borrador()).id, ctx.empresa.id)).estadoSunat, 'PENDIENTE_ENVIO');
});

test('emisiones simultáneas no superan el último cupo', async () => {
  await suscribirA('pe-gratis');
  await emitidas(9);
  const [a, b] = await Promise.all([borrador(), borrador()]);
  const s = servicio();
  const r = await Promise.allSettled([s.emitir(a.id, ctx.empresa.id), s.emitir(b.id, ctx.empresa.id)]);
  assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
  assert.ok(r.find((x) => x.status === 'rejected').reason instanceof ErrorPlan);
});

test('suscripción Culqi cancelada y vencida usa el límite de pe-gratis', async () => {
  await suscribirA('pe-negocio', { proveedorPago: 'culqi', cancelAtPeriodEnd: true, currentPeriodEnd: new Date('2026-11-01T00:00:00Z') });
  await emitidas(10);
  await assert.rejects(servicio().emitir((await borrador()).id, ctx.empresa.id), ErrorPlan);
});

test('detracción en un plan sin regímenes responde 403 con el plan necesario', async () => {
  await suscribirA('pe-emprendedor');
  await assert.rejects(borrador({ detraccion: { codigo: '037' } }), (e) => e instanceof ErrorPlan && e.status === 403 && /Negocio/.test(e.message));
  await prisma.subscription.update({ where: { empresaId: ctx.empresa.id }, data: { planId: planes['pe-negocio'].id } });
  // La detracción exige operación 1001 y un monto mayor a S/ 700.
  const ok = await borrador({ detraccion: { codigo: '037' }, tipoOperacion: '1001', lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 1000 }] });
  assert.ok(ok.id);
});
