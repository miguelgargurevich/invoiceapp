process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-prueba';
process.env.STORAGE_PROVIDER = 'local';
const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.LOCAL_UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'recibos-'));

const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const express = require('express');
const { generateAccessToken } = require('../../src/middleware/auth');
const jobReceiptsRouter = require('../../src/routes/jobReceipts');

let ctxA; let ctxB; let servidor; let base; let facturaB;

test.before(async () => {
  await limpiar();
  ctxA = await crearEmpresaPeru({ ruc: '20000000001' });
  ctxB = await crearEmpresaPeru({ ruc: '20000000002' });
  facturaB = await crearAceptado({ empresa: ctxB.empresa, cliente: ctxB.cliente });

  const app = express();
  app.use(express.json());
  app.use('/api/job-receipts', jobReceiptsRouter);
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(async () => { servidor.close(); await prisma.$disconnect(); });

const pedir = async (metodo, ruta, cuerpo, token) => {
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, json: texto ? JSON.parse(texto) : null };
};

const pedirConArchivo = async (ruta, campos, archivoBuffer, token) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.append(k, v);
  if (archivoBuffer) {
    // Crear un File con nombre y tipo MIME para que multer lo acepte
    const file = new File([archivoBuffer], 'recibo.png', { type: 'image/png' });
    form.append('file', file);
  }
  const r = await fetch(`${base}${ruta}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const texto = await r.text();
  return { status: r.status, json: texto ? JSON.parse(texto) : null };
};

test('POST /api/job-receipts sin archivo: empresa A no puede crear recibo en factura de B (404)', async () => {
  const r = await pedir('POST', '/api/job-receipts', {
    facturaId: facturaB.id,
    fecha: '2026-01-15',
    descripcion: 'Recibo de prueba',
    monto: '100.00',
  }, generateAccessToken(ctxA.user));
  assert.equal(r.status, 404, JSON.stringify(r.json));
});

test('POST /api/job-receipts sin archivo: empresa B puede crear recibo en su propia factura (201)', async () => {
  const r = await pedir('POST', '/api/job-receipts', {
    facturaId: facturaB.id,
    fecha: '2026-01-15',
    descripcion: 'Recibo de prueba',
    monto: '100.00',
  }, generateAccessToken(ctxB.user));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.ok(r.json.id);
  assert.equal(r.json.facturaId, facturaB.id);
});

test('POST /api/job-receipts con archivo: empresa A no puede subir archivo a factura de B (404)', async () => {
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const r = await pedirConArchivo('/api/job-receipts', {
    facturaId: facturaB.id,
    fecha: '2026-01-15',
    descripcion: 'Recibo con archivo',
    monto: '50.00',
  }, pngBuffer, generateAccessToken(ctxA.user));
  assert.equal(r.status, 404, JSON.stringify(r.json));
});

test('POST /api/job-receipts con archivo: empresa B puede subir archivo a su propia factura (201, fileUrl con su empresaId)', async () => {
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const r = await pedirConArchivo('/api/job-receipts', {
    facturaId: facturaB.id,
    fecha: '2026-01-16',
    descripcion: 'Recibo con archivo',
    monto: '50.00',
  }, pngBuffer, generateAccessToken(ctxB.user));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.ok(r.json.id);
  assert.ok(r.json.url);
  assert.ok(r.json.url.includes(ctxB.empresa.id), `fileUrl debe contener empresaId de B: ${r.json.url}`);
});