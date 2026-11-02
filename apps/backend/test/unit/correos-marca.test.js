const test = require('node:test');
const assert = require('node:assert/strict');

// Sustituye Resend por un doble que guarda lo que se enviaría (no sale ningún correo).
const enviados = [];
const rutaResend = require.resolve('resend');
require.cache[rutaResend] = {
  id: rutaResend, filename: rutaResend, loaded: true,
  exports: {
    Resend: class {
      constructor() { this.emails = { send: async (datos) => { enviados.push(datos); return { id: 'prueba' }; } }; }
    },
  },
};
const correos = require('../../src/services/emailService');

const cliente = { nombre: 'CLIENTE SAC', tipoDocumento: 'RUC', documento: '20131312955', email: 'cliente@test.pe' };
const factura = {
  serie: 'F001', numero: 7, fechaEmision: new Date('2026-11-01T15:00:00Z'), fechaVencimiento: null,
  total: '118.00', moneda: 'PEN', cliente,
};
const proforma = {
  serie: 'P001', numero: 3, fechaEmision: new Date('2026-11-01T15:00:00Z'), fechaValidez: new Date('2026-12-01T15:00:00Z'),
  total: '118.00', cliente,
};
const empresa = (colorPrimario) => ({ nombre: 'Empresa Beta', ruc: '20000000001', email: 'hola@beta.pe', colorPrimario });

async function htmlDe(envio) {
  enviados.length = 0;
  await envio();
  assert.equal(enviados.length, 1, 'debía salir un correo');
  return enviados[0].html;
}

test('la factura creada usa el color de marca en la cabecera y el número', async () => {
  const html = await htmlDe(() => correos.sendInvoiceCreationEmail({ factura, empresa: empresa('#1e40af'), locale: 'es' }));
  assert.match(html, /\.header \{ background-color: #1E40AF;/);
  assert.match(html, /\.invoice-number \{[^}]*color: #1E40AF;/);
  assert.ok(!html.includes('#2563eb'), 'no debe quedar el azul fijo');
});

test('sin color propio la factura creada usa el berenjena de Facturo', async () => {
  const html = await htmlDe(() => correos.sendInvoiceCreationEmail({ factura, empresa: empresa(null), locale: 'es' }));
  assert.match(html, /\.header \{ background-color: #6B2C6E;/);
});

test('un amarillo se usa en su versión legible (botones y texto blanco sobre él)', async () => {
  const html = await htmlDe(() => correos.sendInvoiceCreationEmail({ factura, empresa: empresa('#FFFF00'), locale: 'es' }));
  assert.ok(!html.includes('background-color: #FFFF00'), 'el amarillo puro no debe ir de fondo con texto blanco');
  assert.match(html, /\.header \{ background-color: #7A7A00;/);
});

test('la proforma usa el color de marca en el borde, el título, el número y el total', async () => {
  const html = await htmlDe(() => correos.sendProformaEmail({ to: 'c@x.pe', subject: 's', message: 'Hola', proforma, empresa: empresa('#1E40AF'), locale: 'es' }));
  assert.match(html, /border-left: 4px solid #1E40AF;/);
  assert.match(html, /\.header h1 \{ margin: 0; color: #1E40AF;/);
  assert.match(html, /\.proforma-number \{[^}]*color: #1E40AF;/);
  assert.match(html, /\.total \{[^}]*color: #1E40AF;/);
  assert.match(html, /background-color: #[0-9A-F]{6}; padding: 20px;/); // tinte del color, no el celeste fijo
  assert.ok(!html.includes('#0284c7') && !html.includes('#0369a1') && !html.includes('#e0f2fe'));
});

test('la confirmación de firma usa el color de marca en el botón', async () => {
  const documento = { serie: 'P001', numero: 3, empresa: empresa('#1E40AF') };
  enviados.length = 0;
  await correos.sendSignatureConfirmationEmail({
    signerEmail: 'firma@x.pe', signerName: 'Firmante', document: documento, empresa: empresa('#1E40AF'),
    signedPdfUrl: 'https://x.pe/doc.pdf', signedAt: new Date('2026-11-01T15:00:00Z'),
  });
  // La confirmación sale a más de un destinatario (firmante y empresa): todos con el color de marca.
  assert.ok(enviados.length >= 1);
  assert.ok(enviados.some((m) => /background: #1E40AF;/.test(m.html)), 'el botón debe llevar el color de marca');
  for (const m of enviados) assert.ok(!m.html.includes('#2563eb'), 'no debe quedar el azul fijo');
});
