process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Resend falso: la firma pública manda correos y aquí no sale ninguno.
const rutaResend = require.resolve('resend');
require.cache[rutaResend] = {
  id: rutaResend, filename: rutaResend, loaded: true,
  exports: { Resend: class { constructor() { this.emails = { send: async () => ({ id: 'prueba' }) }; } } },
};

const { prisma, limpiar } = require('./ayuda');
const { generateAccessToken, authenticateToken } = require('../../src/middleware/auth');
const { crearServicioPush, servicioPushApagado, MOTIVO } = require('../../src/push/servicio');
const { crearAvisos } = require('../../src/push/avisos');
const { crearRouterPush } = require('../../src/push/rutas');
const { establecerAvisos, SIN_AVISOS } = require('../../src/push/registro');
const { RESULTADO } = require('../../src/push/fcm');
const firmaPublica = require('../../src/routes/signaturesPublic');

let n = 0;
const unico = () => `${Date.now()}-${++n}`;

// El RUC son 11 dígitos y es único por usuario creado (la hora + un contador).
async function crearUsuario({ conEmpresa = true } = {}) {
  const user = await prisma.userProfile.create({ data: { email: `u-${unico()}@test.pe`, name: 'Dueño' } });
  const empresa = conEmpresa
    ? await prisma.empresa.create({ data: { nombre: 'Empresa Beta', razonSocial: 'EMPRESA BETA SAC', ruc: `2${String(Date.now()).slice(-6)}${String(n).padStart(4, '0')}`, pais: 'PE', moneda: 'PEN', userId: user.id } })
    : null;
  const cliente = empresa
    ? await prisma.cliente.create({ data: { empresaId: empresa.id, tipoDocumento: '6', numeroDocumento: '20131312955', razonSocial: 'CLIENTE SECRETO SAC', email: 'cliente@test.pe' } })
    : null;
  return { user, empresa, cliente, jwt: generateAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role }) };
}

async function crearDispositivo(u, { tipo = 'fcm', token = `tok-${unico()}`, plataforma = tipo === 'fcm' ? 'android' : 'web', empresaId } = {}) {
  return prisma.dispositivoPush.create({
    data: { userId: u.user.id, empresaId: empresaId || u.empresa.id, tipo, plataforma, token, p256dh: tipo === 'webpush' ? 'BNc-abc' : null, auth: tipo === 'webpush' ? 'auth123' : null },
  });
}

/** Emisores falsos que guardan lo que recibirían. `resultado(dispositivo)` decide qué contestan. */
function emisoresFalsos(resultado = () => RESULTADO.ENVIADO) {
  const enviados = [];
  const crear = (tipo) => ({ tipo, enviar: async (d, payload) => { enviados.push({ tipo, token: d.token, payload }); return resultado(d, tipo); } });
  return { fcm: crear('fcm'), webpush: crear('webpush'), enviados };
}

const logSilencioso = { warn: () => {}, error: () => {}, log: () => {} };
const servicioCon = (em) => crearServicioPush({ prisma, enviadores: em, log: logSilencioso });
const datosAviso = (u, extra = {}) => ({ userId: u.user.id, empresaId: u.empresa.id, clave: `k-${unico()}`, titulo: 'Titulo', cuerpo: 'Cuerpo', ruta: '/es/facturas', ...extra });

test.before(limpiar);
test.after(() => prisma.$disconnect());

// ───────────────────────────── servicio ─────────────────────────────

test('avisa solo a los dispositivos del usuario y de SU empresa (nunca de otro)', async () => {
  const a = await crearUsuario(); const b = await crearUsuario();
  const dA = await crearDispositivo(a); const dAweb = await crearDispositivo(a, { tipo: 'webpush', token: 'https://fcm.googleapis.com/fcm/send/aaa' });
  await crearDispositivo(b);
  // Fila inconsistente: del usuario A pero de la empresa de B. El filtro por tenant la deja fuera.
  await crearDispositivo(a, { empresaId: b.empresa.id, token: 'tok-cruzado' });

  const em = emisoresFalsos();
  const r = await servicioCon(em).avisar(datosAviso(a));
  assert.equal(r.motivo, MOTIVO.ENVIADO);
  assert.equal(r.enviados, 2);
  assert.deepEqual(em.enviados.map((e) => e.token).sort(), [dA.token, dAweb.token].sort());
});

