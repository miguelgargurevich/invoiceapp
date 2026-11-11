// Siembra y reinicio de la demo contra la BD de pruebas, con el motor SUNAT simulado (engineFalso).
const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearAceptado } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { engineFalso, almacenFalso } = require('./falsos');
const { cifrar, descifrar } = require('../../src/sunat/seguridad/cifrado');
const { sembrarDemo, contarDemo, cuentasDemoExisten } = require('../../src/demo/siembra');
const { borrarDatosDemo } = require('../../src/demo/borrado');
const { emitidosHoy } = require('../../src/demo/limite');
const { PERFILES, CORREOS_DEMO } = require('../../src/demo/perfiles');
const { digitoVerificadorRuc } = require('../../src/demo/datos-ficticios');

const AHORA = new Date('2026-11-15T17:00:00Z'); // 12:00 del 15 de noviembre en Lima
const ENTORNO = { MODO_DEMO: 'si', NODE_ENV: 'development', DATABASE_URL: process.env.DATABASE_URL };
const CERTIFICADO_PRUEBA = () => ({ pfx: Buffer.from('pfx-de-prueba-de-la-demo'), clave: 'clave-de-prueba' });

const deps = (extra = {}) => ({
  prisma,
  engine: engineFalso(),
  almacen: almacenFalso(),
  cifrar,
  descifrar,
  generarCertificado: CERTIFICADO_PRUEBA,
  env: ENTORNO,
  ahora: () => AHORA,
  ...extra,
});
const sembrar = (extra) => sembrarDemo(deps(extra));
const reiniciar = async () => {
  await borrarDatosDemo(prisma);
  return sembrar();
};
const idEmpresa = async (perfil) => {
  const usuario = await prisma.userProfile.findUnique({ where: { email: PERFILES[perfil].email } });
  return (await prisma.empresa.findUnique({ where: { userId: usuario.id } })).id;
};

test.before(async () => { await sembrarPlanesPe(); });
test.beforeEach(async () => {
  await limpiar();
  await prisma.configuracionSitio.deleteMany();
});
test.after(async () => { await prisma.$disconnect(); });

test('la siembra crea las dos cuentas con sus empresas, emisores, planes y datos', async () => {
  const { conteos } = await sembrar();
  assert.deepEqual(conteos.emprendedor, {
    clientes: 8, productos: 7, proformas: 0, comprobantes: 79, notas: 1, aceptados: 79, rechazados: 0, enviadosASunat: 79,
  });
  assert.deepEqual(conteos.servicios, {
    clientes: 5, productos: 4, proformas: 4, comprobantes: 37, notas: 2, aceptados: 36, rechazados: 1, enviadosASunat: 36,
  });
  const usuarios = await prisma.userProfile.findMany({ where: { email: { in: [...CORREOS_DEMO] } }, select: { email: true, role: true, isActive: true } });
  assert.equal(usuarios.length, 2);
  assert.ok(usuarios.every((u) => u.role === 'USER' && u.isActive));

  const emprendedor = await prisma.empresa.findFirst({ where: { userId: (await prisma.userProfile.findUnique({ where: { email: PERFILES.emprendedor.email } })).id }, include: { subscription: { include: { plan: true } }, emisorSunat: true } });
  assert.equal(emprendedor.subscription.plan.slug, 'pe-emprendedor');
  assert.equal(emprendedor.pais, 'PE');
  assert.equal(emprendedor.emisorSunat.ambiente, 'BETA');
  assert.equal(emprendedor.emisorSunat.solUsuario, 'MODDATOS');
  assert.equal(descifrar(emprendedor.emisorSunat.solClaveCifrada).toString('utf8'), 'moddatos');
  assert.equal(emprendedor.colorPrimario, null);

  const servicios = await prisma.empresa.findUnique({ where: { id: await idEmpresa('servicios') }, include: { subscription: { include: { plan: true } }, emisorSunat: true } });
  assert.equal(servicios.subscription.plan.slug, 'pe-negocio');
  assert.equal(servicios.ruc, '20000000001', 'RUC de pruebas de SUNAT beta');
  assert.equal(servicios.colorPrimario, '#0F766E');
  assert.equal(servicios.emisorSunat.cuentaDetracciones, '00-000-000001');
});

