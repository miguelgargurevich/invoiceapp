const test = require('node:test');
const assert = require('node:assert/strict');
const { generarPdf, textoQr } = require('../../../src/sunat/pdf/representacion');

const factura = {
  tipoComprobante: '01', serie: 'F001', numero: 7, fechaEmision: new Date('2026-11-01T15:00:00Z'), moneda: 'PEN',
  formaPago: 'Credito', igv: '18.00', total: '118.00', subtotal: '100.00', totalGravadas: '100.00', totalExoneradas: '0',
  totalInafectas: '0', totalExportacion: '0', totalIcbper: '0', hashSunat: 'abc123=', montoEnLetras: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES',
  detraccionCodigo: '037', detraccionMonto: '142.00', percepcionMonto: null, retencionMonto: null,
  cuotas: [{ numero: 1, monto: '118.00', fechaVencimiento: new Date('2026-12-15T17:00:00Z') }],
  empresa: { ruc: '20000000001', razonSocial: 'EMPRESA BETA SAC', emisorSunat: { direccionFiscal: 'AV. PRUEBA 123' } },
  cliente: { tipoDocumento: 'RUC', numeroDocumento: '20131312955', razonSocial: 'SUNAT' },
  detalles: Array.from({ length: 45 }, (_, i) => ({ orden: i, cantidad: '1', codigoUnidadSunat: 'NIU', descripcion: `Línea ${i} – ítem`, valorUnitario: '2.2222222222', subtotal: '2.22' })),
};

test('textoQr sigue el formato de SUNAT', () => {
  assert.equal(textoQr(factura), '20000000001|01|F001|7|18.00|118.00|2026-11-01|6|20131312955|abc123=|');
});

// 02:30 UTC del 2 ya es el 1 en Lima: el QR debe llevar la fecha de Lima, no la UTC.
test('la fecha del QR es la de Lima aunque en UTC ya sea otro día', () => {
  const qr = textoQr({ ...factura, fechaEmision: new Date('2026-11-02T02:30:00Z') });
  assert.equal(qr.split('|')[6], '2026-11-01');
});

test('genera un PDF de varias páginas sin romperse con caracteres especiales', async () => {
  const pdf = await generarPdf(factura);
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 2000);
});
