// Con MODO_DEMO=si no sale ningún correo (aunque haya clave de Resend); sin él, todo sale como siempre.
const test = require('node:test');
const assert = require('node:assert/strict');

// Mismo doble de Resend que correos-firma.test.js: guarda lo que se enviaría.
const enviados = [];
const rutaResend = require.resolve('resend');
require.cache[rutaResend] = {
  id: rutaResend, filename: rutaResend, loaded: true,
  exports: {
    Resend: class {
      constructor() { this.emails = { send: async (datos) => { enviados.push(datos); return { data: { id: 'real' }, error: null }; } }; }
    },
  },
};
process.env.RESEND_API_KEY = 're_clave_real_de_mentira';
const correos = require('../../src/services/emailService');

const documento = { id: 'd1', serie: 'P001', numero: 3, total: '118.00', moneda: 'PEN', fechaEmision: new Date(), items: [] };
const empresa = { nombre: 'Empresa Beta', ruc: '20000000001', email: 'dueno@beta.example', colorPrimario: '#1e40af' };
const firma = { signerEmail: 'cliente@x.example', signerName: 'Ana', token: 'abc', document: documento, empresa, expiresAt: new Date('2026-12-01T15:00:00Z'), baseUrl: 'https://facturo.test' };
const factura = { ...documento, cliente: { razonSocial: 'Cliente', email: 'cliente@x.example' }, detalles: [] };

test.afterEach(() => { delete process.env.MODO_DEMO; enviados.length = 0; });

test('con MODO_DEMO, sendEmail no llama a Resend y responde como si hubiera salido', async () => {
  process.env.MODO_DEMO = 'si';
  const r = await correos.sendEmail({ to: 'a@b.example', subject: 'Hola', text: 'x' });
  assert.equal(enviados.length, 0);
  assert.ok(r && r.data && r.data.id, 'devuelve una respuesta con forma de Resend');
  assert.equal(r.error, null);
});

test('con MODO_DEMO, las solicitudes y confirmaciones de firma no envían nada (ni al firmante ni al dueño)', async () => {
  process.env.MODO_DEMO = 'si';
  const a = await correos.sendSignatureRequestEmail(firma);
  const b = await correos.sendSignatureConfirmationEmail({ ...firma, nombreFirmante: 'Ana', fechaFirmado: new Date(), urlPdf: 'https://x.example/p.pdf' });
  assert.equal(enviados.length, 0);
  assert.ok(a && b);
});

const intentos = [
  () => correos.sendInvoiceEmail({ to: 'c@x.example', subject: 'F', message: 'm', factura, empresa }),
  () => correos.sendProformaEmail({ to: 'c@x.example', subject: 'P', message: 'm', proforma: factura, empresa }),
  () => correos.sendInvoiceCreationEmail({ factura, empresa }),
  () => correos.sendPaymentConfirmationEmail({ pago: { monto: 10, fechaPago: new Date(), metodoPago: 'x' }, factura, empresa }),
];

test('con MODO_DEMO, los correos de factura, proforma, creación y pago tampoco salen', async () => {
  process.env.MODO_DEMO = 'si';
  for (const intento of intentos) await intento();
  assert.equal(enviados.length, 0);
});

test('sin MODO_DEMO los correos salen por Resend como siempre', async () => {
  delete process.env.MODO_DEMO;
  await correos.sendEmail({ to: 'a@b.example', subject: 'Hola', text: 'x' });
  await correos.sendSignatureRequestEmail(firma);
  for (const intento of intentos) await intento(); // las mismas cuatro llamadas que arriba: sin demo SÍ salen
  assert.equal(enviados.length, 6);
  assert.equal(enviados[0].subject, 'Hola');
});
