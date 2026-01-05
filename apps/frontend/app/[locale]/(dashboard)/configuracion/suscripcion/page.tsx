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
  ChevronLeft,
  Loader2,
  Star,
  AlertTriangle,
  Info,
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
  const searchParams = useSearchParams();
  const { empresa } = useAuth();
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detectar éxito o cancelación desde Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const planName = searchParams.get('plan');
    
    if (success === 'true') {
      const successMessage = planName 
        ? t('subscriptionSuccessWithPlan', { plan: planName })
        : t('subscriptionSuccess');
      
      setMessage({ 
        type: 'success', 
        text: successMessage
      });
      
      // Refresh subscription context
      refreshSubscription();
      
      // Limpiar URL
      router.replace(`/${locale}/configuracion/suscripcion`);
      // Auto-hide after 10 seconds
      setTimeout(() => setMessage(null), 10000);
    } else if (canceled === 'true') {
      setMessage({ 
        type: 'error', 
        text: t('subscriptionCanceled') 
      });
      // Limpiar URL
      router.replace(`/${locale}/configuracion/suscripcion`);
      // Auto-hide after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    }
  }, [searchParams, router, locale, t, refreshSubscription]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>

          {/* Hero Section Skeleton */}
          <div className="text-center space-y-6 py-12">
            <div className="inline-flex items-center justify-center">
              <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-96 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
              <div className="h-8 w-[600px] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Test Mode Banner Skeleton */}
          <div className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-full max-w-md bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Billing Toggle Skeleton */}
          <div className="flex justify-center py-4">
            <div className="h-14 w-80 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          </div>

          {/* Plans Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 space-y-6 shadow-lg"
              >
                {/* Plan Icon & Name */}
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <div className="h-14 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      <div className="h-4 flex-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>

                {/* Button */}
                <div className="h-14 w-full bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* FAQ Section Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-8 space-y-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-gray-900 dark:text-white">{t('errorLoadingSubscription')}</p>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <Button onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${locale}/configuracion`)}
            className="hover:bg-white/80 dark:hover:bg-gray-800/80"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {tCommon('back')}
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-full text-blue-700 dark:text-blue-400 text-sm font-semibold mb-6 shadow-sm">
            <Zap className="h-5 w-5" />
            {t('upgradeBanner', { defaultValue: 'Upgrade Your Experience' })}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent leading-tight">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={cn(
              'p-6 rounded-2xl flex items-start gap-4 shadow-xl border-2 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500',
              message.type === 'success'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700'
                : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-red-300 dark:border-red-700'
            )}
          >
            <div className={cn(
              'p-3 rounded-xl',
              message.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/40' 
                : 'bg-red-100 dark:bg-red-900/40'
            )}>
              {message.type === 'success' ? (
                <Check className={cn(
                  'h-6 w-6',
                  'text-green-600 dark:text-green-400'
                )} />
              ) : (
                <AlertCircle className={cn(
                  'h-6 w-6',
                  'text-red-600 dark:text-red-400'
                )} />
              )}
            </div>
            <div className="flex-1">
              <p className={cn(
                'text-base font-semibold leading-relaxed',
                message.type === 'success'
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              )}>{message.text}</p>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Test Mode Banner */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl">
              <Info className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-400 text-lg">{t('testMode')}</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-500 mt-2">{t('testModeDesc')}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <code className="text-xs font-mono text-gray-900 dark:text-yellow-400">4242 4242 4242 4242</code>
              </div>
            </div>
          </div>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <Card className="overflow-hidden border-2 shadow-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900">
            <div className="p-8 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-blue-600/10 dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-blue-500/10">
              {/* Header */}
              <div className="flex items-center gap-2 mb-6">
                <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 rounded-full" />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  {t('yourCurrentPlan', { defaultValue: 'Your Current Plan' })}
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-6">
                  <div className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-3xl ring-4 ring-blue-200 dark:ring-blue-800 shadow-xl">
                    <div className="text-white">
                      {getPlanIcon(subscription.plan?.name || '')}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {subscription.plan?.name || t('currentPlan')}
                      </h3>
                      <span
                        className={cn(
                          'px-4 py-1.5 text-xs font-bold rounded-full shadow-md',
                          getStatusColor(subscription.status)
                        )}
                      >
                        {t(`status.${subscription.status.toLowerCase()}`)}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2 text-lg">
                      {subscription.plan?.description || ''}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2 text-base">
                      {subscription.currentPeriodEnd && (
                        <>
                          <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span>
                            {subscription.cancelAtPeriodEnd
                              ? t('willCancelOn')
                              : t('nextBillingDate')}
                            : <strong className="text-gray-900 dark:text-white ml-1">
                              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                            </strong>
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {subscription.cancelAtPeriodEnd ? (
                    <Button
                      onClick={handleReactivate}
                      disabled={loadingReactivate}
                      className="shadow-lg bg-gradient-to-r from-green-600 to-emerald-700 dark:from-green-500 dark:to-emerald-600 hover:from-green-700 hover:to-emerald-800 dark:hover:from-green-600 dark:hover:to-emerald-700 text-white"
                    >
                      {loadingReactivate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('reactivateSubscription')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelModal(true)}
                      className="text-red-600 hover:text-red-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('cancelSubscription')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    disabled={loadingPortal}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  >
                    {loadingPortal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t('manageBilling')}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Usage Stats */}
        {usage && subscription && (
          <Card className="p-8 shadow-xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 border-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{t('usage')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('usageDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Invoices */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('invoicesUsed')}</span>
                  <span className="text-2xl font-bold">
                    {usage.usage.invoices}
                    <span className="text-base text-gray-600 dark:text-gray-400 font-normal"> / {usage.limits.maxInvoices ?? '∞'}</span>
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 ease-out shadow-sm',
                      (usage.percentages.invoices ?? 0) > 90
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : (usage.percentages.invoices ?? 0) > 70
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-blue-500 to-primary'
                    )}
                    style={{ width: `${Math.min(usage.percentages.invoices ?? 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {Math.round(usage.percentages.invoices ?? 0)}% utilizado
                </p>
              </div>

              {/* Clients */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('clientsUsed')}</span>
                  <span className="text-2xl font-bold">
                    {usage.usage.clients}
                    <span className="text-base text-gray-600 dark:text-gray-400 font-normal"> / {usage.limits.maxClients ?? '∞'}</span>
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 ease-out shadow-sm',
                      (usage.percentages.clients ?? 0) > 90
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : (usage.percentages.clients ?? 0) > 70
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-emerald-500 to-green-600'
                    )}
                    style={{ width: `${Math.min(usage.percentages.clients ?? 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {Math.round(usage.percentages.clients ?? 0)}% utilizado
                </p>
              </div>

              {/* Users */}
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('usersUsed')}</span>
                  <span className="text-2xl font-bold">
                    {usage.usage.users}
                    <span className="text-base text-gray-600 dark:text-gray-400 font-normal"> / {usage.limits.maxUsers ?? '∞'}</span>
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500 ease-out shadow-sm',
                      (usage.percentages.users ?? 0) > 90
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : (usage.percentages.users ?? 0) > 70
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-purple-500 to-violet-600'
                    )}
                    style={{ width: `${Math.min(usage.percentages.users ?? 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {Math.round(usage.percentages.users ?? 0)}% utilizado
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Billing Interval Toggle */}
        <div className="flex justify-center py-4">
          <div className="inline-flex items-center bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-lg border-2 border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                'px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                billingInterval === 'monthly'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-primary dark:to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {t('monthly')}
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={cn(
                'px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2',
                billingInterval === 'yearly'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-primary dark:to-blue-600 text-white shadow-lg scale-105'
                  : 'text-gray-800 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {t('yearly')}
              <span className="bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => {
            const isCurrent = isCurrentPlan(plan);
            const isPopular = index === 1; // Middle plan is usually most popular
            const savings = calculateYearlySavings(plan);
            const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative p-8 flex flex-col transition-all duration-300 hover:scale-105 border-2',
                  isPopular && 'ring-4 ring-primary shadow-2xl scale-105 bg-gradient-to-br from-white via-blue-50 to-white dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800',
                  isCurrent && 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-400 dark:border-green-600',
                  !isPopular && !isCurrent && 'bg-white dark:bg-gray-800 hover:shadow-xl border-gray-300 dark:border-gray-700'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-primary dark:to-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                      <Star className="h-4 w-4 fill-current" />
                      {t('mostPopular')}
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-4 right-6">
                    <span className="bg-gradient-to-r from-green-600 to-emerald-700 dark:from-green-500 dark:to-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      {t('currentPlanBadge')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <div className={cn(
                    'p-4 rounded-2xl transition-all',
                    isPopular ? 'bg-gradient-to-br from-blue-600 to-blue-700 dark:from-primary dark:to-blue-600 shadow-lg' : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'
                  )}>
                    <div className={cn(
                      isPopular ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                    )}>
                      {getPlanIcon(plan.name)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plan.description}</p>
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      {formatPrice(price)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-lg">
                      {billingInterval === 'monthly' ? t('perMonth') : t('perYear')}
                    </span>
                  </div>
                  {billingInterval === 'yearly' && savings > 0 && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg text-sm font-semibold">
                      <Zap className="h-4 w-4" />
                      Ahorra {savings}% anual
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {billingInterval === 'monthly' ? t('billedMonthly') : t('billedYearly')}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-4 flex-grow mb-8">
                  {/* Invoices */}
                  <li className="flex items-start gap-3">
                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {plan.maxInvoices === -1 || !plan.maxInvoices
                        ? t('planFeatures.invoicesUnlimited')
                        : t('planFeatures.invoices', { count: plan.maxInvoices.toString() })}
                    </span>
                  </li>

                  {/* Clients */}
                  <li className="flex items-start gap-3">
                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {plan.maxClients === -1 || !plan.maxClients
                        ? t('planFeatures.clientsUnlimited')
                        : t('planFeatures.clients', { count: plan.maxClients.toString() })}
                    </span>
                  </li>

                  {/* Users */}
                  <li className="flex items-start gap-3">
                    <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    </div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {plan.maxUsers === -1 || !plan.maxUsers
                        ? t('planFeatures.usersUnlimited')
                        : t('planFeatures.users', { count: plan.maxUsers.toString() })}
                    </span>
                  </li>

                  {/* Additional features from plan.features array */}
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingCheckout === plan.id || isCurrent}
                  variant={isPopular ? 'primary' : 'outline'}
                  className={cn(
                    'w-full py-6 text-base font-semibold shadow-lg transition-all',
                    isPopular && 'bg-gradient-to-r from-blue-600 to-blue-700 dark:from-primary dark:to-blue-600 hover:from-blue-700 hover:to-blue-800 dark:hover:from-primary/90 dark:hover:to-blue-700 text-white',
                    isCurrent && 'bg-green-600 hover:bg-green-700 text-white'
                  )}
                >
                  {loadingCheckout === plan.id ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      {t('currentPlanBadge')}
                    </>
                  ) : subscription ? (
                    <>
                      {t('changePlan')}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  ) : (
                    <>
                      {t('getStarted')}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <Card className="p-8 shadow-xl bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 border-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
              <Info className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold">{t('faqTitle')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                {t('faqQ1')}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t('faqA1')}</p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <div className="p-1 bg-green-100 dark:bg-green-900/40 rounded">
                  <RefreshCw className="h-4 w-4 text-green-600" />
                </div>
                {t('faqQ2')}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t('faqA2')}</p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <div className="p-1 bg-orange-100 dark:bg-orange-900/40 rounded">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </div>
                {t('faqQ3')}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{t('faqA3')}</p>
            </div>
          </div>
        </Card>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-8 shadow-2xl border-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold">{t('confirmCancel')}</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-8 text-base leading-relaxed">{t('confirmCancelDesc')}</p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(false)}
                  className="px-6"
                >
                  {t('keepSubscription')}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancelSubscription}
                  disabled={loadingCancel}
                  className="px-6 bg-red-600 hover:bg-red-700"
                >
                  {loadingCancel && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('confirmCancelButton')}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
