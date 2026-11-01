const express = require('express');
const { z } = require('zod');
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const { responderError, soloPeru } = require('../sunat/http');
const { getOrCreateSubscription } = require('../middleware/subscription');
const { cifrar } = require('../sunat/seguridad/cifrado');
const { parametro } = require('../sunat/catalogos/parametros');
const { diasDesdeEmision } = require('../sunat/emision/plazos');
const {
  UNIDADES, MOTIVOS_NOTA_CREDITO, MOTIVOS_NOTA_DEBITO, DETRACCION_CODIGOS, PERCEPCION_REGIMENES,
} = require('../sunat/catalogos');

const aLista = (mapa) => Object.entries(mapa).map(([codigo, descripcion]) => ({ codigo, descripcion }));
const conPorcentaje = (mapa) => Object.entries(mapa).map(([codigo, d]) => ({ codigo, descripcion: d.descripcion, porcentaje: d.porcentaje }));

// Catálogos que muestra la interfaz: salen de src/sunat/catalogos para que el frontend no tenga una copia.
const CATALOGOS_INTERFAZ = Object.freeze({
  afectaciones: [
    { codigo: '10', descripcion: 'Gravado' },
    { codigo: '20', descripcion: 'Exonerado' },
    { codigo: '30', descripcion: 'Inafecto' },
    { codigo: '40', descripcion: 'Exportación' },
  ],
  tiposOperacion: [
    { codigo: '0101', descripcion: 'Venta interna' },
    { codigo: '0200', descripcion: 'Exportación' },
    { codigo: '1001', descripcion: 'Operación sujeta a detracción' },
  ],
  unidades: aLista(UNIDADES),
  motivosNotaCredito: aLista(MOTIVOS_NOTA_CREDITO),
  motivosNotaDebito: aLista(MOTIVOS_NOTA_DEBITO),
  detracciones: conPorcentaje(DETRACCION_CODIGOS),
  percepciones: conPorcentaje(PERCEPCION_REGIMENES),
});

const emisorSchema = z.object({
  ubigeo: z.string().regex(/^\d{6}$/, 'El ubigeo tiene 6 dígitos'),
  departamento: z.string().min(1),
  provincia: z.string().min(1),
  distrito: z.string().min(1),
  urbanizacion: z.string().optional(),
  direccionFiscal: z.string().min(1),
  codigoEstablecimiento: z.string().regex(/^\d{4}$/).default('0000'),
  ambiente: z.enum(['BETA', 'PRODUCCION']).default('BETA'),
  confirmarProduccion: z.boolean().optional(),
  solUsuario: z.string().min(1).optional(),
  solClave: z.string().min(1).optional(),
  certificado: z.object({ pfxBase64: z.string().min(1), clave: z.string() }).optional(),
  cuentaDetracciones: z.string().optional(),
  esAgenteRetencion: z.boolean().optional(),
  esAgentePercepcion: z.boolean().optional(),
});

const serieSchema = z.object({
  tipoComprobante: z.enum(['01', '03', '07', '08']),
  serie: z.string().regex(/^[FB][A-Z0-9]{3}$/, 'La serie debe tener 4 caracteres y empezar con F o B'),
});

// Solo datos no sensibles: nunca los campos *Cifrad*.
function vistaEmisor(emisor) {
  if (!emisor) return { configurado: false };
  return {
    configurado: true,
    ubigeo: emisor.ubigeo,
    departamento: emisor.departamento,
    provincia: emisor.provincia,
    distrito: emisor.distrito,
    urbanizacion: emisor.urbanizacion,
    direccionFiscal: emisor.direccionFiscal,
    codigoEstablecimiento: emisor.codigoEstablecimiento,
    ambiente: emisor.ambiente,
    solUsuario: emisor.solUsuario,
    tieneClaveSol: Boolean(emisor.solClaveCifrada),
    tieneCertificado: Boolean(emisor.certificadoCifrado),
    certificadoVence: emisor.certificadoVence,
    cuentaDetracciones: emisor.cuentaDetracciones,
    esAgenteRetencion: emisor.esAgenteRetencion,
    esAgentePercepcion: emisor.esAgentePercepcion,
  };
}

