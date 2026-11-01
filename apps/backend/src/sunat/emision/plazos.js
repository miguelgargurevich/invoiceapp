const { parametro } = require('../catalogos/parametros');
const { fechaLima, diasCalendario } = require('../fechas');

function diasDesdeEmision(fechaEmision, ahora) {
  return diasCalendario(fechaLima(fechaEmision), fechaLima(ahora));
}

function dentroDePlazoEnvio(fechaEmision, ahora = new Date()) {
  return diasDesdeEmision(fechaEmision, ahora) <= Number(parametro('PLAZO_ENVIO_DIAS', ahora));
}

function dentroDePlazoBaja(fechaEmision, ahora = new Date()) {
  return diasDesdeEmision(fechaEmision, ahora) <= Number(parametro('PLAZO_BAJA_DIAS', ahora));
}

module.exports = { dentroDePlazoEnvio, dentroDePlazoBaja, diasDesdeEmision };
