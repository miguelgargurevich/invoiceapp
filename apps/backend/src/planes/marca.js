// Color de marca de la empresa (funciones puras: sin BD ni red).
// La empresa guarda `colorPrimario` («#RRGGBB» o null). Si no tiene, se usa el berenjena de Facturo.

const COLOR_FACTURO = '#6B2C6E';
const HEX = /^#[0-9A-Fa-f]{6}$/;
const CONTRASTE_MINIMO = 4.5; // WCAG AA para texto normal

function colorDeMarca(empresa) {
  const color = empresa?.colorPrimario;
  return typeof color === 'string' && HEX.test(color) ? color.toUpperCase() : COLOR_FACTURO;
}

function canales(hex) {
  if (typeof hex !== 'string' || !HEX.test(hex)) throw new TypeError(`Color no válido: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Luminancia relativa (WCAG 2.x) de un canal 0-255 linealizado.
function linealizar(valor) {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex) {
  const [r, g, b] = canales(hex).map(linealizar);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Razón de contraste WCAG entre dos colores (1 a 21).
function contraste(hexA, hexB) {
  const [claro, oscuro] = [luminancia(hexA), luminancia(hexB)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

const aHex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

// Texto blanco legible sobre el color: si el contraste es menor a 4.5:1, mezcla con negro en pasos del 1 %
// hasta llegar al mínimo (un amarillo se vuelve un ocre legible). El mismo valor sirve de texto sobre blanco.
function colorParaTextoBlanco(hex) {
  const base = hex.toUpperCase();
  canales(base);
  if (contraste('#FFFFFF', base) >= CONTRASTE_MINIMO) return base;
  for (let paso = 1; paso <= 100; paso += 1) {
    const f = 1 - paso / 100;
    const candidato = aHex(canales(base).map((v) => Math.round(v * f)));
    if (contraste('#FFFFFF', candidato) >= CONTRASTE_MINIMO) return candidato;
  }
  return '#000000'; // inalcanzable: el negro tiene 21:1 con blanco
}

// Para pdf-lib: canales entre 0 y 1.
function hexARgb01(hex) {
  const [r, g, b] = canales(hex).map((v) => v / 255);
  return { r, g, b };
}

// Tinte claro del color (mezcla con blanco): fondos suaves de los correos. cantidad 0 = el color, 1 = blanco.
function tintar(hex, cantidad) {
  return aHex(canales(hex).map((v) => Math.round(v + (255 - v) * cantidad)));
}

module.exports = { COLOR_FACTURO, colorDeMarca, colorParaTextoBlanco, hexARgb01, contraste, tintar };
