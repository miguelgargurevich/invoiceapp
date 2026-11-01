const test = require('node:test');
const assert = require('node:assert/strict');
const { fechaLima, isoLima, diasCalendario } = require('../../../src/sunat/fechas');
const { aDecimal, dos } = require('../../../src/sunat/numeros');

test('fechaLima usa la hora de Lima (UTC-5)', () => {
  assert.equal(fechaLima(new Date('2026-11-02T03:00:00Z')), '2026-11-01');
  assert.equal(fechaLima(new Date('2026-11-02T05:00:00Z')), '2026-11-02');
});

test('isoLima devuelve la hora local con -05:00', () => {
  assert.equal(isoLima(new Date('2026-11-01T15:30:00Z')), '2026-11-01T10:30:00-05:00');
});

test('diasCalendario cuenta días entre fechas', () => {
  assert.equal(diasCalendario('2026-11-01', '2026-11-04'), 3);
  assert.equal(diasCalendario('2026-11-01', '2026-11-01'), 0);
});

test('aDecimal y dos aceptan números, strings y null', () => {
  assert.equal(dos(aDecimal('1.005')), '1.01');
  assert.equal(dos(null), '0.00');
  assert.equal(dos(18), '18.00');
});
