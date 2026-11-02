const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { generarPdf, textoQr } = require('../../../src/sunat/pdf/representacion');
const { colorParaTextoBlanco, hexARgb01 } = require('../../../src/planes/marca');

// Colores que pinta el PDF: pdf-lib escribe «r g b rg» (relleno) y «r g b RG» (trazo); el stream va comprimido.
function coloresDelPdf(pdf) {
  const s = pdf.toString('latin1');
  const re = /stream\r?\n/g;
  let texto = '';
  let m;
  while ((m = re.exec(s))) {
    const ini = m.index + m[0].length;
    const fin = s.indexOf('endstream', ini);
    try { texto += zlib.inflateSync(Buffer.from(s.slice(ini, fin), 'latin1')).toString('latin1'); } catch { /* no es un stream de contenido */ }
  }
  return [...texto.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (rg|RG)\n/g)]
    .map(([, r, g, b, op]) => ({ r: Number(r), g: Number(g), b: Number(b), op }));
}
const usa = (colores, hex, op = 'rg') => {
  const { r, g, b } = hexARgb01(hex);
  return colores.some((c) => c.op === op && Math.abs(c.r - r) < 1e-9 && Math.abs(c.g - g) < 1e-9 && Math.abs(c.b - b) < 1e-9);
};

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

test('con colorPrimario el PDF pinta el color de marca (borde, franja, tipo/número y la línea de la tabla)', async () => {
  const pdf = await generarPdf({ ...factura, empresa: { ...factura.empresa, colorPrimario: '#1E40AF' } });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  const colores = coloresDelPdf(pdf);
  assert.ok(usa(colores, '#1E40AF'), 'falta el color de marca en relleno');
  assert.ok(usa(colores, '#1E40AF', 'RG'), 'falta el color de marca en trazo (borde del recuadro)');
  assert.ok(usa(colores, '#FFFFFF'), 'la franja del RUC debe llevar texto blanco');
  assert.ok(usa(colores, '#000000'), 'el resto del documento sigue en negro');
});

test('sin colorPrimario el PDF usa el berenjena de Facturo', async () => {
  const colores = coloresDelPdf(await generarPdf(factura));
  assert.ok(usa(colores, '#6B2C6E'));
  assert.ok(usa(colores, '#6B2C6E', 'RG'));
});

test('un color claro (amarillo) se pinta en su versión legible, no tal cual', async () => {
  const colores = coloresDelPdf(await generarPdf({ ...factura, empresa: { ...factura.empresa, colorPrimario: '#FFFF00' } }));
  assert.ok(!usa(colores, '#FFFF00'), 'el amarillo puro no debe usarse como texto ni como trazo');
  assert.ok(usa(colores, colorParaTextoBlanco('#FFFF00')));
});
