const prisma = require('../utils/prisma');
const { planGratisDe } = require('../planes/catalogo');
const { pasarAGratis } = require('../planes/gratis');

const INCLUIR = { plan: true, empresa: { select: { pais: true } } };

// Lee la fila y el país de la empresa (sin dejar `empresa` pegado a la suscripción que sale de aquí).
async function leer(empresaId, cliente) {
  const fila = await cliente.subscription.findUnique({ where: { empresaId }, include: INCLUIR });
  if (!fila) return null;
  const { empresa, ...sub } = fila;
  return { sub, pais: empresa?.pais || 'US' };
}

// Crea la suscripción inicial de la empresa según su país. Devuelve false si no hay plan para sembrarla.
async function crear(empresaId, pais, cliente) {
  let data;
  if (pais === 'PE') {
    // Perú: sin prueba gratuita; arranca en el plan gratis.
    const gratis = await planGratisDe(cliente, 'PE');
    if (!gratis) return false;
    data = { empresaId, planId: gratis.id, status: 'ACTIVE', billingInterval: 'MONTH', currentPeriodStart: new Date() };
  } else {
    // EE. UU.: prueba gratuita en el plan inicial.
    const starterPlan = await cliente.plan.findFirst({
      where: { pais: 'US', OR: [{ slug: 'starter' }, { isActive: true }] },
      orderBy: { displayOrder: 'asc' }
    });
    if (!starterPlan) return false;
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + (starterPlan.trialDays || 14));
    data = {
      empresaId, planId: starterPlan.id, status: 'TRIALING', billingInterval: 'MONTH',
      trialStart: now, trialEnd, currentPeriodStart: now, currentPeriodEnd: trialEnd,
      invoicesUsed: 0, proposalsUsed: 0, storageUsedMb: 0
    };
  }
  // skipDuplicates (ON CONFLICT DO NOTHING): dos lecturas a la vez no rompen la transacción en curso.
  await cliente.subscription.createMany({ data: [data], skipDuplicates: true });
  console.log(`[SUBSCRIPTION] Created ${pais === 'PE' ? 'pe-gratis' : 'trial'} subscription for empresa ${empresaId}`);
  return true;
}

/**
 * Suscripción VIGENTE de la empresa: la única que deben mirar los permisos y los límites.
 * Corrige la base al leer:
 *  - sin fila: la crea con el plan del país de la empresa (PE → pe-gratis);
 *  - plan de otro país que la empresa: la pasa al plan gratis del país de la empresa;
 *  - Culqi cancelada con el período vencido: la baja a pe-gratis;
 *  - Culqi en PAST_DUE: no toca la base (Culqi reintenta el cobro) pero devuelve el plan efectivo pe-gratis
 *    (`plan`) y el contratado en `planContratado`.
 * Devuelve null si no hay un plan que asignar (quien la use debe negar el acceso).
 * @param {string} empresaId
 * @param {object} [cliente] prisma o `tx` de una transacción
 * @param {{ahora?: () => Date}} [opciones] reloj (para pruebas y para la fecha de emisión)
 */
async function getOrCreateSubscription(empresaId, cliente = prisma, { ahora = () => new Date() } = {}) {
  let leida = await leer(empresaId, cliente);
  if (!leida) {
    const empresa = await cliente.empresa.findUnique({ where: { id: empresaId }, select: { pais: true } });
    if (!(await crear(empresaId, empresa?.pais || 'US', cliente))) return null;
    leida = await leer(empresaId, cliente);
    if (!leida) return null;
  }
  const { sub, pais } = leida;

  if (sub.plan.pais !== pais) {
    // Ej.: una empresa de EE. UU. con plan de EE. UU. que pasó a Perú.
    if (sub.stripeSubscriptionId) {
      console.warn(`[SUBSCRIPTION] La empresa ${empresaId} cambió de país con una suscripción de Stripe activa: revisa y cancélala`);
    }
    return pasarAGratis(cliente, sub, { pais, ahora });
  }

  if (sub.proveedorPago === 'culqi') {
    const vencida = sub.cancelAtPeriodEnd && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < ahora();
    if (vencida) return pasarAGratis(cliente, sub, { pais: 'PE', ahora, canceladaEn: ahora() });
    if (sub.status === 'PAST_DUE') {
      const gratis = await planGratisDe(cliente, 'PE');
      if (!gratis) return null;
      return { ...sub, plan: gratis, planContratado: sub.plan };
    }
  }
  return sub;
}

/**
 * Middleware to check if a feature is available in user's plan
 * @param {string} featureName - The feature flag name (e.g., 'hasProposals', 'hasDigitalSignatures')
 */
function checkFeature(featureName) {
  return async (req, res, next) => {
    try {
      if (!req.empresa) {
        return res.status(401).json({ error: 'Empresa not found' });
      }

      const subscription = await getOrCreateSubscription(req.empresa.id);

      if (!subscription) {
        return res.status(403).json({ 
          error: 'No subscription available',
          code: 'NO_SUBSCRIPTION'
        });
      }

      // Check if subscription is active
      if (!['ACTIVE', 'TRIALING'].includes(subscription.status)) {
        return res.status(403).json({
          error: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          status: subscription.status
        });
      }

      // Check feature access
      const hasFeature = subscription.plan[featureName];
      
      if (!hasFeature) {
        return res.status(403).json({ 
          error: 'This feature is not available in your current plan',
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureName,
          currentPlan: subscription.plan.slug,
          planName: subscription.plan.name,
          upgradeRequired: true
        });
      }

      // Attach subscription to request for use in route
      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('[SUBSCRIPTION] Error checking feature:', error);
      res.status(500).json({ error: 'Error checking subscription' });
    }
  };
}

