const test = require('node:test');
const assert = require('node:assert/strict');
const { rucValido, correoValido, normalizarDatosLegales } = require('../../src/sitio/legal');

test('rucValido: acepta RUC reales y rechaza dígito verificador, largo y caracteres', () => {
  for (const ok of ['10409241862', '20131312955', '20000000001']) assert.equal(rucValido(ok), true, ok);
  for (const mal of ['10409241863', '1040924186', '104092418620', '1040924186a', '', null, undefined, 10409241862]) {
    assert.equal(rucValido(mal), false, String(mal));
  }
});

test('correoValido', () => {
  assert.equal(correoValido('a@b.pe'), true);
  assert.equal(correoValido('a@b'), false);
  assert.equal(correoValido('a b@c.pe'), false);
});

test('normalizarDatosLegales: vacío y ausente → null, recorta, exige objeto', () => {
  assert.deepEqual(normalizarDatosLegales({ legalMarca: ' X ', legalRuc: '' }).datos,
    { legalMarca: 'X', legalRazonSocial: null, legalRuc: null, legalDomicilio: null, legalCorreo: null });
  assert.ok(normalizarDatosLegales(null).error);
  assert.ok(normalizarDatosLegales([]).error);
});
