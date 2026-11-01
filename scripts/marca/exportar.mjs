// Exporta los PNG y el favicon.ico de la marca desde los SVG de apps/frontend/public/marca.
// Uso (desde la raíz del repo):
//   T=$(mktemp -d) && npm i --prefix "$T" @resvg/resvg-js@2.6.2 >/dev/null && RESVG_DIR="$T" node scripts/marca/exportar.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const marca = path.join(raiz, 'apps/frontend/public/marca');
const require = createRequire(path.join(process.env.RESVG_DIR || raiz, 'noop.js'));
let Resvg;
try {
  ({ Resvg } = require('@resvg/resvg-js'));
} catch {
  console.error('Falta @resvg/resvg-js. Instálala en una carpeta temporal y pasa esa ruta en RESVG_DIR (ver el «Uso» de arriba).');
  process.exit(1);
}

const aPng = (archivo, ancho, fondo) => new Resvg(fs.readFileSync(path.join(marca, archivo)), {
  fitTo: { mode: 'width', value: ancho },
  ...(fondo ? { background: fondo } : {}),
}).render().asPng();

const salidas = [
  ['facturo-icono.svg', 192, null, 'icon-192.png'],
  ['facturo-icono.svg', 512, null, 'icon-512.png'],
  ['facturo-icono.svg', 180, '#FFFFFF', 'apple-touch-icon.png'],
];
for (const [svg, ancho, fondo, destino] of salidas) {
  fs.writeFileSync(path.join(marca, destino), aPng(svg, ancho, fondo));
  console.log('ok', destino);
}

// ICO con PNG embebidos (16, 32, 48): cabecera de 6 bytes, una entrada de 16 bytes por imagen y luego los PNG.
const tamanos = [16, 32, 48];
const imagenes = tamanos.map((t) => aPng('favicon.svg', t));
const cabecera = Buffer.alloc(6 + 16 * imagenes.length);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(imagenes.length, 4);
let desplazamiento = cabecera.length;
imagenes.forEach((img, i) => {
  const e = 6 + 16 * i;
  cabecera.writeUInt8(tamanos[i], e);
  cabecera.writeUInt8(tamanos[i], e + 1);
  cabecera.writeUInt8(0, e + 2);
  cabecera.writeUInt8(0, e + 3);
  cabecera.writeUInt16LE(1, e + 4);
  cabecera.writeUInt16LE(32, e + 6);
  cabecera.writeUInt32LE(img.length, e + 8);
  cabecera.writeUInt32LE(desplazamiento, e + 12);
  desplazamiento += img.length;
});
fs.writeFileSync(path.join(raiz, 'apps/frontend/app/favicon.ico'), Buffer.concat([cabecera, ...imagenes]));
console.log('ok favicon.ico');
