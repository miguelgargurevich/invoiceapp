'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Lock, Sparkles, ArrowRight, Crown, X, Zap } from 'lucide-react';
import { Button } from '@/components/common';
import { Modal } from './Modal';
import { planMasBarato, ETIQUETA_FUNCION, type FuncionPlan } from '@/lib/planSugerido';

interface UpgradePromptProps {
  feature: string;
  // Función que falta: si viene, el aviso dice desde qué plan está disponible.
  funcion?: FuncionPlan;
  currentPlan?: string | null;
  variant?: 'inline' | 'modal' | 'banner';
  className?: string;
}

export function UpgradePrompt({
  feature,
  funcion,
  currentPlan,
  variant = 'inline',
  className = ''
}: UpgradePromptProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('subscriptionFeatures');

  const planSugerido = funcion ? planMasBarato(funcion) : null;

  const handleUpgrade = () => {
    router.push(`/${locale}/configuracion?tab=suscripcion`);
  };

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div>
              <p className="font-medium">{t('upgradeRequired')}</p>
              <p className="text-sm text-primary-100">{t('featureNotAvailable', { feature })}</p>
              {planSugerido && (
                <p className="text-sm text-primary-100">{t('disponibleDesde', { plan: planSugerido.nombre })}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleUpgrade}
            variant="secondary"
            size="sm"
            className="bg-white text-primary-600 hover:bg-primary-50"
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
        <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{t('upgradeRequired')}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('featureNotAvailableDesc', { feature })}
          {planSugerido && (
            <span className="block mt-1 text-sm">{t('disponibleDesde', { plan: planSugerido.nombre })}</span>
          )}
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
        {planSugerido && <> · {t('disponibleDesde', { plan: planSugerido.nombre })}</>}
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

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  featureDescription?: string;
  // Función que falta. El modal muestra el plan más barato que la incluye.
  funcion: FuncionPlan;
}

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  featureDescription,
  funcion
}: UpgradeModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('subscriptionFeatures');

  const handleUpgrade = () => {
    onClose();
    router.push(`/${locale}/configuracion?tab=suscripcion`);
  };

  const plan = planMasBarato(funcion);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center px-2 pb-2">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Crown className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('upgradeToUnlock')}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {featureDescription || t('featureNotAvailableDesc', { feature })}
        </p>

        {/* Plan Card: el plan más barato que incluye la función */}
        {plan && (
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-1 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg text-gray-900 dark:text-white">Plan {plan.nombre}</span>
              </div>
              <ul className="space-y-2 text-left">
                {plan.funciones.map((f) => (
                  <li
                    key={f}
                    className={`flex items-center text-sm ${
                      f === funcion ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    {ETIQUETA_FUNCION[f]}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:opacity-90 text-white font-semibold py-3"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {t('upgradeNow')}
          </Button>
          <button
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm py-2"
          >
            {t('maybeLater')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface UsageLimitWarningProps {
  resource: string;
  used: number;
  limit: number;
  className?: string;
}

export function UsageLimitWarning({ resource, used, limit, className = '' }: UsageLimitWarningProps) {
  const t = useTranslations('subscriptionFeatures');
  const router = useRouter();
  const locale = useLocale();
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
          onClick={() => router.push(`/${locale}/configuracion?tab=suscripcion`)}
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

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: string;
  used: number;
  limit: number;
}

export function UsageLimitModal({ isOpen, onClose, resource, used, limit }: UsageLimitModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('subscriptionFeatures');

  const handleUpgrade = () => {
    onClose();
    router.push(`/${locale}/configuracion?tab=suscripcion`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center px-2 pb-2">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
          <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('limitReachedTitle')}
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('limitReachedDesc', { resource })}
        </p>

        {/* Progress bar */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">{t('usedThisMonth')}</span>
            <span className="font-bold text-red-600 dark:text-red-400">{used} / {limit}</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:opacity-90 text-white font-semibold py-3"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {t('upgradeForMore')}
          </Button>
          <button
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm py-2"
          >
            {t('maybeLater')}
          </button>
        </div>
      </div>
    </Modal>
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

// Insignia con el plan más barato que incluye la función (p. ej. «NEGOCIO» en proformas).
export function PlanBadge({ funcion, className = '' }: { funcion: FuncionPlan; className?: string }) {
  const plan = planMasBarato(funcion);
  if (!plan) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-primary-500 to-primary-600 text-white ${className}`}>
      {plan.nombre.toUpperCase()}
    </span>
  );
}
