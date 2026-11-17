const jwt = require('jsonwebtoken');

// Emisor de FCM HTTP v1 (app de Android; iPhone cuando haya APNs en Firebase). Receta del Portal de Dealers (EnviadorPushFcm.cs):
// la cuenta de servicio firma un JWT RS256, lo cambia por un token de acceso de OAuth2 (se guarda hasta un minuto antes de que venza)
// y con él llama a POST /v1/projects/{proyecto}/messages:send. Un 401 renueva el token y reintenta UNA vez.
// `fetch` y el reloj se inyectan: las pruebas no llaman a Google.

const ALCANCE_FCM = 'https://www.googleapis.com/auth/firebase.messaging';
const URL_TOKEN_POR_DEFECTO = 'https://oauth2.googleapis.com/token';

const RESULTADO = Object.freeze({ ENVIADO: 'enviado', TOKEN_INVALIDO: 'token-invalido', FALLO: 'fallo' });

/** Lee el JSON que baja la consola de Google Cloud. Devuelve null si no es una cuenta de servicio usable. */
function leerCuentaDeServicio(json) {
  if (typeof json !== 'string' || !json.trim()) return null;
  let datos;
  try { datos = JSON.parse(json); } catch { return null; }
  const correo = datos?.client_email;
  const llave = datos?.private_key;
  if (typeof correo !== 'string' || !correo || typeof llave !== 'string' || !llave.includes('PRIVATE KEY')) return null;
  // Solo https: la llave firma un JWT que se manda a esta dirección.
  const url = typeof datos.token_uri === 'string' && datos.token_uri.startsWith('https://') ? datos.token_uri : URL_TOKEN_POR_DEFECTO;
  return { correo, llave, urlToken: url };
}

/** El `status` de Google (`NOT_FOUND`…) y el `errorCode` propio de FCM (`UNREGISTERED`…), si el cuerpo los trae. */
function errorDeFcm(cuerpo) {
  try {
    const error = JSON.parse(cuerpo)?.error;
    if (!error) return { status: null, codigo: null };
    const detalle = Array.isArray(error.details) ? error.details.find((d) => d && typeof d.errorCode === 'string' && d.errorCode) : null;
    return { status: typeof error.status === 'string' ? error.status : null, codigo: detalle ? detalle.errorCode : null };
  } catch {
    return { status: null, codigo: null };
  }
}

/**
 * Qué hacer con la respuesta de error de FCM. SOLO un token que FCM dice, con todas las letras, que no existe se borra:
 * `UNREGISTERED` en el detalle del error (FCM lo manda dentro de un 404), o un 400 INVALID_ARGUMENT que se queja del token de registro.
 * Un 404 a secas NO alcanza (también lo da un proyecto mal escrito y borraría los teléfonos de todos), ni un 400 por el mensaje,
 * un 401/403 de credenciales, un 429 o un 5xx: el teléfono está bien y el problema es otro.
 */
function clasificarErrorFcm(estado, cuerpo) {
  const { status, codigo } = errorDeFcm(cuerpo);
  if (codigo === 'UNREGISTERED') return RESULTADO.TOKEN_INVALIDO;
  if (estado === 400 && (codigo === 'INVALID_ARGUMENT' || status === 'INVALID_ARGUMENT') && /registration token/i.test(cuerpo)) return RESULTADO.TOKEN_INVALIDO;
  return RESULTADO.FALLO;
}

/** El mensaje de FCM HTTP v1: título, cuerpo y la ruta interna que la app abre al tocar el aviso (en `data`, siempre texto). */
function cuerpoDelMensaje(token, { titulo, cuerpo, ruta }) {
  return {
    message: {
      token,
      notification: { title: titulo, body: cuerpo },
      data: { ruta },
      android: { priority: 'HIGH' },
      apns: { payload: { aps: { sound: 'default' } } },
    },
  };
}

function crearEnviadorFcm({ proyectoId, cuenta, fetch: llamar = globalThis.fetch, ahora = () => new Date(), log = console }) {
  let tokenDeAcceso = null;
  let vence = 0;
  let enCurso = null;

  async function pedirToken() {
    const ahoraMs = ahora().getTime();
    // `iat` y `exp` salen del reloj inyectado (no del de jsonwebtoken), así las pruebas no dependen de la hora.
    const iat = Math.floor(ahoraMs / 1000);
    const firmado = jwt.sign(
      { iss: cuenta.correo, scope: ALCANCE_FCM, aud: cuenta.urlToken, iat, exp: iat + 3600 },
      cuenta.llave,
      { algorithm: 'RS256' },
    );
    const respuesta = await llamar(cuenta.urlToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: firmado }).toString(),
    });
    if (!respuesta.ok) {
      log.error(`[Push] FCM: Google no dio el token de acceso (${respuesta.status}): revisar la cuenta de servicio.`);
      return null;
    }
    const datos = await respuesta.json().catch(() => null);
    if (!datos || typeof datos.access_token !== 'string' || !datos.access_token) return null;
    const segundos = Number.isFinite(datos.expires_in) ? datos.expires_in : 3600;
    tokenDeAcceso = datos.access_token;
    vence = ahoraMs + (Math.max(60, segundos) - 60) * 1000;
    return tokenDeAcceso;
  }

  // Una sola petición de token a la vez (varios envíos juntos comparten la misma).
  async function obtenerToken() {
    if (tokenDeAcceso && ahora().getTime() < vence) return tokenDeAcceso;
    if (!enCurso) enCurso = pedirToken().finally(() => { enCurso = null; });
    return enCurso;
  }

  return {
    tipo: 'fcm',
    async enviar(dispositivo, payload) {
      for (let intento = 1; ; intento += 1) {
        const acceso = await obtenerToken();
        if (!acceso) return RESULTADO.FALLO;
        const respuesta = await llamar(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(proyectoId)}/messages:send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${acceso}` },
          body: JSON.stringify(cuerpoDelMensaje(dispositivo.token, payload)),
        });
        if (respuesta.ok) return RESULTADO.ENVIADO;
        if (respuesta.status === 401 && intento === 1) {
          // El token de acceso venció o lo revocaron: se pide otro y se reintenta una sola vez.
          tokenDeAcceso = null;
          continue;
        }
        const texto = await respuesta.text().catch(() => '');
        const resultado = clasificarErrorFcm(respuesta.status, texto);
        // Nunca el cuerpo entero ni el token del teléfono: solo el estado y el código de error de FCM.
        const { status, codigo } = errorDeFcm(texto);
        log.warn(`[Push] FCM contestó ${respuesta.status} (${codigo || status || '?'}) al enviar a un teléfono ${dispositivo.plataforma}.`);
        return resultado;
      }
    },
  };
}

module.exports = { crearEnviadorFcm, leerCuentaDeServicio, clasificarErrorFcm, cuerpoDelMensaje, RESULTADO, ALCANCE_FCM, URL_TOKEN_POR_DEFECTO };
