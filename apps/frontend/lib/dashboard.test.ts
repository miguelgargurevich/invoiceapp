import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularCupo, calcularIndicadores, claveMesLima, esDelMes, esEmitido, fechaLarga, requiereAtencion,
} from './dashboard.ts';
import type { Comprobante } from './sunat/tipos.ts';

// Hoy, 15 de noviembre de 2026, 10:00 en Lima.
const AHORA = new Date('2026-11-15T15:00:00Z');

// Comprobante mínimo para las cuentas: solo los campos que lee la lógica.
const comp = (datos: Partial<Comprobante> & Pick<Comprobante, 'estadoSunat' | 'fechaEmision'>): Comprobante => ({
  tipoComprobante: '01',
  moneda: 'PEN',
  total: '0',
  ...datos,
}) as Comprobante;

test('claveMesLima usa el mes de Lima (UTC-5), no el de UTC', () => {
  // 04:59 UTC del 1 de noviembre es 23:59 del 31 de octubre en Lima.
  assert.equal(claveMesLima('2026-11-01T04:59:00Z'), '2026-10');
  // 05:00 UTC ya es 00:00 del 1 de noviembre en Lima.
  assert.equal(claveMesLima('2026-11-01T05:00:00Z'), '2026-11');
  assert.equal(claveMesLima('no-es-fecha'), '');
});

test('esDelMes compara con el mes de Lima de la referencia', () => {
  assert.equal(esDelMes('2026-11-02T12:00:00Z', AHORA), true);
  assert.equal(esDelMes('2026-10-31T12:00:00Z', AHORA), false);
  assert.equal(esDelMes('2026-11-01T04:59:00Z', AHORA), false);
  assert.equal(esDelMes('no-es-fecha', AHORA), false);
});

test('esEmitido excluye borradores y lo que no tiene estado', () => {
  assert.equal(esEmitido(null), false);
  assert.equal(esEmitido(undefined), false);
  assert.equal(esEmitido('BORRADOR'), false);
  assert.equal(esEmitido('PENDIENTE_ENVIO'), true);
  assert.equal(esEmitido('ANULADO'), true);
});

test('requiereAtencion: rechazados, observados y error de envío', () => {
  assert.equal(requiereAtencion('RECHAZADO'), true);
  assert.equal(requiereAtencion('ACEPTADO_CON_OBS'), true);
  assert.equal(requiereAtencion('ERROR_TEMPORAL'), true);
  assert.equal(requiereAtencion('ACEPTADO'), false);
  assert.equal(requiereAtencion('BORRADOR'), false);
});

test('calcularIndicadores cuenta el mes, ventas netas y atención', () => {
  const lista = [
    comp({ estadoSunat: 'ACEPTADO', fechaEmision: '2026-11-02T12:00:00Z', total: '1180.00' }),
    comp({ tipoComprobante: '03', estadoSunat: 'ACEPTADO_CON_OBS', fechaEmision: '2026-11-03T12:00:00Z', total: '59.90' }),
    comp({ tipoComprobante: '07', estadoSunat: 'ACEPTADO', fechaEmision: '2026-11-04T12:00:00Z', total: '100.00' }),
    comp({ estadoSunat: 'BORRADOR', fechaEmision: '2026-11-05T12:00:00Z', total: '500.00' }),
    comp({ estadoSunat: 'RECHAZADO', fechaEmision: '2026-11-06T12:00:00Z', total: '200.00' }),
    comp({ estadoSunat: 'ACEPTADO', fechaEmision: '2026-11-07T12:00:00Z', total: '300.00', moneda: 'USD' }),
    comp({ estadoSunat: 'ANULADO', fechaEmision: '2026-11-08T12:00:00Z', total: '90.00' }),
    comp({ estadoSunat: 'ACEPTADO', fechaEmision: '2026-10-20T12:00:00Z', total: '800.00' }),
    comp({ estadoSunat: 'ERROR_TEMPORAL', fechaEmision: '2026-10-21T12:00:00Z', total: '10.00' }),
  ];
  const r = calcularIndicadores(lista, AHORA);
  // Emitidos del mes: A, B, C, E, F y G (el borrador no cuenta; octubre tampoco).
  assert.equal(r.emitidosMes, 6);
  // Ventas: 1180 + 59.90 - 100 (la USD y la anulada no suman; la de octubre no es de este mes).
  assert.equal(r.ventasMes, 1139.9);
  // Atención en toda la lista: el rechazado, el observado y el error de envío de octubre.
  assert.equal(r.requierenAtencion, 3);
  assert.equal(r.incompleto, false);
});

test('calcularIndicadores suma en céntimos sin error de coma flotante', () => {
  const lista = [
    comp({ estadoSunat: 'ACEPTADO', fechaEmision: '2026-11-02T12:00:00Z', total: '0.10' }),
    comp({ estadoSunat: 'ACEPTADO', fechaEmision: '2026-11-02T12:00:00Z', total: '0.20' }),
  ];
  assert.equal(calcularIndicadores(lista, AHORA).ventasMes, 0.3);
});

test('calcularIndicadores marca incompleto cuando la lista llena el tope y llega al mes', () => {
  const llena = (fecha: string) =>
    Array.from({ length: 100 }, () => comp({ estadoSunat: 'ACEPTADO', fechaEmision: fecha, total: '1' }));
  // 100 del mes: puede haber más de este mes sin mostrar.
  assert.equal(calcularIndicadores(llena('2026-11-02T12:00:00Z'), AHORA).incompleto, true);
  // 100, pero el último ya es de octubre: el mes está completo.
  const mixta = [...llena('2026-11-02T12:00:00Z').slice(0, 99), comp({ estadoSunat: 'ACEPTADO', fechaEmision: '2026-10-30T12:00:00Z' })];
  assert.equal(calcularIndicadores(mixta, AHORA).incompleto, false);
  // Menos de 100: la lista está entera.
  assert.equal(calcularIndicadores(llena('2026-11-02T12:00:00Z').slice(0, 99), AHORA).incompleto, false);
});

test('calcularIndicadores con lista vacía', () => {
  assert.deepEqual(calcularIndicadores([], AHORA), {
    emitidosMes: 0, ventasMes: 0, requierenAtencion: 0, incompleto: false,
  });
});

test('calcularCupo: sin límite, sin datos y niveles', () => {
  assert.equal(calcularCupo(5, null).nivel, 'ilimitado');
  assert.equal(calcularCupo(5, -1).nivel, 'ilimitado');
  // undefined = no se pudo leer el plan: no se debe presentar como ilimitado.
  assert.equal(calcularCupo(5, undefined).nivel, 'desconocido');
  assert.deepEqual(calcularCupo(10, 20), { usados: 10, limite: 20, porcentaje: 50, nivel: 'ok' });
  assert.equal(calcularCupo(16, 20).nivel, 'casi');
  assert.equal(calcularCupo(20, 20).nivel, 'lleno');
  assert.equal(calcularCupo(25, 20).porcentaje, 100);
  assert.equal(calcularCupo(0, 0).nivel, 'lleno');
});

test('fechaLarga da la fecha en español de Lima', () => {
  const texto = fechaLarga(new Date('2026-11-02T15:00:00Z'));
  assert.match(texto, /lunes/);
  assert.match(texto, /2 de noviembre de 2026/);
});
