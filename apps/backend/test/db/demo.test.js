// Modo demo (MODO_DEMO=si): rutas /api/demo, candado, límite diario y, sobre todo, que SIN la variable nada cambia.
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_falsa';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
delete process.env.MODO_DEMO;
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const { engineFalso } = require('./falsos');
const { authenticateToken, generateAccessToken } = require('../../src/middleware/auth');
const { crearRouterDemo } = require('../../src/demo/rutas');
const { PERFILES } = require('../../src/demo/perfiles');
const { LIMITE_DIARIO } = require('../../src/demo/modo');
const authRoutes = require('../../src/routes/auth');
const sitioRoutes = require('../../src/routes/sitio');
const adminRoutes = require('../../src/routes/admin');
const empresaRoutes = require('../../src/routes/empresa');
const jobPhotosRoutes = require('../../src/routes/jobPhotos');
const jobReceiptsRoutes = require('../../src/routes/jobReceipts');
const subscriptionsRoutes = require('../../src/routes/subscriptions');
const { crearRouterCulqi } = require('../../src/routes/subscriptionsCulqi');
const { crearRouterSunat } = require('../../src/routes/sunat');
const { crearRouterComprobantes } = require('../../src/routes/comprobantes');

const pasa = (_req, _res, next) => next();
const AHORA = new Date('2026-11-15T17:00:00Z'); // 12:00 en Lima
let ahora = AHORA;
const llamadasCulqi = [];
const engine = engineFalso();
const emisiones = [];
let servidor; let base;

