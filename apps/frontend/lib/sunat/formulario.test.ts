import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aPayload, camposVisibles, clientesPermitidos, codigoUnidad, diferenciaCuotas, esRuc, formularioDesdeComprobante,
  formularioInicial, formularioParaNota, lineaVacia, listoParaVistaPrevia, payloadVistaPrevia, repartirCuotas,
  seriesDeTipo, sumarMeses, validarSerie, type FormularioComprobante,
} from './formulario.ts';
import type { Comprobante } from './tipos';

const base = (extra: Partial<FormularioComprobante> = {}): FormularioComprobante => ({
  ...formularioInicial('01'),
  serie: 'F001',
  clienteId: 'c1',
  lineas: [{ ...lineaVacia(), descripcion: 'Servicio', cantidad: '2', precio: '59', precioIncluyeIgv: true }],
  ...extra,
});

test('factura al contado', () => {
  const p = aPayload(base());
  assert.deepEqual(p, {
    tipoComprobante: '01', serie: 'F001', clienteId: 'c1', tipoOperacion: '0101', moneda: 'PEN',
    lineas: [{ descripcion: 'Servicio', cantidad: 2, unidad: 'NIU', precio: 59, precioIncluyeIgv: true, descuento: 0, afectacion: '10', bolsasIcbper: 0 }],
    formaPago: { tipo: 'Contado' },
  });
});

test('crédito con cuotas y tipo de cambio solo fuera de PEN', () => {
  const p = aPayload(base({
    moneda: 'USD', tipoCambio: '3.75', formaPago: 'Credito',
    cuotas: [{ clave: 'a', monto: '59.00', fechaVencimiento: '2026-12-01' }, { clave: 'b', monto: '59,00', fechaVencimiento: '2027-01-01' }],
  }));
  assert.equal(p.tipoCambio, 3.75);
  assert.deepEqual(p.formaPago, { tipo: 'Credito', cuotas: [{ monto: 59, fechaVencimiento: '2026-12-01' }, { monto: 59, fechaVencimiento: '2027-01-01' }] });
  assert.equal(aPayload(base({ tipoCambio: '3.75' })).tipoCambio, undefined);
});

test('detracción solo con operación 1001; percepción si se elige', () => {
  assert.deepEqual(aPayload(base({ tipoOperacion: '1001', detraccionCodigo: '037' })).detraccion, { codigo: '037' });
  assert.equal(aPayload(base({ tipoOperacion: '0101', detraccionCodigo: '037' })).detraccion, undefined);
  assert.deepEqual(aPayload(base({ percepcionRegimen: '51' })).percepcion, { regimen: '51' });
});

test('exportación fuerza afectación 40', () => {
  assert.equal(aPayload(base({ tipoOperacion: '0200' })).lineas[0].afectacion, '40');
});

test('producto y código solo si existen; observaciones recortadas', () => {
  const p = aPayload(base({
    observaciones: '  nota  ',
    lineas: [{ ...lineaVacia(), productoId: 'p1', codigoProducto: ' P-01 ', descripcion: ' Caja ', cantidad: '1', precio: '10', descuento: '', bolsasIcbper: '2' }],
  }));
  assert.equal(p.observaciones, 'nota');
  assert.deepEqual(p.lineas[0], { productoId: 'p1', codigoProducto: 'P-01', descripcion: 'Caja', cantidad: 1, unidad: 'NIU', precio: 10, precioIncluyeIgv: true, descuento: 0, afectacion: '10', bolsasIcbper: 2 });
});

test('nota de crédito: documento afectado, contado y sin detracción ni percepción', () => {
  const p = aPayload(base({
    tipoComprobante: '07', serie: 'FC01', tipoOperacion: '1001', detraccionCodigo: '037', percepcionRegimen: '51',
    formaPago: 'Credito', cuotas: [{ clave: 'a', monto: '1', fechaVencimiento: '2026-12-01' }],
    documentoAfectadoId: 'f1', motivoCodigo: '01', motivoDescripcion: '',
  }));
  assert.equal(p.tipoOperacion, '0101');
  assert.deepEqual(p.formaPago, { tipo: 'Contado' });
  assert.equal(p.detraccion, undefined);
  assert.equal(p.percepcion, undefined);
  assert.deepEqual(p.documentoAfectado, { facturaId: 'f1', motivoCodigo: '01' });
});

