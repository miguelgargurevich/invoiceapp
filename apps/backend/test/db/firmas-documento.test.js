// Firma digital: una solicitud de firma guarda su documento en su propia columna (facturaId o proformaId),
// y la página pública devuelve ese mismo documento. Antes, documentId tenía dos relaciones (factura y proforma)
// y ningún INSERT pasaba: Postgres exigía que el id existiera a la vez en facturas y en proformas.
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { prisma, limpiar, crearEmpresaPeru, crearAceptado } = require('./ayuda');
const { sembrarPlanesPe } = require('./planes-ayuda');
const signaturesRouter = require('../../src/routes/signatures');
const signaturesPublicRouter = require('../../src/routes/signaturesPublic');

let ctx; let planes; let servidor; let base;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/signatures/public', signaturesPublicRouter);
  app.use('/api/signatures', (req, _res, next) => { req.user = { id: ctx.user.id }; next(); }, signaturesRouter);
  await new Promise((r) => { servidor = app.listen(0, r); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.beforeEach(async () => {
  await limpiar();
  planes = await sembrarPlanesPe();
  ctx = await crearEmpresaPeru();
  // pe-negocio incluye firma digital (has_digital_signatures = true).
  await prisma.subscription.create({ data: { empresaId: ctx.empresa.id, planId: planes['pe-negocio'].id, status: 'ACTIVE' } });
});
test.after(async () => { servidor.close(); await prisma.$disconnect(); });

const pedirFirma = (body) => fetch(`${base}/api/signatures/request`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ signerEmail: 'firma@test.pe', sendEmail: false, ...body }),
});
const validar = async (token) => {
  const r = await fetch(`${base}/api/signatures/public/validate/${token}`);
  return { status: r.status, json: await r.json() };
};

test('solicitud de firma de una factura: queda ligada a facturaId y no a proformaId', async () => {
  const factura = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 501 });
  const r = await pedirFirma({ documentType: 'INVOICE', documentId: factura.id });
  assert.equal(r.status, 200, await r.clone().text());
  const { id, token } = await r.json();

  const fila = await prisma.signatureRequest.findUnique({ where: { id } });
  assert.equal(fila.documentType, 'INVOICE');
  assert.equal(fila.documentId, factura.id);
  assert.equal(fila.facturaId, factura.id);
  assert.equal(fila.proformaId, null);

  const publica = await validar(token);
  assert.equal(publica.status, 200);
  assert.equal(publica.json.factura.id, factura.id);
  assert.equal(publica.json.proforma, null);
});

test('solicitud de firma de una proforma: queda ligada a proformaId y no a facturaId', async () => {
  const proforma = await prisma.proforma.create({
    data: {
      empresaId: ctx.empresa.id, clienteId: ctx.cliente.id, serie: 'P001', numero: 9, fechaEmision: new Date(),
      subtotal: 100, igv: 18, total: 118, userId: ctx.user.id,
    },
  });
  const r = await pedirFirma({ documentType: 'PROFORMA', documentId: proforma.id });
  assert.equal(r.status, 200, await r.clone().text());
  const { id, token } = await r.json();

  const fila = await prisma.signatureRequest.findUnique({ where: { id } });
  assert.equal(fila.documentType, 'PROFORMA');
  assert.equal(fila.documentId, proforma.id);
  assert.equal(fila.proformaId, proforma.id);
  assert.equal(fila.facturaId, null);

  const publica = await validar(token);
  assert.equal(publica.status, 200);
  assert.equal(publica.json.proforma.id, proforma.id);
  assert.equal(publica.json.factura, null);
});

test('dos solicitudes sobre documentos distintos no chocan entre sí', async () => {
  const factura = await crearAceptado({ empresa: ctx.empresa, cliente: ctx.cliente, numero: 502 });
  const proforma = await prisma.proforma.create({
    data: {
      empresaId: ctx.empresa.id, clienteId: ctx.cliente.id, serie: 'P001', numero: 10, fechaEmision: new Date(),
      subtotal: 100, igv: 18, total: 118, userId: ctx.user.id,
    },
  });
  assert.equal((await pedirFirma({ documentType: 'INVOICE', documentId: factura.id })).status, 200);
  assert.equal((await pedirFirma({ documentType: 'PROFORMA', documentId: proforma.id })).status, 200);
  assert.equal(await prisma.signatureRequest.count({ where: { empresaId: ctx.empresa.id } }), 2);
});