test.before(async () => {
  const servicioCulqi = {
    suscribir: async () => { llamadasCulqi.push('suscribir'); return { ok: true }; },
    cambiarTarjeta: async () => { llamadasCulqi.push('cambiarTarjeta'); return { ok: true }; },
  };
  const sunat = {
    engine,
    servicioEmision: { emitir: async (id) => { emisiones.push(id); return { id, estadoSunat: 'PENDIENTE_ENVIO' }; } },
    servicioAnulacion: {},
  };
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/demo', crearRouterDemo({ prisma, limitadorEntrar: pasa }));
  app.use('/api/sitio', sitioRoutes);
  app.use('/api/admin', authenticateToken, adminRoutes);
  app.use('/api/empresas', empresaRoutes);
  app.use('/api/job-photos', jobPhotosRoutes);
  app.use('/api/job-receipts', jobReceiptsRoutes);
  app.use('/api/subscriptions/culqi', crearRouterCulqi({ prisma, obtenerServicio: () => servicioCulqi }));
  app.use('/api/subscriptions', subscriptionsRoutes);
  app.use('/api/sunat', crearRouterSunat({ prisma, obtenerSunat: async () => sunat }));
  app.use('/api/comprobantes', crearRouterComprobantes({ prisma, obtenerSunat: async () => sunat, ahora: () => ahora }));
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => { delete process.env.MODO_DEMO; servidor.close(); await prisma.$disconnect(); });
test.beforeEach(async () => {
  delete process.env.MODO_DEMO;
  ahora = AHORA;
  llamadasCulqi.length = 0;
  emisiones.length = 0;
  engine.llamadas.length = 0;
  await limpiar();
  await prisma.configuracionSitio.deleteMany();
});
test.afterEach(() => { delete process.env.MODO_DEMO; });

const enDemo = () => { process.env.MODO_DEMO = 'si'; };
const pedir = async (metodo, ruta, { token, cuerpo, form } = {}) => {
  const headers = { ...(token ? { authorization: `Bearer ${token}` } : {}) };
  let body;
  if (form) body = form;
  else if (cuerpo !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(cuerpo); }
  const r = await fetch(`${base}${ruta}`, { method: metodo, headers, body });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { json = null; }
  return { status: r.status, texto, json };
};
const bloqueado = (r) => {
  assert.equal(r.status, 403, `esperaba 403, llegó ${r.status}: ${r.texto}`);
  assert.equal(r.json.codigo, 'DEMO_BLOQUEADO');
  assert.match(r.json.error, /demostración/i);
};
const crearUsuarioDemo = (perfil, extra = {}) => prisma.userProfile.create({
  data: { email: PERFILES[perfil].email, name: PERFILES[perfil].nombre, role: 'USER', isActive: true, ...extra },
});
const crearUsuario = async (role = 'USER') => prisma.userProfile.create({
  data: { email: `${role.toLowerCase()}-${Date.now()}-${Math.random()}@test.pe`, role, passwordHash: await bcrypt.hash('clave-secreta', 10) },
});

// ---------- /api/demo/estado ----------

test('sin MODO_DEMO, /api/demo/estado y /api/demo/entrar responden 404 y no entregan ninguna sesión', async () => {
  await crearUsuarioDemo('emprendedor');
  const estado = await pedir('GET', '/api/demo/estado');
  assert.equal(estado.status, 404);
  const entrar = await pedir('POST', '/api/demo/entrar', { cuerpo: { perfil: 'emprendedor' } });
  assert.equal(entrar.status, 404);
  assert.doesNotMatch(entrar.texto, /access_token/);
  for (const valor of ['no', 'SI', 'true', '1', '']) {
    process.env.MODO_DEMO = valor;
    assert.equal((await pedir('GET', '/api/demo/estado')).status, 404, `MODO_DEMO="${valor}" no activa la demo`);
  }
});

test('con MODO_DEMO: estado devuelve el contrato (perfiles, límite, whatsapp nulo y sin enlace de firma)', async () => {
  enDemo();
  const r = await pedir('GET', '/api/demo/estado');
  assert.equal(r.status, 200);
  assert.equal(r.json.activa, true);
  assert.equal(r.json.whatsapp, null);
  assert.equal(r.json.limiteDiario, 30);
  assert.deepEqual(r.json.perfiles.map((p) => p.id), ['emprendedor', 'servicios', 'cliente']);
  for (const p of r.json.perfiles) {
    assert.equal(typeof p.nombre, 'string');
    assert.equal(typeof p.descripcion, 'string');
  }
  assert.equal(r.json.perfiles[2].enlaceFirma, null);
  assert.equal(Object.hasOwn(r.json.perfiles[0], 'enlaceFirma'), false);
  assert.doesNotMatch(r.texto, /@demo\.facturo\.example/, 'el estado no revela los correos de las cuentas');
});

test('estado: enlaceFirma es la solicitud PENDIENTE (vigente) más reciente de la empresa «servicios»', async () => {
  enDemo();
  const usuario = await crearUsuarioDemo('servicios');
  const empresa = await prisma.empresa.create({ data: { nombre: 'Soluciones', ruc: '20000000001', pais: 'PE', userId: usuario.id } });
  const otra = await crearEmpresaPeru({ ruc: '20000000002' });
  // documentId no tiene relación (la FK es proformaId, opcional): no hace falta crear la proforma.
  const solicitud = (e, token, status, { creada, vence = new Date(Date.now() + 864e5 * 5) } = {}) => prisma.signatureRequest.create({
    data: { token, documentType: 'PROFORMA', documentId: `doc-${token}`, signerEmail: 'c@x.example', status, expiresAt: vence, requestedBy: e.userId, empresaId: e.id, ...(creada ? { createdAt: creada } : {}) },
  });
  await solicitud(empresa, 'tok-vieja', 'PENDING', { creada: new Date('2026-01-01T00:00:00Z') });
  await solicitud(empresa, 'tok-firmada', 'SIGNED', { creada: new Date('2026-11-01T00:00:00Z') });
  await solicitud(empresa, 'tok-vencida', 'PENDING', { creada: new Date('2026-11-02T00:00:00Z'), vence: new Date('2026-11-03T00:00:00Z') });
  await solicitud(otra.empresa, 'tok-de-otra-empresa', 'PENDING');
  const ultima = await solicitud(empresa, 'tok-buena', 'PENDING', { creada: new Date('2026-06-01T00:00:00Z') });
  assert.ok(ultima);
  const r = await pedir('GET', '/api/demo/estado');
  assert.equal(r.json.perfiles[2].enlaceFirma, '/es/sign/tok-buena');
});

test('estado: devuelve el WhatsApp guardado en la base', async () => {
  enDemo();
  await prisma.configuracionSitio.create({ data: { id: 'global', demoWhatsapp: '+51987654321' } });
  assert.equal((await pedir('GET', '/api/demo/estado')).json.whatsapp, '+51987654321');
});

// ---------- demoWhatsapp en PUT /api/admin/sitio/legal ----------

test('PUT legal acepta demoWhatsapp: normaliza a +51 y 9 dígitos; vacío = null; ausente no lo toca', async () => {
  const sa = generateAccessToken(await crearUsuario('SUPER_ADMIN'));
  const put = (demoWhatsapp) => pedir('PUT', '/api/admin/sitio/legal', { token: sa, cuerpo: { legalMarca: 'Marca', ...(demoWhatsapp === undefined ? {} : { demoWhatsapp }) } });
  const guardado = async () => (await prisma.configuracionSitio.findUnique({ where: { id: 'global' } }))?.demoWhatsapp;
  for (const entrada of ['987654321', '+51987654321', '51987654321', '+51 987 654 321', ' 987-654-321 ']) {
    const r = await put(entrada);
    assert.equal(r.status, 200, `${entrada}: ${r.texto}`);
    assert.equal(await guardado(), '+51987654321', entrada);
  }
  assert.equal((await put(undefined)).status, 200);
  assert.equal(await guardado(), '+51987654321', 'sin el campo no se borra lo guardado');
  assert.equal((await put('')).status, 200);
  assert.equal(await guardado(), null);
  await put('999111222');
  assert.equal((await put(null)).status, 200);
  assert.equal(await guardado(), null);
});

test('PUT legal rechaza un WhatsApp que no es celular peruano (400) y no guarda nada', async () => {
  const sa = generateAccessToken(await crearUsuario('SUPER_ADMIN'));
  await prisma.configuracionSitio.create({ data: { id: 'global', legalMarca: 'Antes', demoWhatsapp: '+51911222333' } });
  for (const malo of ['98765432', '8987654321', '887654321', '9876543210', '+52987654321', '+1 987654321', 'abc987654321', '+51 12345678', 987654321, true, {}]) {
    const r = await pedir('PUT', '/api/admin/sitio/legal', { token: sa, cuerpo: { legalMarca: 'Nueva', demoWhatsapp: malo } });
    assert.equal(r.status, 400, `${JSON.stringify(malo)} debería ser 400`);
    assert.match(r.json.error, /WhatsApp/);
  }
  const fila = await prisma.configuracionSitio.findUnique({ where: { id: 'global' } });
  assert.equal(fila.legalMarca, 'Antes');
  assert.equal(fila.demoWhatsapp, '+51911222333');
});

test('el WhatsApp de la demo no sale en GET /api/sitio/legal (público) y solo SUPER_ADMIN lo guarda', async () => {
  await prisma.configuracionSitio.create({ data: { id: 'global', legalMarca: 'M', demoWhatsapp: '+51987654321' } });
  const publico = await pedir('GET', '/api/sitio/legal');
  assert.equal(publico.status, 200);
  assert.doesNotMatch(publico.texto, /demo|987654321/i);
  const normal = generateAccessToken(await crearUsuario('USER'));
  assert.equal((await pedir('PUT', '/api/admin/sitio/legal', { token: normal, cuerpo: { demoWhatsapp: '999999999' } })).status, 403);
  assert.equal((await prisma.configuracionSitio.findUnique({ where: { id: 'global' } })).demoWhatsapp, '+51987654321');
});

// ---------- /api/demo/entrar ----------

const entrar = (cuerpo) => pedir('POST', '/api/demo/entrar', { cuerpo });

test('entrar: devuelve lo mismo que /api/auth/login y un token válido de la cuenta de demo', async () => {
  enDemo();
  const demo = await crearUsuarioDemo('emprendedor');
  const normal = await crearUsuario('USER');
  const login = await pedir('POST', '/api/auth/login', { cuerpo: { email: normal.email, password: 'clave-secreta' } });
  const r = await entrar({ perfil: 'emprendedor' });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json).sort(), Object.keys(login.json).sort());
  assert.deepEqual(Object.keys(r.json.user).sort(), Object.keys(login.json.user).sort());
  assert.deepEqual(Object.keys(r.json.session).sort(), Object.keys(login.json.session).sort());
  assert.equal(r.json.session.token_type, 'Bearer');
  assert.equal(r.json.user.id, demo.id);
  assert.equal(r.json.user.email, PERFILES.emprendedor.email);
  assert.doesNotMatch(r.texto, /passwordHash|clave-secreta/);
  const payload = jwt.verify(r.json.session.access_token, process.env.JWT_SECRET);
  assert.equal(payload.sub, demo.id);
  // el token sirve de verdad contra una ruta protegida
  const yo = await pedir('GET', '/api/auth/me', { token: r.json.session.access_token });
  assert.equal(yo.status, 200);
  assert.equal(yo.json.user.email, PERFILES.emprendedor.email);
});

