// Marca de agua «DEMOSTRACIÓN» del PDF de comprobantes: solo con MODO_DEMO, en diagonal, gris claro y detrás del contenido.
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { generarPdf } = require('../../../src/sunat/pdf/representacion');

// Contenido de cada página: pdf-lib escribe los streams comprimidos; los textos de las fuentes estándar van en hexadecimal (<..> Tj).
function paginas(pdf) {
  const s = pdf.toString('latin1');
  const re = /stream\r?\n/g;
  const streams = [];
  let m;
  while ((m = re.exec(s))) {
    const ini = m.index + m[0].length;
    const fin = s.indexOf('endstream', ini);
    try { streams.push(zlib.inflateSync(Buffer.from(s.slice(ini, fin), 'latin1')).toString('latin1')); } catch { /* imagen u otro stream */ }
  }
  return streams.filter((x) => /Tj/.test(x));
}
const textos = (contenido) => [...contenido.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map(([, h]) => Buffer.from(h, 'hex').toString('latin1'));

const factura = (lineas = 3) => ({
  tipoComprobante: '03', serie: 'B001', numero: 7, fechaEmision: new Date('2026-11-01T15:00:00Z'), moneda: 'PEN',
  formaPago: 'Contado', igv: '18.00', total: '118.00', subtotal: '100.00', totalGravadas: '100.00', totalExoneradas: '0',
  totalInafectas: '0', totalExportacion: '0', totalIcbper: '0', hashSunat: 'abc123=', montoEnLetras: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES',
  cuotas: [], empresa: { ruc: '20000000001', razonSocial: 'EMPRESA BETA SAC', emisorSunat: { direccionFiscal: 'AV. PRUEBA 123' } },
  cliente: { tipoDocumento: '1', numeroDocumento: '12345678', razonSocial: 'JUAN PEREZ' },
  detalles: Array.from({ length: lineas }, (_, i) => ({ orden: i, cantidad: '1', codigoUnidadSunat: 'NIU', descripcion: `Línea ${i}`, valorUnitario: '2.22', subtotal: '2.22' })),
});

test.afterEach(() => { delete process.env.MODO_DEMO; });

test('sin MODO_DEMO el PDF no lleva marca de agua', async () => {
  delete process.env.MODO_DEMO;
  const todo = paginas(await generarPdf(factura())).flatMap(textos).join('\n');
  assert.doesNotMatch(todo, /DEMOSTRACI/);
  assert.match(todo, /IMPORTE TOTAL/);
});

test('con MODO_DEMO el PDF lleva «DEMOSTRACIÓN» en diagonal, gris claro, y el contenido sigue completo', async () => {
  process.env.MODO_DEMO = 'si';
  const [pagina] = paginas(await generarPdf(factura()));
  const t = textos(pagina);
  assert.ok(t.includes('DEMOSTRACI\xD3N'), `falta la marca: ${t.join('|')}`); // Ó en WinAnsi = 0xD3
  // diagonal: matriz de rotación de 45° (cos = sen ≈ 0,7071) justo antes de la marca
  const antesDeMarca = pagina.slice(0, pagina.indexOf(Buffer.from('DEMOSTRACI\xD3N', 'latin1').toString('hex').toUpperCase()));
  assert.match(antesDeMarca, /0\.7071\d* 0\.7071\d* -0\.7071\d* 0\.7071\d*/, 'la marca debe ir rotada 45°');
  // gris claro (no negro) justo antes de la marca
  assert.match(antesDeMarca, /0\.9 0\.9 0\.9 rg/);
  // el contenido sigue ahí
  for (const esperado of ['IMPORTE TOTAL', 'BOLETA DE VENTA ELECTR\xD3NICA', 'Cliente: JUAN PEREZ', 'Representaci\xF3n impresa de la boleta de venta electr\xF3nica']) {
    assert.ok(t.some((x) => x.includes(esperado)), `falta «${esperado}»`);
  }
});

test('la marca va DETRÁS del contenido (se dibuja primero) y en cada página', async () => {
  process.env.MODO_DEMO = 'si';
  const hojas = paginas(await generarPdf(factura(60)));
  assert.ok(hojas.length >= 2, 'el comprobante largo ocupa varias páginas');
  for (const [i, hoja] of hojas.entries()) {
    const t = textos(hoja);
    assert.equal(t[0], 'DEMOSTRACI\xD3N', `página ${i + 1}: la marca es lo primero que se dibuja`);
    assert.equal(t.filter((x) => x === 'DEMOSTRACI\xD3N').length, 1);
  }
});
