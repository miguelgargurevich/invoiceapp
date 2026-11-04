process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { prisma, limpiar } = require('./ayuda');
const { authenticateToken, generateAccessToken } = require('../../src/middleware/auth');
const sitioRoutes = require('../../src/routes/sitio');
const adminRoutes = require('../../src/routes/admin');

const SEED = fs.readFileSync(path.join(__dirname, '../../prisma/seed_sitio.sql'), 'utf8');
const CAMPOS = ['legalDomicilio', 'legalCorreo', 'legalMarca', 'legalRazonSocial', 'legalRuc'];
const valido = {
  legalMarca: 'Ing. Miguel F. Gargurevich', legalRazonSocial: 'GARGUREVICH EJEMPLO MIGUEL',
  legalRuc: '10409241862', legalDomicilio: 'Av. Las Gaviotas 2121, Santiago de Surco, Lima, Perú', legalCorreo: 'hola@facturo.pe',
};

let servidor; let base; let tokens;
const crearUsuario = async (role) => {
  const u = await prisma.userProfile.create({ data: { email: `${role}-${Date.now()}-${Math.random()}@test.pe`, role } });
  return generateAccessToken(u);
};

test.before(async () => {
  await limpiar();
  tokens = { SUPER_ADMIN: await crearUsuario('SUPER_ADMIN'), ADMIN: await crearUsuario('ADMIN'), USER: await crearUsuario('USER') };
  const app = express();
  app.use(express.json());
  app.use('/api/sitio', sitioRoutes);
  app.use('/api/admin', authenticateToken, adminRoutes);
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => { servidor.close(); await prisma.$disconnect(); });
test.beforeEach(async () => { await prisma.configuracionSitio.deleteMany(); });

const pedir = async (metodo, ruta, { token, cuerpo } = {}) => {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, texto, json: texto ? JSON.parse(texto) : null };
};

test('GET público sin sesión: sin fila devuelve los 5 campos en null', async () => {
  const r = await pedir('GET', '/api/sitio/legal');
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json).sort(), [...CAMPOS].sort());
  for (const c of CAMPOS) assert.equal(r.json[c], null);
});

test('GET público devuelve solo los 5 campos, sin id ni fechas', async () => {
  await prisma.configuracionSitio.create({ data: { id: 'global', ...valido } });
  const r = await pedir('GET', '/api/sitio/legal');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, valido);
  assert.doesNotMatch(r.texto, /updatedAt|"id"/);
});

test('PUT de SUPER_ADMIN guarda y normaliza (recorta espacios, vacío pasa a null)', async () => {
  const cuerpo = { ...valido, legalMarca: '  Ing. Miguel F. Gargurevich  ', legalRazonSocial: '   ', legalCorreo: '' };
  const r = await pedir('PUT', '/api/admin/sitio/legal', { token: tokens.SUPER_ADMIN, cuerpo });
  assert.equal(r.status, 200);
  assert.equal(r.json.legalMarca, 'Ing. Miguel F. Gargurevich');
  assert.equal(r.json.legalRazonSocial, null);
  assert.equal(r.json.legalCorreo, null);
  const fila = await prisma.configuracionSitio.findUnique({ where: { id: 'global' } });
  assert.equal(fila.legalRuc, '10409241862');
  assert.equal(fila.legalRazonSocial, null);
  // y la lectura pública ve lo guardado
  assert.deepEqual((await pedir('GET', '/api/sitio/legal')).json, r.json);
  // una segunda edición actualiza la misma fila (una sola fila)
  await pedir('PUT', '/api/admin/sitio/legal', { token: tokens.SUPER_ADMIN, cuerpo: { ...valido } });
  assert.equal(await prisma.configuracionSitio.count(), 1);
});

test('PUT con RUC inválido → 400 en español y no guarda nada', async () => {
  for (const legalRuc of ['10409241863', '1040924186', '20abc241862', '104092418620']) {
    const r = await pedir('PUT', '/api/admin/sitio/legal', { token: tokens.SUPER_ADMIN, cuerpo: { ...valido, legalRuc } });
    assert.equal(r.status, 400, legalRuc);
    assert.match(r.json.error, /RUC/);
  }
  assert.equal(await prisma.configuracionSitio.count(), 0);
});

test('PUT con correo mal formado, texto muy largo o tipo equivocado → 400', async () => {
  const mal = [
    { ...valido, legalCorreo: 'no-es-un-correo' },
    { ...valido, legalDomicilio: 'x'.repeat(201) },
    { ...valido, legalMarca: 123 },
  ];
  for (const cuerpo of mal) {
    const r = await pedir('PUT', '/api/admin/sitio/legal', { token: tokens.SUPER_ADMIN, cuerpo });
    assert.equal(r.status, 400);
    assert.match(r.json.error, /[a-záéíóú]/i);
  }
  assert.equal(await prisma.configuracionSitio.count(), 0);
});

test('PUT de ADMIN o USER → 403, y sin sesión → 401; no se guarda nada', async () => {
  for (const rol of ['ADMIN', 'USER']) {
    const r = await pedir('PUT', '/api/admin/sitio/legal', { token: tokens[rol], cuerpo: valido });
    assert.equal(r.status, 403, rol);
  }
  const sin = await pedir('PUT', '/api/admin/sitio/legal', { cuerpo: valido });
  assert.equal(sin.status, 401);
  assert.equal(await prisma.configuracionSitio.count(), 0);
});

test('la siembra crea la fila inicial con razón social y correo en null', async () => {
  await prisma.$executeRawUnsafe(SEED);
  const fila = await prisma.configuracionSitio.findUnique({ where: { id: 'global' } });
  assert.equal(fila.legalMarca, 'Ing. Miguel F. Gargurevich');
  assert.equal(fila.legalRuc, '10409241862');
  assert.equal(fila.legalDomicilio, 'Av. Las Gaviotas 2121, Santiago de Surco, Lima, Perú');
  assert.equal(fila.legalRazonSocial, null);
  assert.equal(fila.legalCorreo, null);
});

test('la siembra NO pisa una fila existente (y es idempotente)', async () => {
  await prisma.configuracionSitio.create({ data: { id: 'global', ...valido, legalMarca: 'Marca editada' } });
  await prisma.$executeRawUnsafe(SEED);
  await prisma.$executeRawUnsafe(SEED);
  const fila = await prisma.configuracionSitio.findUnique({ where: { id: 'global' } });
  assert.equal(fila.legalMarca, 'Marca editada');
  assert.equal(fila.legalRazonSocial, 'GARGUREVICH EJEMPLO MIGUEL');
  assert.equal(fila.legalCorreo, 'hola@facturo.pe');
  assert.equal(await prisma.configuracionSitio.count(), 1);
});