test('entrar como «servicios» devuelve la sesión de la cuenta de servicios', async () => {
  enDemo();
  await crearUsuarioDemo('emprendedor');
  const servicios = await crearUsuarioDemo('servicios');
  const r = await entrar({ perfil: 'servicios' });
  assert.equal(r.status, 200);
  assert.equal(r.json.user.id, servicios.id);
  assert.equal(jwt.verify(r.json.session.access_token, process.env.JWT_SECRET).sub, servicios.id);
});

test('entrar NUNCA devuelve la sesión de un usuario normal, mande lo que mande el cliente', async () => {
  enDemo();
  await crearUsuarioDemo('emprendedor');
  const normal = await crearUsuario('USER');
  const admin = await crearUsuario('SUPER_ADMIN');
  const intentos = [
    { perfil: 'emprendedor', email: normal.email },
    { perfil: 'emprendedor', userId: normal.id, id: normal.id },
    { perfil: normal.email },
    { perfil: 'emprendedor', email: admin.email, role: 'SUPER_ADMIN' },
    { email: normal.email },
    { perfil: ['emprendedor', normal.email] },
  ];
  for (const cuerpo of intentos) {
    const r = await entrar(cuerpo);
    if (r.status === 200) {
      const sub = jwt.verify(r.json.session.access_token, process.env.JWT_SECRET).sub;
      assert.notEqual(sub, normal.id);
      assert.notEqual(sub, admin.id);
      assert.equal(r.json.user.email, PERFILES.emprendedor.email);
    } else {
      assert.equal(r.status, 400);
      assert.doesNotMatch(r.texto, /access_token/);
    }
  }
});

