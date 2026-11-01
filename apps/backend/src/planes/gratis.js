// Baja una suscripción al plan gratis de un país. Lo usan el webhook/servicio de Culqi y la lectura vigente
// (middleware/subscription.js), así que no depende de ninguno de los dos (sin ciclos de require).
const { planGratisDe } = require('./catalogo');

// `cliente` puede ser el prisma global o el `tx` de una transacción.
// `limpiarStripe`: además deja `stripeSubscriptionId` en null (cambio de país: esa suscripción ya se canceló
// o se intentó cancelar; si el id quedara, los webhooks de Stripe volverían a tocar la fila gratis). Culqi no lo usa.
// Devuelve la suscripción ya actualizada (con su plan) o null si ese país no tiene plan gratis.
async function pasarAGratis(cliente, sub, { pais = 'PE', ahora = () => new Date(), canceladaEn = null, limpiarStripe = false } = {}) {
  const gratis = await planGratisDe(cliente, pais);
  if (!gratis) return null;
  const ahoraMismo = ahora();
  return cliente.subscription.update({
    where: { id: sub.id },
    data: {
      planId: gratis.id, status: 'ACTIVE', billingInterval: 'MONTH',
      culqiSubscriptionId: null, culqiCardId: null, cancelAtPeriodEnd: false, canceledAt: canceladaEn,
      ...(limpiarStripe ? { stripeSubscriptionId: null } : {}),
      trialStart: null, trialEnd: null, currentPeriodStart: ahoraMismo, currentPeriodEnd: null,
    },
    include: { plan: true },
  });
}

module.exports = { pasarAGratis };
