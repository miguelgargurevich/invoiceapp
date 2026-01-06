const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');

// Initialize Stripe with your secret key
// Remember to switch to your live secret key in production
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ==========================================
// STRIPE WEBHOOK HANDLER
// ==========================================
// Note: This route MUST use express.raw() for body parsing
// Configure in app.js before other body parsers
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature (following Stripe best practices)
    // https://docs.stripe.com/webhooks/signatures
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ Webhook verified:', event.type);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Payment is successful and the subscription is created.
        // You should provision the subscription and save the customer ID to your database.
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        // Continue to provision the subscription as payments continue to be made.
        // Store the status in your database and check when a user accesses your service.
        // This approach helps you avoid hitting rate limits.
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        // The payment failed or the customer doesn't have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ==========================================
// WEBHOOK HANDLERS
// ==========================================

async function handleCheckoutSessionCompleted(session) {
  try {
    console.log('💳 Checkout session completed:', session.id);
    console.log('📦 Session metadata:', JSON.stringify(session.metadata, null, 2));

    const empresaId = session.metadata.empresa_id;
    const planSlug = session.metadata.plan_id; // This is the slug, not the UUID
    const rawBillingInterval = session.metadata.billing_interval || 'monthly';
    
    console.log('🔍 Looking for plan with slug:', planSlug);
    
    // Normalize billing interval to database format
    const billingInterval = rawBillingInterval === 'monthly' ? 'MONTH' : 
                            rawBillingInterval === 'yearly' ? 'YEAR' : 
                            rawBillingInterval;

    if (!empresaId || !planSlug) {
      console.error('❌ Missing metadata in checkout session:', { empresaId, planSlug });
      return;
    }

    // Get plan by slug to get the UUID
    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug }
    });

    if (!plan) {
      console.error('❌ Plan not found for slug:', planSlug);
      // Try to find by name as fallback
      const planByName = await prisma.plan.findFirst({
        where: { name: { contains: planSlug, mode: 'insensitive' } }
      });
      if (planByName) {
        console.log('✅ Found plan by name instead:', planByName.name, planByName.id);
      }
      return;
    }
    
    console.log('✅ Found plan:', plan.name, 'UUID:', plan.id);

    // Get the subscription from Stripe
    console.log('🔄 Retrieving Stripe subscription:', session.subscription);
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log('✅ Got Stripe subscription, status:', stripeSubscription.status);

    // Create or update subscription in database (using camelCase)
    console.log('📝 Upserting subscription in DB for empresa:', empresaId);
    const result = await prisma.subscription.upsert({
      where: { empresaId: empresaId },
      update: {
        planId: plan.id, // Use the UUID from the plan
        status: stripeSubscription.status.toUpperCase(),
        billingInterval: billingInterval,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start 
          ? new Date(stripeSubscription.trial_start * 1000) 
          : null,
        trialEnd: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000) 
          : null,
        updatedAt: new Date()
      },
      create: {
        id: require('crypto').randomUUID(),
        empresaId: empresaId,
        planId: plan.id, // Use the UUID from the plan
        status: stripeSubscription.status.toUpperCase(),
        billingInterval: billingInterval,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start 
          ? new Date(stripeSubscription.trial_start * 1000) 
          : null,
        trialEnd: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000) 
          : null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: { plan: true }
    });

    console.log('✅ Subscription created/updated for empresa:', empresaId, '| Plan:', result.plan?.name, '| Status:', result.status);
  } catch (error) {
    console.error('❌ ERROR in handleCheckoutSessionCompleted:', error);
    throw error; // Re-throw to trigger 500 response
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('🆕 Subscription created:', subscription.id);
  await updateSubscriptionFromStripe(subscription);
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Subscription updated:', subscription.id);
  await updateSubscriptionFromStripe(subscription);
}

async function handleSubscriptionDeleted(subscription) {
  console.log('❌ Subscription deleted:', subscription.id);
  
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  });

  if (dbSubscription) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

async function handleInvoicePaid(invoice) {
  console.log('💰 Invoice paid:', invoice.id);
  
  if (invoice.subscription) {
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription }
    });

    if (dbSubscription && dbSubscription.status !== 'ACTIVE') {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      });
    }
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('⚠️ Invoice payment failed:', invoice.id);
  
  if (invoice.subscription) {
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription }
    });

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'PAST_DUE',
          updatedAt: new Date()
        }
      });

      // TODO: Send notification email to user
      console.log('⚠️ Payment failed for empresa:', dbSubscription.empresaId);
    }
  }
}

async function updateSubscriptionFromStripe(stripeSubscription) {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubscription.id }
  });

  if (dbSubscription) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: stripeSubscription.status.toUpperCase(),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at 
          ? new Date(stripeSubscription.canceled_at * 1000) 
          : null,
        trialStart: stripeSubscription.trial_start 
          ? new Date(stripeSubscription.trial_start * 1000) 
          : null,
        trialEnd: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000) 
          : null,
        updatedAt: new Date()
      }
    });
  }
}

module.exports = router;