test('entrar con un usuario normal detrás del perfil (tabla corrompida) → 503 y sin token', async () => {
  enDemo();
  const normal = await crearUsuario('USER');
  const corrupto = express();
  corrupto.use(express.json());
  corrupto.use('/api/demo', crearRouterDemo({ prisma, limitadorEntrar: pasa, perfiles: { emprendedor: { id: 'emprendedor', email: normal.email } } }));
  const s = await new Promise((r) => { const x = corrupto.listen(0, () => r(x)); });
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/api/demo/entrar`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ perfil: 'emprendedor' }),
    });
    const cuerpo = await r.text();
    assert.equal(r.status, 503);
    assert.doesNotMatch(cuerpo, /access_token/);
  } finally { s.close(); }
});

test('entrar con la cuenta de demo inexistente → 503; inactiva → 503; con rol de administrador → 503', async () => {
  enDemo();
  const sinCuenta = await entrar({ perfil: 'emprendedor' });
  assert.equal(sinCuenta.status, 503);
  assert.doesNotMatch(sinCuenta.texto, /access_token/);

  const demo = await crearUsuarioDemo('emprendedor');
  await prisma.userProfile.update({ where: { id: demo.id }, data: { isActive: false } });
  const inactiva = await entrar({ perfil: 'emprendedor' });
  assert.equal(inactiva.status, 503);
  assert.doesNotMatch(inactiva.texto, /access_token/);

  await prisma.userProfile.update({ where: { id: demo.id }, data: { isActive: true, role: 'SUPER_ADMIN' } });
  const admin = await entrar({ perfil: 'emprendedor' });
  assert.equal(admin.status, 503);
  assert.doesNotMatch(admin.texto, /access_token/);
});

test('entrar con un perfil inválido → 400 («cliente» no inicia sesión; «__proto__» y «constructor» tampoco)', async () => {
  enDemo();
  await crearUsuarioDemo('emprendedor');
  for (const perfil of ['cliente', 'admin', '', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 1, null, undefined, {}]) {
    const r = await entrar({ perfil });
    assert.equal(r.status, 400, `perfil ${JSON.stringify(perfil)}`);
    assert.doesNotMatch(r.texto, /access_token/);
  }
  assert.equal((await pedir('POST', '/api/demo/entrar')).status, 400);
});

test('entrar tiene límite de peticiones propio (el predeterminado, 30 por ventana)', async () => {
  enDemo();
  const conLimite = express();
  conLimite.use(express.json());
  conLimite.use('/api/demo', crearRouterDemo({ prisma })); // limitador por defecto
  const s = await new Promise((r) => { const x = conLimite.listen(0, () => r(x)); });
  try {
    const estados = [];
    for (let i = 0; i < 32; i += 1) {
      const r = await fetch(`http://127.0.0.1:${s.address().port}/api/demo/entrar`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ perfil: 'x' }),
      });
      estados.push(r.status);
      await r.text();
    }
    assert.equal(estados[0], 400);
    assert.equal(estados[31], 429);
  } finally { s.close(); }
});

