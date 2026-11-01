const ESTADO = Object.freeze({
  BORRADOR: 'BORRADOR',
  PENDIENTE_ENVIO: 'PENDIENTE_ENVIO',
  ERROR_TEMPORAL: 'ERROR_TEMPORAL',
  ACEPTADO: 'ACEPTADO',
  ACEPTADO_CON_OBS: 'ACEPTADO_CON_OBS',
  RECHAZADO: 'RECHAZADO',
  ANULACION_PENDIENTE: 'ANULACION_PENDIENTE',
  ANULADO: 'ANULADO',
});

// Rangos SUNAT: 0100-1999 excepción (reintentar), 2000-3999 rechazo, 4000+ observaciones.
function clasificarRespuesta({ codigo, observaciones = [] }) {
  if (codigo === null || codigo === undefined || codigo === '') return ESTADO.ERROR_TEMPORAL;
  const n = Number(codigo);
  if (n === 0) return observaciones.length ? ESTADO.ACEPTADO_CON_OBS : ESTADO.ACEPTADO;
  if (n === 1033) return 'CONSULTAR_CDR'; // ya registrado: se consulta el CDR en vez de reenviar
  if (n >= 100 && n <= 1999) return ESTADO.ERROR_TEMPORAL;
  if (n >= 2000 && n <= 3999) return ESTADO.RECHAZADO;
  if (n >= 4000) return ESTADO.ACEPTADO_CON_OBS;
  return ESTADO.ERROR_TEMPORAL;
}

const ESPERAS_SEGUNDOS = [60, 300, 900, 3600];

function siguienteReintento(intentos) {
  return ESPERAS_SEGUNDOS[Math.min(intentos, ESPERAS_SEGUNDOS.length) - 1];
}

module.exports = { ESTADO, clasificarRespuesta, siguienteReintento };
