const express = require('express');
const {
  PLATAFORMAS_FCM, esEndpointWebPushPermitido, esTokenFcmValido, esClaveWebValida,
} = require('./validacion');

// /api/push — los dispositivos de quien tiene la sesión iniciada. Siempre es el usuario del token: ninguna ruta recibe un usuario.
//   GET  /config               qué canales hay y la clave pública VAPID (no es secreta; así no hace falta recompilar la web)
//   POST /dispositivos         alta o actualización POR TOKEN (si el token era de otro usuario, pasa al actual)
//   POST /dispositivos/baja    la web/app lo llama ANTES de cerrar la sesión (el token va en el cuerpo, no en la URL: la URL queda en los logs)

function crearRouterPush({ prisma, auth, enviadores = {}, esDemo = () => false, ahora = () => new Date() }) {
  const router = express.Router();
  const middlewares = Array.isArray(auth) ? auth : [auth];
  const fcmListo = Boolean(enviadores.fcm);
  const webListo = Boolean(enviadores.webpush);

  router.get('/config', ...middlewares, (_req, res) => {
    const demo = esDemo();
    res.json({
      fcm: { disponible: fcmListo && !demo },
      web: { disponible: webListo && !demo, publicKey: webListo && !demo ? enviadores.vapidPublica : null },
    });
  });

  router.post('/dispositivos', ...middlewares, async (req, res) => {
    try {
      // La demo pública comparte cuentas entre visitantes: ahí no se registra ningún teléfono.
      if (esDemo()) return res.status(403).json({ error: 'Los avisos no están disponibles en la demo.' });
      const userId = req.user?.id;
      const empresaId = req.user?.empresaId;
      if (!userId || !empresaId) return res.status(400).json({ error: 'Falta la empresa de la sesión.' });

      const cuerpo = req.body || {};
      let fila;
      if (cuerpo.tipo === 'fcm') {
        const token = typeof cuerpo.token === 'string' ? cuerpo.token.trim() : '';
        const plataforma = typeof cuerpo.plataforma === 'string' ? cuerpo.plataforma.trim().toLowerCase() : '';
        if (!esTokenFcmValido(token)) return res.status(400).json({ error: 'Falta el token del teléfono (o no es válido).' });
        if (!PLATAFORMAS_FCM.includes(plataforma)) return res.status(400).json({ error: 'La plataforma tiene que ser «android» o «ios».' });
        fila = { tipo: 'fcm', plataforma, token, p256dh: null, auth: null };
      } else if (cuerpo.tipo === 'webpush') {
        const s = cuerpo.suscripcion;
        const endpoint = typeof s?.endpoint === 'string' ? s.endpoint.trim() : '';
        const p256dh = s?.keys?.p256dh;
        const claveAuth = s?.keys?.auth;
        if (!esEndpointWebPushPermitido(endpoint)) return res.status(400).json({ error: 'La suscripción del navegador no es válida.' });
        if (!esClaveWebValida(p256dh) || !esClaveWebValida(claveAuth)) return res.status(400).json({ error: 'La suscripción del navegador no es válida.' });
        fila = { tipo: 'webpush', plataforma: 'web', token: endpoint, p256dh, auth: claveAuth };
      } else {
        return res.status(400).json({ error: 'El tipo tiene que ser «fcm» o «webpush».' });
      }

      const datos = { userId, empresaId, tipo: fila.tipo, plataforma: fila.plataforma, p256dh: fila.p256dh, auth: fila.auth, ultimoUsoAt: ahora() };
      // Un token = un dispositivo = la última sesión que entró: si era de otro usuario, pasa a este.
      const guardar = () => prisma.dispositivoPush.upsert({ where: { token: fila.token }, create: { ...datos, token: fila.token }, update: datos });
      try {
        await guardar();
      } catch (error) {
        if (error?.code !== 'P2002') throw error;
        await guardar(); // dos altas del mismo token a la vez: la segunda ya lo encuentra y solo actualiza
      }
      return res.json({ registrado: true });
    } catch (error) {
      console.error('[Push] No se pudo registrar el dispositivo:', String(error?.message || error).split('\n')[0]);
      return res.status(500).json({ error: 'No se pudo registrar el dispositivo.' });
    }
  });

  // Solo borra si el dispositivo es del usuario de la sesión. Con un token ajeno (o inexistente) contesta lo mismo que si no hubiera nada:
  // así no se revela de quién es un token.
  router.post('/dispositivos/baja', ...middlewares, async (req, res) => {
    try {
      const userId = req.user?.id;
      const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      if (userId && token) await prisma.dispositivoPush.deleteMany({ where: { token, userId } });
      return res.status(204).end();
    } catch (error) {
      console.error('[Push] No se pudo dar de baja el dispositivo:', String(error?.message || error).split('\n')[0]);
      return res.status(500).json({ error: 'No se pudo dar de baja el dispositivo.' });
    }
  });

  return router;
}

module.exports = { crearRouterPush };
