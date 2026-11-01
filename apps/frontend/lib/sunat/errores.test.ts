import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarError } from './errores.ts';

const conCuerpo = (status: number, body: unknown, message = 'x') => Object.assign(new Error(message), { status, body });

test('422 trae la lista de errores', () => {
  const n = normalizarError(conCuerpo(422, { error: 'Falta RUC. Serie mal', errores: ['Falta RUC', 'Serie mal'] }), 'caído');
  assert.deepEqual(n, { mensaje: 'Falta RUC. Serie mal', errores: ['Falta RUC', 'Serie mal'], accion: null, status: 422 });
});

test('409 de fuera de plazo trae la acción', () => {
  const n = normalizarError(conCuerpo(409, { error: 'venció', accion: 'EMITIR_NOTA_CREDITO' }), 'caído');
  assert.equal(n.accion, 'EMITIR_NOTA_CREDITO');
});

test('503 usa el mensaje de no disponible', () => {
  assert.equal(normalizarError(conCuerpo(503, { error: 'interno' }), 'SUNAT no disponible').mensaje, 'SUNAT no disponible');
});

test('errores comunes y vacíos', () => {
  assert.equal(normalizarError(new Error('red caída'), 'x').mensaje, 'red caída');
  assert.deepEqual(normalizarError(null, 'x'), { mensaje: 'Error', errores: [], accion: null, status: null });
});
