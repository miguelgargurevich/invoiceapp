'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Image as ImageIcon, 
  DollarSign, 
  Percent, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Sparkles,
  Rocket,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// Step Components
import { 
  WelcomeStep, 
  AuthStep,
  CompanyStep, 
  CurrencyStep, 
  TaxStep, 
  PlanStep,
  CompleteStep 
} from '@/components/setup';

interface SetupData {
  // Auth fields
  name: string;
  email: string;
  password: string;
  // Company fields
  companyName: string;
  direccion: string;
  telefono: string;
  emailEmpresa: string;
  website: string;
  logoFile: File | null;
  logo: string | null;
  currency: string;
  locale: string;
  taxRate: number;
  taxName: string;
  taxEnabled: boolean;
  selectedPlan?: string;
  billingInterval?: 'monthly' | 'yearly';
}

interface EmpresaResponse {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  web?: string;
  logoUrl?: string;
  currency?: string;
  locale?: string;
  taxRate?: number;
  taxName?: string;
  setupCompleted?: boolean;
}

const STEPS = [
  { id: 'welcome', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  { id: 'auth', icon: UserPlus, color: 'from-green-500 to-emerald-500' },
  { id: 'company', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { id: 'currency', icon: DollarSign, color: 'from-yellow-500 to-orange-500' },
  { id: 'tax', icon: Percent, color: 'from-red-500 to-pink-500' },
  { id: 'plan', icon: Check, color: 'from-green-500 to-emerald-500' },
  { id: 'complete', icon: Rocket, color: 'from-indigo-500 to-purple-500' },
];

export default function SetupWizardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('setup');
  const router = useRouter();
  const { user, signUp, signIn, refreshEmpresa } = useAuth();
  const [currentUser, setCurrentUser] = useState(user);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [setupData, setSetupData] = useState<SetupData>({
    name: '',
    email: '',
    password: '',
    companyName: '',
    direccion: '',
    telefono: '',
    emailEmpresa: '',
    website: '',
    logoFile: null,
    logo: null,
    currency: 'USD',
    locale: 'en',
    taxRate: 0,
    taxName: 'Tax',
    taxEnabled: false,
    selectedPlan: 'free',
    billingInterval: 'yearly',
  });

  // Check if user already completed setup
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        // Check if returning from Stripe
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const planId = urlParams.get('plan');
        
        if (sessionId && planId) {
          // User returned from successful payment
          // Update the plan in state and move to complete step
          setSetupData(prev => ({ ...prev, selectedPlan: planId }));
          setCurrentStep(7); // Go to CompleteStep
          // Clean URL
          window.history.replaceState({}, '', `/${locale}/setup`);
        }

        // Only check empresa if user is authenticated
        if (!user) {
          setIsLoading(false);
          return;
        }

        const response = await api.get<EmpresaResponse>('/empresas/mi-empresa');
        if (response.setupCompleted) {
          // Already completed setup, redirect to dashboard
          router.push('/dashboard');
          return;
        }
        
        // Pre-fill with existing data if any
        if (response) {
          setSetupData(prev => ({
            ...prev,
            companyName: response.nombre || '',
            direccion: response.direccion || '',
            telefono: response.telefono || '',
            email: response.email || '',
            website: response.web || '',
            logo: response.logoUrl || null,
            currency: response.currency || 'USD',
            locale: response.locale || 'en',
            taxRate: response.taxRate || 0,
            taxName: response.taxName || 'Tax',
            taxEnabled: (response.taxRate || 0) > 0,
          }));
        }
      } catch (error) {
        // No empresa yet or not authenticated, that's fine
        console.log('No empresa found or not authenticated, starting fresh setup');
      } finally {
        setIsLoading(false);
      }
    };

    checkSetupStatus();
  }, [router, locale, user]);

  // Update currentUser when user changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const updateSetupData = useCallback((data: Partial<SetupData>) => {
    setSetupData(prev => ({ ...prev, ...data }));
  }, []);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeSetup = async () => {
    setIsSaving(true);
    try {
      console.log('[SETUP] Starting account creation...');
      
      // STEP 1: Create user account with empresa data in one call
      if (!currentUser) {
        try {
          console.log('[SETUP] Creating account with empresa data...');
          const empresaDataForSignUp = {
            nombre: setupData.companyName,
            ruc: `TEMP-${Date.now()}`,
            direccion: setupData.direccion,
            telefono: setupData.telefono,
            email: setupData.emailEmpresa,
            web: setupData.website,
            currency: setupData.currency,
            locale: setupData.locale,
            taxRate: setupData.taxEnabled ? setupData.taxRate : 0,
            taxName: setupData.taxName,
          };

          // Register with empresa data - this creates both user and empresa
          await signUp(setupData.email, setupData.password, setupData.name);
          console.log('[SETUP] Account and empresa created successfully');

          // Ensure local state has a user right after signup
          setCurrentUser({ email: setupData.email } as any);

          // Small delay for UI state propagation
          await new Promise(resolve => setTimeout(resolve, 400));
        } catch (error: any) {
          console.error('[SETUP] Error creating account:', error);
          alert('Error creating account: ' + (error.message || 'Please try again'));
          setIsSaving(false);
          return;
        }
      }

      // STEP 2: Upload logo if exists
      if (setupData.logoFile) {
        try {
          console.log('[SETUP] Uploading logo...');
          const formData = new FormData();
          formData.append('logo', setupData.logoFile);
          
          const logoResponse = await api.upload<{ logoUrl: string }>('/empresas/logo', formData);
          console.log('[SETUP] Logo uploaded:', logoResponse.logoUrl);
        } catch (error) {
          console.error('[SETUP] Error uploading logo:', error);
          // Continue without logo
        }
      }

      // STEP 3: Handle subscription
      // Fetch plans to determine if selected plan is paid
      let isPaidPlan = false;
      try {
        const { getPlans } = await import('@/lib/subscriptions');
        const plans = await getPlans();
        const selectedPlan = plans.find(p => p.id === setupData.selectedPlan);
        isPaidPlan = !!selectedPlan && selectedPlan.priceMonthly > 0;
      } catch (error) {
        console.error('[SETUP] Error fetching plans:', error);
      }

      if (isPaidPlan) {
        // For paid plans: create Stripe checkout session now that we have a token
        try {
          console.log('[SETUP] Creating Stripe checkout session...');
          const response = await api.post<{ url: string }>('/subscriptions/create-checkout-session', {
            planId: setupData.selectedPlan,
            billingInterval: setupData.billingInterval || 'yearly',
            locale: setupData.locale,
          });
          if (response.url) {
            // Set locale cookie before redirect
            document.cookie = `preferredLocale=${setupData.locale};path=/;max-age=31536000`;
            window.location.href = response.url;
            return;
          }
        } catch (error) {
          console.error('[SETUP] Error creating checkout session:', error);
          alert(setupData.locale === 'es'
            ? 'Error al procesar el pago. Por favor intenta de nuevo.'
            : 'Error processing payment. Please try again.');
          setIsSaving(false);
          return;
        }
      } else {
        // Free plan: initialize subscription directly
        try {
          await api.post('/subscriptions/initialize', { planId: setupData.selectedPlan });
          console.log('[SETUP] Subscription initialized');
        } catch (error) {
          console.error('[SETUP] Error initializing subscription:', error);
          // Continue anyway
        }
      }

      // Refresh empresa in auth context
      await refreshEmpresa();

      // Set preferred locale cookie for future visits
      document.cookie = `preferredLocale=${setupData.locale};path=/;max-age=31536000`;

      // Redirect to dashboard in the selected language
      router.push(`/${setupData.locale}/dashboard`);
    } catch (error) {
      console.error('Error completing setup:', error);
      alert('Error completing setup. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Progress Header */}
      <div className="w-full py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      opacity: isActive || isCompleted ? 1 : 0.4,
                    }}
                    className={`
                      relative flex items-center justify-center w-10 h-10 rounded-full
                      ${isActive ? `bg-gradient-to-r ${step.color}` : ''}
                      ${isCompleted ? 'bg-green-500' : ''}
                      ${!isActive && !isCompleted ? 'bg-white/10' : ''}
                      transition-all duration-300
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className="w-5 h-5 text-white" />
                    )}
                  </motion.div>
                  
                  {index < STEPS.length - 1 && (
                    <div 
                      className={`w-8 h-0.5 mx-1 transition-colors duration-300 ${
                        index < currentStep ? 'bg-green-500' : 'bg-white/20'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Step label */}
          <motion.p 
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white/60 text-sm"
          >
            {t(`steps.${STEPS[currentStep].id}.label`)} ({currentStep + 1}/{STEPS.length})
          </motion.p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className={`w-full ${currentStep === 5 ? 'max-w-7xl' : 'max-w-2xl'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && <WelcomeStep onNext={nextStep} />}
              {currentStep === 1 && (
                <AuthStep 
                  data={setupData}
                  onUpdate={updateSetupData}
                  onNext={nextStep}
                  onPrev={prevStep}
                />
              )}
              {currentStep === 2 && (
                <CompanyStep 
                  data={setupData} 
                  onUpdate={updateSetupData} 
                  onNext={nextStep}
                  onPrev={prevStep}
                />
              )}
              {currentStep === 3 && (
                <CurrencyStep 
                  data={setupData} 
                  onUpdate={updateSetupData} 
                  onNext={nextStep}
                  onPrev={prevStep}
                />
              )}
              {currentStep === 4 && (
                <TaxStep 
                  data={setupData} 
                  onUpdate={updateSetupData} 
                  onNext={nextStep}
                  onPrev={prevStep}
                />
              )}
              {currentStep === 5 && (
                <PlanStep 
                  data={setupData} 
                  onUpdate={updateSetupData} 
                  onNext={nextStep}
                  onPrev={prevStep}
                />
              )}
              {currentStep === 6 && (
                <CompleteStep 
                  data={setupData} 
                  onComplete={completeSetup}
                  onPrev={prevStep}
                  isSaving={isSaving}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Time estimate */}
      <div className="pb-6 text-center">
        <p className="text-white/40 text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          {t('timeEstimate')}
        </p>
      </div>
    </div>
  );
}