test('lo que viaja es exactamente título, cuerpo y ruta', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  const em = emisoresFalsos();
  await servicioCon(em).avisar({ ...datosAviso(a), titulo: 'Hola', cuerpo: 'Mundo', ruta: '/es/facturas', monto: 999, cliente: 'SECRETO', email: 'x@y.pe' });
  assert.deepEqual(em.enviados[0].payload, { titulo: 'Hola', cuerpo: 'Mundo', ruta: '/es/facturas' });
});

test('el mismo aviso (misma clave) no se repite; otra clave sí sale', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  const em = emisoresFalsos(); const s = servicioCon(em);
  const datos = datosAviso(a, { clave: 'firma:abc' });
  assert.equal((await s.avisar(datos)).motivo, MOTIVO.ENVIADO);
  assert.equal((await s.avisar(datos)).motivo, MOTIVO.REPETIDO);
  assert.equal(em.enviados.length, 1);
  assert.equal((await s.avisar({ ...datos, clave: 'firma:otra' })).motivo, MOTIVO.ENVIADO);
  assert.equal(em.enviados.length, 2);
  // Dos pedidos a la vez: el índice único deja pasar solo uno.
  const carrera = datosAviso(a, { clave: 'carrera' });
  const rs = await Promise.all([s.avisar(carrera), s.avisar(carrera), s.avisar(carrera)]);
  assert.equal(rs.filter((x) => x.motivo === MOTIVO.ENVIADO).length, 1);
});

test('sin dispositivos no se reserva la clave: al activar los avisos, el siguiente sí llega', async () => {
  const a = await crearUsuario();
  const em = emisoresFalsos(); const s = servicioCon(em);
  const datos = datosAviso(a, { clave: 'vencidas:x' });
  assert.equal((await s.avisar(datos)).motivo, MOTIVO.SIN_DISPOSITIVOS);
  assert.equal(await prisma.avisoPushEnviado.count({ where: { userId: a.user.id } }), 0);
  await crearDispositivo(a);
  assert.equal((await s.avisar(datos)).motivo, MOTIVO.ENVIADO);
});

test('sin emisores (sin variables de entorno) no hace nada: ni envía ni toca la base', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  const s = crearServicioPush({ prisma, enviadores: { fcm: null, webpush: null }, log: logSilencioso });
  assert.equal(s.activo(), false);
  assert.equal((await s.avisar(datosAviso(a))).motivo, MOTIVO.APAGADO);
  assert.equal(await prisma.avisoPushEnviado.count({ where: { userId: a.user.id } }), 0);
  assert.equal((await servicioPushApagado.avisar()).motivo, MOTIVO.APAGADO);
});

test('un token que el proveedor dice que ya no existe se borra; los demás se quedan', async () => {
  const a = await crearUsuario();
  const malo = await crearDispositivo(a, { token: 'tok-malo' }); const bueno = await crearDispositivo(a, { token: 'tok-bueno' });
  const em = emisoresFalsos((d) => (d.token === 'tok-malo' ? RESULTADO.TOKEN_INVALIDO : RESULTADO.ENVIADO));
  const r = await servicioCon(em).avisar(datosAviso(a));
  assert.equal(r.enviados, 1);
  assert.equal(await prisma.dispositivoPush.findUnique({ where: { id: malo.id } }), null);
  assert.ok(await prisma.dispositivoPush.findUnique({ where: { id: bueno.id } }));
});

