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
