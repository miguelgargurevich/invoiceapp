// Comprueba que lo que quedó generado por `cap sync` es un build de producción:
// URL de producción, sin cleartext, sin localhost y sin FACTURO_URL en el entorno.
// Sale con código 1 si algo no cuadra. Se corre antes de compilar el APK o el IPA de publicación.
import { existsSync, readFileSync } from 'node:fs';
import { URL_PRODUCCION } from './destino.mjs';

const fallos = [];

if (process.env.FACTURO_URL) {
  fallos.push('FACTURO_URL está definido en el entorno: el build no sería de producción.');
}

const www = 'www/sin-conexion.html';
if (!readFileSync(www, 'utf8').includes(`<meta name="facturo-destino" content="${URL_PRODUCCION}"`)) {
  fallos.push(`${www}: la URL de la pantalla sin conexión no es ${URL_PRODUCCION}.`);
}

const configs = [
  'android/app/src/main/assets/capacitor.config.json',
  'ios/App/App/capacitor.config.json',
];
for (const ruta of configs) {
  if (!existsSync(ruta)) {
    console.log(`(omitido: todavía no existe ${ruta})`);
    continue;
  }
  const texto = readFileSync(ruta, 'utf8');
  const config = JSON.parse(texto);
  if (config.server?.url !== URL_PRODUCCION) {
    fallos.push(`${ruta}: server.url es ${config.server?.url}, debía ser ${URL_PRODUCCION}.`);
  }
  if ('cleartext' in (config.server ?? {})) {
    fallos.push(`${ruta}: server.cleartext está presente.`);
  }
  if (texto.includes('localhost') || texto.includes('127.0.0.1')) {
    fallos.push(`${ruta}: aparece localhost o 127.0.0.1.`);
  }
}

const manifest = 'android/app/src/main/AndroidManifest.xml';
if (existsSync(manifest) && /usesCleartextTraffic\s*=\s*"true"/.test(readFileSync(manifest, 'utf8'))) {
  fallos.push(`${manifest}: usesCleartextTraffic="true".`);
}

if (fallos.length > 0) {
  console.error('El build NO es de producción:');
  for (const fallo of fallos) console.error(` - ${fallo}`);
  process.exit(1);
}
console.log(`OK: build de producción (${URL_PRODUCCION}), sin cleartext ni localhost.`);
