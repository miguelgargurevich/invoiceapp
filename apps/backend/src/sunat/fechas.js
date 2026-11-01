// Perú no tiene horario de verano: Lima es siempre UTC-5.
const DESFASE_LIMA_MS = 5 * 60 * 60 * 1000;

function aLima(fecha) {
  return new Date(new Date(fecha).getTime() - DESFASE_LIMA_MS);
}

function fechaLima(fecha) {
  return aLima(fecha).toISOString().slice(0, 10);
}

function isoLima(fecha) {
  return `${aLima(fecha).toISOString().slice(0, 19)}-05:00`;
}

function diasCalendario(desde, hasta) {
  const inicio = Date.parse(`${desde}T00:00:00Z`);
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  return Math.round((fin - inicio) / 86400000);
}

module.exports = { fechaLima, isoLima, diasCalendario };
