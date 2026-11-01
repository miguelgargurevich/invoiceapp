const test = require('node:test');
const assert = require('node:assert/strict');
const { responderError, soloPeru, bloquearElectronicos } = require('../../../src/sunat/http');
const { ErrorFueraDePlazo, ErrorValidacion, ErrorEngineNoDisponible } = require('../../../src/sunat/errores');

const resFalsa = () => ({ code: null, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

test('responderError traduce errores del módulo', () => {
  let res = resFalsa(); responderError(res, new ErrorFueraDePlazo('vencido'));
  assert.deepEqual([res.code, res.body.accion], [409, 'EMITIR_NOTA_CREDITO']);
  res = resFalsa(); responderError(res, new ErrorValidacion(['a', 'b']));
  assert.deepEqual([res.code, res.body.errores], [422, ['a', 'b']]);
});

test('responderError no filtra al usuario el mensaje crudo del motor ni de errores desconocidos', () => {
  const original = console.error;
  console.error = () => {};
  try {
    let res = resFalsa(); responderError(res, new ErrorEngineNoDisponible('connect ECONNREFUSED 10.0.0.5:8080 SOL=clave-secreta'));
    assert.equal(res.code, 503);
    assert.doesNotMatch(JSON.stringify(res.body), /ECONNREFUSED|10\.0\.0\.5|clave-secreta/);
    res = resFalsa(); responderError(res, new Error('stack interno con v1:abc'));
    assert.equal(res.code, 500);
    assert.doesNotMatch(JSON.stringify(res.body), /interno con|v1:/);
  } finally { console.error = original; }
});

test('soloPeru deja pasar solo empresas PE', () => {
  const res = resFalsa();
  let siguio = false;
  soloPeru({ empresa: { pais: 'US' } }, res, () => { siguio = true; });
  assert.equal(res.code, 403);
  assert.equal(siguio, false);
  soloPeru({ empresa: { pais: 'PE' } }, resFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});

test('bloquearElectronicos impide editar comprobantes SUNAT', async () => {
  const prisma = { factura: { findFirst: async ({ where }) => (where.id === 'e' ? { estadoSunat: 'ACEPTADO' } : { estadoSunat: null }) } };
  const mw = bloquearElectronicos(prisma);
  const res = resFalsa();
  await mw({ params: { id: 'e' }, empresa: { id: 'x' } }, res, () => {});
  assert.equal(res.code, 409);
  let siguio = false;
  await mw({ params: { id: 'n' }, empresa: { id: 'x' } }, resFalsa(), () => { siguio = true; });
  assert.equal(siguio, true);
});

test('bloquearElectronicos consulta con la empresa del usuario', async () => {
  let donde;
  const prisma = { factura: { findFirst: async ({ where }) => { donde = where; return null; } } };
  await bloquearElectronicos(prisma)({ params: { id: 'f1' }, empresa: { id: 'emp-1' } }, resFalsa(), () => {});
  assert.deepEqual(donde, { id: 'f1', empresaId: 'emp-1' });
});