/**
 * Middleware to check usage limits before creating resources
 * @param {string} resourceType - 'invoice', 'proposal', or 'client'
 */
function checkLimit(resourceType) {
  return async (req, res, next) => {
    try {
      if (!req.empresa) {
        return res.status(401).json({ error: 'Empresa not found' });
      }

      const subscription = await getOrCreateSubscription(req.empresa.id);

      if (!subscription) {
        return res.status(403).json({ 
          error: 'No subscription available',
          code: 'NO_SUBSCRIPTION'
        });
      }

      // Check if subscription is active
      if (!['ACTIVE', 'TRIALING'].includes(subscription.status)) {
        return res.status(403).json({
          error: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          status: subscription.status
        });
      }

      let limit, used, resourceName;

      switch (resourceType) {
        case 'invoice':
          limit = subscription.plan.maxInvoicesPerMonth;
          used = subscription.invoicesUsed;
          resourceName = 'invoices this month';
          break;
        case 'proposal':
          limit = subscription.plan.maxProposalsPerMonth;
          used = subscription.proposalsUsed;
          resourceName = 'proposals this month';
          break;
        case 'client':
          limit = subscription.plan.maxClients;
          // Count current active clients
          used = await prisma.cliente.count({
            where: { 
              empresaId: req.empresa.id,
              activo: true
            }
          });
          resourceName = 'clients';
          break;
        default:
          req.subscription = subscription;
          return next();
      }

      // -1 means unlimited
      if (limit === -1) {
        req.subscription = subscription;
        return next();
      }

      if (used >= limit) {
        return res.status(403).json({
          error: `You have reached the limit of ${limit} ${resourceName} for your plan`,
          code: 'LIMIT_REACHED',
          resource: resourceType,
          limit,
          used,
          currentPlan: subscription.plan.slug,
          planName: subscription.plan.name,
          upgradeRequired: true
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('[SUBSCRIPTION] Error checking limit:', error);
      res.status(500).json({ error: 'Error checking subscription limits' });
    }
  };
}

/**
 * Increment usage counter after successful resource creation
 * Call this AFTER the resource is created successfully
 * @param {string} resourceType - 'invoice' or 'proposal'
 */
async function incrementUsage(empresaId, resourceType) {
  try {
    const updateData = {};
    
    switch (resourceType) {
      case 'invoice':
        updateData.invoicesUsed = { increment: 1 };
        break;
      case 'proposal':
        updateData.proposalsUsed = { increment: 1 };
        break;
      default:
        return;
    }

    await prisma.subscription.update({
      where: { empresaId },
      data: updateData
    });

    console.log(`[SUBSCRIPTION] Incremented ${resourceType} usage for empresa ${empresaId}`);
  } catch (error) {
    console.error('[SUBSCRIPTION] Error incrementing usage:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Update storage usage
 * @param {string} empresaId 
 * @param {number} sizeMb - Size in MB (positive to add, negative to remove)
 */
async function updateStorageUsage(empresaId, sizeMb) {
  try {
    await prisma.subscription.update({
      where: { empresaId },
      data: {
        storageUsedMb: { increment: sizeMb }
      }
    });

    console.log(`[SUBSCRIPTION] Updated storage usage by ${sizeMb}MB for empresa ${empresaId}`);
  } catch (error) {
    console.error('[SUBSCRIPTION] Error updating storage:', error);
  }
}

/**
 * Check storage limit before file upload
 * @param {number} fileSizeMb - Size of file to upload in MB
 */
function checkStorageLimit(fileSizeMb = 0) {
  return async (req, res, next) => {
    try {
      if (!req.empresa) {
        return res.status(401).json({ error: 'Empresa not found' });
      }

      const subscription = await getOrCreateSubscription(req.empresa.id);

      if (!subscription) {
        return res.status(403).json({ 
          error: 'No subscription available',
          code: 'NO_SUBSCRIPTION'
        });
      }

      const limit = subscription.plan.maxStorageMb;
      const used = subscription.storageUsedMb;

      // Calculate file size from request if not provided
      let uploadSize = fileSizeMb;
      if (!uploadSize && req.file) {
        uploadSize = req.file.size / (1024 * 1024); // Convert bytes to MB
      }

      if (used + uploadSize > limit) {
        return res.status(403).json({
          error: `Storage limit exceeded. You have ${(limit - used).toFixed(1)}MB remaining`,
          code: 'STORAGE_LIMIT_EXCEEDED',
          limit,
          used,
          required: uploadSize,
          upgradeRequired: true
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('[SUBSCRIPTION] Error checking storage:', error);
      res.status(500).json({ error: 'Error checking storage limit' });
    }
  };
}

/**
 * Attach subscription to request without enforcing any limits
 * Useful for read operations where you need subscription info
 */
function attachSubscription() {
  return async (req, res, next) => {
    try {
      if (!req.empresa) {
        return next();
      }

      const subscription = await getOrCreateSubscription(req.empresa.id);
      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('[SUBSCRIPTION] Error attaching subscription:', error);
      next(); // Continue anyway for read operations
    }
  };
}

module.exports = {
  checkFeature,
  checkLimit,
  incrementUsage,
  updateStorageUsage,
  checkStorageLimit,
  attachSubscription,
  getOrCreateSubscription
};
