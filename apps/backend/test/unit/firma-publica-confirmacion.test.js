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
const { sendSignatureConfirmationEmail } = require('../../src/services/emailService');
const { datosConfirmacionFirma } = require('../../src/routes/signaturesPublic');

const empresa = { nombre: 'Empresa Beta', email: 'hola@beta.pe', logoUrl: null, colorPrimario: '#1e40af' };
const solicitud = (documentType) => ({
  signerEmail: 'cliente@test.pe',
  signerName: 'Ana Torres',
  documentType,
  factura: documentType === 'INVOICE' ? { serie: 'F001', numero: 7, total: '118.00', moneda: 'PEN' } : null,
  proforma: documentType === 'PROFORMA' ? { serie: 'P001', numero: 3, total: '118.00', moneda: 'PEN' } : null,
  empresa,
});
const firma = { signedAt: new Date('2026-11-02T20:00:00Z') };

test('la firma pública arma la confirmación de una proforma con su empresa', async () => {
  const datos = datosConfirmacionFirma(solicitud('PROFORMA'), firma);
  assert.equal(datos.signerEmail, 'cliente@test.pe');
  assert.equal(datos.document.serie, 'P001');
  assert.equal(datos.empresa, empresa);
  assert.equal(datos.signedAt, firma.signedAt);

  enviados.length = 0;
  await sendSignatureConfirmationEmail(datos);
  assert.equal(enviados.length, 2, 'firmante y dueño');
  assert.equal(enviados[0].to, 'cliente@test.pe');
  assert.equal(enviados[0].subject, 'Confirmación: firmaste la Proforma P001-3');
  assert.equal(enviados[1].to, 'hola@beta.pe');
  assert.match(enviados[0].html, /#1E40AF/);
});

test('con una factura usa la factura como documento', () => {
  const datos = datosConfirmacionFirma(solicitud('INVOICE'), firma);
  assert.equal(datos.document.serie, 'F001');
});