test('un fallo (no un token inválido) deja el dispositivo y suelta la reserva para reintentar', async () => {
  const a = await crearUsuario(); const d = await crearDispositivo(a);
  let falla = true;
  const em = emisoresFalsos(() => (falla ? RESULTADO.FALLO : RESULTADO.ENVIADO));
  const s = servicioCon(em);
  const datos = datosAviso(a, { clave: 'reintento' });
  assert.equal((await s.avisar(datos)).motivo, MOTIVO.FALLO);
  assert.ok(await prisma.dispositivoPush.findUnique({ where: { id: d.id } }), 'el dispositivo sigue');
  assert.equal(await prisma.avisoPushEnviado.count({ where: { userId: a.user.id, clave: 'reintento' } }), 0);
  falla = false;
  assert.equal((await s.avisar(datos)).motivo, MOTIVO.ENVIADO);
});

test('si un emisor lanza una excepción, avisar no lanza', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  const s = servicioCon({ fcm: { tipo: 'fcm', enviar: async () => { throw new Error('ECONNRESET'); } }, webpush: null });
  const r = await s.avisar(datosAviso(a));
  assert.equal(r.motivo, MOTIVO.FALLO);
});

test('con un solo canal activo, los dispositivos del otro canal no cuentan ni como fallo', async () => {
  const a = await crearUsuario(); await crearDispositivo(a, { tipo: 'fcm' });
  const web = await crearDispositivo(a, { tipo: 'webpush', token: 'https://fcm.googleapis.com/fcm/send/solo' });
  const em = emisoresFalsos();
  const s = servicioCon({ fcm: null, webpush: em.webpush });
  const r = await s.avisar(datosAviso(a));
  assert.equal(r.enviados, 1);
  assert.deepEqual(em.enviados.map((e) => e.token), [web.token]);
});

test('al borrar la empresa y el usuario se borran sus dispositivos y avisos (ON DELETE CASCADE)', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  await servicioCon(emisoresFalsos()).avisar(datosAviso(a));
  assert.equal(await prisma.dispositivoPush.count({ where: { userId: a.user.id } }), 1);
  assert.equal(await prisma.avisoPushEnviado.count({ where: { userId: a.user.id } }), 1);
  await prisma.empresa.delete({ where: { id: a.empresa.id } });
  assert.equal(await prisma.dispositivoPush.count({ where: { userId: a.user.id } }), 0, 'los dispositivos salen con la empresa');
  await prisma.userProfile.delete({ where: { id: a.user.id } });
  assert.equal(await prisma.avisoPushEnviado.count({ where: { userId: a.user.id } }), 0, 'los avisos salen con el usuario');
});

// ───────────────────────────── rutas ─────────────────────────────

let servidor; let base; let demo = false;
const CLAVES_VAPID = { publica: 'BPublicaDePrueba', privada: 'PrivadaQueNuncaSale' };
test.before(async () => {
  const app = express();
  app.use(express.json());
  const enviadores = { fcm: { tipo: 'fcm' }, webpush: { tipo: 'webpush' }, vapidPublica: CLAVES_VAPID.publica };
  app.use('/api/push', crearRouterPush({ prisma, auth: authenticateToken, enviadores, esDemo: () => demo }));
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => servidor.close());

async function pedir(metodo, ruta, u, cuerpo) {
  const r = await fetch(`${base}/api/push${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(u ? { authorization: `Bearer ${u.jwt}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let json = null; try { json = JSON.parse(texto); } catch { /* sin cuerpo */ }
  return { status: r.status, json, texto };
}

test('las rutas exigen sesión', async () => {
  assert.equal((await pedir('GET', '/config')).status, 401);
  assert.equal((await pedir('POST', '/dispositivos', null, { tipo: 'fcm', token: 'x', plataforma: 'android' })).status, 401);
  assert.equal((await pedir('POST', '/dispositivos/baja', null, { token: 'x' })).status, 401);
});

test('GET /config dice qué canales hay y da la clave pública VAPID, nunca la privada', async () => {
  const a = await crearUsuario();
  const r = await pedir('GET', '/config', a);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { fcm: { disponible: true }, web: { disponible: true, publicKey: CLAVES_VAPID.publica } });
  assert.doesNotMatch(r.texto, new RegExp(CLAVES_VAPID.privada));
});

test('registrar un teléfono: usa el usuario y la empresa de la SESIÓN, no los del cuerpo', async () => {
  const a = await crearUsuario(); const b = await crearUsuario();
  const r = await pedir('POST', '/dispositivos', a, { tipo: 'fcm', plataforma: 'android', token: 'tok-nuevo', userId: b.user.id, empresaId: b.empresa.id });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { registrado: true });
  assert.doesNotMatch(r.texto, /tok-nuevo/, 'no devuelve el token');
  const fila = await prisma.dispositivoPush.findUnique({ where: { token: 'tok-nuevo' } });
  assert.equal(fila.userId, a.user.id);
  assert.equal(fila.empresaId, a.empresa.id);
  assert.equal(fila.tipo, 'fcm');
  assert.equal(fila.plataforma, 'android');
});

