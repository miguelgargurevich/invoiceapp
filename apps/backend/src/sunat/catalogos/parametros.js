const { fechaLima } = require('../fechas');

// Parámetros normativos con fecha de vigencia. Un cambio de SUNAT = agregar una entrada aquí.
// Todos los valores van a verificarse en beta antes del paso a producción (ver spec).
const PARAMETROS = Object.freeze({
  ICBPER_TARIFA: [{ desde: '2023-01-01', valor: '0.50' }],
  DETRACCION_UMBRAL: [{ desde: '2000-01-01', valor: '700' }],
  RETENCION_UMBRAL: [{ desde: '2000-01-01', valor: '700' }],
  RETENCION_PORCENTAJE: [{ desde: '2014-03-01', valor: '3' }],
  BOLETA_UMBRAL_IDENTIFICACION: [{ desde: '2000-01-01', valor: '700' }],
  PLAZO_ENVIO_DIAS: [{ desde: '2000-01-01', valor: '3' }],
  PLAZO_BAJA_DIAS: [{ desde: '2000-01-01', valor: '7' }],
});

function parametro(nombre, fecha = new Date()) {
  const vigencias = PARAMETROS[nombre];
  if (!vigencias) throw new Error(`Parámetro SUNAT desconocido: ${nombre}`);
  const dia = fechaLima(fecha);
  const vigente = vigencias
    .filter((v) => v.desde <= dia)
    .sort((a, b) => (a.desde < b.desde ? 1 : -1))[0];
  if (!vigente) throw new Error(`No hay valor vigente de ${nombre} para ${dia}`);
  return vigente.valor;
}

module.exports = { parametro };
