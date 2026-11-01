const { z } = require('zod');
const { ErrorCalculo } = require('./calculo/calcular');
const {
  ErrorValidacion, ErrorEstado, ErrorFueraDePlazo, ErrorBorrador, ErrorEngineNoDisponible, ErrorConstruccion,
} = require('./errores');

function responderError(res, error) {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', detalles: error.issues });
  if (error instanceof ErrorCalculo || error instanceof ErrorBorrador) return res.status(400).json({ error: error.message });
  if (error instanceof ErrorValidacion) return res.status(422).json({ error: error.message, errores: error.errores });
  if (error instanceof ErrorConstruccion) return res.status(422).json({ error: error.message });
  if (error instanceof ErrorEstado) return res.status(409).json({ error: error.message });
  if (error instanceof ErrorFueraDePlazo) return res.status(409).json({ error: error.message, accion: 'EMITIR_NOTA_CREDITO' });
  if (error instanceof ErrorEngineNoDisponible) {
    return res.status(503).json({ error: 'El motor SUNAT no está disponible: intenta en unos minutos' });
  }
  console.error('[SUNAT]', error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

function soloPeru(req, res, next) {
  if (req.empresa?.pais === 'PE') return next();
  return res.status(403).json({ error: 'La facturación electrónica SUNAT solo está disponible para empresas de Perú' });
}

function bloquearElectronicos(prisma) {
  return async (req, res, next) => {
    try {
      const f = await prisma.factura.findFirst({
        where: { id: req.params.id, empresaId: req.empresa.id },
        select: { estadoSunat: true },
      });
      if (f?.estadoSunat) {
        return res.status(409).json({
          error: 'Los comprobantes electrónicos SUNAT se gestionan desde /api/comprobantes y no se editan una vez emitidos',
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { responderError, soloPeru, bloquearElectronicos };
