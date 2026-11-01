import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, esPlanGratis } from './precios.ts';

test('formatPrice muestra soles con el formato de Perú', () => {
  assert.equal(formatPrice(59, 'PEN'), 'S/ 59.00');
  assert.equal(formatPrice(1149, 'PEN'), 'S/ 1,149.00');
});

test('formatPrice mantiene dólares como antes', () => {
  assert.equal(formatPrice(15, 'USD'), '$15.00');
});

test('esPlanGratis reconoce el plan de precio cero', () => {
  assert.equal(esPlanGratis({ priceMonthly: 0 }), true);
  assert.equal(esPlanGratis({ priceMonthly: 29 }), false);
});
