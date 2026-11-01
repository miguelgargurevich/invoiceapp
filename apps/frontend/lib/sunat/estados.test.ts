import test from 'node:test';
import assert from 'node:assert/strict';
import { ESTADOS_SUNAT, accionesPermitidas, colorEstado, estaEnProceso, etiquetaEstado } from './estados.ts';

test('los ocho estados tienen etiqueta, color y acciones', () => {
  assert.equal(ESTADOS_SUNAT.length, 8);
  for (const estado of ESTADOS_SUNAT) {
    assert.equal(etiquetaEstado(estado), `estados.${estado}`);
    assert.ok(colorEstado(estado));
    assert.ok(Array.isArray(accionesPermitidas(estado)));
  }
});

test('acciones según el estado', () => {
  assert.deepEqual(accionesPermitidas('BORRADOR'), ['editar', 'eliminar', 'emitir']);
  assert.deepEqual(accionesPermitidas('ACEPTADO'), ['pdf', 'xml', 'cdr', 'anular', 'notaCredito', 'notaDebito']);
  assert.deepEqual(accionesPermitidas('ACEPTADO_CON_OBS'), ['pdf', 'xml', 'cdr', 'anular', 'notaCredito', 'notaDebito']);
  assert.deepEqual(accionesPermitidas('RECHAZADO'), ['corregir']);
  assert.deepEqual(accionesPermitidas('ANULADO'), ['pdf', 'xml', 'cdr']);
  assert.deepEqual(accionesPermitidas('PENDIENTE_ENVIO'), []);
  assert.deepEqual(accionesPermitidas('ANULACION_PENDIENTE'), []);
});

test('estados en proceso', () => {
  assert.deepEqual(ESTADOS_SUNAT.filter(estaEnProceso), ['PENDIENTE_ENVIO', 'ERROR_TEMPORAL', 'ANULACION_PENDIENTE']);
});

test('colores', () => {
  assert.equal(colorEstado('ACEPTADO'), 'success');
  assert.equal(colorEstado('RECHAZADO'), 'danger');
  assert.equal(colorEstado('BORRADOR'), 'neutral');
});

test('accionesPermitidas devuelve una copia', () => {
  accionesPermitidas('BORRADOR').push('anular');
  assert.deepEqual(accionesPermitidas('BORRADOR'), ['editar', 'eliminar', 'emitir']);
});
