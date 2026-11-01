// Helper de pruebas con BD real (Postgres de pruebas en el puerto 5436). Ver tarea 5 del plan.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5436/invoiceapp_test';
process.env.SUNAT_MASTER_KEY = process.env.SUNAT_MASTER_KEY || Buffer.alloc(32, 7).toString('base64');

const prisma = require('../../src/utils/prisma');
const { cifrar } = require('../../src/sunat/seguridad/cifrado');

async function limpiar() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE envios_sunat, proceso_sunat_items, procesos_sunat, cuotas_factura,
    detalles_factura, pagos_factura, facturas, configuracion_series, clientes, emisores_sunat, empresas, user_profiles
    RESTART IDENTITY CASCADE`);
}

async function crearEmpresaPeru({ ruc = '20000000001' } = {}) {
  const user = await prisma.userProfile.create({ data: { email: `u-${Date.now()}-${Math.random()}@test.pe` } });
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'Empresa Beta', razonSocial: 'EMPRESA BETA SAC', ruc, pais: 'PE', moneda: 'PEN', currency: 'PEN',
      taxRate: 18, taxName: 'IGV', userId: user.id,
      emisorSunat: {
        create: {
          ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', direccionFiscal: 'AV. PRUEBA 123',
          solUsuario: 'MODDATOS', solClaveCifrada: cifrar('moddatos'),
          certificadoCifrado: cifrar(Buffer.from('pfx-de-prueba')), certificadoClaveCifrada: cifrar('clave'),
          certificadoVence: new Date('2030-01-01T00:00:00Z'), cuentaDetracciones: '00-000-000001',
        },
      },
    },
    include: { emisorSunat: true },
  });
  for (const [tipoDocumento, serie] of [['01', 'F001'], ['03', 'B001'], ['07', 'FC01'], ['08', 'FD01'], ['07', 'BC01']]) {
    await prisma.configuracionSeries.create({ data: { empresaId: empresa.id, tipoDocumento, serie, ultimoNumero: 0 } });
  }
  const cliente = await prisma.cliente.create({
    data: { empresaId: empresa.id, tipoDocumento: '6', numeroDocumento: '20131312955', razonSocial: 'CLIENTE SAC', email: 'cliente@test.pe' },
  });
  const clienteDni = await prisma.cliente.create({
    data: { empresaId: empresa.id, tipoDocumento: '1', numeroDocumento: '12345678', razonSocial: 'JUAN PEREZ' },
  });
  return { user, empresa, cliente, clienteDni };
}

// Crea directamente un comprobante ya aceptado por SUNAT (para probar anulaciones y notas).
async function crearAceptado({ empresa, cliente, tipo = '01', serie = 'F001', numero = 1, fechaEmision = new Date() }) {
  return prisma.factura.create({
    data: {
      empresaId: empresa.id, clienteId: cliente.id, userId: empresa.userId, tipoComprobante: tipo, serie, numero,
      fechaEmision, estadoSunat: 'ACEPTADO', moneda: 'PEN', subtotal: 100, igv: 18, total: 118, totalGravadas: 100,
      montoEnLetras: 'SON: CIENTO DIECIOCHO CON 00/100 SOLES', formaPago: 'Contado', xmlKey: `sunat/x/${serie}-${numero}.xml`,
      detalles: {
        create: [{
          descripcion: 'Servicio', cantidad: 1, unidadMedida: 'NIU', precioUnitario: 100, subtotal: 100, igv: 18, total: 118,
          valorUnitario: 100, precioUnitarioIgv: 118,
        }],
      },
    },
  });
}

module.exports = { prisma, limpiar, crearEmpresaPeru, crearAceptado };