// ---------- Candado: cuentas ----------

test('demo: POST /api/auth/register → 403 y no se crea ningún usuario', async () => {
  enDemo();
  const r = await pedir('POST', '/api/auth/register', { cuerpo: { email: 'nuevo@test.pe', password: 'abcdef', empresaData: { nombre: 'X' } } });
  bloqueado(r);
  assert.equal(await prisma.userProfile.count({ where: { email: 'nuevo@test.pe' } }), 0);
});

test('demo: /api/auth solo deja login, logout y /me; lo demás (contraseña, correo) queda cerrado por defecto', async () => {
  enDemo();
  const normal = await crearUsuario('USER');
  const login = await pedir('POST', '/api/auth/login', { cuerpo: { email: normal.email, password: 'clave-secreta' } });
  assert.equal(login.status, 200, 'iniciar sesión con contraseña sigue funcionando en la demo');
  const token = login.json.session.access_token;
  assert.equal((await pedir('GET', '/api/auth/me', { token })).status, 200);
  assert.equal((await pedir('POST', '/api/auth/logout')).status, 200);
  for (const [metodo, ruta] of [['POST', '/change-password'], ['PUT', '/password'], ['POST', '/cambiar-clave'], ['PUT', '/email'], ['PATCH', '/me'], ['PUT', '/me']]) {
    bloqueado(await pedir(metodo, `/api/auth${ruta}`, { token, cuerpo: { password: 'otra-clave', email: 'otro@test.pe' } }));
  }
  const igual = await prisma.userProfile.findUnique({ where: { id: normal.id } });
  assert.equal(await bcrypt.compare('clave-secreta', igual.passwordHash), true);
  assert.equal(igual.email, normal.email);
});

// ---------- Candado: cobros y plan ----------

test('demo: Culqi (suscribir y tarjeta) → 403 y el servicio de cobro nunca se llama', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);
  bloqueado(await pedir('POST', '/api/subscriptions/culqi/suscribir', { token, cuerpo: { planSlug: 'pe-negocio', intervalo: 'MONTH' } }));
  bloqueado(await pedir('POST', '/api/subscriptions/culqi/tarjeta', { token, cuerpo: { tokenId: 'tkn_test_1' } }));
  assert.deepEqual(llamadasCulqi, []);
});

test('demo: Stripe (checkout, portal, sync) → 403 y cambiar de plan (gratis, cancelar, reactivar) → 403 sin tocar la suscripción', async () => {
  enDemo();
  const planes = await sembrarPlanesPe();
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);
  await prisma.subscription.create({ data: { empresaId: ctx.empresa.id, planId: planes['pe-negocio'].id, status: 'ACTIVE' } });
  for (const ruta of ['create-checkout-session', 'create-portal-session', 'sync-from-session', 'cancel', 'reactivate', 'switch-to-free']) {
    bloqueado(await pedir('POST', `/api/subscriptions/${ruta}`, { token, cuerpo: { planId: planes['pe-gratis'].id, sessionId: 'cs_test_1' } }));
  }
  const sub = await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } });
  assert.equal(sub.plan.slug, 'pe-negocio');
  assert.equal(sub.status, 'ACTIVE');
});

