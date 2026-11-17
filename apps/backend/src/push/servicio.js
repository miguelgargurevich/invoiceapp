const { armarPayload } = require('./validacion');
const { RESULTADO } = require('./fcm');

// El servicio de avisos: a quién, qué y sin repetir. Los emisores (FCM, Web Push) se inyectan: las pruebas usan unos falsos y
// NO llaman a Google ni a ningún servicio de push.
//
// Reglas:
//  - Cada consulta filtra por usuario Y empresa (tenant): un aviso nunca llega a un dispositivo de otra empresa.
//  - Con los dos canales apagados (sin variables de entorno) no hace nada: ni toca la base.
//  - Sin dispositivos tampoco reserva la clave: si el usuario activa los avisos después, el siguiente aviso sí le llega.
//  - La clave (usuario + clave) se RESERVA antes de enviar (índice único): dos procesos, o un reintento del trabajo, no repiten el aviso.
//    Si ningún dispositivo lo recibió por un fallo (no por falta de dispositivos), la reserva se suelta para que un reintento pueda enviarlo.
//  - NUNCA lanza: lo que sale mal se cuenta en el log (sin tokens) y el flujo que pidió el aviso sigue.

const MOTIVO = Object.freeze({ APAGADO: 'apagado', SIN_DISPOSITIVOS: 'sin-dispositivos', REPETIDO: 'repetido', ENVIADO: 'enviado', FALLO: 'fallo' });

function crearServicioPush({ prisma, enviadores, log = console }) {
  const canales = { fcm: enviadores?.fcm || null, webpush: enviadores?.webpush || null };

  const activo = () => Boolean(canales.fcm || canales.webpush);

  /** Un dispositivo: envía por su canal y devuelve el resultado. Un canal apagado o un error inesperado cuentan como fallo. */
  async function enviarA(dispositivo, payload) {
    const emisor = canales[dispositivo.tipo === 'fcm' ? 'fcm' : 'webpush'];
    if (!emisor) return null; // canal apagado: este dispositivo no cuenta ni como envío ni como fallo
    try {
      return await emisor.enviar(dispositivo, payload);
    } catch (error) {
      log.warn(`[Push] No se pudo enviar a un dispositivo ${dispositivo.plataforma}: ${String(error?.message || error).split('\n')[0].slice(0, 100)}`);
      return RESULTADO.FALLO;
    }
  }

  /**
   * Avisa a UN usuario (y empresa). `clave` identifica el aviso para no repetirlo. Devuelve { motivo, enviados }.
   */
  async function avisar({ userId, empresaId, clave, titulo, cuerpo, ruta }) {
    try {
      if (!userId || !empresaId || !clave) return { motivo: MOTIVO.SIN_DISPOSITIVOS, enviados: 0 };
      if (!activo()) return { motivo: MOTIVO.APAGADO, enviados: 0 };

      const dispositivos = await prisma.dispositivoPush.findMany({ where: { userId, empresaId } });
      const usables = dispositivos.filter((d) => canales[d.tipo === 'fcm' ? 'fcm' : 'webpush']);
      if (usables.length === 0) return { motivo: MOTIVO.SIN_DISPOSITIVOS, enviados: 0 };

      // Reserva atómica (INSERT … ON CONFLICT DO NOTHING): si la clave ya estaba, otro proceso (o un reintento) ya avisó.
      const reserva = await prisma.avisoPushEnviado.createMany({ data: [{ userId, clave }], skipDuplicates: true });
      if (reserva.count === 0) return { motivo: MOTIVO.REPETIDO, enviados: 0 };

      const payload = armarPayload({ titulo, cuerpo, ruta });
      const resultados = await Promise.all(usables.map(async (d) => [d, await enviarA(d, payload)]));

      const invalidos = resultados.filter(([, r]) => r === RESULTADO.TOKEN_INVALIDO).map(([d]) => d.id);
      if (invalidos.length) await prisma.dispositivoPush.deleteMany({ where: { id: { in: invalidos }, userId, empresaId } });

      const enviados = resultados.filter(([, r]) => r === RESULTADO.ENVIADO).length;
      const fallos = resultados.filter(([, r]) => r === RESULTADO.FALLO).length;
      if (enviados === 0 && fallos > 0) {
        // Nadie lo recibió y no fue porque el teléfono ya no existiera: se suelta la reserva para poder reintentar.
        await prisma.avisoPushEnviado.deleteMany({ where: { userId, clave } });
        return { motivo: MOTIVO.FALLO, enviados: 0 };
      }
      return { motivo: MOTIVO.ENVIADO, enviados };
    } catch (error) {
      log.error(`[Push] No se pudo avisar: ${String(error?.message || error).split('\n')[0].slice(0, 120)}`);
      return { motivo: MOTIVO.FALLO, enviados: 0 };
    }
  }

  /** Para disparar sin esperar: el flujo que pide el aviso (una firma, un comprobante) nunca espera ni falla por esto. */
  function avisarSinEsperar(datos) {
    void avisar(datos);
  }

  return { avisar, avisarSinEsperar, activo };
}

/** Un servicio que no hace nada (los lugares donde el push es opcional lo usan por defecto). */
const servicioPushApagado = Object.freeze({
  avisar: async () => ({ motivo: MOTIVO.APAGADO, enviados: 0 }),
  avisarSinEsperar: () => {},
  activo: () => false,
});

module.exports = { crearServicioPush, servicioPushApagado, MOTIVO };
