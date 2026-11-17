const { crearEnviadores } = require('./config');
const { crearServicioPush, servicioPushApagado } = require('./servicio');
const { crearAvisos, programarVencidas } = require('./avisos');
const { crearRouterPush } = require('./rutas');

/**
 * Arma todo el push de una vez para app.js. NUNCA lanza ni rompe el arranque: sin variables de entorno (o con una configuración mala)
 * los canales quedan apagados, se avisa una vez en el log y la API funciona igual (las rutas /api/push existen y dicen «no disponible»).
 * Devuelve { servicio, avisos, router, detener }.
 */
function iniciarPush({ prisma, auth, env = process.env, esDemo = () => false, programar = true, log = console } = {}) {
  let enviadores = { fcm: null, webpush: null, vapidPublica: null };
  try {
    enviadores = crearEnviadores({ env, log });
  } catch (error) {
    log.warn(`[Push] No se pudo preparar el envío; los avisos quedan apagados: ${String(error?.message || error).split('\n')[0].slice(0, 100)}`);
  }
  const servicio = crearServicioPush({ prisma, enviadores, log });
  const avisos = crearAvisos({ prisma, servicio });
  const router = crearRouterPush({ prisma, auth, enviadores, esDemo });

  let detener = () => {};
  // La demo pública no manda avisos (cuentas compartidas entre visitantes).
  if (programar && servicio.activo() && !esDemo()) detener = programarVencidas({ avisos, log });

  return { servicio, avisos, router, detener };
}

module.exports = { iniciarPush, servicioPushApagado };
