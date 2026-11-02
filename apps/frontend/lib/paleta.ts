// Paleta de marca: a partir de UN color que elige la empresa se genera la escala primary-50…900.
// El color elegido es el paso 600. Hacia 50 se aclara y hacia 900 se oscurece, manteniendo matiz
// y saturación (HSL). Las funciones son puras: no tocan el DOM.

export const PASOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type Paso = (typeof PASOS)[number];

/** Escala en tripletas "R G B", lista para `rgb(var(--primary-600) / <alpha>)`. */
export type Escala = Record<Paso, string>;

/** Contraste mínimo WCAG AA para texto normal (blanco sobre el botón). */
export const CONTRASTE_MINIMO = 4.5;

// Luminosidad HSL en los extremos de la escala.
const L_PASO_50 = 0.97;
const L_PASO_900_MAX = 0.08;

type Rgb = [number, number, number];
type Hsl = [number, number, number]; // h en grados, s y l entre 0 y 1

const HEX = /^#[0-9a-fA-F]{6}$/;

export function esHexValido(texto: string): boolean {
  return HEX.test(texto);
}

function hexARgb(hex: string): Rgb {
  if (!esHexValido(hex)) {
    throw new Error(`Color no válido: ${hex}`);
  }
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbAHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** `#1e40af` → `#1E40AF`. Lanza si no es #RRGGBB. */
export function normalizarHex(hex: string): string {
  return rgbAHex(hexARgb(hex));
}

/** `#1E40AF` → `"30 64 175"`. */
export function hexATripla(hex: string): string {
  return hexARgb(hex).join(' ');
}

/** `"30 64 175"` → `#1E40AF`. */
export function triplaAHex(tripla: string): string {
  const [r, g, b] = tripla.split(' ').map(Number) as Rgb;
  return rgbAHex([r, g, b]);
}

function luminancia([r, g, b]: Rgb): number {
  const lineal = (canal: number) => {
    const s = canal / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Contraste WCAG de texto blanco sobre el color (1 a 21). */
export function contrasteBlanco(hex: string): number {
  return 1.05 / (luminancia(hexARgb(hex)) + 0.05);
}

function rgbAHsl([r, g, b]: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) {
    return [0, 0, l];
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  return [h * 60, s, l];
}

function hslARgb([h, s, l]: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = l - c / 2;
  return [r1, g1, b1].map((v) => Math.round((v + m) * 255)) as Rgb;
}

/**
 * Escala de 10 pasos con el color como paso 600. Para el paso 600 se usa el color exacto;
 * los demás pasos mueven solo la luminosidad.
 */
export function generarEscala(hex: string): Escala {
  const base = hexARgb(hex);
  const [h, s, l0] = rgbAHsl(base);
  const lOscuro = Math.min(L_PASO_900_MAX, l0 / 2);
  const escala = {} as Escala;
  for (const paso of PASOS) {
    if (paso === 600) {
      escala[paso] = base.join(' ');
      continue;
    }
    let l: number;
    if (paso < 600) {
      // 50 → L_PASO_50; 500 queda a 100/550 del camino desde el 600.
      const f = (600 - paso) / 550;
      l = l0 + (L_PASO_50 - l0) * f;
    } else {
      // 700 → un tercio del camino hacia el negro; 900 → lOscuro.
      const f = (paso - 600) / 300;
      l = l0 - (l0 - lOscuro) * f;
    }
    escala[paso] = hslARgb([h, s, l]).join(' ');
  }
  return escala;
}

/**
 * Si el color no alcanza el contraste mínimo con texto blanco, lo oscurece en HSL (mismo matiz)
 * hasta alcanzarlo. Si ya lo alcanza, devuelve el mismo color normalizado.
 */
export function ajustarParaTextoBlanco(hex: string): string {
  let rgb = hexARgb(hex);
  const [h, s, lInicial] = rgbAHsl(rgb);
  let l = lInicial;
  while (contrasteBlanco(rgbAHex(rgb)) < CONTRASTE_MINIMO && l > 0) {
    l = Math.max(0, l - 0.005);
    rgb = hslARgb([h, s, l]);
  }
  return rgbAHex(rgb);
}

/** true si el color tuvo que oscurecerse para que el texto blanco se lea. */
export function necesitaAjuste(hex: string): boolean {
  return ajustarParaTextoBlanco(hex) !== normalizarHex(hex);
}

/** La escala que usa el panel: se ajusta el color y luego se generan los pasos. */
export function escalaParaMarca(hex: string): Escala {
  return generarEscala(ajustarParaTextoBlanco(hex));
}