function crearRouterSunat({ prisma, obtenerSunat, auth = [authenticateToken, getEmpresaFromUser] }) {
  const router = express.Router();
  router.use(...auth);
  const manejar = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) { responderError(res, error); }
  };

  router.get('/emisor', manejar(async (req, res) => {
    res.json(vistaEmisor(await prisma.emisorSunat.findUnique({ where: { empresaId: req.empresa.id } })));
  }));

  // Configurar el emisor es lo que convierte a la empresa en "PE": no lleva soloPeru.
  router.put('/emisor', manejar(async (req, res) => {
    const d = emisorSchema.parse(req.body);
    if (d.ambiente === 'PRODUCCION' && d.confirmarProduccion !== true) {
      return res.status(400).json({ error: 'Para pasar a producción confirma explícitamente (confirmarProduccion: true)' });
    }
    const datos = {
      ubigeo: d.ubigeo,
      departamento: d.departamento,
      provincia: d.provincia,
      distrito: d.distrito,
      urbanizacion: d.urbanizacion ?? null,
      direccionFiscal: d.direccionFiscal,
      codigoEstablecimiento: d.codigoEstablecimiento,
      ambiente: d.ambiente,
      ...(d.cuentaDetracciones !== undefined ? { cuentaDetracciones: d.cuentaDetracciones } : {}),
      ...(d.esAgenteRetencion !== undefined ? { esAgenteRetencion: d.esAgenteRetencion } : {}),
      ...(d.esAgentePercepcion !== undefined ? { esAgentePercepcion: d.esAgentePercepcion } : {}),
      ...(d.solUsuario ? { solUsuario: d.solUsuario } : {}),
      ...(d.solClave ? { solClaveCifrada: cifrar(d.solClave) } : {}),
    };

    if (d.certificado) {
      const sunat = await obtenerSunat();
      if (!sunat) return res.status(503).json({ error: 'El módulo SUNAT no está disponible para validar el certificado' });
      const info = await sunat.engine.inspeccionarCertificado(d.certificado.pfxBase64, d.certificado.clave);
      if (!info.ruc) return res.status(400).json({ error: 'No se encontró el RUC dentro del certificado' });
      if (info.ruc !== req.empresa.ruc) {
        return res.status(400).json({ error: `El certificado pertenece al RUC ${info.ruc}, no al de la empresa (${req.empresa.ruc})` });
      }
      if (new Date(info.vence) <= new Date()) return res.status(400).json({ error: 'El certificado está vencido' });
      datos.certificadoCifrado = cifrar(Buffer.from(d.certificado.pfxBase64, 'base64'));
      datos.certificadoClaveCifrada = cifrar(d.certificado.clave);
      datos.certificadoVence = new Date(info.vence);
    }

    const [emisor] = await prisma.$transaction([
      prisma.emisorSunat.upsert({ where: { empresaId: req.empresa.id }, create: { empresaId: req.empresa.id, ...datos }, update: datos }),
      prisma.empresa.update({ where: { id: req.empresa.id }, data: { pais: 'PE' } }),
    ]);
    // La empresa ya es PE: su suscripción pasa al plan del país nuevo (no conserva uno de EE. UU.).
    // Si esto fallara, cada lectura posterior de la suscripción la corrige igual.
    await getOrCreateSubscription(req.empresa.id, prisma);
    return res.json(vistaEmisor(emisor));
  }));

  router.get('/series', soloPeru, manejar(async (req, res) => {
    res.json(await prisma.configuracionSeries.findMany({
      where: { empresaId: req.empresa.id, tipoDocumento: { in: ['01', '03', '07', '08'] } },
      orderBy: [{ tipoDocumento: 'asc' }, { serie: 'asc' }],
    }));
  }));

  router.post('/series', soloPeru, manejar(async (req, res) => {
    const d = serieSchema.parse(req.body);
    const prefijos = { '01': ['F'], '03': ['B'], '07': ['F', 'B'], '08': ['F', 'B'] };
    if (!prefijos[d.tipoComprobante].includes(d.serie[0])) {
      return res.status(400).json({ error: `La serie ${d.serie} no corresponde a este tipo de comprobante` });
    }
    try {
      const serie = await prisma.configuracionSeries.create({
        data: { empresaId: req.empresa.id, tipoDocumento: d.tipoComprobante, serie: d.serie, ultimoNumero: 0 },
      });
      return res.status(201).json(serie);
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ error: `La serie ${d.serie} ya existe` });
      throw error;
    }
  }));

  router.get('/catalogos', soloPeru, (req, res) => res.json(CATALOGOS_INTERFAZ));

  router.get('/alertas', soloPeru, manejar(async (req, res) => {
    const ahora = new Date();
    const emisor = await prisma.emisorSunat.findUnique({ where: { empresaId: req.empresa.id } });
    const plazo = Number(parametro('PLAZO_ENVIO_DIAS', ahora));
    const pendientes = await prisma.factura.findMany({
      where: { empresaId: req.empresa.id, estadoSunat: { in: ['PENDIENTE_ENVIO', 'ERROR_TEMPORAL'] } },
      select: { id: true, serie: true, numero: true, fechaEmision: true, estadoSunat: true, mensajeRespuestaSunat: true },
      orderBy: { fechaEmision: 'asc' },
    });
    const tickets = await prisma.procesoSunat.findMany({
      where: { empresaId: req.empresa.id, estado: 'ENVIADO', updatedAt: { lt: new Date(ahora.getTime() - 3600000) } },
      select: { id: true, tipo: true, ticket: true, createdAt: true },
    });
    const venceEn = emisor?.certificadoVence ? emisor.certificadoVence.getTime() - ahora.getTime() : null;
    res.json({
      certificadoPorVencer: venceEn !== null && venceEn < 30 * 86400000 ? { vence: emisor.certificadoVence } : null,
      comprobantesPendientes: pendientes.map((f) => ({ ...f, diasRestantes: plazo - diasDesdeEmision(f.fechaEmision, ahora) })),
      ticketsAtascados: tickets,
    });
  }));

  return router;
}

module.exports = { crearRouterSunat };
