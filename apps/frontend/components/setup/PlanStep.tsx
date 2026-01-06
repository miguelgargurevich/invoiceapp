'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Loader2,
  Sparkles,
  Zap,
  Crown,
  Star
} from 'lucide-react';
import api from '@/lib/api';
import { getPlans, type Plan } from '@/lib/subscriptions';

interface SetupData {
  companyName: string;
  direccion: string;
  telefono: string;
  email: string;
  website: string;
  logo: string | null;
  currency: string;
  locale: string;
  taxRate: number;
  taxName: string;
  taxEnabled: boolean;
  selectedPlan?: string;
}

interface PlanStepProps {
  data: SetupData;
  onUpdate: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const getPlanIcon = (planName: string) => {
  const name = planName.toLowerCase();
  if (name.includes('free') || name.includes('trial')) return <Sparkles className="w-6 h-6" />;
  if (name.includes('starter') || name.includes('basic')) return <Zap className="w-6 h-6" />;
  if (name.includes('pro') || name.includes('premium')) return <Crown className="w-6 h-6" />;
  return <Star className="w-6 h-6" />;
};

const getPlanColor = (planName: string) => {
  const name = planName.toLowerCase();
  if (name.includes('free') || name.includes('trial')) return 'from-gray-500 to-gray-600';
  if (name.includes('starter') || name.includes('basic')) return 'from-blue-500 to-cyan-500';
  if (name.includes('pro') || name.includes('premium')) return 'from-purple-500 to-pink-500';
  return 'from-green-500 to-emerald-500';
};

export default function PlanStep({ data, onUpdate, onNext, onPrev }: PlanStepProps) {
  const t = useTranslations('setup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(data.selectedPlan || '');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');
  const locale = data.locale || 'en';

  const calculateYearlySavings = (plan: Plan) => {
    if (!plan.priceMonthly || !plan.priceYearly) return 0;
    const monthlyTotal = plan.priceMonthly * 12;
    return Math.round(((monthlyTotal - plan.priceYearly) / monthlyTotal) * 100);
  };

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plansData = await getPlans();
        setPlans(plansData);
        
        // Auto-select free/trial plan if none selected
        if (!selectedPlanId) {
          const freePlan = plansData.find(p => 
            p.name.toLowerCase().includes('free') || 
            p.name.toLowerCase().includes('trial')
          );
          if (freePlan) {
            setSelectedPlanId(freePlan.id);
            onUpdate({ selectedPlan: freePlan.id });
          }
        }
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlans();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlanId(planId);
    onUpdate({ selectedPlan: planId });
  };

  const handleContinue = async () => {
    if (!selectedPlanId) return;

    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      // Check if it's a free plan (price is 0)
      const isFree = selectedPlan.priceMonthly === 0;
      
      if (isFree) {
        // Free plan - just continue
        onNext();
      } else {
        // Paid plan - create checkout session and redirect
        const response = await api.post<{ url: string }>('/subscriptions/create-checkout-session', {
          planId: selectedPlanId,
          billingInterval,
          locale,
        });

        if (response.url) {
          // Save data to sessionStorage before redirect
          sessionStorage.setItem('setupData', JSON.stringify(data));
          // Redirect to Stripe Checkout
          window.location.href = response.url;
        }
      }
    } catch (error) {
      console.error('Error processing plan selection:', error);
      alert(locale === 'es' 
        ? 'Hubo un error al procesar tu selección. Por favor intenta de nuevo.' 
        : 'There was an error processing your selection. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mb-4">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {locale === 'es' ? 'Elige tu plan' : 'Choose your plan'}
        </h2>
        <p className="text-white/60">
          {locale === 'es' 
            ? 'Selecciona el plan que mejor se adapte a tus necesidades'
            : 'Select the plan that best fits your needs'
          }
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={`text-sm font-medium ${billingInterval === 'monthly' ? 'text-white' : 'text-white/60'}`}>
          {locale === 'es' ? 'Mensual' : 'Monthly'}
        </span>
        <button
          type="button"
          onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            billingInterval === 'yearly' ? 'bg-primary-600' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
              billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${billingInterval === 'yearly' ? 'text-white' : 'text-white/60'}`}>
          {locale === 'es' ? 'Anual' : 'Yearly'}
        </span>
        {billingInterval === 'yearly' && (
          <span className="px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">
            {locale === 'es' ? 'Ahorra hasta 20%' : 'Save up to 20%'}
          </span>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {plans.map((plan, index) => {
          const isSelected = selectedPlanId === plan.id;
          const isPopular = plan.name.toLowerCase().includes('pro'); // Mark PRO plan as popular
          const isFree = plan.priceMonthly === 0;
          const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          const savings = calculateYearlySavings(plan);
          
          return (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => handleSelectPlan(plan.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-6 rounded-xl border-2 transition-all text-left flex flex-col items-start
                ${isSelected 
                  ? 'border-white/40 bg-white/10 shadow-lg shadow-white/20' 
                  : 'border-white/10 bg-white/5 hover:border-white/20'
                }
                ${isPopular && 'ring-2 ring-purple-500/50'}
              `}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-semibold text-white flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {locale === 'es' ? 'Popular' : 'Popular'}
                </div>
              )}

              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${getPlanColor(plan.name)} rounded-xl mb-4`}>
                <div className="text-white">
                  {getPlanIcon(plan.name)}
                </div>
              </div>

              {/* Plan Name */}
              <h3 className="text-xl font-bold text-white mb-1">
                {plan.name}
              </h3>

              {/* Description */}
              {plan.description && (
                <p className="text-sm text-white/60 mb-3">{plan.description}</p>
              )}

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">
                  ${isFree ? '0' : price}
                </span>
                <span className="text-white/60 ml-1 text-sm">
                  {isFree 
                    ? (locale === 'es' ? 'para siempre' : 'forever')
                    : billingInterval === 'monthly'
                    ? (locale === 'es' ? '/mes' : '/month')
                    : (locale === 'es' ? '/año' : '/year')
                  }
                </span>
                {billingInterval === 'yearly' && savings > 0 && !isFree && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-xs font-semibold">
                    <Zap className="w-3 h-3" />
                    {locale === 'es' ? `Ahorra ${savings}%` : `Save ${savings}%`}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features?.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-white text-sm font-bold border border-white/30 shadow-lg">
                  <Check className="w-5 h-5" />
                  {locale === 'es' ? 'Seleccionado' : 'Selected'}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPrev}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          {locale === 'es' ? 'Atrás' : 'Back'}
        </motion.button>
        
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          disabled={!selectedPlanId || isProcessing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {locale === 'es' ? 'Procesando...' : 'Processing...'}
            </>
          ) : (
            <>
              {locale === 'es' ? 'Continuar' : 'Continue'}
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
