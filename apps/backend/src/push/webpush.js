const { RESULTADO } = require('./fcm');
const { esEndpointWebPushPermitido } = require('./validacion');

// Emisor de Web Push (navegador) con VAPID. Usa la librería `web-push` (cifrado aes128gcm del payload), inyectada para las pruebas.
// Un 404 o 410 del servicio de push dice, con todas las letras, que la suscripción ya no existe: se borra. Cualquier otro error
// (429, 5xx, red) NO borra nada.

function crearEnviadorWebPush({ lib, publica, privada, sujeto, log = console }) {
  return {
    tipo: 'webpush',
    async enviar(dispositivo, payload) {
      // Defensa en profundidad: aunque una fila vieja traiga otra dirección, el servidor no le habla.
      if (!esEndpointWebPushPermitido(dispositivo.token)) {
        log.warn('[Push] Web Push: una suscripción con dirección no permitida se ignoró.');
        return RESULTADO.TOKEN_INVALIDO;
      }
      try {
        await lib.sendNotification(
          { endpoint: dispositivo.token, keys: { p256dh: dispositivo.p256dh, auth: dispositivo.auth } },
          JSON.stringify(payload),
          { vapidDetails: { subject: sujeto, publicKey: publica, privateKey: privada }, TTL: 60 * 60 * 24, urgency: 'normal' },
        );
        return RESULTADO.ENVIADO;
      } catch (error) {
        const estado = Number(error?.statusCode);
        if (estado === 404 || estado === 410) return RESULTADO.TOKEN_INVALIDO;
        // Solo el código: el mensaje del error puede traer la dirección de la suscripción.
        log.warn(`[Push] Web Push contestó ${Number.isFinite(estado) ? estado : 'error de red'}.`);
        return RESULTADO.FALLO;
      }
    },
  };
}

module.exports = { crearEnviadorWebPush };
