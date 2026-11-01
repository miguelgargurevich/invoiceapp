import test from 'node:test';
import assert from 'node:assert/strict';
import { esRucValido, validarIdentificacionFiscal } from './ruc.ts';

test('esRucValido acepta RUC reales y rechaza dígito verificador o prefijo malos', () => {
  assert.equal(esRucValido('20131312955'), true); // SUNAT
  assert.equal(esRucValido('20100070970'), true);
  assert.equal(esRucValido('20000000001'), true); // RUC de pruebas de SUNAT beta
  assert.equal(esRucValido('20131312956'), false); // dígito verificador
  assert.equal(esRucValido('30131312955'), false); // prefijo
  assert.equal(esRucValido('2013131295'), false); // 10 dígitos
});

test('validarIdentificacionFiscal: vacío es válido (opcional)', () => {
  assert.equal(validarIdentificacionFiscal(''), null);
  assert.equal(validarIdentificacionFiscal('   '), null);
});

test('validarIdentificacionFiscal: solo dígitos se valida como RUC', () => {
  assert.equal(validarIdentificacionFiscal('20131312955'), null);
  assert.equal(validarIdentificacionFiscal(' 20131312955 '), null);
  assert.equal(validarIdentificacionFiscal('20131312956'), 'rucInvalido');
  assert.equal(validarIdentificacionFiscal('123456'), 'rucInvalido');
});

test('validarIdentificacionFiscal: identificaciones de otros países (con letras o guiones)', () => {
  assert.equal(validarIdentificacionFiscal('12-3456789'), null); // EIN de EE. UU.
  assert.equal(validarIdentificacionFiscal('B12345678'), null); // NIF de España
  assert.equal(validarIdentificacionFiscal('X'.repeat(21)), 'muyLargo');
  assert.equal(validarIdentificacionFiscal('TEMP-123'), 'reservado');
});
