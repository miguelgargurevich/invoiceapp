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

test('no se puede anular el comprobante de otra empresa', async () => {
  const otra = await crearEmpresaPeru({ ruc: '20000000002' });
  const { s, engine, cola } = servicio();
  const ajena = await crearAceptado({ empresa: otra.empresa, cliente: otra.cliente });
  await assert.rejects(s.solicitarAnulacion(ajena.id, ctx.empresa.id, 'x'), ErrorEstado);
  assert.equal(await prisma.procesoSunat.count(), 0);
  assert.equal(engine.llamadas.length, 0);
  assert.deepEqual(cola.trabajos, []);
  assert.equal((await prisma.factura.findUnique({ where: { id: ajena.id } })).estadoSunat, 'ACEPTADO');
});

test('dos solicitudes simultáneas del mismo comprobante crean un solo proceso', async () => {
  // El engine tarda un poco para que ambas solicitudes se solapen y el bloqueo de la fila sea lo único que las ordene.
  const lento = engineFalso({
    baja: async () => {
      await new Promise((resolve) => { setTimeout(resolve, 200); });
      return { ticket: 'T-RA', xmlBase64: Buffer.from('<ra/>').toString('base64'), nombre: 'ra' };
    },
  });
  const { s } = servicio(lento);
  const f = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente });
  const resultados = await Promise.allSettled([
    s.solicitarAnulacion(f.id, ctx.empresa.id, 'a'),
    s.solicitarAnulacion(f.id, ctx.empresa.id, 'b'),
  ]);
  const cumplidas = resultados.filter((r) => r.status === 'fulfilled');
  const falladas = resultados.filter((r) => r.status === 'rejected');
  assert.equal(cumplidas.length, 1);
  assert.equal(falladas.length, 1);
  assert.ok(falladas[0].reason instanceof ErrorEstado);
  assert.equal(await prisma.procesoSunat.count(), 1);
  assert.equal(await prisma.procesoSunatItem.count(), 1);
  assert.equal(lento.llamadas.length, 1);
});
