const test = require('node:test');
const assert = require('node:assert/strict');
const errores = require('../../../src/sunat/errores');

test('ErrorValidacion junta los mensajes y conserva la lista', () => {
  const e = new errores.ErrorValidacion(['Falta el RUC', 'Falta la serie']);
  assert.ok(e instanceof Error);
  assert.equal(e.name, 'ErrorValidacion');
  assert.equal(e.message, 'Falta el RUC. Falta la serie');
  assert.deepEqual(e.errores, ['Falta el RUC', 'Falta la serie']);
});

test('los demás errores del módulo llevan su nombre y su mensaje', () => {
  assert.equal(new errores.ErrorEstado('x').name, 'ErrorEstado');
  assert.equal(new errores.ErrorFueraDePlazo('x').name, 'ErrorFueraDePlazo');
  assert.equal(new errores.ErrorBorrador('x').name, 'ErrorBorrador');
  assert.equal(new errores.ErrorEngineNoDisponible('x').name, 'ErrorEngineNoDisponible');
  const c = new errores.ErrorConstruccion('falló', { campo: 'igv' });
  assert.equal(c.name, 'ErrorConstruccion');
  assert.deepEqual(c.detalle, { campo: 'igv' });
});
