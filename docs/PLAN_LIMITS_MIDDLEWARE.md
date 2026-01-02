# 🔒 Plan Limits & Middleware Implementation

## 📋 Feature Matrix

| Feature | Starter | Pro | Business |
|---------|---------|-----|----------|
| **Invoices/month** | 20 | 100 | ∞ |
| **Clients** | 10 | 50 | ∞ |
| **Proposals/month** | ❌ | 30 | ∞ |
| **Storage** | 100 MB | 500 MB | 2 GB |
| **Basic Reports** | ✅ | ✅ | ✅ |
| **PDF Export** | ✅ | ✅ | ✅ |
| **EN/ES Languages** | ✅ | ✅ | ✅ |
| **Proposals** | ❌ | ✅ | ✅ |
| **Digital Signatures** | ❌ | ✅ | ✅ |
| **Custom Branding** | ❌ | ✅ | ✅ |
| **Job Tracking** | ❌ | ✅ | ✅ |
| **Multi-Currency** | ❌ | ❌ | ✅ |
| **Advanced Reports** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |

## 🎯 Middleware Implementation

### 1. Create Subscription Middleware

**File:** `apps/backend/src/middleware/subscription.js`

```javascript
const prisma = require('../utils/prisma');

/**
 * Check if feature is available in user's plan
 */
async function checkFeature(featureName) {
  return async (req, res, next) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { empresaId: req.empresa.id },
        include: { plan: true }
      });

      if (!subscription) {
        return res.status(403).json({ 
          error: 'No active subscription',
          feature: featureName 
        });
      }

      // Check feature access
      const hasFeature = subscription.plan[featureName];
      
      if (!hasFeature) {
        return res.status(403).json({ 
          error: 'Feature not available in your plan',
          feature: featureName,
          currentPlan: subscription.plan.slug,
          upgradeUrl: '/settings?tab=subscription'
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Error checking feature:', error);
      res.status(500).json({ error: 'Error checking subscription' });
    }
  };
}

/**
 * Check usage limits before creating resources
 */
async function checkLimit(resourceType) {
  return async (req, res, next) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { empresaId: req.empresa.id },
        include: { plan: true }
      });

      if (!subscription) {
        return res.status(403).json({ 
          error: 'No active subscription' 
        });
      }

      let limit, used;

      switch (resourceType) {
        case 'invoice':
          limit = subscription.plan.maxInvoicesPerMonth;
          used = subscription.invoicesUsed;
          break;
        case 'proposal':
          limit = subscription.plan.maxProposalsPerMonth;
          used = subscription.proposalsUsed;
          break;
        case 'client':
          limit = subscription.plan.maxClients;
          // Count current clients
          used = await prisma.cliente.count({
            where: { empresaId: req.empresa.id }
          });
          break;
        default:
          return next();
      }

      // -1 means unlimited
      if (limit === -1) {
        req.subscription = subscription;
        return next();
      }

      if (used >= limit) {
        return res.status(403).json({
          error: 'Limit reached for your plan',
          resource: resourceType,
          limit,
          used,
          upgradeUrl: '/settings?tab=subscription'
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Error checking limit:', error);
      res.status(500).json({ error: 'Error checking subscription limits' });
    }
  };
}

/**
 * Increment usage counter after successful creation
 */
async function incrementUsage(resourceType) {
  return async (req, res, next) => {
    // Store original res.json
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Only increment on successful creation (status 200 or 201)
      if (res.statusCode === 200 || res.statusCode === 201) {
        incrementUsageAsync(req.empresa.id, resourceType).catch(err => {
          console.error('Error incrementing usage:', err);
        });
      }
      return originalJson(data);
    };

    next();
  };
}

async function incrementUsageAsync(empresaId, resourceType) {
  const updateData = {};
  
  switch (resourceType) {
    case 'invoice':
      updateData.invoicesUsed = { increment: 1 };
      break;
    case 'proposal':
      updateData.proposalsUsed = { increment: 1 };
      break;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.subscription.update({
      where: { empresaId },
      data: updateData
    });
  }
}

module.exports = {
  checkFeature,
  checkLimit,
  incrementUsage
};
```

### 2. Apply to Routes

#### Invoices Route
```javascript
// apps/backend/src/routes/facturas.js
const { checkLimit, incrementUsage } = require('../middleware/subscription');

// Create invoice
router.post('/', 
  authenticateToken, 
  getEmpresaFromUser,
  checkLimit('invoice'),      // Check before creating
  incrementUsage('invoice'),  // Increment after success
  async (req, res) => {
    // ... invoice creation logic
  }
);
```

