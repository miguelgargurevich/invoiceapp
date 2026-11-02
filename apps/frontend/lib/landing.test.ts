import test from 'node:test';
import assert from 'node:assert/strict';
import { datosVistaPrevia, porcentajeAhorro, equivalenteMensual } from './landing.ts';
import { formatPrice } from './precios.ts';

test('el equivalente mensual del plan anual conserva los céntimos (no redondea al sol)', () => {
  assert.equal(equivalenteMensual(569), 47.42);
  assert.equal(formatPrice(equivalenteMensual(569), 'PEN'), 'S/ 47.42');
  assert.equal(formatPrice(equivalenteMensual(1149), 'PEN'), 'S/ 95.75');
});

test('porcentajeAhorro da el ahorro entero frente a doce meses del mensual', () => {
  assert.equal(porcentajeAhorro(29, 279), 20);   // 348 → 279 = 19.8 % → 20
  assert.equal(porcentajeAhorro(59, 569), 20);   // 708 → 569 = 19.6 % → 20
  assert.equal(porcentajeAhorro(119, 1149), 20); // 1428 → 1149 = 19.5 % → 20
  assert.equal(porcentajeAhorro(15, 144), 20);   // EE. UU.
  assert.equal(porcentajeAhorro(0, 0), 0);
});

test('la vista previa usa series peruanas y no muestra dólares', () => {
  const vista = datosVistaPrevia();
  assert.equal(vista.valores[1], 'S/ 18,450.00');
  assert.deepEqual(
    vista.filas?.map((f) => f.numero),
    ['F001-000123', 'B001-000045', 'FC01-000002'],
  );
  assert.equal(vista.dominio, 'facturo.gargurevich.dev');
});