test('el mismo token de otro usuario pasa al último que entró (un teléfono = una sesión)', async () => {
  const a = await crearUsuario(); const b = await crearUsuario();
  await pedir('POST', '/dispositivos', a, { tipo: 'fcm', plataforma: 'ios', token: 'tok-compartido' });
  await pedir('POST', '/dispositivos', b, { tipo: 'fcm', plataforma: 'ios', token: 'tok-compartido' });
  const filas = await prisma.dispositivoPush.findMany({ where: { token: 'tok-compartido' } });
  assert.equal(filas.length, 1);
  assert.equal(filas[0].userId, b.user.id);
  assert.equal(filas[0].empresaId, b.empresa.id);
  // Registrarlo dos veces seguidas con el mismo usuario no duplica.
  await Promise.all([pedir('POST', '/dispositivos', b, { tipo: 'fcm', plataforma: 'ios', token: 'tok-compartido' }), pedir('POST', '/dispositivos', b, { tipo: 'fcm', plataforma: 'ios', token: 'tok-compartido' })]);
  assert.equal(await prisma.dispositivoPush.count({ where: { token: 'tok-compartido' } }), 1);
});

test('registrar una suscripción del navegador (dirección de un servicio de push conocido)', async () => {
  const a = await crearUsuario();
  const endpoint = 'https://fcm.googleapis.com/fcm/send/xyz-largo';
  const r = await pedir('POST', '/dispositivos', a, { tipo: 'webpush', suscripcion: { endpoint, keys: { p256dh: 'BNc-abc_123', auth: 'auth-123' } } });
  assert.equal(r.status, 200);
  const fila = await prisma.dispositivoPush.findUnique({ where: { token: endpoint } });
  assert.equal(fila.tipo, 'webpush');
  assert.equal(fila.plataforma, 'web');
  assert.equal(fila.p256dh, 'BNc-abc_123');
  assert.equal(fila.userId, a.user.id);
});

test('datos inválidos: 400 y no se guarda nada', async () => {
  const a = await crearUsuario();
  const buena = { endpoint: 'https://fcm.googleapis.com/fcm/send/ok', keys: { p256dh: 'BNc-abc', auth: 'auth123' } };
  const casos = [
    { tipo: 'otro', token: 'x' },
    {},
    { tipo: 'fcm', plataforma: 'android', token: '' },
    { tipo: 'fcm', plataforma: 'android', token: 'con espacio' },
    { tipo: 'fcm', plataforma: 'android', token: 'a'.repeat(401) },
    { tipo: 'fcm', plataforma: 'web', token: 'tok-ok' },
    { tipo: 'fcm', plataforma: 'windows', token: 'tok-ok' },
    { tipo: 'webpush', suscripcion: { ...buena, endpoint: 'http://fcm.googleapis.com/fcm/send/ok' } },
    { tipo: 'webpush', suscripcion: { ...buena, endpoint: 'https://169.254.169.254/latest/meta-data' } },
    { tipo: 'webpush', suscripcion: { ...buena, endpoint: 'https://evil.com/fcm.googleapis.com' } },
    { tipo: 'webpush', suscripcion: { endpoint: buena.endpoint } },
    { tipo: 'webpush', suscripcion: { endpoint: buena.endpoint, keys: { p256dh: '<x>', auth: 'a' } } },
    { tipo: 'webpush' },
  ];
  for (const caso of casos) assert.equal((await pedir('POST', '/dispositivos', a, caso)).status, 400, JSON.stringify(caso).slice(0, 80));
  assert.equal(await prisma.dispositivoPush.count({ where: { userId: a.user.id } }), 0);
});

