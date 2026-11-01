const test = require('node:test');
const assert = require('node:assert/strict');
const { armarComprobante, armarEmisor, armarBaja, armarResumen, nombreBase } = require('../../../src/sunat/engine/mapper');

const empresa = { ruc: '20000000001', razonSocial: 'EMPRESA BETA SAC', nombre: 'Beta', nombreComercial: null, taxRate: 18 };
const factura = (extra = {}) => ({
  tipoComprobante: '01', serie: 'F001', numero: 7, fechaEmision: new Date('2026-11-01T15:00:00Z'), tipoOperacion: '0101',
  moneda: 'PEN', formaPago: 'Contado', subtotal: '100.00', igv: '18.00', total: '118.00', totalGravadas: '100.00',
  totalExoneradas: '0', totalInafectas: '0', totalExportacion: '0', totalIcbper: '0', netoPendiente: '118.00',
  montoEnLetras: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES', cuotas: [],
  cliente: { tipoDocumento: 'RUC', numeroDocumento: '20131312955', razonSocial: 'SUNAT', direccion: null },
  detalles: [{ orden: 0, descripcion: 'Servicio', cantidad: '2', codigoUnidadSunat: 'NIU', valorUnitario: '50', precioUnitarioIgv: '59',
    descuento: '0', subtotal: '100', igv: '18', icbper: '0', cantidadBolsasIcbper: 0, tipoAfectacionIgv: '10', codigoProductoSunat: null }],
  ...extra,
});

test('armarComprobante produce el contrato del engine', () => {
  const c = armarComprobante(factura(), { tasaIgv: 18, cuentaDetracciones: null });
  assert.equal(c.correlativo, '7');
  assert.equal(c.fechaEmision, '2026-11-01T10:00:00-05:00');
  assert.deepEqual(c.cliente, { tipoDoc: '6', numDoc: '20131312955', razonSocial: 'SUNAT', direccion: null });
  assert.equal(c.totales.totalImpuestos, '18.00');
  assert.equal(c.lineas[0].valorUnitario, '50.0000000000');
  assert.equal(c.lineas[0].porcentajeIgv, '18');
  assert.equal(c.lineas[0].valorBruto, '100.00');
  assert.deepEqual(c.formaPago, { tipo: 'Contado' });
  assert.equal(c.documentoAfectado, null);
});

test('línea exonerada no lleva porcentaje de IGV', () => {
  const linea = { ...factura().detalles[0], tipoAfectacionIgv: '20', igv: '0', icbper: '0' };
  const c = armarComprobante(factura({ detalles: [linea] }), { tasaIgv: 18 });
  assert.equal(c.lineas[0].afectacion, '20');
  assert.equal(c.lineas[0].porcentajeIgv, '0');
});

test('crédito, detracción, retención y nota', () => {
  const credito = armarComprobante(factura({
    formaPago: 'Credito', netoPendiente: '1038.00', detraccionCodigo: '037', detraccionPorcentaje: '12', detraccionMonto: '142',
    cuotas: [{ monto: '1038', fechaVencimiento: new Date('2026-12-15T17:00:00Z') }],
  }), { tasaIgv: 18, cuentaDetracciones: '00-000-000001' });
  assert.deepEqual(credito.formaPago, { tipo: 'Credito', monto: '1038.00', cuotas: [{ monto: '1038.00', fechaPago: '2026-12-15' }] });
  assert.deepEqual(credito.detraccion, { codigo: '037', porcentaje: '12', monto: '142.00', cuentaBanco: '00-000-000001', medioPago: '001' });
  assert.equal(credito.leyendas[1].codigo, '2006');

  const nota = armarComprobante(factura({ tipoComprobante: '07', serie: 'FC01', docRelacionadoTipo: '01', docRelacionadoSerie: 'F001',
    docRelacionadoNumero: 3, motivoCodigo: '01', motivoDescripcion: 'Anulación de la operación' }), { tasaIgv: 18 });
  assert.deepEqual(nota.documentoAfectado, { tipoDoc: '01', numero: 'F001-3', motivoCodigo: '01', motivoDescripcion: 'Anulación de la operación' });
  assert.equal(nota.formaPago, null);
});

test('armarEmisor descifra los secretos', () => {
  const descifrar = (t) => Buffer.from(t.replace('cifrado:', ''));
  const e = armarEmisor(empresa, {
    ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', urbanizacion: null, direccionFiscal: 'AV 1',
    codigoEstablecimiento: '0000', ambiente: 'BETA', solUsuario: 'MODDATOS', solClaveCifrada: 'cifrado:moddatos',
    certificadoCifrado: 'cifrado:PFX', certificadoClaveCifrada: 'cifrado:clave',
  }, descifrar);
  assert.equal(e.solClave, 'moddatos');
  assert.equal(e.certificadoPfxBase64, Buffer.from('PFX').toString('base64'));
  assert.equal(e.direccion.urbanizacion, '-');
  assert.equal(e.nombreComercial, 'Beta');
});

test('baja y resumen', () => {
  const datos = { correlativo: 2, fechaGeneracion: '2026-11-03', fechaReferencia: '2026-11-01', items: [{ factura: factura(), motivo: 'Error' }] };
  assert.deepEqual(armarBaja(datos), {
    correlativo: '2', fecGeneracion: '2026-11-01', fecComunicacion: '2026-11-03',
    detalles: [{ tipoDoc: '01', serie: 'F001', correlativo: '7', motivo: 'Error' }],
  });
  const resumen = armarResumen({ ...datos, items: [{ factura: factura({ tipoComprobante: '03', serie: 'B001' }) }] });
  assert.equal(resumen.fecResumen, '2026-11-03');
  assert.equal(resumen.detalles[0].serieNro, 'B001-7');
  assert.equal(resumen.detalles[0].estado, '3');
  assert.equal(nombreBase(empresa, factura()), '20000000001-01-F001-7');
});

test('armarResumen lleva el porcentaje de IGV de cada detalle', () => {
  const r = armarResumen({ correlativo: 3, fechaGeneracion: '2026-11-03', fechaReferencia: '2026-11-01', items: [
    { factura: factura({ tipoComprobante: '03', serie: 'B001', numero: 1 }) },
    { factura: factura({ tipoComprobante: '03', serie: 'B001', numero: 2, igv: '0' }) },
    { factura: factura({ tipoComprobante: '03', serie: 'B001', numero: 3, empresa: { taxRate: 10 } }) },
  ] });
  assert.deepEqual(r.detalles.map((d) => d.porcentajeIgv), ['18', '0', '10']);
});
