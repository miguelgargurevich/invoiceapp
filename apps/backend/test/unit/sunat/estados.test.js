const test = require('node:test');
const assert = require('node:assert/strict');
const { ESTADO, clasificarRespuesta, siguienteReintento } = require('../../../src/sunat/emision/estados');
const { dentroDePlazoEnvio, dentroDePlazoBaja } = require('../../../src/sunat/emision/plazos');

test('clasifica por rango de código SUNAT', () => {
  assert.equal(clasificarRespuesta({ codigo: '0', observaciones: [] }), ESTADO.ACEPTADO);
  assert.equal(clasificarRespuesta({ codigo: '0', observaciones: ['4252 - obs'] }), ESTADO.ACEPTADO_CON_OBS);
  assert.equal(clasificarRespuesta({ codigo: '4252' }), ESTADO.ACEPTADO_CON_OBS);
  assert.equal(clasificarRespuesta({ codigo: '2800' }), ESTADO.RECHAZADO);
  assert.equal(clasificarRespuesta({ codigo: '3999' }), ESTADO.RECHAZADO);
  assert.equal(clasificarRespuesta({ codigo: '1033' }), 'CONSULTAR_CDR');
  assert.equal(clasificarRespuesta({ codigo: '1999' }), ESTADO.ERROR_TEMPORAL);
  assert.equal(clasificarRespuesta({ codigo: '2000' }), ESTADO.RECHAZADO);
  assert.equal(clasificarRespuesta({ codigo: '4000' }), ESTADO.ACEPTADO_CON_OBS);
  assert.equal(clasificarRespuesta({ codigo: '100' }), ESTADO.ERROR_TEMPORAL);
  assert.equal(clasificarRespuesta({ codigo: null }), ESTADO.ERROR_TEMPORAL);
});

test('reintentos: 1, 5, 15, 60 min y luego cada hora', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(siguienteReintento), [60, 300, 900, 3600, 3600, 3600]);
});

test('plazos de envío (3 días) y de baja (7 días) en hora de Lima', () => {
  const emision = new Date('2026-11-01T15:00:00Z');
  assert.equal(dentroDePlazoEnvio(emision, new Date('2026-11-04T20:00:00Z')), true);
  assert.equal(dentroDePlazoEnvio(emision, new Date('2026-11-05T15:00:00Z')), false);
  assert.equal(dentroDePlazoBaja(emision, new Date('2026-11-08T15:00:00Z')), true);
  assert.equal(dentroDePlazoBaja(emision, new Date('2026-11-09T15:00:00Z')), false);
});
