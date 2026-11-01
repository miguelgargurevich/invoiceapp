const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularComprobante, ErrorCalculo } = require('../../../src/sunat/calculo/calcular');

const FECHA = new Date('2026-11-01T15:00:00Z');
const linea = (extra) => ({ descripcion: 'Servicio', cantidad: 1, precio: 100, ...extra });
const calcular = (extra) => calcularComprobante({ tasaIgv: 18, moneda: 'PEN', fechaEmision: FECHA, ...extra });

test('gravado con precio sin IGV', () => {
  const r = calcular({ lineas: [linea({ cantidad: 2, precio: 50 })] });
  assert.equal(r.lineas[0].valorUnitario, '50.0000000000');
  assert.equal(r.lineas[0].precioUnitario, '59.0000000000');
  assert.equal(r.totales.gravadas, '100.00');
  assert.equal(r.totales.igv, '18.00');
  assert.equal(r.totales.total, '118.00');
  assert.deepEqual(r.leyendas[0], { codigo: '1000', valor: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES' });
  assert.equal(r.formaPago, 'Contado');
});

test('precio con IGV se desagrega', () => {
  const r = calcular({ lineas: [linea({ precio: 118, precioIncluyeIgv: true })] });
  assert.equal(r.lineas[0].valorUnitario, '100.0000000000');
  assert.equal(r.totales.igv, '18.00');
  assert.equal(r.totales.total, '118.00');
});

test('el IGV total es la suma de los IGV redondeados por línea', () => {
  const r = calcular({ lineas: [linea({ precio: 0.1 }), linea({ precio: 0.1 }), linea({ precio: 0.1 })] });
  assert.equal(r.totales.igv, '0.06');
  assert.equal(r.totales.total, '0.36');
});

test('descuento por línea reduce el valor de venta', () => {
  const r = calcular({ lineas: [linea({ precio: 100, descuento: 10 })] });
  assert.equal(r.lineas[0].valorBruto, '100.00');
  assert.equal(r.lineas[0].valorVenta, '90.00');
  assert.equal(r.totales.descuento, '10.00');
  assert.equal(r.totales.total, '106.20');
});

test('mixto: gravado, exonerado e inafecto', () => {
  const r = calcular({ lineas: [linea(), linea({ precio: 50, afectacion: '20' }), linea({ precio: 30, afectacion: '30' })] });
  assert.equal(r.totales.gravadas, '100.00');
  assert.equal(r.totales.exoneradas, '50.00');
  assert.equal(r.totales.inafectas, '30.00');
  assert.equal(r.totales.igv, '18.00');
  assert.equal(r.totales.total, '198.00');
});

test('exportación: todo en afectación 40, sin IGV', () => {
  const r = calcular({ tipoOperacion: '0200', moneda: 'USD', lineas: [linea({ precio: 1000, afectacion: '40' })] });
  assert.equal(r.totales.exportacion, '1000.00');
  assert.equal(r.totales.igv, '0.00');
  assert.match(r.leyendas[0].valor, /DÓLARES AMERICANOS$/);
  assert.throws(() => calcular({ tipoOperacion: '0200', lineas: [linea()] }), ErrorCalculo);
  assert.throws(() => calcular({ lineas: [linea({ afectacion: '40' })] }), /exportación/);
});

test('detracción 037 al 12 % redondeada a soles', () => {
  const r = calcular({ tipoOperacion: '1001', detraccion: { codigo: '037' }, lineas: [linea({ precio: 1000 })] });
  assert.equal(r.totales.total, '1180.00');
  assert.deepEqual(r.detraccion, { codigo: '037', porcentaje: '12', monto: '142.00', montoMoneda: '142.00' });
  assert.equal(r.netoPendiente, '1038.00');
  assert.equal(r.leyendas[1].codigo, '2006');
});

test('detracción: umbral y tipo de operación', () => {
  assert.throws(() => calcular({ tipoOperacion: '1001', detraccion: { codigo: '037' }, lineas: [linea({ precio: 500 })] }), /mayores a S\/ 700/);
  assert.throws(() => calcular({ detraccion: { codigo: '037' }, lineas: [linea({ precio: 1000 })] }), /1001/);
  assert.throws(() => calcular({ tipoOperacion: '1001', lineas: [linea({ precio: 1000 })] }), /código de bien o servicio/);
});

test('percepción régimen 51 al 2 %', () => {
  const r = calcular({ percepcion: { regimen: '51' }, lineas: [linea()] });
  assert.deepEqual(r.percepcion, { regimen: '51', porcentaje: '2', base: '118.00', monto: '2.36', total: '120.36' });
});

test('retención del 3 % solo sobre S/ 700', () => {
  const r = calcular({ retencion: true, lineas: [linea({ precio: 1000 })] });
  assert.deepEqual(r.retencion, { porcentaje: '3', base: '1180.00', monto: '35.40' });
  assert.equal(r.netoPendiente, '1144.60');
  assert.equal(calcular({ retencion: true, lineas: [linea()] }).retencion, null);
});

test('crédito: las cuotas deben sumar el neto pendiente', () => {
  const r = calcular({
    lineas: [linea()],
    formaPago: { tipo: 'Credito', cuotas: [{ monto: 59, fechaVencimiento: '2026-12-01' }, { monto: 59, fechaVencimiento: '2027-01-01' }] },
  });
  assert.equal(r.formaPago, 'Credito');
  assert.deepEqual(r.cuotas[1], { numero: 2, monto: '59.00', fechaVencimiento: '2027-01-01' });
  assert.throws(
    () => calcular({ lineas: [linea()], formaPago: { tipo: 'Credito', cuotas: [{ monto: 100, fechaVencimiento: '2026-12-01' }] } }),
    /suma de las cuotas \(100.00\).*\(118.00\)/,
  );
});

test('ICBPER por bolsa', () => {
  const r = calcular({ lineas: [linea({ descripcion: 'Bolsa', precio: 0.2, bolsasIcbper: 2 })] });
  assert.equal(r.lineas[0].icbper, '1.00');
  assert.equal(r.totales.icbper, '1.00');
  assert.equal(r.totales.totalImpuestos, '1.04');
  assert.equal(r.totales.total, '1.24');
});

test('errores de entrada', () => {
  assert.throws(() => calcular({ lineas: [] }), /al menos una línea/);
  assert.throws(() => calcular({ lineas: [linea({ cantidad: 0 })] }), /mayor que cero/);
  assert.throws(() => calcular({ lineas: [linea({ descuento: 200 })] }), /supera/);
  assert.throws(() => calcular({ lineas: [linea({ afectacion: '99' })] }), /no soportada/);
});

// Pruebas añadidas a las del plan: cubren bordes que las mutaciones dejaron sin cazar.
test('detracción y retención son excluyentes: con detracción no hay retención', () => {
  const r = calcular({
    tipoOperacion: '1001', retencion: true, detraccion: { codigo: '037' }, lineas: [linea({ precio: 1000 })],
  });
  assert.equal(r.retencion, null);
  assert.equal(r.netoPendiente, '1038.00');
});

test('detracción en dólares: monto en soles al tipo de cambio, montoMoneda en dólares', () => {
  const r = calcular({
    tipoOperacion: '1001', moneda: 'USD', tipoCambio: 3.75, detraccion: { codigo: '037' },
    lineas: [linea({ precio: 1000 })],
  });
  assert.equal(r.totales.total, '1180.00');
  assert.deepEqual(r.detraccion, { codigo: '037', porcentaje: '12', monto: '531.00', montoMoneda: '141.60' });
  assert.equal(r.netoPendiente, '1038.40');
});

test('umbral exacto de S/ 700: no hay detracción ni retención; un céntimo más sí', () => {
  // 593.22 + IGV = 700.00 exacto
  const exacto = [linea({ precio: 593.22 })];
  assert.equal(calcular({ lineas: exacto }).totales.total, '700.00');
  assert.throws(() => calcular({ tipoOperacion: '1001', detraccion: { codigo: '037' }, lineas: exacto }), /mayores a S\/ 700/);
  assert.equal(calcular({ retencion: true, lineas: exacto }).retencion, null);
  // 593.37 + IGV = 700.18
  const encima = [linea({ precio: 593.37 })];
  const d = calcular({ tipoOperacion: '1001', detraccion: { codigo: '037' }, lineas: encima });
  assert.equal(d.totales.total, '700.18');
  assert.equal(d.detraccion.monto, '84.00');
  assert.deepEqual(calcular({ retencion: true, lineas: encima }).retencion, { porcentaje: '3', base: '700.18', monto: '21.01' });
});

test('moneda extranjera: pide tipo de cambio y la percepción solo va en soles', () => {
  assert.throws(
    () => calcular({ tipoOperacion: '1001', moneda: 'USD', detraccion: { codigo: '037' }, lineas: [linea({ precio: 1000 })] }),
    /tipo de cambio/,
  );
  assert.throws(() => calcular({ moneda: 'USD', retencion: true, lineas: [linea({ precio: 1000 })] }), /tipo de cambio/);
  assert.throws(() => calcular({ moneda: 'USD', percepcion: { regimen: '51' }, lineas: [linea()] }), /en soles/);
  assert.throws(() => calcular({ percepcion: { regimen: '99' }, lineas: [linea()] }), /no soportado/);
});

test('forma de pago: cuota sin fecha, crédito sin cuotas y tipo inválido se rechazan', () => {
  const credito = (cuotas) => calcular({ lineas: [linea()], formaPago: { tipo: 'Credito', cuotas } });
  assert.throws(() => credito([{ monto: 118 }]), /no tiene fecha de vencimiento/);
  assert.throws(() => credito([]), /al menos una cuota/);
  assert.throws(() => calcular({ lineas: [linea()], formaPago: { tipo: 'Leasing' } }), /Contado o Credito/);
});

test('crédito con detracción: las cuotas suman el neto después de detraer', () => {
  const entrada = {
    tipoOperacion: '1001', detraccion: { codigo: '037' }, lineas: [linea({ precio: 1000 })],
  };
  const r = calcular({
    ...entrada, formaPago: { tipo: 'Credito', cuotas: [{ monto: 1038, fechaVencimiento: '2026-12-01' }] },
  });
  assert.equal(r.cuotas[0].monto, '1038.00');
  assert.throws(
    () => calcular({ ...entrada, formaPago: { tipo: 'Credito', cuotas: [{ monto: 1180, fechaVencimiento: '2026-12-01' }] } }),
    /\(1180.00\).*\(1038.00\)/,
  );
});

test('invariantes: el total de cada línea incluye ICBPER y los totales son la suma de las líneas', () => {
  const r = calcular({
    lineas: [
      linea({ descripcion: 'Bolsa', precio: 0.2, bolsasIcbper: 2 }),
      linea({ precio: 33.33, precioIncluyeIgv: true, descuento: 1.1 }),
      linea({ precio: 10, afectacion: '20', cantidad: 3 }),
    ],
  });
  assert.equal(r.lineas[0].total, '1.24');
  const suma = (campo) => r.lineas.reduce((acc, l) => acc + Math.round(Number(l[campo]) * 100), 0);
  assert.equal(Math.round(Number(r.totales.total) * 100), suma('total'));
  assert.equal(Math.round(Number(r.totales.igv) * 100), suma('igv'));
  assert.equal(Math.round(Number(r.totales.valorVenta) * 100), suma('valorVenta'));
  assert.equal(r.totales.descuento, '1.10');
});
