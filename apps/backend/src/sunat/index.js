const { crearCola } = require('./cola');
const { crearManejadores } = require('./cola/manejadores');
const { crearClienteEngine } = require('./engine/cliente');
const { crearAlmacenPrivado } = require('./almacen');
const { crearAlmacenLocal } = require('./almacenLocal');
const { crearServicioEmision } = require('./emision/servicio');
const { crearServicioAnulacion } = require('./emision/anulacion');
const { crearNotificador } = require('./notificador');
const { descifrar, obtenerLlave } = require('./seguridad/cifrado');
const { sendEmail } = require('../services/emailService');

// Almacén de XML/CDR. Con SUNAT_ALMACEN_DIR (solo desarrollo) va a disco; en producción se niega.
function crearAlmacen(env = process.env) {
  if (env.SUNAT_ALMACEN_DIR) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SUNAT_ALMACEN_DIR no se permite en producción: usa R2_PRIVATE_BUCKET');
    }
    console.log('[SUNAT] Almacén local en', env.SUNAT_ALMACEN_DIR);
    return crearAlmacenLocal(env.SUNAT_ALMACEN_DIR);
  }
  // `|| ''` evita que el valor por defecto de crearAlmacenPrivado lea process.env cuando se pasa otro env.
  return crearAlmacenPrivado({ bucket: env.R2_PRIVATE_BUCKET || '' });
}

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
  const almacen = crearAlmacen();
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

module.exports = { iniciarSunat, crearAlmacen };
