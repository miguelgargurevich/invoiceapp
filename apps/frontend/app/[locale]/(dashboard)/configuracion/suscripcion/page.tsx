'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Check,
  X,
  AlertCircle,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  Loader2,
  Star,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, LoadingSpinner } from '@/components/common';
import { cn } from '@/lib/utils';
import {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  getUsage,
  formatPrice,
  getStatusColor,
  type Plan,
  type Subscription,
  type UsageResponse,
} from '@/lib/subscriptions';

type BillingInterval = 'monthly' | 'yearly';

export default function SubscriptionPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('subscription');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { empresa } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingReactivate, setLoadingReactivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, subData, usageData] = await Promise.all([
        getPlans(),
        getCurrentSubscription(),
        getUsage().catch(() => null), // Usage might fail if no subscription
      ]);
      setPlans(plansData);
      setSubscription(subData.subscription);
      setUsage(usageData);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setLoadingCheckout(planId);
      const { url } = await createCheckoutSession(planId, billingInterval);
      window.location.href = url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setMessage({ type: 'error', text: t('checkoutError') });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoadingCheckout(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoadingPortal(true);
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      console.error('Error creating portal session:', err);
      setMessage({ type: 'error', text: t('portalError') });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setLoadingCancel(true);
      const result = await cancelSubscription();
      setSubscription(result.subscription);
      setShowCancelModal(false);
      const endDate = result.subscription.currentPeriodEnd
        ? new Date(result.subscription.currentPeriodEnd).toLocaleDateString()
        : '';
      setMessage({ type: 'success', text: t('canceledDesc', { date: endDate }) });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoadingCancel(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setLoadingReactivate(true);
      const result = await reactivateSubscription();
      setSubscription(result.subscription);
      setMessage({ type: 'success', text: t('reactivatedDesc') });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoadingReactivate(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('business') || name.includes('enterprise')) {
      return <Building2 className="h-6 w-6" />;
    }
    if (name.includes('pro')) {
      return <Crown className="h-6 w-6" />;
    }
    return <Zap className="h-6 w-6" />;
  };

  const isCurrentPlan = (plan: Plan) => {
    return subscription?.plan?.id === plan.id;
  };

  const calculateYearlySavings = (plan: Plan) => {
    if (!plan.priceMonthly || !plan.priceYearly) return 0;
    const monthlyTotal = plan.priceMonthly * 12;
    return Math.round(((monthlyTotal - plan.priceYearly) / monthlyTotal) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">{t('loadingSubscription')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">{t('errorLoadingSubscription')}</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/configuracion`)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {tCommon('back')}
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            'p-4 rounded-lg flex items-center gap-3',
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p>{message.text}</p>
        </div>
      )}

      {/* Test Mode Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-400">{t('testMode')}</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">{t('testModeDesc')}</p>
          </div>
        </div>
      </div>

      {/* Current Subscription Status */}
      {subscription && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                {getPlanIcon(subscription.plan?.name || '')}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{subscription.plan?.name || t('currentPlan')}</h3>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(subscription.status)
                    )}
                  >
                    {t(`status.${subscription.status.toLowerCase()}`)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">
                  {subscription.currentPeriodEnd && (
                    <>
                      {subscription.cancelAtPeriodEnd
                        ? t('willCancelOn')
                        : t('nextBillingDate')}
                      : {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {subscription.cancelAtPeriodEnd ? (
                <Button
                  onClick={handleReactivate}
                  disabled={loadingReactivate}
                >
                  {loadingReactivate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('reactivateSubscription')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(true)}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  {t('cancelSubscription')}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={loadingPortal}
              >
                {loadingPortal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-2" />
                {t('manageBilling')}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Usage Stats */}
      {usage && subscription && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('usage')}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t('usageDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Invoices */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('invoicesUsed')}</span>
                <span className="font-medium">
                  {usage.usage.invoices} {t('of')} {usage.limits.maxInvoices ?? '∞'}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    (usage.percentages.invoices ?? 0) > 90
                      ? 'bg-red-500'
                      : (usage.percentages.invoices ?? 0) > 70
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(usage.percentages.invoices ?? 0, 100)}%` }}
                />
              </div>
            </div>

            {/* Clients */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('clientsUsed')}</span>
                <span className="font-medium">
                  {usage.usage.clients} {t('of')} {usage.limits.maxClients ?? '∞'}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    (usage.percentages.clients ?? 0) > 90
                      ? 'bg-red-500'
                      : (usage.percentages.clients ?? 0) > 70
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(usage.percentages.clients ?? 0, 100)}%` }}
                />
              </div>
            </div>

            {/* Users */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('usersUsed')}</span>
                <span className="font-medium">
                  {usage.usage.users} {t('of')} {usage.limits.maxUsers ?? '∞'}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    (usage.percentages.users ?? 0) > 90
                      ? 'bg-red-500'
                      : (usage.percentages.users ?? 0) > 70
                      ? 'bg-yellow-500'
                      : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(usage.percentages.users ?? 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-muted rounded-lg p-1">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              billingInterval === 'monthly'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
              billingInterval === 'yearly'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('yearly')}
            <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs px-2 py-0.5 rounded-full">
              {t('yearlyDiscount', { percent: '20' })}
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isCurrent = isCurrentPlan(plan);
          const isPopular = index === 1; // Middle plan is usually most popular
          const savings = calculateYearlySavings(plan);
          const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative p-6 flex flex-col',
                isPopular && 'ring-2 ring-primary',
                isCurrent && 'bg-primary/5'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {t('mostPopular')}
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    {t('currentPlanBadge')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={cn('p-2 rounded-lg', isPopular ? 'bg-primary/10' : 'bg-muted')}>
                  {getPlanIcon(plan.name)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(price)}</span>
                  <span className="text-muted-foreground">
                    {billingInterval === 'monthly' ? t('perMonth') : t('perYear')}
                  </span>
                </div>
                {billingInterval === 'yearly' && savings > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    {t('yearlyDiscount', { percent: savings.toString() })}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {billingInterval === 'monthly' ? t('billedMonthly') : t('billedYearly')}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 flex-grow mb-6">
                {/* Invoices */}
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">
                    {plan.maxInvoices
                      ? t('planFeatures.invoices', { count: plan.maxInvoices.toString() })
                      : t('planFeatures.invoicesUnlimited')}
                  </span>
                </li>

                {/* Clients */}
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">
                    {plan.maxClients
                      ? t('planFeatures.clients', { count: plan.maxClients.toString() })
                      : t('planFeatures.clientsUnlimited')}
                  </span>
                </li>

                {/* Users */}
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">
                    {plan.maxUsers
                      ? t('planFeatures.users', { count: plan.maxUsers.toString() })
                      : t('planFeatures.usersUnlimited')}
                  </span>
                </li>

                {/* Additional features from plan.features array */}
                {plan.features?.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingCheckout === plan.id || isCurrent}
                variant={isPopular ? 'primary' : 'outline'}
                className="w-full"
              >
                {loadingCheckout === plan.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isCurrent ? (
                  t('currentPlanBadge')
                ) : subscription ? (
                  t('changePlan')
                ) : (
                  t('getStarted')
                )}
                {!loadingCheckout && !isCurrent && (
                  <ArrowRight className="h-4 w-4 ml-2" />
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">{t('faqTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">{t('faqQ1')}</h4>
            <p className="text-sm text-muted-foreground">{t('faqA1')}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t('faqQ2')}</h4>
            <p className="text-sm text-muted-foreground">{t('faqA2')}</p>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t('faqQ3')}</h4>
            <p className="text-sm text-muted-foreground">{t('faqA3')}</p>
          </div>
        </div>
      </Card>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold">{t('confirmCancel')}</h3>
            </div>
            <p className="text-muted-foreground mb-6">{t('confirmCancelDesc')}</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
              >
                {t('keepSubscription')}
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelSubscription}
                disabled={loadingCancel}
              >
                {loadingCancel && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('confirmCancelButton')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
