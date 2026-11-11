const test = require('node:test');
const assert = require('node:assert/strict');
const { limitesPeticiones } = require('../../src/demo/modo');

test('producción conserva sus límites: 300 generales, 50 de autenticación y 30 para entrar a la demo', () => {
  assert.deepEqual(limitesPeticiones({ NODE_ENV: 'production' }), { general: 300, auth: 50, entrarDemo: 30 });
  assert.deepEqual(limitesPeticiones({}), { general: 300, auth: 50, entrarDemo: 30 });
});

test('desarrollo conserva sus límites', () => {
  assert.deepEqual(limitesPeticiones({ NODE_ENV: 'development' }), { general: 1000, auth: 200, entrarDemo: 200 });
});

test('la demo pública sube los límites para grupos que entran desde la misma red', () => {
  const demo = limitesPeticiones({ MODO_DEMO: 'si', NODE_ENV: 'production' });
  assert.deepEqual(demo, { general: 3000, auth: 500, entrarDemo: 150 });
  assert.ok(demo.auth > limitesPeticiones({ NODE_ENV: 'production' }).auth);
});

test('un MODO_DEMO distinto de «si» no sube nada', () => {
  assert.deepEqual(limitesPeticiones({ MODO_DEMO: 'no', NODE_ENV: 'production' }), { general: 300, auth: 50, entrarDemo: 30 });
});
