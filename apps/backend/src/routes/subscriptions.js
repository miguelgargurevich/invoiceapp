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

    res.json({
      subscription,
      empresa: {
        id: req.empresa.id,
        nombre: req.empresa.nombre
      }
    });
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

    // Get plan details - look up by slug (planId from frontend is the slug)
    const plan = await prisma.plan.findUnique({
      where: { slug: planId }
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
      success_url: `${process.env.FRONTEND_URL}/${locale}/configuracion?tab=suscripcion&success=true&session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(plan.name)}`,
      cancel_url: `${process.env.FRONTEND_URL}/${locale}/configuracion?tab=suscripcion&canceled=true`,
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
// SYNC SUBSCRIPTION FROM CHECKOUT SESSION
// ==========================================
router.post('/sync-from-session', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Session not complete' });
    }

    // Get metadata
    const empresaId = session.metadata.empresa_id;
    const planSlug = session.metadata.plan_id;
    const rawBillingInterval = session.metadata.billing_interval || 'monthly';

    // Verify empresa matches authenticated user
    if (empresaId !== req.empresa.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get plan by slug
    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Normalize billing interval
    const billingInterval = rawBillingInterval === 'monthly' ? 'MONTH' : 
                            rawBillingInterval === 'yearly' ? 'YEAR' : 
                            rawBillingInterval;

    // Get Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

    // Helper to safely convert timestamps
    const safeDate = (timestamp) => {
      if (!timestamp) return null;
      const date = new Date(timestamp * 1000);
      return isNaN(date.getTime()) ? null : date;
    };

    // Update subscription in database
    const subscription = await prisma.subscription.upsert({
      where: { empresaId: empresaId },
      update: {
        planId: plan.id,
        status: stripeSubscription.status.toUpperCase(),
        billingInterval: billingInterval,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        currentPeriodStart: safeDate(stripeSubscription.current_period_start),
        currentPeriodEnd: safeDate(stripeSubscription.current_period_end),
        trialStart: safeDate(stripeSubscription.trial_start),
        trialEnd: safeDate(stripeSubscription.trial_end),
        updatedAt: new Date()
      },
      create: {
        empresaId: empresaId,
        planId: plan.id,
        status: stripeSubscription.status.toUpperCase(),
        billingInterval: billingInterval,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        currentPeriodStart: safeDate(stripeSubscription.current_period_start),
        currentPeriodEnd: safeDate(stripeSubscription.current_period_end),
        trialStart: safeDate(stripeSubscription.trial_start),
        trialEnd: safeDate(stripeSubscription.trial_end),
        invoicesUsed: 0,
        proposalsUsed: 0,
        storageUsedMb: 0
      },
      include: { plan: true }
    });

    console.log(`✅ [SYNC] Subscription synced for empresa ${empresaId} to plan ${plan.name}`);

    res.json({ 
      message: 'Subscription synced successfully',
      subscription 
    });
  } catch (error) {
    console.error('Error syncing subscription:', error);
    res.status(500).json({ error: 'Error syncing subscription' });
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
      return_url: `${process.env.FRONTEND_URL}/${locale}/configuracion?tab=suscripcion`,
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
// SWITCH TO FREE PLAN
// ==========================================
router.post('/switch-to-free', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { empresaId: req.empresa.id },
      include: { plan: true }
    });

    // Get the free plan
    const freePlan = await prisma.plan.findUnique({
      where: { slug: 'free' }
    });

    if (!freePlan) {
      return res.status(404).json({ error: 'Free plan not found' });
    }

    // If user has an active Stripe subscription, cancel it
    if (subscription?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        console.log(`[SUBSCRIPTIONS] Canceled Stripe subscription ${subscription.stripeSubscriptionId} for empresa ${req.empresa.id}`);
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError);
        // Continue anyway - the user wants to switch to free
      }
    }

    // Update or create subscription with free plan
    const now = new Date();
    const updatedSubscription = await prisma.subscription.upsert({
      where: { empresaId: req.empresa.id },
      update: {
        planId: freePlan.id,
        status: 'ACTIVE',
        billingInterval: 'MONTH',
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: null, // Free plan has no end date
        trialStart: null,
        trialEnd: null,
        updatedAt: now
      },
      create: {
        empresaId: req.empresa.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        billingInterval: 'MONTH',
        currentPeriodStart: now,
        invoicesUsed: 0,
        proposalsUsed: 0,
        storageUsedMb: 0
      },
      include: { plan: true }
    });

    console.log(`[SUBSCRIPTIONS] Switched empresa ${req.empresa.id} to Free plan`);

    res.json({ 
      message: 'Successfully switched to Free plan',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Error switching to free plan:', error);
    res.status(500).json({ error: 'Error switching to free plan' });
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

    // Calculate percentages
    const maxInvoices = subscription.plan?.maxInvoicesPerMonth;
    const maxClients = subscription.plan?.maxClients;
    const maxProposals = subscription.plan?.maxProposalsPerMonth;

    const invoicesPercentage = maxInvoices ? (invoicesCount / maxInvoices) * 100 : null;
    const clientsPercentage = maxClients ? (clientsCount / maxClients) * 100 : null;
    const proposalsPercentage = maxProposals ? (proposalsCount / maxProposals) * 100 : null;

    res.json({
      currentPeriod: {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd
      },
      usage: {
        invoices: invoicesCount,
        clients: clientsCount,
        users: 1 // For now, single user
      },
      limits: {
        maxInvoices: maxInvoices,
        maxClients: maxClients,
        maxUsers: null // Unlimited for now
      },
      percentages: {
        invoices: invoicesPercentage,
        clients: clientsPercentage,
        users: null
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Error fetching usage' });
  }
});

module.exports = router;
