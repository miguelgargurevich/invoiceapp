const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');
const { engineFalso, almacenFalso, colaFalsa } = require('./falsos');
const { guardarBorrador } = require('../../src/sunat/emision/borradores');
const { crearServicioEmision } = require('../../src/sunat/emision/servicio');
const { descifrar } = require('../../src/sunat/seguridad/cifrado');
const { ErrorConstruccion, ErrorEngineNoDisponible, ErrorValidacion, ErrorEstado } = require('../../src/sunat/errores');

let ctx;
test.beforeEach(async () => { await limpiar(); ctx = await crearEmpresaPeru(); });
test.after(() => prisma.$disconnect());

const borrador = (extra = {}) => guardarBorrador({
  prisma, empresa: ctx.empresa, userId: ctx.user.id,
  datos: { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 118 }], ...extra },
});
const servicio = (engine = engineFalso(), almacen = almacenFalso(), cola = colaFalsa()) =>
  ({ engine, almacen, cola, s: crearServicioEmision({ prisma, engine, almacen, descifrar, cola }) });
const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

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

// --- Pruebas añadidas a las del plan ---

test('dos emisiones simultáneas del MISMO borrador: una cumple, la otra falla y el número no salta', async () => {
  // La firma tarda para que ambas lleguen al chequeo de estado antes de que alguna confirme.
  const engine = engineFalso({
    firma: async (_e, c) => {
      await esperar(150);
      return { xmlBase64: Buffer.from(`<xml>${c.serie}-${c.correlativo}</xml>`).toString('base64'), hash: 'HASH=', nombre: 'n' };
    },
  });
  const { s, cola } = servicio(engine);
  const b = await borrador();
  const resultados = await Promise.allSettled([s.emitir(b.id, ctx.empresa.id), s.emitir(b.id, ctx.empresa.id)]);
  const cumplidas = resultados.filter((r) => r.status === 'fulfilled');
  const falladas = resultados.filter((r) => r.status === 'rejected');
  assert.equal(cumplidas.length, 1);
  assert.equal(falladas.length, 1);
  assert.ok(falladas[0].reason instanceof ErrorEstado, `error inesperado: ${falladas[0].reason}`);
  assert.equal(cumplidas[0].value.numero, 1);
  const serie = await prisma.configuracionSeries.findFirst({ where: { empresaId: ctx.empresa.id, serie: 'F001' } });
  assert.equal(serie.ultimoNumero, 1);
  assert.equal(cola.trabajos.length, 1);
});

test('emitir no toca un comprobante de otra empresa', async () => {
  const otra = await crearEmpresaPeru({ ruc: '20000000002' });
  const { s } = servicio();
  const b = await borrador();
  await assert.rejects(s.emitir(b.id, otra.empresa.id), (e) => e instanceof ErrorEstado && /no encontrado/.test(e.message));
  const f = await prisma.factura.findUnique({ where: { id: b.id } });
  assert.equal(f.estadoSunat, 'BORRADOR');
});

test('si el motor falla al firmar, no queda XML guardado ni número consumido', async () => {
  const { s, almacen, cola } = servicio(engineFalso({ firma: new ErrorEngineNoDisponible('caído') }));
  const b = await borrador();
  await assert.rejects(s.emitir(b.id, ctx.empresa.id), ErrorEngineNoDisponible);
  assert.equal(almacen.archivos.size, 0);
  assert.equal(cola.trabajos.length, 0);
});

test('procesarEnvio con 1033 consulta el CDR y guarda el que devuelve', async () => {
  const engine = engineFalso({
    envio: { codigo: '1033', descripcion: 'Ya registrado', observaciones: [], cdrZipBase64: null },
    cdr: { codigo: '0', descripcion: 'Aceptada', observaciones: [], cdrZipBase64: Buffer.from('cdr-consultado').toString('base64') },
  });
  const { s, almacen } = servicio(engine);
  const b = await borrador();
  await s.emitir(b.id, ctx.empresa.id);
  const r = await s.procesarEnvio(b.id);
  assert.equal(r.estado, 'ACEPTADO');
  assert.deepEqual(engine.llamadas.map((l) => l.nombre).filter((n) => n !== 'firmar'), ['enviar', 'consultarCdr']);
  const f = await prisma.factura.findUnique({ where: { id: b.id } });
  assert.equal(almacen.archivos.get(f.cdrKey).toString(), 'cdr-consultado');
  const operaciones = (await prisma.envioSunat.findMany({ where: { facturaId: b.id }, orderBy: { createdAt: 'asc' } })).map((e) => e.operacion);
  assert.deepEqual(operaciones, ['sendBill', 'getStatusCdr']);
});
