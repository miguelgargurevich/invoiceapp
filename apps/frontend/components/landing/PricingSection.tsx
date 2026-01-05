'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Crown, Building2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  maxInvoices: number | null;
  maxClients: number | null;
  maxUsers: number | null;
  isActive: boolean;
  sortOrder: number;
}

export function PricingSection() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const [isYearly, setIsYearly] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Define default plans for landing page (in case API is not available)
  const defaultPlans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        '5 invoices per month',
        '3 clients',
        '1 user',
        'Basic templates',
        'Email support',
      ],
      maxInvoices: 5,
      maxClients: 3,
      maxUsers: 1,
      isActive: true,
      sortOrder: 0,
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'For growing businesses',
      priceMonthly: 9,
      priceYearly: 90,
      features: [
        '50 invoices per month',
        '25 clients',
        '2 users',
        'Professional templates',
        'Digital signatures',
        'Priority support',
      ],
      maxInvoices: 50,
      maxClients: 25,
      maxUsers: 2,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For established businesses',
      priceMonthly: 29,
      priceYearly: 290,
      features: [
        'Unlimited invoices',
        'Unlimited clients',
        '5 users',
        'Custom branding',
        'Advanced reports',
        'API access',
        '24/7 support',
      ],
      maxInvoices: null,
      maxClients: null,
      maxUsers: 5,
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      priceMonthly: 99,
      priceYearly: 990,
      features: [
        'Everything in Professional',
        'Unlimited users',
        'Multi-company support',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      maxInvoices: null,
      maxClients: null,
      maxUsers: null,
      isActive: true,
      sortOrder: 3,
    },
  ];

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/subscriptions/plans`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setPlans(data);
          } else {
            setPlans(defaultPlans);
          }
        } else {
          setPlans(defaultPlans);
        }
      } catch {
        setPlans(defaultPlans);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  const planIcons: Record<string, typeof Sparkles> = {
    free: Sparkles,
    starter: Zap,
    professional: Crown,
    enterprise: Building2,
  };

  const planColors: Record<string, { gradient: string; shadow: string; badge: string }> = {
    free: {
      gradient: 'from-slate-500 to-slate-700',
      shadow: 'shadow-slate-500/20',
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    starter: {
      gradient: 'from-primary-500 to-primary-700',
      shadow: 'shadow-primary-500/20',
      badge: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    },
    professional: {
      gradient: 'from-purple-500 to-purple-700',
      shadow: 'shadow-purple-500/20',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    },
    enterprise: {
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
  };

  const getPlanKey = (planName: string): string => {
    const name = planName.toLowerCase();
    if (name.includes('free') || name.includes('gratis')) return 'free';
    if (name.includes('starter') || name.includes('básico') || name.includes('basic')) return 'starter';
    if (name.includes('pro') || name.includes('professional')) return 'professional';
    if (name.includes('enterprise') || name.includes('empresa')) return 'enterprise';
    return 'starter';
  };

  return (
    <section id="pricing" className="py-20 md:py-32 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
            {t('pricing.badge')}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
            {t('pricing.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {t('pricing.subtitle')}
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className={`text-sm font-medium ${!isYearly ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {t('pricing.monthly')}
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              isYearly ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                isYearly ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {t('pricing.yearly')}
          </span>
          {isYearly && (
            <span className="px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">
              {t('pricing.save')}
            </span>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
          {loading ? (
            // Loading skeleton
            [...Array(4)].map((_, i) => (
              <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-pulse">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
                <div className="h-10 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            displayPlans.map((plan, index) => {
              const planKey = getPlanKey(plan.name);
              const Icon = planIcons[planKey] || Sparkles;
              const colors = planColors[planKey] || planColors.starter;
              const isPopular = planKey === 'professional';
              const price = isYearly ? plan.priceYearly : plan.priceMonthly;
              const monthlyPrice = isYearly ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative p-6 rounded-2xl border transition-all hover:scale-105 ${
                    isPopular
                      ? 'bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/50 dark:to-slate-900 border-purple-300 dark:border-purple-700 shadow-xl shadow-purple-500/10'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg'
                  }`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-700 rounded-full shadow-lg">
                        {t('pricing.popular')}
                      </span>
                    </div>
                  )}

                  {/* Plan Icon & Name */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-4 ${colors.shadow} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-6">
                    {plan.description || t(`pricing.plans.${planKey}.description`)}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-slate-900 dark:text-white">
                        ${monthlyPrice}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        /{t('pricing.perMonth')}
                      </span>
                    </div>
                    {isYearly && plan.priceYearly > 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        ${price} {t('pricing.billedYearly')}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          isPopular ? 'text-purple-500' : 'text-green-500'
                        }`} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link
                    href={`/${locale}/register?plan=${plan.id}`}
                    className={`block w-full py-3 px-4 text-center text-sm font-semibold rounded-xl transition-all ${
                      isPopular
                        ? 'text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40'
                        : 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400'
                    }`}
                  >
                    {plan.priceMonthly === 0 ? t('pricing.startFree') : t('pricing.getStarted')}
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-slate-600 dark:text-slate-400">
            {t('pricing.needCustom')}{' '}
            <a href="mailto:sales@invoiceapp.io" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              {t('pricing.contactUs')}
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
