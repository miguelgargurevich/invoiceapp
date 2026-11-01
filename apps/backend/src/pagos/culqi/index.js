const prisma = require('../../utils/prisma');
const { crearClienteCulqi } = require('./cliente');
const { crearServicioCulqi } = require('./suscripciones');

let servicio = null;
function obtenerServicioCulqi() {
  if (!servicio) servicio = crearServicioCulqi({ prisma, culqi: crearClienteCulqi() });
  return servicio;
}

module.exports = { obtenerServicioCulqi };
