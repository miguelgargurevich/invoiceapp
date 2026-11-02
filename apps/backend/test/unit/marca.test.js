const test = require('node:test');
const assert = require('node:assert/strict');
const { COLOR_FACTURO, colorDeMarca, colorParaTextoBlanco, hexARgb01, contraste } = require('../../src/planes/marca');

test('sin color propio se usa el berenjena de Facturo', () => {
  assert.equal(COLOR_FACTURO, '#6B2C6E');
  assert.equal(colorDeMarca({ colorPrimario: null }), '#6B2C6E');
  assert.equal(colorDeMarca({}), '#6B2C6E');
  assert.equal(colorDeMarca(undefined), '#6B2C6E');
});

test('el color de la empresa se devuelve en mayúsculas; un valor no válido cae al berenjena', () => {
  assert.equal(colorDeMarca({ colorPrimario: '#1e40af' }), '#1E40AF');
  assert.equal(colorDeMarca({ colorPrimario: 'azul' }), '#6B2C6E');
  assert.equal(colorDeMarca({ colorPrimario: '#1E40A' }), '#6B2C6E');
});

test('la razón de contraste sigue WCAG: negro sobre blanco es 21:1', () => {
  assert.equal(contraste('#000000', '#FFFFFF'), 21);
  assert.equal(contraste('#FFFFFF', '#FFFFFF'), 1);
});

test('un color oscuro ya legible en blanco no cambia', () => {
  assert.ok(contraste('#FFFFFF', '#1E40AF') >= 4.5);
  assert.equal(colorParaTextoBlanco('#1E40AF'), '#1E40AF');
  assert.equal(colorParaTextoBlanco('#6b2c6e'), '#6B2C6E');
});

test('un amarillo se oscurece hasta llegar a 4.5:1 con blanco', () => {
  const original = '#FFFF00';
  const legible = colorParaTextoBlanco(original);
  assert.notEqual(legible, original);
  assert.match(legible, /^#[0-9A-F]{6}$/);
  assert.ok(contraste('#FFFFFF', legible) >= 4.5, `contraste ${contraste('#FFFFFF', legible)}`);
  // Es el primer paso (de 1 %) que cumple: el paso anterior no alcanza.
  const mezcla = (f) => {
    const v = [255, 255, 0].map((c) => Math.round(c * f));
    return `#${v.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  };
  const pasos = Array.from({ length: 100 }, (_, i) => mezcla(1 - (i + 1) / 100));
  const primero = pasos.find((c) => contraste('#FFFFFF', c) >= 4.5);
  assert.equal(legible, primero);
  // Conserva el tono: rojo y verde a la vez, sin azul.
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(legible.slice(i, i + 2), 16));
  assert.ok(r > 0 && g > 0 && b === 0, legible);
});

test('tintar mezcla con blanco: 0 deja el color, 1 da blanco', () => {
  const { tintar } = require('../../src/planes/marca');
  assert.equal(tintar('#6B2C6E', 0), '#6B2C6E');
  assert.equal(tintar('#6B2C6E', 1), '#FFFFFF');
  assert.match(tintar('#6B2C6E', 0.9), /^#[0-9A-F]{6}$/);
  assert.ok(contraste('#000000', tintar('#6B2C6E', 0.9)) > 15); // tinte muy claro: fondo de correo
});

test('hexARgb01 devuelve canales entre 0 y 1', () => {
  assert.deepEqual(hexARgb01('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexARgb01('#FF0000'), { r: 1, g: 0, b: 0 });
  const azul = hexARgb01('#1E40AF');
  assert.ok(Math.abs(azul.r - 0x1e / 255) < 1e-12);
  assert.ok(Math.abs(azul.g - 0x40 / 255) < 1e-12);
  assert.ok(Math.abs(azul.b - 0xaf / 255) < 1e-12);
});

test('hexARgb01 y colorParaTextoBlanco rechazan un valor que no es #RRGGBB', () => {
  assert.throws(() => hexARgb01('rojo'), TypeError);
  assert.throws(() => colorParaTextoBlanco('#FFF'), TypeError);
});
