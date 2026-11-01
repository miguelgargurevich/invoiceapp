const test = require('node:test');
const assert = require('node:assert/strict');
const { montoEnLetras } = require('../../../src/sunat/calculo/montoEnLetras');

const casos = [
  ['0', 'SON: CERO CON 00/100 SOLES'],
  ['1', 'SON: UNO CON 00/100 SOLES'],
  ['15', 'SON: QUINCE CON 00/100 SOLES'],
  ['21', 'SON: VEINTIUNO CON 00/100 SOLES'],
  ['45', 'SON: CUARENTA Y CINCO CON 00/100 SOLES'],
  ['100', 'SON: CIEN CON 00/100 SOLES'],
  ['101', 'SON: CIENTO UNO CON 00/100 SOLES'],
  ['118', 'SON: CIENTO DIECIOCHO CON 00/100 SOLES'],
  ['1000', 'SON: MIL CON 00/100 SOLES'],
  ['1200.50', 'SON: MIL DOSCIENTOS CON 50/100 SOLES'],
  ['21000', 'SON: VEINTIUN MIL CON 00/100 SOLES'],
  ['31000', 'SON: TREINTA Y UN MIL CON 00/100 SOLES'],
  ['100000', 'SON: CIEN MIL CON 00/100 SOLES'],
  ['1000000', 'SON: UN MILLON CON 00/100 SOLES'],
  ['2500000', 'SON: DOS MILLONES QUINIENTOS MIL CON 00/100 SOLES'],
];

for (const [monto, esperado] of casos) {
  test(`montoEnLetras(${monto})`, () => assert.equal(montoEnLetras(monto), esperado));
}

test('usa el nombre de la moneda', () => {
  assert.equal(montoEnLetras('0.5', 'USD'), 'SON: CERO CON 50/100 DÓLARES AMERICANOS');
});

test('rechaza montos de mil millones o más', () => {
  assert.throws(() => montoEnLetras('1000000000'), /fuera de rango/);
});
