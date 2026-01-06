'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Loader2,
  Star,
  AlertTriangle,
  Info,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button, Card, LoadingSpinner } from '@/components/common';
import { cn } from '@/lib/utils';
import {
  getPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  reactivateSubscription,
  switchToFreePlan,
  syncSubscriptionFromSession,
  getUsage,
  formatPrice,
  getStatusColor,
  type Plan,
  type Subscription,
  type UsageResponse,
} from '@/lib/subscriptions';

type BillingInterval = 'monthly' | 'yearly';

export default function SubscriptionTab({ locale }: { locale: string }) {
  const t = useTranslations('subscription');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSubscription } = useSubscription();

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
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [hasProcessedReturn, setHasProcessedReturn] = useState(false);
  const [showTestModeModal, setShowTestModeModal] = useState(false);
  
  // Check if we're in development mode
  const isDeveloperMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('test');

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const planName = searchParams.get('plan');
    const sessionId = searchParams.get('session_id');
    
    // Only process once
    if (hasProcessedReturn) return;
    
    if (success === 'true' && sessionId) {
      setHasProcessedReturn(true);
      
      const successMessage = planName 
        ? t('subscriptionSuccessWithPlan', { plan: planName })
        : t('subscriptionSuccess');
      
      setMessage({ 
        type: 'success', 
        text: successMessage
      });
      
      // Sync subscription immediately using session ID
      const syncSubscription = async () => {
        try {
          await syncSubscriptionFromSession(sessionId);
          console.log('✅ Subscription synced from session');
          
          // Refresh contexts
          await refreshSubscription();
          await loadData();
          
          // Clean URL params after processing
          const url = new URL(window.location.href);
          url.searchParams.delete('success');
          url.searchParams.delete('session_id');
          url.searchParams.delete('plan');
          window.history.replaceState({}, '', url.toString());
        } catch (error) {
          console.error('❌ Error syncing subscription:', error);
        }
      };
      
      syncSubscription();
      
      setTimeout(() => setMessage(null), 10000);
    } else if (canceled === 'true') {
      setHasProcessedReturn(true);
      
      setMessage({ 
        type: 'error', 
        text: t('subscriptionCanceled') 
      });
      setTimeout(() => setMessage(null), 5000);
      
      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('canceled');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, hasProcessedReturn]);

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
        getUsage().catch(() => null),
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
    // Find the plan details
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    
    // If user has a subscription, show confirmation modal
    if (subscription) {
      setSelectedPlan(plan);
      setShowChangePlanModal(true);
      return;
    }
    
    // If no subscription, proceed directly
    await proceedWithSubscription(planId);
  };

  const proceedWithSubscription = async (planId: string) => {
    try {
      setLoadingCheckout(planId);
      setShowChangePlanModal(false);
      
      // Handle Free plan separately (no Stripe checkout needed)
      if (planId === 'free') {
        const result = await switchToFreePlan();
        setSubscription(result.subscription);
        // Refresh the global subscription context
        refreshSubscription();
        setTimeout(() => refreshSubscription(), 2000);
        setMessage({ type: 'success', text: t('switchedToFree') });
        setTimeout(() => setMessage(null), 5000);
        return;
      }
      
      const { url } = await createCheckoutSession(planId, billingInterval, locale);
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
      const { url } = await createPortalSession(locale);
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
    if (name.includes('starter')) {
      return <Zap className="h-6 w-6" />;
    }
    if (name.includes('free')) {
      return <Star className="h-6 w-6" />;
    }
    return <Zap className="h-6 w-6" />;
  };

  const getPlanColor = (planName: string, isPopular: boolean) => {
    //if (isPopular) return 'bg-primary';
    const name = planName.toLowerCase();
    if (name.includes('business') || name.includes('enterprise')) {
      return 'bg-gradient-to-br from-purple-500 to-indigo-600';
    }
    if (name.includes('pro')) {
      return 'bg-gradient-to-br from-yellow-500 to-orange-600';
    }
    if (name.includes('starter')) {
      return 'bg-gradient-to-br from-blue-500 to-cyan-600';
    }
    if (name.includes('free')) {
      return 'bg-gradient-to-br from-green-500 to-emerald-600';
    }
    return 'bg-gray-100 dark:bg-gray-700';
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
      <Card className="shadow-sm">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">{t('errorLoadingSubscription')}</p>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <Button onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-sm">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h2>
              {isDeveloperMode && (
                <button
                  onClick={() => setShowTestModeModal(true)}
                  className="p-1.5 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  title="Test Mode Information"
                >
                  <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('subtitle')}</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={cn(
              'p-4 rounded-lg flex items-start gap-3 mt-6',
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
            )}
          >
            {message.type === 'success' ? (
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <p className={cn(
              'text-sm font-medium flex-1',
              message.type === 'success'
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
            )}>{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Current Subscription */}
        {loading ? (
          <Card className="mt-6 p-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </Card>
        ) : subscription && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'p-3 rounded-xl shadow-md',
                  getPlanColor(subscription.plan?.name || '', false)
                )}>
                  <div className="text-white">
                    {getPlanIcon(subscription.plan?.name || '')}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {subscription.plan?.name || t('currentPlan')}
                    </h3>
                    <span
                      className={cn(
                        'px-3 py-1 text-xs font-bold rounded-full',
                        getStatusColor(subscription.status)
                      )}
                    >
                      {t(`status.${subscription.status.toLowerCase()}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {subscription.plan?.description || ''}
                  </p>
                  {subscription.currentPeriodEnd && (
                    <p className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      {subscription.cancelAtPeriodEnd
                        ? t('willCancelOn')
                        : t('nextBillingDate')}
                      : <strong className="ml-1">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </strong>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {subscription.cancelAtPeriodEnd ? (
                  <Button
                    onClick={handleReactivate}
                    disabled={loadingReactivate}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loadingReactivate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('reactivateSubscription')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelModal(true)}
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:border-red-400"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('cancelSubscription')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={loadingPortal}
                  size="sm"
                >
                  {loadingPortal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('manageBilling')}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Usage Stats */}
      {usage && subscription && (
        <Card className="shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold">{t('usage')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Invoices */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('invoicesUsed')}</span>
                <span className="text-lg font-bold">
                  {usage.usage.invoices}
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-normal"> / {usage.limits.maxInvoices === -1 || !usage.limits.maxInvoices ? '∞' : usage.limits.maxInvoices}</span>
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usage.limits.maxInvoices === -1 ? 'bg-blue-500' :
                    (usage.percentages.invoices ?? 0) > 90
                      ? 'bg-red-500'
                      : (usage.percentages.invoices ?? 0) > 70
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  )}
                  style={{ width: usage.limits.maxInvoices === -1 ? '10%' : `${Math.min(usage.percentages.invoices ?? 0, 100)}%` }}
                />
              </div>
            </div>

            {/* Clients */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('clientsUsed')}</span>
                <span className="text-lg font-bold">
                  {usage.usage.clients}
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-normal"> / {usage.limits.maxClients === -1 || !usage.limits.maxClients ? '∞' : usage.limits.maxClients}</span>
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usage.limits.maxClients === -1 ? 'bg-emerald-500' :
                    (usage.percentages.clients ?? 0) > 90
                      ? 'bg-red-500'
                      : (usage.percentages.clients ?? 0) > 70
                      ? 'bg-yellow-500'
                      : 'bg-emerald-500'
                  )}
                  style={{ width: usage.limits.maxClients === -1 ? '10%' : `${Math.min(usage.percentages.clients ?? 0, 100)}%` }}
                />
              </div>
            </div>

            {/* Users */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('usersUsed')}</span>
                <span className="text-lg font-bold">
                  {usage.usage.users}
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-normal"> / {usage.limits.maxUsers === -1 || !usage.limits.maxUsers ? '∞' : usage.limits.maxUsers}</span>
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    usage.limits.maxUsers === -1 ? 'bg-purple-500' :
                    (usage.percentages.users ?? 0) > 90
                      ? 'bg-red-500'
                      : (usage.percentages.users ?? 0) > 70
                      ? 'bg-yellow-500'
                      : 'bg-purple-500'
                  )}
                  style={{ width: usage.limits.maxUsers === -1 ? '10%' : `${Math.min(usage.percentages.users ?? 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={cn(
              'px-6 py-2 rounded-lg text-sm font-semibold transition-all',
              billingInterval === 'monthly'
                ? 'bg-blue-600 dark:bg-primary text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={cn(
              'px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
              billingInterval === 'yearly'
                ? 'bg-blue-600 dark:bg-primary text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {t('yearly')}
            <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, index) => {
          const isCurrent = isCurrentPlan(plan);
          const isPopular = index === 2; // Pro plan
          const savings = calculateYearlySavings(plan);
          const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            
          return (
            //console.log('Rendering plan:', plan.name, { isCurrent, isPopular, price, savings }),
            <Card
              key={plan.id}
              className={cn(
                'relative p-6 flex flex-col transition-all hover:shadow-md border-2',
                isPopular && 'ring-2 ring-primary',
                isCurrent && 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600',
                !isCurrent && 'border-gray-300 dark:border-gray-700'
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    {t('mostPopular')}
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {t('currentPlanBadge')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  'p-3 rounded-xl shadow-md',
                  getPlanColor(plan.name, isPopular)
                )}>
                  <div className="text-white">
                    {getPlanIcon(plan.name)}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">{plan.description}</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(price)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {billingInterval === 'monthly' ? t('perMonth') : t('perYear')}
                  </span>
                </div>
                {billingInterval === 'yearly' && savings > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs font-semibold">
                    <Zap className="h-3 w-3" />
                    Save {savings}%
                  </div>
                )}
              </div>

              <ul className="space-y-2 flex-grow mb-4">
                {plan.features?.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-gray-800 dark:text-gray-200">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingCheckout === plan.id || isCurrent}
                variant={isPopular ? 'primary' : 'outline'}
                size="sm"
                className="w-full"
              >
                {loadingCheckout === plan.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isCurrent ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t('currentPlanBadge')}
                  </>
                ) : subscription ? (
                  <>
                    {t('changePlan')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    {t('getStarted')}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* FAQ Section */}
      <Card className="shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-bold">{t('faqTitle')}</h3>
        </div>
        <div className="space-y-3">
          {/* FAQ 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-sm text-left">{t('faqQ1')}</h4>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedFaq === 1 && "rotate-180"
              )} />
            </button>
            {expandedFaq === 1 && (
              <div className="px-4 pb-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-3">
                {t('faqA1')}
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-semibold text-sm text-left">{t('faqQ2')}</h4>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedFaq === 2 && "rotate-180"
              )} />
            </button>
            {expandedFaq === 2 && (
              <div className="px-4 pb-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-3">
                {t('faqA2')}
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-semibold text-sm text-left">{t('faqQ3')}</h4>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedFaq === 3 && "rotate-180"
              )} />
            </button>
            {expandedFaq === 3 && (
              <div className="px-4 pb-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-3">
                {t('faqA3')}
              </div>
            )}
          </div>

          {/* FAQ 4 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 4 ? null : 4)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                  <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-sm text-left">{t('faqQ4')}</h4>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedFaq === 4 && "rotate-180"
              )} />
            </button>
            {expandedFaq === 4 && (
              <div className="px-4 pb-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-3">
                {t('faqA4')}
              </div>
            )}
          </div>

          {/* FAQ 5 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 5 ? null : 5)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <Star className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="font-semibold text-sm text-left">{t('faqQ5')}</h4>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedFaq === 5 && "rotate-180"
              )} />
            </button>
            {expandedFaq === 5 && (
              <div className="px-4 pb-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-3">
                {t('faqA5')}
              </div>
            )}
          </div>

          {/* FAQ 6 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedFaq(expandedFaq === 6 ? null : 6)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-lg">
                  <Check className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <h4 className="font-semibold text-sm text-left">{t('faqQ6')}</h4>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedFaq === 6 && "rotate-180"
              )} />
            </button>
            {expandedFaq === 6 && (
              <div className="px-4 pb-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-700 pt-3">
                {t('faqA6')}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Change Plan Confirmation Modal */}
      {showChangePlanModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'p-2 rounded-lg',
                getPlanColor(selectedPlan.name, false)
              )}>
                <div className="text-white">
                  {getPlanIcon(selectedPlan.name)}
                </div>
              </div>
              <h3 className="text-lg font-bold">{t('confirmChangePlan', { plan: selectedPlan.name })}</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('confirmChangePlanDesc', { 
                  currentPlan: subscription?.plan?.name || 'Current',
                  newPlan: selectedPlan.name 
                })}
              </p>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(billingInterval === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {billingInterval === 'monthly' ? t('perMonth') : t('perYear')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangePlanModal(false);
                  setSelectedPlan(null);
                }}
                size="sm"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={() => proceedWithSubscription(selectedPlan.id)}
                disabled={loadingCheckout === selectedPlan.id}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loadingCheckout === selectedPlan.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('confirmChangePlanButton')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Test Mode Modal */}
      {showTestModeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTestModeModal(false)}>
          <div className="max-w-md w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Info className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('testMode')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('testModeDesc')}</p>
              </div>
              <button
                onClick={() => setShowTestModeModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-400 mb-2">Test Card Number:</p>
              <code className="block text-center text-base font-mono px-4 py-3 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-800 text-gray-900 dark:text-white">
                4242 4242 4242 4242
              </code>
              <p className="text-xs text-yellow-800 dark:text-yellow-500 mt-3">
                Use any future expiry date and any 3-digit CVC code.
              </p>
            </div>
            </Card>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-bold">{t('confirmCancel')}</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">{t('confirmCancelDesc')}</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                size="sm"
              >
                {t('keepSubscription')}
              </Button>
              <Button
                onClick={handleCancelSubscription}
                disabled={loadingCancel}
                size="sm"
                className="bg-red-600 hover:bg-red-700"
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
