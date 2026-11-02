import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTRASTE_MINIMO,
  PASOS,
  ajustarParaTextoBlanco,
  contrasteBlanco,
  escalaParaMarca,
  esHexValido,
  generarEscala,
  hexATripla,
  necesitaAjuste,
  normalizarHex,
  triplaAHex,
} from './paleta.ts';

test('el berenjena de Facturo queda como paso 600 exacto', () => {
  assert.equal(generarEscala('#6B2C6E')[600], '107 44 110');
});

test('la escala tiene los 10 pasos y cada uno es una tripleta RGB', () => {
  const escala = generarEscala('#1E40AF');
  assert.deepEqual(Object.keys(escala).map(Number), PASOS);
  for (const paso of PASOS) {
    assert.match(escala[paso], /^\d{1,3} \d{1,3} \d{1,3}$/);
    for (const canal of escala[paso].split(' ').map(Number)) {
      assert.ok(canal >= 0 && canal <= 255, `${paso}: canal fuera de rango`);
    }
  }
});

test('el paso 600 de un azul es el color elegido', () => {
  assert.equal(generarEscala('#1E40AF')[600], '30 64 175');
});

test('de 50 a 900 cada paso es más oscuro que el anterior', () => {
  for (const hex of ['#6B2C6E', '#1E40AF', '#C2410C', '#374151']) {
    const contrastes = PASOS.map((paso) => contrasteBlanco(triplaAHex(generarEscala(hex)[paso])));
    for (let i = 1; i < contrastes.length; i++) {
      assert.ok(contrastes[i] >= contrastes[i - 1], `${hex}: el paso ${PASOS[i]} es más claro que ${PASOS[i - 1]}`);
    }
  }
});

test('un color que no es hexadecimal no genera escala', () => {
  assert.throws(() => generarEscala('azul'));
});

test('contrasteBlanco sigue WCAG: blanco 1 y negro 21', () => {
  assert.equal(contrasteBlanco('#FFFFFF'), 1);
  assert.ok(Math.abs(contrasteBlanco('#000000') - 21) < 1e-9);
});

test('el berenjena ya se lee con texto blanco y no se ajusta', () => {
  assert.ok(contrasteBlanco('#6B2C6E') >= CONTRASTE_MINIMO);
  assert.equal(ajustarParaTextoBlanco('#6b2c6e'), '#6B2C6E');
  assert.equal(necesitaAjuste('#6B2C6E'), false);
});

test('el amarillo se oscurece hasta llegar a 4.5 con texto blanco', () => {
  const ajustado = ajustarParaTextoBlanco('#FACC15');
  assert.notEqual(ajustado, '#FACC15');
  assert.ok(contrasteBlanco(ajustado) >= CONTRASTE_MINIMO, `contraste ${contrasteBlanco(ajustado)}`);
  assert.equal(necesitaAjuste('#FACC15'), true);
});

test('escalaParaMarca usa el color ya ajustado como paso 600', () => {
  const ajustado = ajustarParaTextoBlanco('#FACC15');
  assert.equal(escalaParaMarca('#FACC15')[600], hexATripla(ajustado));
});

test('esHexValido acepta #RRGGBB y rechaza lo demás', () => {
  assert.equal(esHexValido('#6B2C6E'), true);
  assert.equal(esHexValido('#6b2c6e'), true);
  assert.equal(esHexValido('6B2C6E'), false);
  assert.equal(esHexValido('#6B2C6'), false);
  assert.equal(esHexValido('#GGGGGG'), false);
  assert.equal(esHexValido(''), false);
});

test('normalizarHex deja #RRGGBB en mayúsculas', () => {
  assert.equal(normalizarHex('#1e40af'), '#1E40AF');
});
