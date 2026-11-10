// Dónde carga la app la web de Facturo.
//
// Producción por defecto. La variable FACTURO_URL existe solo para pruebas locales
// (p. ej. FACTURO_URL=http://localhost:3000 con «adb reverse tcp:3000 tcp:3000»).
// Con http solo se admite localhost, y el build de producción nunca lleva cleartext.
// Lo usan capacitor.config.ts, preparar-www.mjs y verificar-produccion.mjs.

export const URL_PRODUCCION = 'https://facturo.gargurevich.dev';

const HOSTS_LOCALES = ['localhost', '127.0.0.1'];

export function destinoFacturo(valor = process.env.FACTURO_URL) {
  const texto = (valor ?? '').trim();
  if (!texto) {
    return {
      url: URL_PRODUCCION,
      host: new URL(URL_PRODUCCION).hostname,
      esProduccion: true,
      http: false,
    };
  }

  const url = new URL(texto); // lanza un error claro si no es una URL
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`FACTURO_URL debe empezar con https:// (o http:// solo para localhost). Valor: ${texto}`);
  }
  if (url.protocol === 'http:' && !HOSTS_LOCALES.includes(url.hostname)) {
    throw new Error(`FACTURO_URL con http:// solo puede apuntar a localhost. Valor: ${texto}`);
  }

  return {
    url: url.origin,
    host: url.hostname,
    esProduccion: url.origin === URL_PRODUCCION,
    http: url.protocol === 'http:',
  };
}
