const { crearCola } = require('./cola');
const { crearManejadores } = require('./cola/manejadores');
const { crearClienteEngine } = require('./engine/cliente');
const { crearAlmacenPrivado } = require('./almacen');
const { crearServicioEmision } = require('./emision/servicio');
const { crearServicioAnulacion } = require('./emision/anulacion');
const { crearNotificador } = require('./notificador');
const { descifrar, obtenerLlave } = require('./seguridad/cifrado');
const { sendEmail } = require('../services/emailService');

// Arranca el módulo SUNAT solo si está configurado. Sin SUNAT_ENGINE_URL, InvoiceApp sigue igual que hoy.
async function iniciarSunat({ prisma }) {
  if (!process.env.SUNAT_ENGINE_URL) {
    console.log('[SUNAT] SUNAT_ENGINE_URL no definido: módulo SUNAT desactivado');
    return null;
  }
  obtenerLlave(); // falla temprano si SUNAT_MASTER_KEY no es válida

  const cola = crearCola({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await cola.iniciar();

  const engine = crearClienteEngine();
  const almacen = crearAlmacenPrivado();
  const servicioEmision = crearServicioEmision({ prisma, engine, almacen, descifrar, cola });
  const servicioAnulacion = crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola });
  const notificador = crearNotificador({ prisma, almacen, enviarCorreo: sendEmail });

  await cola.trabajar(crearManejadores({
    servicioEmision,
    servicioAnulacion,
    notificador,
    encolarEnvio: cola.encolarEnvio,
    encolarTicket: cola.encolarTicket,
  }));
  console.log('[SUNAT] Módulo SUNAT iniciado');
  return { engine, almacen, servicioEmision, servicioAnulacion };
}

module.exports = { iniciarSunat };
