// Reglas puras (sin red ni base) de lo que entra y sale del push. Ver docs/push/README.md.

// Un token de FCM mide ~160-200 caracteres: algo más largo que esto no es uno.
const LARGO_MAXIMO_TOKEN_FCM = 400;
// La URL de una suscripción web es más larga que un token (Chrome/Firefox/Safari: 100-400 caracteres; se deja holgura).
const LARGO_MAXIMO_ENDPOINT_WEB = 2048;
const LARGO_MAXIMO_CLAVE_WEB = 256;

const PLATAFORMAS_FCM = Object.freeze(['android', 'ios']);

// El servidor hace POST a la URL que trae la suscripción: solo se acepta la de un servicio de push conocido
// (si no, cualquier usuario con sesión podría hacer que el servidor llame a una dirección de su elección: SSRF).
const SERVICIOS_WEB_PUSH = Object.freeze([
  { exacto: 'fcm.googleapis.com' }, // Chrome, Edge, Opera, Brave…
  { exacto: 'updates.push.services.mozilla.com' }, // Firefox
  { sufijo: '.push.services.mozilla.com' },
  { sufijo: '.push.apple.com' }, // Safari (web.push.apple.com)
  { sufijo: '.notify.windows.com' }, // Edge antiguo / Windows
]);

/** ¿Es la URL de una suscripción web de un servicio de push conocido? https, sin puerto raro ni usuario:clave. */
function esEndpointWebPushPermitido(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > LARGO_MAXIMO_ENDPOINT_WEB) return false;
  let url;
  try { url = new URL(endpoint); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  return SERVICIOS_WEB_PUSH.some((s) => (s.exacto ? host === s.exacto : host.endsWith(s.sufijo) && host.length > s.sufijo.length));
}

/** El token de FCM: sin espacios ni saltos, de largo razonable. */
function esTokenFcmValido(token) {
  return typeof token === 'string' && token.length > 0 && token.length <= LARGO_MAXIMO_TOKEN_FCM && !/\s/.test(token);
}

function esClaveWebValida(valor) {
  return typeof valor === 'string' && valor.length > 0 && valor.length <= LARGO_MAXIMO_CLAVE_WEB && /^[A-Za-z0-9_\-+/=]+$/.test(valor);
}

/**
 * ¿Es una ruta de ESTA web? Empieza con «/», no con «//» (el navegador la toma por otro sitio), sin «\» (algunos navegadores lo leen como «/»)
 * ni caracteres de control. Lo que empieza con «/» no puede tener esquema («https:»).
 */
function esRutaInterna(ruta) {
  if (typeof ruta !== 'string' || ruta.length === 0 || ruta.length > 2000) return false;
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\\\u0000-\u001f\u007f]/.test(ruta);
}

const LARGO_TITULO = 80;
const LARGO_CUERPO = 180;

function recortar(texto, largo) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  return t.length <= largo ? t : `${t.slice(0, largo - 1).trimEnd()}…`;
}

/**
 * Lo único que viaja en un aviso: título, cuerpo corto y ruta interna. Nada más (ni montos, ni nombres de clientes, ni RUC, ni correos):
 * quien arma el aviso decide el texto, y aquí se fija la forma. Una ruta que no es interna se cambia por «/».
 */
function armarPayload({ titulo, cuerpo, ruta }) {
  return { titulo: recortar(titulo, LARGO_TITULO), cuerpo: recortar(cuerpo, LARGO_CUERPO), ruta: esRutaInterna(ruta) ? ruta : '/' };
}

module.exports = {
  LARGO_MAXIMO_TOKEN_FCM,
  LARGO_MAXIMO_ENDPOINT_WEB,
  PLATAFORMAS_FCM,
  esEndpointWebPushPermitido,
  esTokenFcmValido,
  esClaveWebValida,
  esRutaInterna,
  armarPayload,
};
