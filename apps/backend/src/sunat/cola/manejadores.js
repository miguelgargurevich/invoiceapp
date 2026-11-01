const { ESTADO, siguienteReintento } = require('../emision/estados');
const { dentroDePlazoEnvio } = require('../emision/plazos');

function crearManejadores({
  servicioEmision, servicioAnulacion, notificador, encolarEnvio, encolarTicket, ahora = () => new Date(),
}) {
  async function manejarEnvio({ facturaId }) {
    const r = await servicioEmision.procesarEnvio(facturaId);
    if (r.omitido) return r;
    if (r.estado === ESTADO.ERROR_TEMPORAL) {
      // Fuera de plazo se deja de reintentar: la alerta del dashboard lo muestra.
      if (dentroDePlazoEnvio(r.fechaEmision, ahora())) await encolarEnvio(facturaId, siguienteReintento(r.intentos));
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