// ---------- Candado: SUNAT ----------

const direccion = { ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', direccionFiscal: 'AV 1' };
const emisorDe = (ctx) => prisma.emisorSunat.findUnique({ where: { empresaId: ctx.empresa.id } });

test('demo: el emisor no pasa a PRODUCCION (con o sin confirmación) y el ambiente guardado no cambia', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);
  const antes = await emisorDe(ctx);
  bloqueado(await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, ambiente: 'PRODUCCION' } }));
  bloqueado(await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, ambiente: 'PRODUCCION', confirmarProduccion: true } }));
  const despues = await emisorDe(ctx);
  assert.equal(despues.ambiente, 'BETA');
  assert.equal(despues.direccionFiscal, antes.direccionFiscal);
});

test('demo: no se sube ni cambia el certificado, su clave ni la clave SOL', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);
  const antes = await emisorDe(ctx);
  bloqueado(await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, certificado: { pfxBase64: 'eA==', clave: 'otra' } } }));
  bloqueado(await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, solClave: 'otra-clave-sol' } }));
  bloqueado(await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, solUsuario: 'OTRO' } }));
  assert.equal(engine.llamadas.filter((l) => l.nombre === 'inspeccionarCertificado').length, 0, 'ni siquiera se inspecciona el certificado');
  const despues = await emisorDe(ctx);
  assert.equal(despues.solClaveCifrada, antes.solClaveCifrada);
  assert.equal(despues.solUsuario, antes.solUsuario);
  assert.equal(despues.certificadoCifrado.toString(), antes.certificadoCifrado.toString());
  assert.equal(despues.certificadoClaveCifrada, antes.certificadoClaveCifrada);
});

test('demo: las demás opciones del emisor (dirección, ubigeo, detracciones) sí se editan', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);
  const r = await pedir('PUT', '/api/sunat/emisor', {
    token, cuerpo: { ...direccion, ubigeo: '150140', distrito: 'SANTIAGO DE SURCO', direccionFiscal: 'AV NUEVA 456', ambiente: 'BETA', solUsuario: 'MODDATOS', cuentaDetracciones: '00-111-222333' },
  });
  assert.equal(r.status, 200, r.texto);
  const e = await emisorDe(ctx);
  assert.equal(e.ubigeo, '150140');
  assert.equal(e.direccionFiscal, 'AV NUEVA 456');
  assert.equal(e.cuentaDetracciones, '00-111-222333');
  assert.equal(e.ambiente, 'BETA');
});

// ---------- Candado: subidas ----------

test('demo: subir el logo, una foto o un recibo de trabajo → 403 (antes de leer el archivo)', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);
  const archivo = () => { const f = new FormData(); f.append('logo', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'logo.png'); return f; };
  bloqueado(await pedir('POST', '/api/empresas/logo', { token, form: archivo() }));
  const foto = new FormData(); foto.append('photo', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'foto.png'); foto.append('facturaId', 'x');
  bloqueado(await pedir('POST', '/api/job-photos', { token, form: foto }));
  const recibo = new FormData(); recibo.append('file', new Blob(['%PDF-1.4'], { type: 'application/pdf' }), 'recibo.pdf'); recibo.append('facturaId', 'x');
  bloqueado(await pedir('POST', '/api/job-receipts', { token, form: recibo }));
  bloqueado(await pedir('POST', '/api/job-receipts', { token, cuerpo: { facturaId: 'x', descripcion: 'sin archivo', monto: 10 } }));
  assert.equal((await prisma.empresa.findUnique({ where: { id: ctx.empresa.id } })).logoUrl, null);
  assert.equal(await prisma.jobPhoto.count(), 0);
  assert.equal(await prisma.jobReceipt.count(), 0);
});

// ---------- Límite diario ----------

