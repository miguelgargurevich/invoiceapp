const { ESTADO, siguienteReintento } = require('../emision/estados');
const { dentroDePlazoEnvio } = require('../emision/plazos');

// `avisos` (opcional) manda los avisos push al dueño: SUNAT rechazó o el envío quedó fuera de plazo. Por defecto no hace nada.
// Un aviso nunca cambia el resultado del trabajo: se lanza sin esperar y sus errores no suben.
const SIN_AVISOS = { comprobanteRechazado: async () => {}, envioFueraDePlazo: async () => {} };

function crearManejadores({
  servicioEmision, servicioAnulacion, notificador, encolarEnvio, encolarTicket, ahora = () => new Date(), avisos = SIN_AVISOS,
}) {
  const avisar = (nombre, facturaId) => {
    try {
      Promise.resolve(avisos[nombre](facturaId)).catch((error) => {
        console.error('[Push] No se pudo avisar (' + nombre + '):', facturaId, error.message);
      });
    } catch (error) {
      console.error('[Push] No se pudo avisar (' + nombre + '):', facturaId, error.message);
    }
  };

  async function manejarEnvio({ facturaId }) {
    const r = await servicioEmision.procesarEnvio(facturaId);
    if (r.omitido) return r;
    if (r.estado === ESTADO.ERROR_TEMPORAL) {
      // Fuera de plazo se deja de reintentar: la alerta del dashboard lo muestra.
      if (dentroDePlazoEnvio(r.fechaEmision, ahora())) await encolarEnvio(facturaId, siguienteReintento(r.intentos));
      else avisar('envioFueraDePlazo', facturaId);
    } else if (r.estado === ESTADO.RECHAZADO) {
      avisar('comprobanteRechazado', facturaId);
    } else if (r.estado === ESTADO.ACEPTADO || r.estado === ESTADO.ACEPTADO_CON_OBS) {
      await notificador.comprobanteAceptado(facturaId).catch((error) => {
        console.error('[SUNAT] No se pudo enviar el correo del comprobante', facturaId, error.message);
      });
    }
    return r;
  }

  async function manejarTicket({ procesoId }) {
    const r = await servicioAnulacion.procesarTicket(procesoId);
    if (r.pendiente) await encolarTicket(procesoId, 60);
    return r;
  }

  return { manejarEnvio, manejarTicket };
}

module.exports = { crearManejadores };