test('con los comprobantes de la demo: detracción, cuotas, nota de crédito y débito, rechazo y proformas', async () => {
  await sembrar();
  const sv = await idEmpresa('servicios');
  const conDetraccion = await prisma.factura.findFirst({ where: { empresaId: sv, detraccionCodigo: '037' } });
  assert.ok(conDetraccion && Number(conDetraccion.detraccionMonto) > 0);
  const aCredito = await prisma.factura.findFirst({ where: { empresaId: sv, formaPago: 'Credito' }, include: { cuotas: true } });
  assert.equal(aCredito.cuotas.length, 2);
  assert.equal(Number(aCredito.cuotas[0].monto) + Number(aCredito.cuotas[1].monto), Number(aCredito.total));
  const nota = await prisma.factura.findFirst({ where: { empresaId: sv, tipoComprobante: '07' } });
  const debito = await prisma.factura.findFirst({ where: { empresaId: sv, tipoComprobante: '08' } });
  assert.ok(nota?.docRelacionadoId && debito?.docRelacionadoId, 'las notas modifican un comprobante de la demo');
  const rechazada = await prisma.factura.findFirst({ where: { empresaId: sv, estadoSunat: 'RECHAZADO' } });
  assert.match(rechazada.mensajeRespuestaSunat, /ejemplo/i);
  assert.ok(rechazada.codigoRespuestaSunat);
  const estados = (await prisma.proforma.findMany({ where: { empresaId: sv }, select: { estado: true } })).map((p) => p.estado).sort();
  assert.deepEqual(estados, ['aceptada', 'pendiente', 'rechazada', 'vencida']);
});

test('todo es ficticio: nombres, correos .example, celulares 9000xxxxx, RUC válidos y ningún dato del dueño', async () => {
  await sembrar();
  const textos = [];
  const empresas = await prisma.empresa.findMany();
  const clientes = await prisma.cliente.findMany();
  const usuarios = await prisma.userProfile.findMany();
  const facturas = await prisma.factura.findMany({ select: { observaciones: true, mensajeRespuestaSunat: true, motivoDescripcion: true } });
  const proformas = await prisma.proforma.findMany({ select: { estado: true, serie: true } });
  const firmas = await prisma.signatureRequest.findMany({ select: { signerEmail: true, signerName: true } });
  const productos = await prisma.producto.findMany({ select: { nombre: true, codigo: true } });
  for (const u of usuarios) textos.push(u.email, u.name);
  for (const e of empresas) textos.push(e.nombre, e.razonSocial, e.nombreComercial, e.direccion, e.telefono, e.email);
  for (const c of clientes) textos.push(c.razonSocial, c.numeroDocumento, c.email, c.telefono, c.direccion);
  for (const f of facturas) textos.push(f.observaciones, f.mensajeRespuestaSunat, f.motivoDescripcion);
  for (const p of productos) textos.push(p.nombre, p.codigo);
  for (const s of firmas) textos.push(s.signerEmail, s.signerName);
  for (const p of proformas) textos.push(p.estado, p.serie);
  const todo = textos.filter(Boolean).join('\n');
  assert.doesNotMatch(todo, /gargurevich|miguel|10409241862|gmail/i);

  for (const u of usuarios) assert.match(u.email, /@([a-z0-9-]+\.)*example$/);
  for (const c of clientes) {
    if (c.email) assert.match(c.email, /@([a-z0-9-]+\.)*example$/);
    if (c.telefono) assert.match(c.telefono, /^9000\d{5}$/);
    if (c.tipoDocumento === '1') assert.match(c.numeroDocumento, /^\d{8}$/);
    if (c.tipoDocumento === '6' && c.numeroDocumento !== '20512340049') {
      assert.equal(Number(c.numeroDocumento[10]), digitoVerificadorRuc(c.numeroDocumento.slice(0, 10)), c.numeroDocumento);
    }
  }
  for (const e of empresas) {
    assert.match(e.telefono, /^9000\d{5}$/);
    assert.match(e.email, /@([a-z0-9-]+\.)*example$/);
  }
});

test('las fechas son relativas a hoy: hay meses anteriores y ningún comprobante cae hoy (no gasta el límite)', async () => {
  await sembrar();
  for (const perfil of ['emprendedor', 'servicios']) {
    const id = await idEmpresa(perfil);
    assert.equal(await emitidosHoy(prisma, id, AHORA), 0, `${perfil}: ningún comprobante de hoy`);
    const comprobantes = await prisma.factura.findMany({ where: { empresaId: id }, select: { fechaEmision: true } });
    assert.ok(comprobantes.every((f) => f.fechaEmision < AHORA), `${perfil}: todo es anterior a hoy`);
    const meses = new Set(comprobantes.map((f) => new Date(f.fechaEmision.getTime() - 5 * 3600e3).toISOString().slice(0, 7)));
    assert.ok(meses.size >= 4, `${perfil}: al menos 4 meses distintos (hay ${[...meses].join(', ')})`);
    assert.ok(meses.has('2026-11'), `${perfil}: hay comprobantes de este mes`);
  }
});

