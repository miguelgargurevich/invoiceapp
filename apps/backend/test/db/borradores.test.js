const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const {
  guardarBorrador, previsualizar, datosDesdeFactura, comprobanteSchema, INCLUDE_COMPROBANTE, INCLUDE_RESPUESTA,
} = require('../../src/sunat/emision/borradores');

let ctx;
let otro;
test.before(async () => {
  await limpiar();
  ctx = await crearEmpresaPeru();
  otro = await crearEmpresaPeru({ ruc: '20000000002' });
});
test.after(() => prisma.$disconnect());

const datosFactura = (extra = {}) => ({
  tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id,
  lineas: [{ descripcion: 'Servicio', cantidad: 2, precio: 59, precioIncluyeIgv: true }],
  ...extra,
});

test('guarda un borrador con totales calculados y sin número', async () => {
  const f = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  assert.equal(f.estadoSunat, 'BORRADOR');
  assert.equal(f.numero, null);
  assert.equal(f.total.toFixed(2), '118.00');
  assert.equal(f.totalGravadas.toFixed(2), '100.00');
  assert.equal(f.detalles[0].valorUnitario.toFixed(10), '50.0000000000');
  assert.equal(f.detalles[0].codigoUnidadSunat, 'NIU');
  assert.equal(f.montoEnLetras, 'SON: CIENTO DIECIOCHO CON 00/100 SOLES');
  assert.equal(f.empresa, undefined);
});

test('guarda cuotas de una venta al crédito', async () => {
  const f = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({ formaPago: { tipo: 'Credito', cuotas: [{ monto: 118, fechaVencimiento: '2026-12-15' }] } }),
  });
  assert.equal(f.formaPago, 'Credito');
  assert.equal(f.cuotas.length, 1);
  assert.equal(f.netoPendiente.toFixed(2), '118.00');
});

test('editar solo funciona en borrador y reemplaza las líneas', async () => {
  const f = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  const editada = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id,
    datos: datosFactura({ lineas: [{ descripcion: 'Otro', cantidad: 1, precio: 10, precioIncluyeIgv: false }] }),
  });
  assert.equal(editada.detalles.length, 1);
  assert.equal(editada.total.toFixed(2), '11.80');
  await prisma.factura.update({ where: { id: f.id }, data: { estadoSunat: 'ACEPTADO' } });
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id, datos: datosFactura() }),
    /Solo se puede editar un comprobante en borrador/,
  );
});

test('rechaza series no configuradas y notas sin documento aceptado', async () => {
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura({ serie: 'F999' }) }),
    /no está configurada/,
  );
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura({ tipoComprobante: '07', serie: 'FC01' }) }),
    /comprobante que modifica/,
  );
});

test('una nota de crédito copia la referencia del documento aceptado', async () => {
  const aceptada = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 50 });
  const nc = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({ tipoComprobante: '07', serie: 'FC01', documentoAfectado: { facturaId: aceptada.id, motivoCodigo: '01' } }),
  });
  assert.equal(nc.docRelacionadoSerie, 'F001');
  assert.equal(nc.docRelacionadoNumero, 50);
  assert.equal(nc.motivoDescripcion, 'Anulación de la operación');
});

test('percepción exige que el emisor sea agente de percepción', async () => {
  // Con un plan que incluye regímenes: sin plan peruano vigente la percepción se niega antes (falla cerrado).
  const planes = await sembrarPlanesPe();
  await prisma.subscription.upsert({
    where: { empresaId: ctx.empresa.id },
    create: { empresaId: ctx.empresa.id, planId: planes['pe-negocio'].id, status: 'ACTIVE' },
    update: { planId: planes['pe-negocio'].id, status: 'ACTIVE' },
  });
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura({ percepcion: { regimen: '51' } }) }),
    /agente de percepción/,
  );
});

test('previsualizar no guarda nada', async () => {
  const antes = await prisma.factura.count();
  const r = await previsualizar({ prisma, empresa: ctx.empresa, datos: datosFactura() });
  assert.equal(r.totales.total, '118.00');
  assert.equal(await prisma.factura.count(), antes);
});

