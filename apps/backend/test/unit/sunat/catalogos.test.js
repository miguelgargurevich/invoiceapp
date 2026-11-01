const test = require('node:test');
const assert = require('node:assert/strict');
const { codigoDocIdentidad, codigoUnidad, DETRACCION_CODIGOS } = require('../../../src/sunat/catalogos');
const { parametro } = require('../../../src/sunat/catalogos/parametros');

test('codigoDocIdentidad convierte textos legados y respeta códigos', () => {
  assert.equal(codigoDocIdentidad('RUC'), '6');
  assert.equal(codigoDocIdentidad('dni'), '1');
  assert.equal(codigoDocIdentidad('CE'), '4');
  assert.equal(codigoDocIdentidad('6'), '6');
  assert.equal(codigoDocIdentidad(null), '0');
});

test('codigoUnidad convierte UND a NIU y conserva códigos válidos', () => {
  assert.equal(codigoUnidad('UND'), 'NIU');
  assert.equal(codigoUnidad('ZZ'), 'ZZ');
  assert.equal(codigoUnidad(undefined), 'NIU');
});

test('DETRACCION_CODIGOS incluye el 037 al 12 %', () => {
  assert.equal(DETRACCION_CODIGOS['037'].porcentaje, '12');
});

test('parametro devuelve el valor vigente a la fecha', () => {
  assert.equal(parametro('ICBPER_TARIFA', new Date('2026-06-01T12:00:00Z')), '0.50');
  assert.equal(parametro('PLAZO_BAJA_DIAS'), '7');
  assert.throws(() => parametro('NO_EXISTE'), /desconocido/);
  assert.throws(() => parametro('ICBPER_TARIFA', new Date('2019-01-01T12:00:00Z')), /vigente/);
});
