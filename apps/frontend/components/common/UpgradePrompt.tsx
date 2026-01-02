'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common';

interface UpgradePromptProps {
  feature: string;
  currentPlan?: string | null;
  variant?: 'inline' | 'modal' | 'banner';
  className?: string;
}

export function UpgradePrompt({ 
  feature, 
  currentPlan, 
  variant = 'inline',
  className = '' 
}: UpgradePromptProps) {
  const router = useRouter();
  const t = useTranslations('subscription');

  const handleUpgrade = () => {
    router.push('/en/configuracion?tab=subscription');
  };

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div>
              <p className="font-medium">{t('upgradeRequired')}</p>
              <p className="text-sm text-indigo-100">{t('featureNotAvailable', { feature })}</p>
            </div>
          </div>
          <Button 
            onClick={handleUpgrade}
            variant="secondary"
            size="sm"
            className="bg-white text-indigo-600 hover:bg-indigo-50"
          >
            {t('upgrade')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className={`text-center p-6 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t('upgradeRequired')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('featureNotAvailableDesc', { feature })}
          {currentPlan && (
            <span className="block mt-1 text-sm">
              {t('currentPlan')}: <span className="font-medium capitalize">{currentPlan}</span>
            </span>
          )}
        </p>
        <Button onClick={handleUpgrade} variant="primary">
          <Sparkles className="w-4 h-4 mr-2" />
          {t('viewPlans')}
        </Button>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm ${className}`}>
      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-amber-800 dark:text-amber-200">
        {t('featureNotAvailable', { feature })}
      </span>
      <button 
        onClick={handleUpgrade}
        className="ml-auto text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 font-medium whitespace-nowrap"
      >
        {t('upgrade')} →
      </button>
    </div>
  );
}

interface UsageLimitWarningProps {
  resource: string;
  used: number;
  limit: number;
  className?: string;
}

export function UsageLimitWarning({ resource, used, limit, className = '' }: UsageLimitWarningProps) {
  const t = useTranslations('subscription');
  const router = useRouter();
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= limit;

  if (!isNearLimit) return null;

  return (
    <div className={`p-3 rounded-lg ${isAtLimit ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'} ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className={isAtLimit ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}>
          {isAtLimit 
            ? t('limitReached', { resource }) 
            : t('nearLimit', { resource, used, limit })}
        </span>
        <button 
          onClick={() => router.push('/en/configuracion?tab=subscription')}
          className={`font-medium whitespace-nowrap ${isAtLimit ? 'text-red-600 dark:text-red-400 hover:text-red-800' : 'text-amber-600 dark:text-amber-400 hover:text-amber-800'}`}
        >
          {t('upgrade')} →
        </button>
      </div>
      {!isAtLimit && (
        <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface FeatureGateProps {
  feature: keyof import('@/contexts/SubscriptionContext').Plan;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  // Import dynamically to avoid circular deps
  const { useFeatureAccess } = require('@/contexts/SubscriptionContext');
  const { hasAccess, loading, currentPlan } = useFeatureAccess(feature);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-10" />;
  }

  if (!hasAccess) {
    return fallback || <UpgradePrompt feature={feature} currentPlan={currentPlan} />;
  }

  return <>{children}</>;
}