async function borrador(ctx, numero) {
  return prisma.factura.create({
    data: {
      empresaId: ctx.empresa.id, clienteId: ctx.cliente.id, userId: ctx.empresa.userId, tipoComprobante: '01', serie: 'F001', numero,
      fechaEmision: ahora, estadoSunat: 'BORRADOR', moneda: 'PEN', subtotal: 100, igv: 18, total: 118, totalGravadas: 100, montoEnLetras: 'X', formaPago: 'Contado',
    },
  });
}
const emitir = (ctx, f) => pedir('POST', `/api/comprobantes/${f.id}/emitir`, { token: generateAccessToken(ctx.user) });
async function emitidos(ctx, n, fecha, estado = 'ACEPTADO') {
  for (let i = 0; i < n; i += 1) {
    const f = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 5000 + Math.floor(Math.random() * 1e6), fechaEmision: fecha });
    if (estado !== 'ACEPTADO') await prisma.factura.update({ where: { id: f.id }, data: { estadoSunat: estado } });
  }
}

test('límite diario: con 30 emitidos hoy (Lima) el 31.º es 429 DEMO_LIMITE y no se emite; con 29 sí', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  await emitidos(ctx, LIMITE_DIARIO - 1, AHORA);
  const b1 = await borrador(ctx, null);
  const ok = await emitir(ctx, b1);
  assert.equal(ok.status, 200, ok.texto);
  assert.deepEqual(emisiones, [b1.id]);
  await emitidos(ctx, 1, AHORA); // ahora ya hay 30
  const b2 = await borrador(ctx, null);
  const r = await emitir(ctx, b2);
  assert.equal(r.status, 429);
  assert.equal(r.json.codigo, 'DEMO_LIMITE');
  assert.match(r.json.error, /30/);
  assert.deepEqual(emisiones, [b1.id], 'el motor no se llama al pasar el límite');
});

test('límite diario: se cuenta por día de Lima, por empresa, sin borradores y con rechazados incluidos', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  const otra = await crearEmpresaPeru({ ruc: '20000000002' });
  // 30 de la otra empresa y 30 de ayer en Lima (23:59:59 del 14) no cuentan
  await emitidos(otra, LIMITE_DIARIO, AHORA);
  await emitidos(ctx, LIMITE_DIARIO, new Date('2026-11-15T04:59:59Z'));
  for (let i = 0; i < 5; i += 1) await borrador(ctx, null); // borradores: no cuentan
  const f = await borrador(ctx, null);
  assert.equal((await emitir(ctx, f)).status, 200);
  // 00:00 de Lima del 15 (05:00 UTC) ya cuenta como hoy: 30 de ahí → bloquea
  await emitidos(ctx, LIMITE_DIARIO - 1, new Date('2026-11-15T05:00:00Z'), 'RECHAZADO');
  await emitidos(ctx, 1, new Date('2026-11-16T04:59:59Z'));
  assert.equal((await emitir(ctx, await borrador(ctx, null))).status, 429);
  // y a las 00:00 de Lima del 16 el contador vuelve a cero
  ahora = new Date('2026-11-16T05:00:00Z');
  assert.equal((await emitir(ctx, await borrador(ctx, null))).status, 200);
});

test('límite diario: vive en la base (otra instancia del router ve los mismos 30)', async () => {
  enDemo();
  const ctx = await crearEmpresaPeru();
  await emitidos(ctx, LIMITE_DIARIO, AHORA);
  const sunat = { servicioEmision: { emitir: async () => ({}) } };
  const otraInstancia = express();
  otraInstancia.use(express.json());
  otraInstancia.use('/api/comprobantes', crearRouterComprobantes({ prisma, obtenerSunat: async () => sunat, ahora: () => AHORA }));
  const s = await new Promise((r) => { const x = otraInstancia.listen(0, () => r(x)); });
  try {
    const f = await borrador(ctx, null);
    const r = await fetch(`http://127.0.0.1:${s.address().port}/api/comprobantes/${f.id}/emitir`, {
      method: 'POST', headers: { authorization: `Bearer ${generateAccessToken(ctx.user)}` },
    });
    assert.equal(r.status, 429);
    assert.equal((await r.json()).codigo, 'DEMO_LIMITE');
  } finally { s.close(); }
});