#### Proposals Route
```javascript
// apps/backend/src/routes/proformas.js
const { checkFeature, checkLimit, incrementUsage } = require('../middleware/subscription');

// Create proposal
router.post('/', 
  authenticateToken, 
  getEmpresaFromUser,
  checkFeature('hasProposals'),  // Pro+ only
  checkLimit('proposal'),
  incrementUsage('proposal'),
  async (req, res) => {
    // ... proposal creation logic
  }
);

// Get proposals list
router.get('/', 
  authenticateToken, 
  getEmpresaFromUser,
  checkFeature('hasProposals'),  // Pro+ only
  async (req, res) => {
    // ... list proposals
  }
);
```

#### Clients Route
```javascript
// apps/backend/src/routes/clientes.js
const { checkLimit } = require('../middleware/subscription');

router.post('/', 
  authenticateToken, 
  getEmpresaFromUser,
  checkLimit('client'),
  async (req, res) => {
    // ... client creation logic
  }
);
```

#### Signatures Route
```javascript
// apps/backend/src/routes/signatures.js
const { checkFeature } = require('../middleware/subscription');

router.post('/request', 
  authenticateToken, 
  getEmpresaFromUser,
  checkFeature('hasDigitalSignatures'),  // Pro+ only
  async (req, res) => {
    // ... signature request logic
  }
);
```

#### Reports Route
```javascript
// apps/backend/src/routes/reportes.js
const { checkFeature } = require('../middleware/subscription');

// Basic reports (all plans)
router.get('/basic/:type', 
  authenticateToken, 
  getEmpresaFromUser,
  checkFeature('hasReports'),
  async (req, res) => {
    // ... basic reports
  }
);

// Advanced reports (Business only)
router.get('/advanced/:type', 
  authenticateToken, 
  getEmpresaFromUser,
  checkFeature('hasAdvancedReports'),
  async (req, res) => {
    // ... advanced reports
  }
);
```

### 3. Frontend Feature Guards

**File:** `apps/frontend/lib/subscriptionGuards.ts`

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

export function useFeatureAccess(feature: string) {
  const { subscription, loading } = useSubscription();
  
  if (loading) return { hasAccess: false, loading: true };
  
  const hasAccess = subscription?.plan?.[feature] ?? false;
  
  return {
    hasAccess,
    loading: false,
    currentPlan: subscription?.plan?.slug,
    planName: subscription?.plan?.name
  };
}

// Usage in components
function ProposalButton() {
  const { hasAccess, currentPlan } = useFeatureAccess('hasProposals');
  
  if (!hasAccess) {
    return (
      <UpgradeButton 
        feature="Proposals"
        currentPlan={currentPlan}
      />
    );
  }
  
  return <CreateProposalButton />;
}
```

### 4. Reset Monthly Counters

Create a cron job or scheduled task:

```javascript
// apps/backend/src/jobs/resetMonthlyUsage.js
const prisma = require('../utils/prisma');

async function resetMonthlyUsage() {
  const now = new Date();
  
  // Reset for subscriptions where current period has ended
  await prisma.subscription.updateMany({
    where: {
      currentPeriodEnd: {
        lte: now
      }
    },
    data: {
      invoicesUsed: 0,
      proposalsUsed: 0
    }
  });
  
  console.log('[CRON] Monthly usage counters reset');
}

// Run daily
module.exports = resetMonthlyUsage;
```

## 🎨 Frontend UX for Limits

### Upgrade Prompts
- Show progress bars for usage (e.g., "18/20 invoices used")
- Block actions with upgrade modal when limit reached
- Show "Upgrade to Pro" badges on locked features

### Settings Page
Display current plan limits clearly:
- Invoices: 18/20 this month
- Clients: 7/10 total
- Storage: 45 MB / 100 MB

## 🔄 Next Steps

1. ✅ Adjust `seed_plans.sql` (done)
2. ⬜ Create `middleware/subscription.js`
3. ⬜ Apply middleware to routes
4. ⬜ Add frontend feature guards
5. ⬜ Create subscription context
6. ⬜ Add usage display in dashboard
7. ⬜ Implement upgrade flow
8. ⬜ Create cron job for monthly resets
9. ⬜ Add Stripe webhooks for subscription events

## 🚀 Webhook Events to Handle

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
