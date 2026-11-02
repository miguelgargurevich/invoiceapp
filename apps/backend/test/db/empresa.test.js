process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { prisma, limpiar } = require('./ayuda');
const { generateAccessToken } = require('../../src/middleware/auth');
const empresaRouter = require('../../src/routes/empresa');

let servidor; let base;

test.before(async () => {
  await limpiar();
  const app = express();
  app.use(express.json());
  app.use('/api/empresas', empresaRouter);
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => { servidor.close(); await prisma.$disconnect(); });

const usuario = (email) => prisma.userProfile.create({ data: { email } });
const guardar = async (user, cuerpo) => {
  const r = await fetch(`${base}/api/empresas/mi-empresa`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${generateAccessToken(user)}` },
    body: JSON.stringify(cuerpo),
  });
  return { status: r.status, json: await r.json() };
};

test('el asistente crea la empresa con el RUC escrito y setupCompleted', async () => {
  const u = await usuario('ruc-uno@test.pe');
  const r = await guardar(u, { nombre: 'Uno SAC', ruc: '20131312955', setupCompleted: true });
  assert.equal(r.status, 200);
  assert.equal(r.json.ruc, '20131312955');
  assert.equal(r.json.setupCompleted, true);
});

test('un RUC que ya usa otra empresa responde 409 sin detalles internos', async () => {
  const u = await usuario('ruc-dos@test.pe');
  const r = await guardar(u, { nombre: 'Dos SAC', ruc: '20131312955', setupCompleted: true });
  assert.equal(r.status, 409);
  assert.equal(r.json.error, 'Ese RUC ya está registrado en otra empresa');
  assert.equal(await prisma.empresa.count({ where: { userId: u.id } }), 0);
});

test('sin RUC queda uno provisional TEMP-', async () => {
  const u = await usuario('ruc-tres@test.pe');
  const r = await guardar(u, { nombre: 'Tres SAC', setupCompleted: true });
  assert.equal(r.status, 200);
  assert.match(r.json.ruc, /^TEMP-/);
});

test('guardar solo algunos campos no pisa el resto (setup, moneda, IGV, idioma)', async () => {
  const u = await usuario('parcial@test.pe');
  const creada = await guardar(u, { nombre: 'Parcial SAC', ruc: '20100047218', currency: 'PEN', locale: 'es', taxRate: 18, taxName: 'IGV', setupCompleted: true });
  assert.equal(creada.status, 200);
  // Configuración › Empresa manda solo datos de contacto
  const r = await guardar(u, { nombre: 'Parcial SAC', direccion: 'Av. Nueva 123', telefono: '+51 999 999 999' });
  assert.equal(r.status, 200);
  assert.equal(r.json.direccion, 'Av. Nueva 123');
  assert.equal(r.json.setupCompleted, true);
  assert.equal(r.json.currency, 'PEN');
  assert.equal(r.json.locale, 'es');
  assert.equal(Number(r.json.taxRate), 18);
  assert.equal(r.json.taxName, 'IGV');
  assert.equal(r.json.ruc, '20100047218');
});

test('una empresa nueva sin datos de impuesto arranca con los de Perú', async () => {
  const u = await usuario('nueva-pe@test.pe');
  const r = await guardar(u, { nombre: 'Nueva SAC' });
  assert.equal(r.status, 200);
  assert.equal(r.json.currency, 'PEN');
  assert.equal(Number(r.json.taxRate), 18);
  assert.equal(r.json.taxName, 'IGV');
  assert.equal(r.json.pais, 'PE');
  assert.equal(r.json.setupCompleted, false);
});
