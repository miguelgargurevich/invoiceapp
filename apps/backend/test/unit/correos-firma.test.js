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

const documento = { serie: 'P001', numero: 3, total: '118.00', moneda: 'PEN' };
const empresa = { nombre: 'Empresa Beta', ruc: '20000000001', email: 'hola@beta.pe', colorPrimario: '#1e40af' };
const TERMINOS_EN = /Signature|Invoice|Proposal|ESIGN|UETA|Hello|U\.S\./;

test('la solicitud de firma sale en español, con el enlace /es/ y la fecha en español', async () => {
  enviados.length = 0;
  await correos.sendSignatureRequestEmail({
    signerEmail: 'cliente@x.pe', signerName: 'Ana Quispe', token: 'abc123', document: documento,
    empresa, expiresAt: new Date('2026-12-01T15:00:00Z'), baseUrl: 'https://facturo.test', locale: 'es',
  });
  assert.equal(enviados.length, 1);
  const { subject, html } = enviados[0];
  assert.equal(subject, 'Firma requerida: Proforma P001-3');
  assert.match(html, /Hola Ana Quispe,/);
  assert.ok(html.includes('https://facturo.test/es/sign/abc123'), 'el enlace debe ser /es/sign/<token>');
  assert.ok(html.includes('S/ 118.00'), 'el monto va en soles');
  assert.match(html, /1 de diciembre de 2026/);
  assert.doesNotMatch(html, TERMINOS_EN, 'no debe quedar inglés ni citas de leyes de EE. UU.');
});

test('la solicitud de firma de una factura dice Factura', async () => {
  enviados.length = 0;
  await correos.sendSignatureRequestEmail({
    signerEmail: 'cliente@x.pe', signerName: 'Ana', token: 't', document: { ...documento, serie: 'F001', numero: 7 },
    empresa, expiresAt: new Date('2026-12-01T15:00:00Z'), baseUrl: 'https://facturo.test', locale: 'es',
  });
  assert.equal(enviados[0].subject, 'Firma requerida: Factura F001-7');
});

test('sin nombre del cliente el saludo es solo «Hola,»', async () => {
  enviados.length = 0;
  await correos.sendSignatureRequestEmail({
    signerEmail: 'cliente@x.pe', signerName: '', token: 't', document: documento,
    empresa, expiresAt: new Date('2026-12-01T15:00:00Z'), baseUrl: 'https://facturo.test', locale: 'es',
  });
  assert.match(enviados[0].html, /<p class="greeting">Hola,<\/p>/);
});

test('sin locale, la solicitud de firma usa español por defecto', async () => {
  enviados.length = 0;
  await correos.sendSignatureRequestEmail({
    signerEmail: 'cliente@x.pe', signerName: 'Ana', token: 'abc123', document: documento,
    empresa, expiresAt: new Date('2026-12-01T15:00:00Z'), baseUrl: 'https://facturo.test',
  });
  assert.ok(enviados[0].html.includes('https://facturo.test/es/sign/abc123'));
  assert.equal(enviados[0].subject, 'Firma requerida: Proforma P001-3');
});

test('la confirmación sale al firmante y al dueño, ambos en español', async () => {
  enviados.length = 0;
  await correos.sendSignatureConfirmationEmail({
    signerEmail: 'firma@x.pe', signerName: 'Ana Quispe', document: documento, empresa,
    signedPdfUrl: 'https://x.pe/doc.pdf', signedAt: new Date('2026-11-01T15:00:00Z'),
  });
  assert.equal(enviados.length, 2, 'un correo al firmante y otro al dueño');
  const [alFirmante, alDueno] = enviados;

  assert.equal(alFirmante.to, 'firma@x.pe');
  assert.equal(alFirmante.subject, 'Confirmación: firmaste la Proforma P001-3');
  assert.match(alFirmante.html, /Hola Ana Quispe,/);

  assert.equal(alDueno.to, 'hola@beta.pe');
  assert.equal(alDueno.subject, 'Firmado: Proforma P001-3 por Ana Quispe');
  assert.match(alDueno.html, /<strong>Ana Quispe<\/strong> firmó la Proforma P001-3\./);
  assert.match(alDueno.html, /<p class="greeting">Hola,<\/p>/);

  for (const m of enviados) {
    assert.match(m.html, /noviembre de 2026/, 'la fecha de la firma sale en español');
    assert.doesNotMatch(m.html, TERMINOS_EN, 'no debe quedar inglés ni citas de leyes de EE. UU.');
  }
});

test('la cabecera de la confirmación usa el color de marca y no el verde', async () => {
  enviados.length = 0;
  await correos.sendSignatureConfirmationEmail({
    signerEmail: 'firma@x.pe', signerName: 'Ana', document: documento, empresa,
    signedPdfUrl: 'https://x.pe/doc.pdf', signedAt: new Date('2026-11-01T15:00:00Z'),
  });
  for (const m of enviados) {
    const cabecera = m.html.match(/\.header \{[^}]*\}/)[0];
    assert.match(cabecera, /background-color: #1E40AF;/);
    assert.doesNotMatch(cabecera, /#10b981|#059669/, 'la cabecera no debe llevar el degradado verde');
  }
});

test('el aviso al dueño nombra al firmante aunque no haya nombre en el correo del firmante', async () => {
  enviados.length = 0;
  await correos.sendSignatureConfirmationEmail({
    signerEmail: 'firma@x.pe', signerName: null, document: documento, empresa,
    signedPdfUrl: null, signedAt: new Date('2026-11-01T15:00:00Z'),
  });
  assert.equal(enviados[1].subject, 'Firmado: Proforma P001-3 por firma@x.pe');
  assert.doesNotMatch(enviados[0].html, /undefined/);
});

test('sin locale, la confirmación usa español por defecto', async () => {
  enviados.length = 0;
  await correos.sendSignatureConfirmationEmail({
    signerEmail: 'firma@x.pe', signerName: 'Ana', document: documento, empresa,
    signedPdfUrl: 'https://x.pe/doc.pdf', signedAt: new Date('2026-11-01T15:00:00Z'),
  });
  assert.equal(enviados[0].subject, 'Confirmación: firmaste la Proforma P001-3');
});