test('nota de débito: mismas reglas y la exportación se conserva con afectación 40', () => {
  const p = aPayload(base({
    tipoComprobante: '08', serie: 'BD01', tipoOperacion: '0200', detraccionCodigo: '037', percepcionRegimen: '51',
    formaPago: 'Credito', cuotas: [{ clave: 'a', monto: '1', fechaVencimiento: '2026-12-01' }],
    documentoAfectadoId: 'f1', motivoCodigo: '02', motivoDescripcion: ' intereses ',
  }));
  assert.equal(p.tipoOperacion, '0200');
  assert.equal(p.lineas[0].afectacion, '40');
  assert.deepEqual(p.formaPago, { tipo: 'Contado' });
  assert.equal(p.detraccion, undefined);
  assert.equal(p.percepcion, undefined);
  assert.deepEqual(p.documentoAfectado, { facturaId: 'f1', motivoCodigo: '02', motivoDescripcion: 'intereses' });
});

test('la serie viaja en mayúsculas y sin espacios (el backend exige ^[FB][A-Z0-9]{3}$)', () => {
  assert.equal(aPayload(base({ tipoComprobante: '03', serie: 'b001' })).serie, 'B001');
  assert.equal(aPayload(base({ serie: ' f001 ' })).serie, 'F001');
});

test('la vista previa siempre se pide al contado (el neto no depende de las cuotas)', () => {
  assert.deepEqual(payloadVistaPrevia(base({ formaPago: 'Credito', cuotas: [] })).formaPago, { tipo: 'Contado' });
});

test('listoParaVistaPrevia', () => {
  assert.equal(listoParaVistaPrevia(base()), true);
  assert.equal(listoParaVistaPrevia(base({ clienteId: '' })), false);
  assert.equal(listoParaVistaPrevia(base({ lineas: [{ ...lineaVacia(), descripcion: '', precio: '1' }] })), false);
  assert.equal(listoParaVistaPrevia(base({ lineas: [{ ...lineaVacia(), descripcion: 'x', precio: '' }] })), false);
  assert.equal(listoParaVistaPrevia(base({ tipoComprobante: '07', documentoAfectadoId: 'f1', motivoCodigo: '' })), false);
});

test('repartirCuotas suma exacto al céntimo y fechas mensuales', () => {
  const cuotas = repartirCuotas('100.00', 3, '2026-12-31');
  assert.deepEqual(cuotas.map((c) => c.monto), ['33.33', '33.33', '33.34']);
  assert.deepEqual(cuotas.map((c) => c.fechaVencimiento), ['2026-12-31', '2027-01-31', '2027-02-28']);
  assert.deepEqual(repartirCuotas('1038.00', 2, '2026-12-15').map((c) => c.monto), ['519.00', '519.00']);
  assert.deepEqual(repartirCuotas('0', 2, '2026-12-15'), []);
  assert.equal(new Set(cuotas.map((c) => c.clave)).size, 3);
});

test('repartirCuotas trabaja en céntimos enteros: el residuo va a la última cuota y nunca se pierde un céntimo', () => {
  assert.deepEqual(repartirCuotas('0.10', 3, '2026-12-15').map((c) => c.monto), ['0.03', '0.03', '0.04']);
  assert.deepEqual(repartirCuotas('19.99', 7, '2026-12-15').map((c) => c.monto), ['2.85', '2.85', '2.85', '2.85', '2.85', '2.85', '2.89']);
  assert.deepEqual(repartirCuotas('1,50', 2, '2026-12-15').map((c) => c.monto), ['0.75', '0.75']);
  for (let centimos = 1; centimos <= 3000; centimos += 7) {
    const neto = `${Math.floor(centimos / 100)}.${String(centimos % 100).padStart(2, '0')}`;
    for (const n of [1, 2, 3, 6, 7, 12]) {
      const cuotas = repartirCuotas(neto, n, '2026-12-15');
      assert.equal(cuotas.length, n);
      assert.equal(diferenciaCuotas(cuotas, neto), '0.00', `${neto} en ${n} cuotas`);
      const montos = cuotas.map((c) => Number(c.monto));
      assert.ok(montos.slice(0, -1).every((m) => m === montos[0]), `${neto} en ${n}: las primeras cuotas son iguales`);
      assert.ok(montos[n - 1] >= montos[0], `${neto} en ${n}: el residuo va a la última`);
    }
  }
});