// ---------- SIN MODO_DEMO: todo sigue funcionando igual ----------

test('SIN MODO_DEMO: registro, emisor en producción, certificado, cambio de plan y Culqi funcionan como siempre', async () => {
  assert.equal(process.env.MODO_DEMO, undefined);
  // registro
  const reg = await pedir('POST', '/api/auth/register', { cuerpo: { email: 'real@test.pe', password: 'abcdef', empresaData: { nombre: 'Real SAC' } } });
  assert.equal(reg.status, 201, reg.texto);
  assert.equal(await prisma.userProfile.count({ where: { email: 'real@test.pe' } }), 1);
  assert.equal((await pedir('POST', '/api/auth/cambiar-clave', { cuerpo: {} })).status, 404, 'sin demo /api/auth no cierra rutas ajenas');

  const planes = await sembrarPlanesPe();
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);

  // emisor en producción (exige confirmar) + certificado y clave SOL
  assert.equal((await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, ambiente: 'PRODUCCION' } })).status, 400);
  const prod = await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, ambiente: 'PRODUCCION', confirmarProduccion: true } });
  assert.equal(prod.status, 200, prod.texto);
  assert.equal((await emisorDe(ctx)).ambiente, 'PRODUCCION');
  const cert = await pedir('PUT', '/api/sunat/emisor', { token, cuerpo: { ...direccion, ambiente: 'PRODUCCION', confirmarProduccion: true, solClave: 'nueva', solUsuario: 'OTRO', certificado: { pfxBase64: 'eA==', clave: 'c' } } });
  assert.equal(cert.status, 200, cert.texto);
  assert.equal((await emisorDe(ctx)).solUsuario, 'OTRO');

  // cambio de plan
  await prisma.subscription.upsert({
    where: { empresaId: ctx.empresa.id }, update: { planId: planes['pe-negocio'].id, status: 'ACTIVE' },
    create: { empresaId: ctx.empresa.id, planId: planes['pe-negocio'].id, status: 'ACTIVE' },
  });
  const plan = await pedir('POST', '/api/subscriptions/switch-to-free', { token });
  assert.equal(plan.status, 200, plan.texto);
  assert.equal((await prisma.subscription.findUnique({ where: { empresaId: ctx.empresa.id }, include: { plan: true } })).plan.slug, 'pe-gratis');

  // cobros: la petición llega al servicio de Culqi
  const culqi = await pedir('POST', '/api/subscriptions/culqi/suscribir', {
    token, cuerpo: { planSlug: 'pe-negocio', intervalo: 'MONTH', tokenId: 'tkn_test_1', facturacion: { nombre: 'Ana', apellido: 'Pérez', telefono: '999888777', direccion: 'Av. Prueba 123', ciudad: 'Lima' } },
  });
  assert.equal(culqi.status, 200, culqi.texto);
  assert.deepEqual(llamadasCulqi, ['suscribir']);
});

test('SIN MODO_DEMO: subidas y portal de Stripe no responden DEMO_BLOQUEADO; el límite diario no existe', async () => {
  const ctx = await crearEmpresaPeru();
  const token = generateAccessToken(ctx.user);
  const noDemo = (r) => assert.notEqual(r.json?.codigo, 'DEMO_BLOQUEADO', `${r.status} ${r.texto}`);
  noDemo(await pedir('POST', '/api/empresas/logo', { token, form: new FormData() }));
  noDemo(await pedir('POST', '/api/job-photos', { token, form: new FormData() }));
  noDemo(await pedir('POST', '/api/job-receipts', { token, cuerpo: {} }));
  for (const ruta of ['create-checkout-session', 'create-portal-session', 'sync-from-session', 'cancel', 'reactivate']) {
    noDemo(await pedir('POST', `/api/subscriptions/${ruta}`, { token, cuerpo: {} }));
  }
  // 40 emitidos hoy y se sigue emitiendo
  await emitidos(ctx, 40, AHORA);
  const r = await emitir(ctx, await borrador(ctx, null));
  assert.equal(r.status, 200, r.texto);
});
