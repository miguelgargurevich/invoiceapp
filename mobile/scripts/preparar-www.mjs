// Escribe en www/sin-conexion.html la URL del build (FACTURO_URL o producción).
// Se corre antes de `cap sync` (npm run sync). Sin FACTURO_URL deja la URL de producción.
import { readFileSync, writeFileSync } from 'node:fs';
import { destinoFacturo } from './destino.mjs';

const ruta = new URL('../www/sin-conexion.html', import.meta.url);
const destino = destinoFacturo();
const html = readFileSync(ruta, 'utf8');

const patron = /<meta name="facturo-destino" content="[^"]*"/;
if (!patron.test(html)) {
  throw new Error('No encuentro <meta name="facturo-destino"> en www/sin-conexion.html.');
}
const nuevo = html.replace(patron, `<meta name="facturo-destino" content="${destino.url}"`);
writeFileSync(ruta, nuevo);

console.log(`Pantalla sin conexión -> ${destino.url}${destino.esProduccion ? ' (producción)' : ' (PRUEBA, no es producción)'}`);
