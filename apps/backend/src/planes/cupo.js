// Límites del plan para la facturación electrónica de Perú: cupo mensual al emitir y regímenes por plan.
const { ErrorPlan } = require('../sunat/errores');

const TIPOS_QUE_CUENTAN = ['01', '03', '07', '08'];
const OFFSET_LIMA_MS = 5 * 3600 * 1000; // Lima es UTC-5 todo el año

function inicioMesLima(fecha) {
  const lima = new Date(fecha.getTime() - OFFSET_LIMA_MS);
  return new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), 1) + OFFSET_LIMA_MS);
}

async function limiteVigente(tx, fila, fecha) {
  const vencida = fila.proveedor_pago === 'culqi' && fila.cancel_at_period_end
    && fila.current_period_end && new Date(fila.current_period_end) < fecha;
  if (!vencida) return Number(fila.limite);
  const gratis = await tx.plan.findUnique({ where: { slug: 'pe-gratis' }, select: { maxInvoicesPerMonth: true } });
  return gratis ? gratis.maxInvoicesPerMonth : Number(fila.limite);
}

// Se llama dentro de la transacción de emitir. Bloquea la suscripción para serializar el último cupo.
async function verificarCupo(tx, empresaId, fecha) {
  const filas = await tx.$queryRaw`
    SELECT s.id, s.proveedor_pago, s.cancel_at_period_end, s.current_period_end,
           p.max_invoices_per_month AS limite, p.pais
    FROM subscriptions s JOIN plans p ON p.id = s.plan_id
    WHERE s.empresa_id = ${empresaId}
    FOR UPDATE OF s`;
  if (filas.length === 0 || filas[0].pais !== 'PE') return;
  const limite = await limiteVigente(tx, filas[0], fecha);
  if (limite === -1) return;
  const usados = await tx.factura.count({
    where: {
      empresaId,
      tipoComprobante: { in: TIPOS_QUE_CUENTAN },
      fechaEmision: { gte: inicioMesLima(fecha) },
      AND: [{ estadoSunat: { not: null } }, { estadoSunat: { not: 'BORRADOR' } }],
    },
  });
  if (usados >= limite) {
    throw new ErrorPlan(`Llegaste al límite de comprobantes de tu plan este mes (${limite}). Mejora tu plan para seguir emitiendo.`);
  }
}

// Detracción y percepción solo en planes con hasRegimenesSunat (la retención la impone el cliente: no se bloquea).
async function verificarRegimenes(prisma, empresaId, datos) {
  if (!datos.detraccion && !datos.percepcion) return;
  const sub = await prisma.subscription.findUnique({ where: { empresaId }, include: { plan: true } });
  if (!sub || sub.plan.pais !== 'PE' || sub.plan.hasRegimenesSunat) return;
  throw new ErrorPlan('La detracción y la percepción están disponibles desde el plan Negocio', { status: 403, codigo: 'FEATURE_NOT_AVAILABLE' });
}

module.exports = { verificarCupo, verificarRegimenes, inicioMesLima };