test('un usuario sin empresa no registra nada (400)', async () => {
  const sin = await crearUsuario({ conEmpresa: false });
  const r = await pedir('POST', '/dispositivos', sin, { tipo: 'fcm', plataforma: 'android', token: 'tok-sin-empresa' });
  assert.equal(r.status, 400);
  assert.equal(await prisma.dispositivoPush.count({ where: { token: 'tok-sin-empresa' } }), 0);
});

test('dar de baja: solo borra un dispositivo propio; con uno ajeno o inexistente contesta igual (204)', async () => {
  const a = await crearUsuario(); const b = await crearUsuario();
  const dA = await crearDispositivo(a, { token: 'tok-de-a' });
  const ajeno = await pedir('POST', '/dispositivos/baja', b, { token: 'tok-de-a' });
  const nada = await pedir('POST', '/dispositivos/baja', b, { token: 'tok-que-no-existe' });
  assert.equal(ajeno.status, 204);
  assert.equal(nada.status, 204);
  assert.ok(await prisma.dispositivoPush.findUnique({ where: { id: dA.id } }), 'el dispositivo de A sigue ahí');
  const propio = await pedir('POST', '/dispositivos/baja', a, { token: 'tok-de-a' });
  assert.equal(propio.status, 204);
  assert.equal(await prisma.dispositivoPush.findUnique({ where: { id: dA.id } }), null);
  assert.equal((await pedir('POST', '/dispositivos/baja', a, {})).status, 204);
});

test('en la demo pública no se registra ningún dispositivo y /config dice «no disponible»', async () => {
  const a = await crearUsuario();
  demo = true;
  try {
    const r = await pedir('POST', '/dispositivos', a, { tipo: 'fcm', plataforma: 'android', token: 'tok-demo' });
    assert.equal(r.status, 403);
    assert.equal(await prisma.dispositivoPush.count({ where: { token: 'tok-demo' } }), 0);
    assert.deepEqual((await pedir('GET', '/config', a)).json, { fcm: { disponible: false }, web: { disponible: false, publicKey: null } });
  } finally { demo = false; }
});

// ───────────────────────────── qué se avisa ─────────────────────────────

let serie = 0;
async function crearFactura(u, { total = 118, vence = new Date('2026-11-01T12:00:00Z'), estado = 'emitida', pagado = 0, serieNombre = 'F001' } = {}) {
  const f = await prisma.factura.create({
    data: {
      empresaId: u.empresa.id, clienteId: u.cliente.id, userId: u.user.id, serie: serieNombre, numero: ++serie, fechaEmision: new Date('2026-10-01T12:00:00Z'),
      fechaVencimiento: vence, estado, subtotal: total, igv: 0, total, tipoComprobante: '01',
    },
  });
  if (pagado) await prisma.pagoFactura.create({ data: { facturaId: f.id, fecha: new Date('2026-10-20T12:00:00Z'), monto: pagado, metodoPago: 'efectivo' } });
  return f;
}

const AHORA_LIMA_10H = new Date('2026-11-17T15:00:00Z'); // 10:00 en Lima

