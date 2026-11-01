const test = require('node:test');
const assert = require('node:assert/strict');
const { validarParaEmision } = require('../../../src/sunat/emision/validacion');

const AHORA = new Date('2026-11-01T15:00:00Z');
const emisor = (extra = {}) => ({ solUsuario: 'MODDATOS', solClaveCifrada: 'x', certificadoCifrado: 'x', certificadoVence: new Date('2030-01-01'), cuentaDetracciones: '00-1', ...extra });
const factura = (extra = {}) => ({
  tipoComprobante: '01', serie: 'F001', tipoOperacion: '0101', total: '118.00', formaPago: 'Contado', cuotas: [],
  detalles: [{}], cliente: { tipoDocumento: '6', numeroDocumento: '20131312955' }, ...extra,
});

test('una factura correcta no tiene errores', () => {
  assert.deepEqual(validarParaEmision(factura(), emisor(), AHORA), []);
});

test('emisor sin configurar o con certificado vencido', () => {
  assert.match(validarParaEmision(factura(), null, AHORA)[0], /Configura los datos del emisor/);
  assert.match(validarParaEmision(factura(), emisor({ certificadoVence: new Date('2026-01-01') }), AHORA).join(), /vencido/);
  assert.match(validarParaEmision(factura(), emisor({ solUsuario: null }), AHORA).join(), /clave SOL/);
});

test('factura exige RUC válido y serie F', () => {
  assert.match(validarParaEmision(factura({ cliente: { tipoDocumento: '1', numeroDocumento: '12345678' } }), emisor(), AHORA).join(), /requiere que el cliente tenga RUC/);
  assert.match(validarParaEmision(factura({ cliente: { tipoDocumento: '6', numeroDocumento: '123' } }), emisor(), AHORA).join(), /RUC del cliente no es válido/);
  assert.match(validarParaEmision(factura({ serie: 'B001' }), emisor(), AHORA).join(), /empezar con F/);
});

test('exportación permite cliente sin documento peruano', () => {
  assert.deepEqual(validarParaEmision(factura({ tipoOperacion: '0200', cliente: { tipoDocumento: '0', numeroDocumento: 'US-123' } }), emisor(), AHORA), []);
});

test('boleta mayor al umbral exige identificar al cliente', () => {
  const boleta = (extra) => factura({ tipoComprobante: '03', serie: 'B001', cliente: { tipoDocumento: '0', numeroDocumento: null }, ...extra });
  assert.deepEqual(validarParaEmision(boleta({ total: '100.00' }), emisor(), AHORA), []);
  assert.match(validarParaEmision(boleta({ total: '800.00' }), emisor(), AHORA).join(), /mayor a S\/ 700/);
});

test('notas, crédito y detracción', () => {
  assert.match(validarParaEmision(factura({ tipoComprobante: '07', serie: 'FC01' }), emisor(), AHORA).join(), /comprobante que modifica/);
  assert.match(validarParaEmision(factura({ tipoComprobante: '07', serie: 'BC01', docRelacionadoId: 'x', docRelacionadoSerie: 'F001', motivoCodigo: '01' }), emisor(), AHORA).join(), /misma letra/);
  assert.match(validarParaEmision(factura({ formaPago: 'Credito' }), emisor(), AHORA).join(), /cuotas/);
  assert.match(validarParaEmision(factura({ tipoOperacion: '1001' }), emisor({ cuentaDetracciones: null }), AHORA).join(), /cuenta de detracciones/);
});
