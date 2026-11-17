const { crearEnviadorFcm, leerCuentaDeServicio } = require('./fcm');
const { crearEnviadorWebPush } = require('./webpush');

// Variables de entorno (las credenciales NUNCA viven en el repo). Sin ellas el envío se apaga solo, con UN aviso en el log:
//   PUSH_FCM_PROJECT_ID                 id del proyecto de Firebase
//   PUSH_FCM_CUENTA_JSON                el JSON de la cuenta de servicio (o…)
//   PUSH_FCM_CUENTA_BASE64              …ese mismo JSON en base64 (más cómodo en una variable de entorno)
//   PUSH_VAPID_PUBLIC_KEY / PUSH_VAPID_PRIVATE_KEY   par VAPID (npx web-push generate-vapid-keys)
//   PUSH_VAPID_SUBJECT                  «mailto:…» o «https://…» de quien envía (por defecto, la web de Facturo)

function jsonDeLaCuenta(env) {
  if (env.PUSH_FCM_CUENTA_JSON) return env.PUSH_FCM_CUENTA_JSON;
  if (env.PUSH_FCM_CUENTA_BASE64) {
    try { return Buffer.from(env.PUSH_FCM_CUENTA_BASE64, 'base64').toString('utf8'); } catch { return null; }
  }
  return null;
}

/**
 * Arma los emisores que la configuración permite. NUNCA lanza: una configuración ausente o a medias deja ese canal apagado
 * y se avisa una vez en el log (con los nombres de lo que falta, jamás con un valor).
 * Devuelve { fcm, webpush, vapidPublica }: cada emisor es `null` si su canal está apagado.
 */
function crearEnviadores({ env = process.env, fetch: llamar, webPushLib, ahora, log = console } = {}) {
  const resultado = { fcm: null, webpush: null, vapidPublica: null };

  const proyecto = (env.PUSH_FCM_PROJECT_ID || '').trim();
  const json = jsonDeLaCuenta(env);
  const cuenta = leerCuentaDeServicio(json);
  if (proyecto && cuenta) {
    resultado.fcm = crearEnviadorFcm({ proyectoId: proyecto, cuenta, fetch: llamar, ahora, log });
  } else if (proyecto || json) {
    log.warn(`[Push] FCM apagado: configuración incompleta (${!proyecto ? 'falta PUSH_FCM_PROJECT_ID' : 'la cuenta de servicio no es un JSON válido'}).`);
  } else {
    log.warn('[Push] FCM apagado: sin PUSH_FCM_PROJECT_ID ni cuenta de servicio (la app no recibirá avisos).');
  }

  const publica = (env.PUSH_VAPID_PUBLIC_KEY || '').trim();
  const privada = (env.PUSH_VAPID_PRIVATE_KEY || '').trim();
  if (publica && privada) {
    const sujeto = (env.PUSH_VAPID_SUBJECT || env.FRONTEND_URL || 'https://facturo.gargurevich.dev').trim();
    try {
      const lib = webPushLib || require('web-push');
      // Valida el par y el sujeto ahora: una clave mal pegada se descubre al arrancar, no al primer aviso.
      lib.setVapidDetails(sujeto, publica, privada);
      resultado.webpush = crearEnviadorWebPush({ lib, publica, privada, sujeto, log });
      resultado.vapidPublica = publica;
    } catch (error) {
      log.warn(`[Push] Web Push apagado: las claves VAPID no son válidas (${String(error?.message || error).split('\n')[0].slice(0, 100)}).`);
    }
  } else if (publica || privada) {
    log.warn('[Push] Web Push apagado: falta una de las dos claves VAPID.');
  } else {
    log.warn('[Push] Web Push apagado: sin claves VAPID (el navegador no recibirá avisos).');
  }

  return resultado;
}

module.exports = { crearEnviadores };
