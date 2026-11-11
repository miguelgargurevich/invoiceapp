// Límite diario de la demo: máximo 30 comprobantes emitidos por empresa y por día (hora de Lima).
// Se cuenta en la base (no en memoria): sobrevive a reinicios y a varias instancias.
const { esDemo, LIMITE_DIARIO } = require('./modo');

const OFFSET_LIMA_MS = 5 * 3600 * 1000; // Lima es UTC-5 todo el año
const DIA_MS = 24 * 3600 * 1000;

function rangoDiaLima(fecha) {
  const lima = new Date(fecha.getTime() - OFFSET_LIMA_MS);
  const inicio = new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate()) + OFFSET_LIMA_MS);
  return { inicio, fin: new Date(inicio.getTime() + DIA_MS) };
}

// «Emitido» = ya salió de BORRADOR (la fecha de emisión se fija al emitir, no al guardar el borrador).
async function emitidosHoy(prisma, empresaId, ahora) {
  const { inicio, fin } = rangoDiaLima(ahora);
  return prisma.factura.count({
    where: {
      empresaId,
      fechaEmision: { gte: inicio, lt: fin },
      AND: [{ estadoSunat: { not: null } }, { estadoSunat: { not: 'BORRADOR' } }],
    },
  });
}

// Middleware para POST /api/comprobantes/:id/emitir (necesita req.empresa).
function crearLimiteDiario({ prisma, ahora = () => new Date() }) {
  return async (req, res, next) => {
    if (!esDemo()) return next();
    try {
      if ((await emitidosHoy(prisma, req.empresa.id, ahora())) >= LIMITE_DIARIO) {
        return res.status(429).json({
          error: `Llegaste al límite de la demo: ${LIMITE_DIARIO} comprobantes por día. Vuelve mañana o crea tu cuenta real.`,
          codigo: 'DEMO_LIMITE',
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { rangoDiaLima, emitidosHoy, crearLimiteDiario };
