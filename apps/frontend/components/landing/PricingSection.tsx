'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Crown, Building2 } from 'lucide-react';
import { formatPrice } from '@/lib/precios';
import { getPlans } from '@/lib/subscriptions';
import { equivalenteMensual, porcentajeAhorro } from '@/lib/landing';
import { CorreoContacto } from '@/components/common/CorreoContacto';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency?: string;
  pais?: 'US' | 'PE';
  isPopular?: boolean;
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

  // Planes de Perú (en soles, IGV incluido) para la página en español; si la API no responde, se ven estos.
  const defaultPlansPe: Plan[] = [
    {
      id: 'pe-gratis',
      name: 'Gratis',
      description: 'Para empezar a emitir comprobantes electrónicos',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'PEN',
      pais: 'PE',
      features: [
        '10 comprobantes al mes',
        '10 clientes',
        'Factura, boleta y notas de crédito y débito',
        'PDF y envío por correo',
      ],
      maxInvoices: 10,
      maxClients: 10,
      maxUsers: null,
      isActive: true,
      sortOrder: 0,
    },
    {
      id: 'pe-emprendedor',
      name: 'Emprendedor',
      description: 'Para negocios que empiezan a crecer',
      priceMonthly: 29,
      priceYearly: 279,
      currency: 'PEN',
      pais: 'PE',
      features: [
        '100 comprobantes al mes',
        '100 clientes',
        'Factura, boleta y notas de crédito y débito',
        'PDF y envío por correo',
        'Reportes',
      ],
      maxInvoices: 100,
      maxClients: 100,
      maxUsers: null,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'pe-negocio',
      name: 'Negocio',
      description: 'Todo lo que tu negocio necesita para facturar',
      priceMonthly: 59,
      priceYearly: 569,
      currency: 'PEN',
      pais: 'PE',
      isPopular: true,
      features: [
        '500 comprobantes al mes',
        'Clientes ilimitados',
        'Proformas',
        'Firma digital de documentos',
        'Detracción y percepción',
        'Tu logo en los comprobantes',
        'Reportes',
      ],
      maxInvoices: 500,
      maxClients: null,
      maxUsers: null,
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'pe-empresa',
      name: 'Empresa',
      description: 'Sin límites, con API y soporte prioritario',
      priceMonthly: 119,
      priceYearly: 1149,
      currency: 'PEN',
      pais: 'PE',
      features: [
        'Comprobantes ilimitados',
        'Clientes ilimitados',
        'Proformas',
        'Firma digital de documentos',
        'Detracción y percepción',
        'Tu logo en los comprobantes',
        'Reportes avanzados',
        'Multimoneda',
        'Acceso por API',
        'Soporte prioritario',
      ],
      maxInvoices: null,
      maxClients: null,
      maxUsers: null,
      isActive: true,
      sortOrder: 3,
    },
  ];

  useEffect(() => {
    // La landing es solo para Perú: planes en soles, con IGV incluido.
    async function fetchPlans() {
      try {
        // getPlans arma la URL con /api igual que el resto de la app.
        const data = await getPlans('PE');
        setPlans(data.length > 0 ? data : defaultPlansPe);
      } catch {
        setPlans(defaultPlansPe);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const displayPlans = plans.length > 0 ? plans : defaultPlansPe;

  const calculateYearlySavings = (plan: Plan) => porcentajeAhorro(plan.priceMonthly, plan.priceYearly);

  const planIcons: Record<string, typeof Sparkles> = {
    free: Sparkles,
    starter: Zap,
    pro: Crown,
    business: Building2,
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
    pro: {
      gradient: 'from-purple-500 to-purple-700',
      shadow: 'shadow-purple-500/20',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    },
    business: {
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/20',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
  };

  const getPlanKey = (planName: string): string => {
    const name = planName.toLowerCase();
    if (name.includes('free') || name.includes('gratis')) return 'free';
    if (name.includes('starter') || name.includes('básico') || name.includes('basic')) return 'starter';
    if (name.includes('emprendedor')) return 'starter';
    if (name.includes('pro') || name.includes('negocio')) return 'pro';
    if (name.includes('business') || name.includes('enterprise') || name.includes('empresa')) return 'business';
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
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                isYearly ? 'translate-x-6' : 'translate-x-0'
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
              const isPopular = plan.isPopular ?? planKey === 'pro';
              const moneda = plan.currency || 'USD';
              const price = isYearly ? plan.priceYearly : plan.priceMonthly;
              const monthlyPrice = isYearly ? equivalenteMensual(plan.priceYearly) : plan.priceMonthly;
              const savings = calculateYearlySavings(plan);

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative p-6 rounded-2xl border transition-all hover:scale-105 flex flex-col ${
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
                        {formatPrice(monthlyPrice, moneda)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        /{t('pricing.perMonth')}
                      </span>
                    </div>
                    {isYearly && plan.priceYearly > 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatPrice(price, moneda)} {t('pricing.billedYearly')}
                      </p>
                    )}
                    {isYearly && savings > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs font-semibold">
                        <Zap className="h-3 w-3" />
                        {t('pricing.save').replace(/\d+%/, `${savings}%`)}
                      </div>
                    )}
                    {moneda === 'PEN' && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {t('pricing.igvIncluido')}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-grow">
                    {(plan.features || []).map((feature, i) => (
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
                    href={`/${locale}/setup?plan=${plan.id}`}
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
            <CorreoContacto className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              {t('pricing.contactUs')}
            </CorreoContacto>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