test('resumen diario: cuenta solo las vencidas con saldo de ESA empresa, y avisa solo a quien tiene dispositivo', async () => {
  await limpiar(); // el resumen recorre TODOS los dispositivos: parte de una base vacía
  const a = await crearUsuario(); const b = await crearUsuario(); const c = await crearUsuario();
  await crearDispositivo(a); await crearDispositivo(c);
  await crearFactura(a); await crearFactura(a, { total: 200, pagado: 50 }); // vencidas con saldo → 2
  await crearFactura(a, { pagado: 118 }); // vencida pero pagada
  await crearFactura(a, { vence: new Date('2026-12-30T12:00:00Z') }); // todavía no vence
  await crearFactura(a, { estado: 'pagada' });
  await crearFactura(a, { estado: 'anulada' });
  await crearFactura(b); await crearFactura(b); await crearFactura(b); // de otra empresa (sin dispositivo)
  // c tiene dispositivo pero ninguna vencida

  const em = emisoresFalsos();
  const avisos = crearAvisos({ prisma, servicio: servicioCon(em), ahora: () => AHORA_LIMA_10H });
  const r = await avisos.facturasVencidas();
  assert.equal(r.avisados, 1);
  assert.equal(em.enviados.length, 1);
  assert.deepEqual(em.enviados[0].payload, { titulo: 'Facturas vencidas', cuerpo: 'Tienes 2 facturas vencidas por cobrar.', ruta: '/es/facturas' });
  assert.doesNotMatch(JSON.stringify(em.enviados[0].payload), /SECRETO|118|200|20131312955|cliente@test/, 'ni montos ni nombres de clientes');
});

test('resumen diario: una vez por empresa y por día de Lima; mañana vuelve a salir', async () => {
  await limpiar(); // el resumen recorre TODOS los dispositivos: parte de una base vacía
  const a = await crearUsuario(); await crearDispositivo(a); await crearFactura(a);
  const em = emisoresFalsos();
  let ahora = AHORA_LIMA_10H;
  const avisos = crearAvisos({ prisma, servicio: servicioCon(em), ahora: () => ahora });
  await avisos.facturasVencidas();
  await avisos.facturasVencidas();
  assert.equal(em.enviados.length, 1);
  assert.equal(em.enviados[0].payload.cuerpo, 'Tienes 1 factura vencida por cobrar.');
  ahora = new Date('2026-11-18T15:00:00Z');
  await avisos.facturasVencidas();
  assert.equal(em.enviados.length, 2);
});

test('resumen diario: no sale de madrugada ni de noche (hora de Lima) ni con el envío apagado', async () => {
  await limpiar(); // el resumen recorre TODOS los dispositivos: parte de una base vacía
  const a = await crearUsuario(); await crearDispositivo(a); await crearFactura(a);
  const em = emisoresFalsos();
  for (const hora of ['2026-11-17T11:00:00Z' /* 06:00 Lima */, '2026-11-18T02:00:00Z' /* 21:00 Lima */]) {
    const r = await crearAvisos({ prisma, servicio: servicioCon(em), ahora: () => new Date(hora) }).facturasVencidas();
    assert.equal(r.omitido, 'fuera-de-horario', hora);
  }
  assert.equal(em.enviados.length, 0);
  const apagado = await crearAvisos({ prisma, servicio: servicioPushApagado, ahora: () => AHORA_LIMA_10H }).facturasVencidas();
  assert.equal(apagado.omitido, 'apagado');
});

test('SUNAT rechazó: avisa al dueño de la empresa con el número y la ruta, sin montos ni cliente', async () => {
  const a = await crearUsuario(); const otro = await crearUsuario();
  await crearDispositivo(a); await crearDispositivo(otro);
  const f = await crearFactura(a, { total: 4321 });
  const em = emisoresFalsos();
  const avisos = crearAvisos({ prisma, servicio: servicioCon(em) });
  await avisos.comprobanteRechazado(f.id);
  await avisos.comprobanteRechazado(f.id); // el mismo rechazo no se repite
  assert.equal(em.enviados.length, 1);
  assert.deepEqual(em.enviados[0].payload, { titulo: 'SUNAT rechazó un comprobante', cuerpo: `F001-${f.numero} fue rechazado. Revísalo y corrígelo.`, ruta: `/es/comprobantes/${f.id}` });
  assert.doesNotMatch(JSON.stringify(em.enviados[0].payload), /4321|SECRETO/);
  await avisos.comprobanteRechazado('no-existe'); // un comprobante inexistente no rompe nada
});