test('datosDesdeFactura reconstruye datos equivalentes', async () => {
  const f = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({
      fechaVencimiento: '2026-12-15T17:00:00.000Z',
      formaPago: { tipo: 'Credito', cuotas: [{ monto: 118, fechaVencimiento: '2026-12-15' }] },
    }),
  });
  const completa = await prisma.factura.findUnique({ where: { id: f.id }, include: INCLUDE_COMPROBANTE });
  const datos = datosDesdeFactura(completa);
  assert.equal(datos.fechaVencimiento, '2026-12-15T17:00:00.000Z');
  const sinVencimiento = await prisma.factura.findUnique({ where: { id: (await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() })).id }, include: INCLUDE_COMPROBANTE });
  assert.equal('fechaVencimiento' in datosDesdeFactura(sinVencimiento), false);
  const r = await previsualizar({ prisma, empresa: ctx.empresa, datos });
  assert.equal(r.totales.total, '118.00');
  assert.equal(r.cuotas[0].fechaVencimiento, '2026-12-15');
});

// --- Pruebas añadidas a las del plan ---

test('comprobanteSchema rechaza entradas que calcularComprobante no valida', () => {
  const con = (linea) => ({ ...datosFactura(), lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 100, ...linea }] });
  assert.equal(comprobanteSchema.safeParse(con({})).success, true);
  assert.equal(comprobanteSchema.safeParse(con({ descuento: -10 })).success, false);
  assert.equal(comprobanteSchema.safeParse(con({ bolsasIcbper: 1.5 })).success, false);
  assert.equal(comprobanteSchema.safeParse(con({ bolsasIcbper: -2 })).success, false);
  assert.equal(comprobanteSchema.safeParse(con({ precio: 'abc' })).success, false);
  assert.equal(comprobanteSchema.safeParse(con({ cantidad: 0 })).success, false);
  assert.equal(comprobanteSchema.safeParse(con({ cantidad: -1 })).success, false);
});

test('una entrada inválida no guarda nada ni llega al cálculo', async () => {
  const antes = await prisma.factura.count();
  await assert.rejects(
    guardarBorrador({
      prisma, empresa: ctx.empresa, userId: ctx.user.id,
      datos: datosFactura({ lineas: [{ descripcion: 'X', cantidad: 1, precio: 100, descuento: -10 }] }),
    }),
    (e) => e.name === 'ZodError',
  );
  assert.equal(await prisma.factura.count(), antes);
});

test('INCLUDE_RESPUESTA no incluye la empresa (secretos del emisor) ni al guardar ni al editar', async () => {
  assert.equal(INCLUDE_RESPUESTA.empresa, undefined);
  assert.ok(INCLUDE_COMPROBANTE.empresa);
  const f = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  const editada = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id, datos: datosFactura() });
  for (const r of [f, editada]) {
    assert.equal(r.empresa, undefined);
    assert.equal(JSON.stringify(r).includes('solClaveCifrada'), false);
  }
});

test('editar reemplaza las cuotas en vez de acumularlas', async () => {
  const f = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({ formaPago: { tipo: 'Credito', cuotas: [{ monto: 118, fechaVencimiento: '2026-12-15' }] } }),
  });
  const aContado = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id, datos: datosFactura() });
  assert.equal(aContado.cuotas.length, 0);
  assert.equal(await prisma.cuotaFactura.count({ where: { facturaId: f.id } }), 0);

  const aDos = await guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id,
    datos: datosFactura({
      formaPago: { tipo: 'Credito', cuotas: [{ monto: 59, fechaVencimiento: '2026-12-15' }, { monto: 59, fechaVencimiento: '2027-01-15' }] },
    }),
  });
  assert.equal(aDos.cuotas.length, 2);
  assert.equal(await prisma.cuotaFactura.count({ where: { facturaId: f.id } }), 2);
});