test('existe una solicitud de firma PENDIENTE y vigente para «Tu cliente», sobre la proforma pendiente', async () => {
  const { proformaPendienteId } = await sembrar();
  const firma = await prisma.signatureRequest.findFirst({
    where: { status: 'PENDING', empresaId: await idEmpresa('servicios') },
  });
  assert.ok(firma, 'hay una solicitud pendiente');
  assert.equal(firma.proformaId, proformaPendienteId);
  assert.ok(firma.expiresAt > AHORA, 'vigente');
  assert.match(firma.token, /^[0-9a-f]{64}$/);
  assert.equal(await cuentasDemoExisten(prisma), true);
});

test('una siembra a medias no cuenta como demo sembrada (el arranque la vuelve a hacer)', async () => {
  assert.equal(await cuentasDemoExisten(prisma), false, 'sin datos, no está sembrada');
  await sembrar();
  assert.equal(await cuentasDemoExisten(prisma), true);
  await prisma.signatureRequest.deleteMany({ where: { status: 'PENDING' } });
  assert.equal(await cuentasDemoExisten(prisma), false, 'sin la solicitud pendiente, falta algo');
});

test('reiniciar dos veces da los mismos conteos', async () => {
  await sembrar();
  const primero = await contarDemo(prisma);
  await reiniciar();
  const segundo = await contarDemo(prisma);
  await reiniciar();
  const tercero = await contarDemo(prisma);
  assert.deepEqual(segundo, primero);
  assert.deepEqual(tercero, primero);
});

test('el reinicio no toca otra cuenta, los planes ni la configuración del sitio', async () => {
  await prisma.configuracionSitio.upsert({ where: { id: 'global' }, update: {}, create: { id: 'global', legalMarca: 'Facturo' } });
  const planesAntes = await prisma.plan.count();
  const otra = await prisma.userProfile.create({ data: { email: 'cuenta-real-de-prueba@test.pe', role: 'USER' } });
  const empresaOtra = await prisma.empresa.create({ data: { nombre: 'Empresa de prueba', ruc: '20999999991', pais: 'PE', userId: otra.id } });
  const cliente = await prisma.cliente.create({ data: { empresaId: empresaOtra.id, tipoDocumento: '6', numeroDocumento: '20999999991', razonSocial: 'CLIENTE DE PRUEBA SAC' } });
  await crearAceptado({ empresa: empresaOtra, cliente, numero: 1 });

  await sembrar();
  await reiniciar();

  assert.ok(await prisma.userProfile.findUnique({ where: { id: otra.id } }), 'la cuenta de prueba sigue');
  assert.equal(await prisma.factura.count({ where: { empresaId: empresaOtra.id } }), 1, 'sus comprobantes siguen');
  assert.equal(await prisma.plan.count(), planesAntes, 'los planes no cambian');
  assert.equal((await prisma.configuracionSitio.findUnique({ where: { id: 'global' } })).legalMarca, 'Facturo');
  assert.equal(await cuentasDemoExisten(prisma), true);
});

test('sin MODO_DEMO=si la siembra aborta y no crea nada', async () => {
  await assert.rejects(sembrarDemo(deps({ env: { NODE_ENV: 'development', DATABASE_URL: ENTORNO.DATABASE_URL } })), /MODO_DEMO=si/);
  assert.equal(await prisma.userProfile.count(), 0);
  await assert.rejects(sembrarDemo(deps({ env: { MODO_DEMO: 'SI', NODE_ENV: 'development', DATABASE_URL: ENTORNO.DATABASE_URL } })), /MODO_DEMO=si/);
  assert.equal(await prisma.empresa.count(), 0);
});

test('en local, la siembra se niega si DATABASE_URL no es una base de demo o de pruebas', async () => {
  const url = 'postgresql://postgres:postgres@localhost:5435/invoiceapp';
  await assert.rejects(sembrar({ env: { MODO_DEMO: 'si', NODE_ENV: 'development', DATABASE_URL: url } }), /invoiceapp_demo o invoiceapp_test/);
  assert.equal(await prisma.userProfile.count(), 0);
});