test('envío fuera de plazo: avisa al dueño', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  const f = await crearFactura(a);
  const em = emisoresFalsos();
  await crearAvisos({ prisma, servicio: servicioCon(em) }).envioFueraDePlazo(f.id);
  assert.equal(em.enviados[0].payload.titulo, 'Comprobante sin enviar a SUNAT');
  assert.equal(em.enviados[0].payload.ruta, `/es/comprobantes/${f.id}`);
});

// ───────────── la firma del cliente (ruta pública real) dispara el aviso ─────────────

let servidorFirma; let baseFirma;
test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/signatures/public', firmaPublica);
  await new Promise((r) => { servidorFirma = app.listen(0, r); });
  baseFirma = `http://127.0.0.1:${servidorFirma.address().port}`;
});
test.after(() => { servidorFirma.close(); establecerAvisos(SIN_AVISOS); });

async function esperar(condicion, ms = 3000) {
  const hasta = Date.now() + ms;
  while (!condicion()) { if (Date.now() > hasta) return false; await new Promise((r) => setTimeout(r, 25)); }
  return true;
}

async function solicitudDeProforma(u, { requestedBy = u.user.id } = {}) {
  const proforma = await prisma.proforma.create({
    data: { empresaId: u.empresa.id, clienteId: u.cliente.id, userId: u.user.id, serie: 'P001', numero: ++serie, fechaEmision: new Date(), subtotal: 100, igv: 18, total: 118 },
  });
  const token = `tok-firma-${unico()}`;
  const solicitud = await prisma.signatureRequest.create({
    data: {
      token, documentType: 'PROFORMA', documentId: proforma.id, proformaId: proforma.id, signerEmail: 'cliente@test.pe', signerName: 'Cliente',
      expiresAt: new Date(Date.now() + 86400000), requestedBy, empresaId: u.empresa.id,
    },
  });
  return { proforma, solicitud, token };
}
const firmar = (token) => fetch(`${baseFirma}/api/signatures/public/submit`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, signatureDataUrl: 'firma-de-prueba', consentGiven: true, userAgent: 'prueba', deviceType: 'desktop' }),
});

test('cuando el cliente firma una proforma, al dueño le llega un aviso (y solo una vez)', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  const em = emisoresFalsos();
  establecerAvisos(crearAvisos({ prisma, servicio: servicioCon(em) }));
  const { proforma, token } = await solicitudDeProforma(a);

  const r = await firmar(token);
  assert.equal(r.status, 200);
  assert.ok(await esperar(() => em.enviados.length === 1), 'llegó el aviso');
  assert.deepEqual(em.enviados[0].payload, { titulo: 'Proforma aceptada', cuerpo: `Tu cliente firmó la proforma P001-${proforma.numero}.`, ruta: `/es/proformas/${proforma.id}` });
  assert.doesNotMatch(JSON.stringify(em.enviados[0].payload), /SECRETO|118|cliente@test/);

  // Firmar otra vez no se acepta y no manda otro aviso.
  assert.equal((await firmar(token)).status, 400);
  await new Promise((res) => setTimeout(res, 100));
  assert.equal(em.enviados.length, 1);
});

test('si el aviso falla, la firma se guarda igual y la respuesta es 200', async () => {
  const a = await crearUsuario(); await crearDispositivo(a);
  const origError = console.error; console.error = () => {};
  establecerAvisos({ ...SIN_AVISOS, firmaRecibida: async () => { throw new Error('FCM caído'); } });
  try {
    const { proforma, token } = await solicitudDeProforma(a);
    assert.equal((await firmar(token)).status, 200);
    assert.equal((await prisma.proforma.findUnique({ where: { id: proforma.id } })).estado, 'aceptada');
    await new Promise((res) => setTimeout(res, 50));
  } finally { console.error = origError; establecerAvisos(SIN_AVISOS); }
});