test('separación entre empresas: cliente, serie, documento afectado y comprobante a editar', async () => {
  const guardar = (empresa, user, extra) => guardarBorrador({ prisma, empresa, userId: user.id, ...extra });

  // Cliente de otra empresa.
  await assert.rejects(
    guardar(ctx.empresa, ctx.user, { datos: datosFactura({ clienteId: otro.cliente.id }) }),
    /Cliente no encontrado/,
  );
  await assert.rejects(
    previsualizar({ prisma, empresa: ctx.empresa, datos: datosFactura({ clienteId: otro.cliente.id }) }),
    /Cliente no encontrado/,
  );

  // Serie que solo existe en otra empresa.
  await prisma.configuracionSeries.create({ data: { empresaId: otro.empresa.id, tipoDocumento: '01', serie: 'F002', ultimoNumero: 0 } });
  await assert.rejects(
    guardar(ctx.empresa, ctx.user, { datos: datosFactura({ serie: 'F002' }) }),
    /no está configurada/,
  );

  // Documento aceptado de otra empresa.
  const ajena = await crearAceptado({ empresa: otro.empresa, cliente: otro.cliente, numero: 60 });
  await assert.rejects(
    guardar(ctx.empresa, ctx.user, {
      datos: datosFactura({ tipoComprobante: '07', serie: 'FC01', documentoAfectado: { facturaId: ajena.id, motivoCodigo: '01' } }),
    }),
    /comprobante que modifica/,
  );

  // Borrador de otra empresa: no se puede editar y queda intacto.
  const borradorAjeno = await guardar(otro.empresa, otro.user, { datos: datosFactura({ clienteId: otro.cliente.id }) });
  await assert.rejects(
    guardar(ctx.empresa, ctx.user, {
      facturaId: borradorAjeno.id,
      datos: datosFactura({ lineas: [{ descripcion: 'Intruso', cantidad: 1, precio: 1, precioIncluyeIgv: false }] }),
    }),
    /Comprobante no encontrado/,
  );
  const intacto = await prisma.factura.findUnique({ where: { id: borradorAjeno.id }, include: { detalles: true } });
  assert.equal(intacto.total.toFixed(2), '118.00');
  assert.equal(intacto.detalles[0].descripcion, 'Servicio');
  assert.equal(intacto.empresaId, otro.empresa.id);
});

test('una nota solo acepta un documento aceptado por SUNAT (con o sin observaciones)', async () => {
  const nota = (afectado) => guardarBorrador({
    prisma, empresa: ctx.empresa, userId: ctx.user.id,
    datos: datosFactura({ tipoComprobante: '07', serie: 'FC01', documentoAfectado: { facturaId: afectado.id, motivoCodigo: '01' } }),
  });
  const borrador = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  await assert.rejects(nota(borrador), /debe estar aceptado/);
  const rechazada = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 70 });
  await prisma.factura.update({ where: { id: rechazada.id }, data: { estadoSunat: 'RECHAZADO' } });
  await assert.rejects(nota(rechazada), /debe estar aceptado/);
  const conObs = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 71 });
  await prisma.factura.update({ where: { id: conObs.id }, data: { estadoSunat: 'ACEPTADO_CON_OBS' } });
  assert.equal((await nota(conObs)).docRelacionadoNumero, 71);
});

test('una serie desactivada no se puede usar', async () => {
  await prisma.configuracionSeries.update({
    where: { empresaId_tipoDocumento_serie: { empresaId: ctx.empresa.id, tipoDocumento: '03', serie: 'B001' } },
    data: { activa: false },
  });
  await assert.rejects(
    guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura({ tipoComprobante: '03', serie: 'B001' }) }),
    /no está configurada/,
  );
});

test('editar espera a una emisión en curso y luego rechaza: no pisa un comprobante ya emitido', async () => {
  const f = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  let edicionTermino = false;
  let edicion;
  // Simula una emisión que tiene la fila bloqueada y la confirma como PENDIENTE_ENVIO.
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM facturas WHERE id = ${f.id} FOR UPDATE`;
    edicion = guardarBorrador({
      prisma, empresa: ctx.empresa, userId: ctx.user.id, facturaId: f.id,
      datos: datosFactura({ lineas: [{ descripcion: 'Pisada', cantidad: 1, precio: 10, precioIncluyeIgv: false }] }),
    }).then(
      (v) => { edicionTermino = true; return v; },
      (e) => { edicionTermino = true; throw e; },
    );
    edicion.catch(() => {});
    await new Promise((resolver) => setTimeout(resolver, 400));
    assert.equal(edicionTermino, false, 'la edición debía esperar el bloqueo de la fila');
    await tx.factura.update({ where: { id: f.id }, data: { estadoSunat: 'PENDIENTE_ENVIO', numero: 1 } });
  });
  await assert.rejects(edicion, /Solo se puede editar un comprobante en borrador/);
  const despues = await prisma.factura.findUnique({ where: { id: f.id }, include: { detalles: true } });
  assert.equal(despues.estadoSunat, 'PENDIENTE_ENVIO');
  assert.equal(despues.detalles[0].descripcion, 'Servicio');
  assert.equal(despues.total.toFixed(2), '118.00');
});

test('editar un comprobante de otra empresa no lo encuentra aunque exista', async () => {
  const f = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos: datosFactura() });
  await assert.rejects(
    guardarBorrador({
      prisma, empresa: otro.empresa, userId: otro.user.id, facturaId: f.id,
      datos: { ...datosFactura(), clienteId: otro.cliente.id },
    }),
    /Comprobante no encontrado/,
  );
});
