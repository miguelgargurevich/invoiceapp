// Conecta la siembra con las piezas reales del backend (Prisma, motor SUNAT, almacén, cifrado).
// Lo usan los scripts de scripts/demo/. Las pruebas no pasan por aquí: llaman a sembrarDemo con piezas simuladas.
const { sembrarDemo, cuentasDemoExisten } = require('./siembra');
const { borrarDatosDemo } = require('./borrado');
const { generarCertificadoPrueba } = require('./certificado');
const { motivoNoSembrar } = require('./guardas');

async function ejecutarSiembra({ siFalta = false, reiniciar = false, registrar = console.log } = {}) {
  const motivo = motivoNoSembrar(process.env);
  if (motivo) throw new Error(motivo);

  // Carga diferida: así las pruebas y el resto del backend no arrastran el motor ni el almacén.
  const prisma = require('../utils/prisma');
  const { cifrar, descifrar } = require('../sunat/seguridad/cifrado');
  const { crearClienteEngine } = require('../sunat/engine/cliente');
  const { crearAlmacen } = require('../sunat');

  if (siFalta && await cuentasDemoExisten(prisma)) {
    registrar('[DEMO] Las cuentas de demo ya existen: no se siembra de nuevo.');
    return { omitida: true };
  }
  if (reiniciar) {
    const borrados = await borrarDatosDemo(prisma);
    registrar(`[DEMO] Datos de la demo borrados: ${borrados.usuarios} cuentas y ${borrados.empresas} empresas.`);
  }
  return sembrarDemo({
    prisma,
    engine: crearClienteEngine(),
    almacen: crearAlmacen(),
    cifrar,
    descifrar,
    generarCertificado: generarCertificadoPrueba,
    registrar: (texto) => registrar(`[DEMO] ${texto}`),
  });
}

module.exports = { ejecutarSiembra };
