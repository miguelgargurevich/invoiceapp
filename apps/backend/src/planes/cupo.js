// Límites del plan para la facturación electrónica de Perú: cupo mensual al emitir y regímenes por plan.
const { ErrorPlan } = require('../sunat/errores');
const { getOrCreateSubscription } = require('../middleware/subscription');

const TIPOS_QUE_CUENTAN = ['01', '03', '07', '08'];
const OFFSET_LIMA_MS = 5 * 3600 * 1000; // Lima es UTC-5 todo el año

function inicioMesLima(fecha) {
  const lima = new Date(fecha.getTime() - OFFSET_LIMA_MS);
  return new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), 1) + OFFSET_LIMA_MS);
}

const sinPlan = () => new ErrorPlan(
  'No pudimos verificar tu plan. Intenta de nuevo o contacta a soporte.',
  { status: 403, codigo: 'NO_SUBSCRIPTION' },
);

// Se llama dentro de la transacción de emitir. Falla CERRADO: sin un plan peruano vigente no se emite.
// Bloquea la suscripción para serializar el último cupo y la lee ya bajo el candado (plan efectivo).
async function verificarCupo(tx, empresaId, fecha) {
  const reloj = { ahora: () => fecha };
  if (!(await getOrCreateSubscription(empresaId, tx, reloj))) throw sinPlan(); // garantiza que la fila exista
  await tx.$queryRaw`SELECT id FROM subscriptions WHERE empresa_id = ${empresaId} FOR UPDATE`;
  const sub = await getOrCreateSubscription(empresaId, tx, reloj);
  if (!sub || sub.plan.pais !== 'PE') throw sinPlan();
  const limite = sub.plan.maxInvoicesPerMonth;
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
// Falla CERRADO: sin un plan peruano vigente que los incluya, se niegan.
async function verificarRegimenes(prisma, empresaId, datos) {
  if (!datos.detraccion && !datos.percepcion) return;
  const sub = await getOrCreateSubscription(empresaId, prisma);
  if (sub && sub.plan.pais === 'PE' && sub.plan.hasRegimenesSunat) return;
  throw new ErrorPlan('La detracción y la percepción están disponibles desde el plan Negocio', { status: 403, codigo: 'FEATURE_NOT_AVAILABLE' });
}

module.exports = { verificarCupo, verificarRegimenes, inicioMesLima };