test('sumarMeses respeta el último día del mes', () => {
  assert.equal(sumarMeses('2027-01-31', 1), '2027-02-28');
  assert.equal(sumarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(sumarMeses('2026-11-15', 0), '2026-11-15');
  assert.equal(sumarMeses('2026-12-31', 2), '2027-02-28');
});

test('sumarMeses y repartirCuotas no revientan con una fecha vacía o inválida', () => {
  assert.equal(sumarMeses('', 1), '');
  assert.equal(sumarMeses('no-es-fecha', 1), '');
  assert.deepEqual(repartirCuotas('100.00', 2, '').map((c) => c.fechaVencimiento), ['', '']);
});

test('diferenciaCuotas: positivo falta, negativo sobra', () => {
  const c = (monto: string) => ({ clave: monto, monto, fechaVencimiento: '2026-12-01' });
  assert.equal(diferenciaCuotas([c('50.00')], '118.00'), '68.00');
  assert.equal(diferenciaCuotas([c('59.00'), c('59.00')], '118.00'), '0.00');
  assert.equal(diferenciaCuotas([c('120.50')], '118.00'), '-2.50');
});

test('diferenciaCuotas no arrastra errores de coma flotante (0.10 + 0.20 contra 0.30)', () => {
  const c = (monto: string) => ({ clave: monto, monto, fechaVencimiento: '2026-12-01' });
  assert.equal(diferenciaCuotas([c('0.10'), c('0.20')], '0.30'), '0.00');
  assert.equal(diferenciaCuotas([c('0,10'), c('0.20')], '0.30'), '0.00');
  assert.equal(diferenciaCuotas([c('1.15'), c('2.30'), c('0.05')], '3.50'), '0.00');
  assert.equal(diferenciaCuotas([c('0.10'), c('x')], '0.30'), '0.20');
});

test('camposVisibles', () => {
  assert.deepEqual(camposVisibles(base(), null), { operacion: true, detraccion: false, percepcion: false, formaPago: true, cuotas: false, tipoCambio: false, documentoAfectado: false });
  assert.equal(camposVisibles(base({ tipoOperacion: '1001' }), null).detraccion, true);
  assert.equal(camposVisibles(base(), { esAgentePercepcion: true }).percepcion, true);
  assert.equal(camposVisibles(base({ formaPago: 'Credito' }), null).cuotas, true);
  assert.equal(camposVisibles(base({ moneda: 'USD' }), null).tipoCambio, true);
  const nota = camposVisibles(base({ tipoComprobante: '07', tipoOperacion: '1001', formaPago: 'Credito' }), { esAgentePercepcion: true });
  assert.deepEqual(nota, { operacion: false, detraccion: false, percepcion: false, formaPago: false, cuotas: false, tipoCambio: false, documentoAfectado: true });
});

test('validarSerie', () => {
  assert.equal(validarSerie('01', 'F002'), null);
  assert.equal(validarSerie('01', 'B002'), 'F');
  assert.equal(validarSerie('03', 'b001'), null);
  assert.equal(validarSerie('07', 'BC01'), null);
  assert.equal(validarSerie('07', 'X001'), 'F o B');
  assert.equal(validarSerie('03', 'B01'), 'B');
});

test('esRuc, codigoUnidad, seriesDeTipo y clientesPermitidos', () => {
  assert.equal(esRuc('RUC'), true);
  assert.equal(esRuc('6'), true);
  assert.equal(esRuc('DNI'), false);
  assert.equal(codigoUnidad('UND'), 'NIU');
  assert.equal(codigoUnidad('serv'), 'ZZ');
  assert.equal(codigoUnidad('kgm'), 'KGM');
  assert.equal(codigoUnidad(''), 'NIU');
  const series = [
    { id: '1', tipoDocumento: '01', serie: 'F001', ultimoNumero: 0, activa: true },
    { id: '2', tipoDocumento: '03', serie: 'B001', ultimoNumero: 0, activa: true },
    { id: '3', tipoDocumento: '01', serie: 'F009', ultimoNumero: 0, activa: false },
  ];
  assert.deepEqual(seriesDeTipo(series, '01').map((s) => s.serie), ['F001']);
  const clientes = [
    { id: 'a', razonSocial: 'A', tipoDocumento: 'RUC', numeroDocumento: '20100070970' },
    { id: 'b', razonSocial: 'B', tipoDocumento: 'DNI', numeroDocumento: '12345678' },
  ];
  assert.deepEqual(clientesPermitidos(clientes, base()).map((c) => c.id), ['a']);
  assert.deepEqual(clientesPermitidos(clientes, base({ tipoComprobante: '03' })).map((c) => c.id), ['a', 'b']);
  assert.deepEqual(clientesPermitidos(clientes, base({ tipoOperacion: '0200' })).map((c) => c.id), ['a', 'b']);
});

const comprobante = {
  id: 'f1', tipoComprobante: '01', serie: 'F001', numero: 3, tipoOperacion: '1001', moneda: 'PEN', tipoCambio: null,
  formaPago: 'Credito', observaciones: 'obs', clienteId: 'c1', detraccionCodigo: '037', percepcionRegimen: null,
  docRelacionadoId: null, motivoCodigo: null, motivoDescripcion: null,
  detalles: [
    { orden: 1, productoId: null, codigoProductoSunat: null, descripcion: 'B', cantidad: '1', codigoUnidadSunat: 'ZZ', precioUnitario: '10.0000', precioIncluyeIgv: false, descuento: '0', tipoAfectacionIgv: '10', cantidadBolsasIcbper: 0 },
    { orden: 0, productoId: 'p1', codigoProductoSunat: 'P1', descripcion: 'A', cantidad: '2', codigoUnidadSunat: 'NIU', precioUnitario: '59', precioIncluyeIgv: true, descuento: '1', tipoAfectacionIgv: '10', cantidadBolsasIcbper: 0 },
  ],
  cuotas: [{ numero: 1, monto: '1038', fechaVencimiento: '2026-12-15T17:00:00.000Z' }],
} as unknown as Comprobante;

test('formularioDesdeComprobante reconstruye el borrador ordenado', () => {
  const f = formularioDesdeComprobante(comprobante);
  assert.deepEqual(f.lineas.map((l) => l.descripcion), ['A', 'B']);
  assert.equal(f.lineas[0].precio, '59');
  assert.equal(f.lineas[0].productoId, 'p1');
  assert.deepEqual(f.cuotas.map((c) => [c.monto, c.fechaVencimiento]), [['1038', '2026-12-15']]);
  assert.equal(f.detraccionCodigo, '037');
  assert.equal(f.observaciones, 'obs');
});

test('formularioParaNota copia cliente y líneas y limpia lo que no aplica', () => {
  const f = formularioParaNota(comprobante, '07', '01');
  assert.equal(f.tipoComprobante, '07');
  assert.equal(f.serie, '');
  assert.equal(f.tipoOperacion, '0101');
  assert.equal(f.clienteId, 'c1');
  assert.equal(f.lineas.length, 2);
  assert.equal(f.detraccionCodigo, '');
  assert.equal(f.formaPago, 'Contado');
  assert.deepEqual(f.cuotas, []);
  assert.equal(f.documentoAfectadoId, 'f1');
  assert.equal(f.motivoCodigo, '01');
  assert.equal(formularioParaNota({ ...comprobante, tipoOperacion: '0200' } as Comprobante, '07').tipoOperacion, '0200');
});
