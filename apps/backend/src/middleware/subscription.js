const prisma = require('../utils/prisma');

/**
 * Get or create subscription for empresa
 * Creates a trial subscription if none exists
 */
async function getOrCreateSubscription(empresaId) {
  let subscription = await prisma.subscription.findUnique({
    where: { empresaId },
    include: { plan: true }
  });

  if (!subscription) {
    // Find starter plan
    const starterPlan = await prisma.plan.findFirst({
      where: { 
        OR: [
          { slug: 'starter' },
          { isActive: true }
        ]
      },
      orderBy: { displayOrder: 'asc' }
    });

    if (!starterPlan) {
      return null;
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + (starterPlan.trialDays || 14));

    subscription = await prisma.subscription.create({
      data: {
        empresaId,
        planId: starterPlan.id,
        status: 'TRIALING',
        billingInterval: 'MONTH',
        trialStart: now,
        trialEnd: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        invoicesUsed: 0,
        proposalsUsed: 0,
        storageUsedMb: 0
      },
      include: { plan: true }
    });

    console.log(`[SUBSCRIPTION] Created trial subscription for empresa ${empresaId}`);
  }

  return subscription;
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
