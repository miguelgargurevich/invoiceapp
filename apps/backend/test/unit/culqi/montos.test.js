const test = require('node:test');
const assert = require('node:assert/strict');
const { aCentimos } = require('../../../src/pagos/culqi/cliente');

test('aCentimos convierte soles (incluso Decimal como texto) a céntimos enteros', () => {
  assert.equal(aCentimos('569.00'), 56900);
  assert.equal(aCentimos('1149'), 114900);
  assert.equal(aCentimos(59), 5900);
  assert.equal(aCentimos('29.10'), 2910); // 29.1 * 100 = 2910.0000000000005 sin redondear
  assert.equal(aCentimos(0), 0);
});
