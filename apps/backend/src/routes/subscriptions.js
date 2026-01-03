const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// Initialize Stripe with your secret key
// Remember to switch to your live secret key in production
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ==========================================
// GET PLANS
// ==========================================
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });

    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Error fetching plans' });
  }
});

// ==========================================
// GET CURRENT SUBSCRIPTION
// ==========================================
router.get('/current', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    let subscription = await prisma.subscription.findUnique({
      where: { empresaId: req.empresa.id },
      include: {
        plan: true
      }
    });

    // If no subscription exists, create a free trial on the Starter plan
    if (!subscription) {
      // Find the starter plan (or any default plan)
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
        return res.status(404).json({ error: 'No plans available' });
      }

      // Create a trial subscription
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + (starterPlan.trialDays || 14));

      subscription = await prisma.subscription.create({
        data: {
          empresaId: req.empresa.id,
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
        include: {
          plan: true
        }
      });

      console.log(`[SUBSCRIPTIONS] Created trial subscription for empresa ${req.empresa.id}`);
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Error fetching subscription' });
  }
});

// ==========================================
// CREATE CHECKOUT SESSION
// ==========================================
router.post('/create-checkout-session', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { planId, billingInterval = 'monthly', locale = 'en' } = req.body;

    // Convert frontend format (monthly/yearly) to backend format (MONTH/YEAR)
    const intervalMap = {
      'monthly': 'MONTH',
      'yearly': 'YEAR',
      'MONTH': 'MONTH',
      'YEAR': 'YEAR'
    };
    const normalizedInterval = intervalMap[billingInterval] || 'MONTH';

    // Get plan details
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Determine the correct Stripe price ID based on billing interval
    const stripePriceId = normalizedInterval === 'YEAR' 
      ? plan.stripePriceIdYearly 
      : plan.stripePriceIdMonthly;

    if (!stripePriceId) {
      return res.status(400).json({ error: 'Stripe price ID not configured for this plan' });
    }

    // Create or get Stripe customer
    let stripeCustomerId;
    const existingSubscription = await prisma.subscription.findUnique({
      where: { empresaId: req.empresa.id }
    });

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          empresa_id: req.empresa.id,
          empresa_name: req.empresa.nombre
        }
      });
      stripeCustomerId = customer.id;
    }

    // Create Checkout Session (following Stripe best practices)
    // https://docs.stripe.com/billing/subscriptions/build-subscriptions
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // The actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: `${process.env.FRONTEND_URL}/${locale}/configuracion/suscripcion?success=true&session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(plan.name)}`,
      cancel_url: `${process.env.FRONTEND_URL}/${locale}/configuracion/suscripcion?canceled=true`,
      // Enable Customer Portal for subscription management
      customer_update: {
        address: 'auto',
      },
      metadata: {
        empresa_id: req.empresa.id,
        plan_id: planId,
        billing_interval: billingInterval
      },
      subscription_data: {
        trial_period_days: plan.trialDays,
        metadata: {
          empresa_id: req.empresa.id,
          plan_id: planId
        }
      }
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Error creating checkout session' });
  }
});

// ==========================================
// CREATE CUSTOMER PORTAL SESSION
// ==========================================
router.post('/create-portal-session', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { locale = 'en' } = req.body;
    
    const subscription = await prisma.subscription.findUnique({
      where: { empresaId: req.empresa.id }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (!subscription.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer ID found' });
    }

    // Create a portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/${locale}/configuracion/suscripcion`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Error creating portal session' });
  }
});

// ==========================================
// CANCEL SUBSCRIPTION
// ==========================================
router.post('/cancel', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { empresaId: req.empresa.id }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active Stripe subscription' });
    }

    // Cancel at period end (don't immediately cancel)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    // Update database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date()
      }
    });

    res.json({ message: 'Subscription will be canceled at period end' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Error canceling subscription' });
  }
});

// ==========================================
// REACTIVATE SUBSCRIPTION
// ==========================================
router.post('/reactivate', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { empresaId: req.empresa.id }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({ error: 'Subscription is not scheduled for cancellation' });
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    // Update database
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null
      }
    });

    res.json({ message: 'Subscription reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Error reactivating subscription' });
  }
});

// ==========================================
// GET USAGE STATISTICS
// ==========================================
router.get('/usage', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    let subscription = await prisma.subscription.findUnique({
      where: { empresaId: req.empresa.id },
      include: {
        plan: {
          select: {
            maxInvoicesPerMonth: true,
            maxClients: true,
            maxProposalsPerMonth: true,
            maxStorageMb: true
          }
        }
      }
    });

    // If no subscription exists, create a free trial (same logic as /current)
    if (!subscription) {
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
        return res.status(404).json({ error: 'No plans available' });
      }

      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + (starterPlan.trialDays || 14));

      subscription = await prisma.subscription.create({
        data: {
          empresaId: req.empresa.id,
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
        include: {
          plan: {
            select: {
              maxInvoicesPerMonth: true,
              maxClients: true,
              maxProposalsPerMonth: true,
              maxStorageMb: true
            }
          }
        }
      });

      console.log(`[SUBSCRIPTIONS] Created trial subscription for usage - empresa ${req.empresa.id}`);
    }

    // Get actual counts from the database
    const [invoicesCount, proposalsCount, clientsCount] = await Promise.all([
      prisma.factura.count({
        where: { 
          empresaId: req.empresa.id,
          createdAt: {
            gte: subscription.currentPeriodStart || new Date(new Date().setDate(1))
          }
        }
      }),
      prisma.proforma.count({
        where: { 
          empresaId: req.empresa.id,
          createdAt: {
            gte: subscription.currentPeriodStart || new Date(new Date().setDate(1))
          }
        }
      }),
      prisma.cliente.count({
        where: { empresaId: req.empresa.id }
      })
    ]);

    res.json({
      invoicesCount,
      proposalsCount,
      clientsCount,
      storageUsedMb: subscription.storageUsedMb || 0
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Error fetching usage' });
  }
});

module.exports = router;
