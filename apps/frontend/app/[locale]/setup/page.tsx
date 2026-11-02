'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Image as ImageIcon,
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
  PlanStep,
  CompleteStep 
} from '@/components/setup';

interface SetupData {
  // Auth fields
  name: string;
  email: string;
  password: string;
  // Company fields
  pais: 'PE';
  companyName: string;
  ruc: string;
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
  ruc?: string;
  pais?: 'US' | 'PE';
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
  { id: 'welcome', icon: Sparkles, color: 'from-primary-500 to-primary-700' },
  { id: 'auth', icon: UserPlus, color: 'from-primary-500 to-primary-700' },
  { id: 'company', icon: Building2, color: 'from-primary-500 to-primary-700' },
  { id: 'plan', icon: Check, color: 'from-primary-500 to-primary-700' },
  { id: 'complete', icon: Rocket, color: 'from-primary-500 to-primary-700' },
];

// Facturo es solo para Perú: la moneda (PEN) y el IGV (18 %) ya vienen fijos, así que no hay pasos de moneda ni de impuesto.
// Los índices de los pasos con pantalla propia se buscan por id, para no depender de su posición.
const PASO_PLAN = STEPS.findIndex((s) => s.id === 'plan');
const PASO_COMPLETAR = STEPS.findIndex((s) => s.id === 'complete');

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
  // RUC de una empresa ya existente: no se pisa con uno provisional al guardar.
  const [rucExistente, setRucExistente] = useState<string | null>(null);
  const PASO_CUENTA = STEPS.findIndex((s) => s.id === 'auth');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [setupData, setSetupData] = useState<SetupData>({
    name: '',
    email: '',
    password: '',
    companyName: '',
    ruc: '',
    direccion: '',
    telefono: '',
    emailEmpresa: '',
    website: '',
    logoFile: null,
    logo: null,
    locale: 'es',
    // Facturo es para Perú: país, moneda e impuesto por defecto (el paso de empresa los puede cambiar).
    pais: 'PE' as const,
    currency: 'PEN',
    taxRate: 18,
    taxName: 'IGV',
    taxEnabled: true,
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
          setCurrentStep(STEPS.length - 1); // CompleteStep
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
          setRucExistente(response.ruc || null);
          setSetupData(prev => ({
            ...prev,
            companyName: response.nombre || '',
            // Un RUC provisional (TEMP-…) no se muestra: el usuario debe poner el real.
            ruc: response.ruc && !response.ruc.startsWith('TEMP-') ? response.ruc : '',
            direccion: response.direccion || '',
            telefono: response.telefono || '',
            emailEmpresa: response.email || '',
            website: response.web || '',
            logo: response.logoUrl || null,
            currency: 'PEN',
            // Empresa siempre de Perú: PEN e IGV 18 % (ya no se preguntan en el asistente).
            pais: 'PE',
            locale: 'es',
            taxRate: 18,
            taxName: 'IGV',
            taxEnabled: true,
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

  // Con sesión iniciada (p. ej. tras /register) el paso «Crear cuenta» no aplica: se salta en ambos sentidos.
  const saltarCuenta = (paso: number, sentido: 1 | -1) =>
    currentUser && paso === PASO_CUENTA ? paso + sentido : paso;

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => saltarCuenta(prev + 1, 1));
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => saltarCuenta(prev - 1, -1));
    }
  };

  useEffect(() => {
    if (currentUser && currentStep === PASO_CUENTA) setCurrentStep(PASO_CUENTA + 1);
  }, [currentUser, currentStep, PASO_CUENTA]);

  const completeSetup = async () => {
    setIsSaving(true);
    try {
      console.log('[SETUP] Starting account creation...');
      
      // STEP 1: Create user account with empresa data in one call
      if (!currentUser) {
        try {
          console.log('[SETUP] Creating account with empresa data...');

          // La empresa se crea después, con PUT /empresas/mi-empresa (STEP 1b)
          await signUp(setupData.email, setupData.password, setupData.name);
          console.log('[SETUP] Account created');

          // Ensure local state has a user right after signup
          setCurrentUser({ email: setupData.email } as any);

          // Small delay for UI state propagation
          await new Promise(resolve => setTimeout(resolve, 400));
        } catch (error: any) {
          console.error('[SETUP] Error creating account:', error);
          alert('Error al crear la cuenta: ' + (error.message || 'Intenta de nuevo'));
          setIsSaving(false);
          return;
        }
      }

      // STEP 1b: Crear o actualizar la empresa con los datos del asistente y marcar el setup como completo.
      // Sin esto, una cuenta creada en /register (o aquí mismo) quedaba sin empresa y el resto fallaba.
      try {
        await api.put('/empresas/mi-empresa', {
          nombre: setupData.companyName,
          // El RUC escrito en el asistente manda; si no hay, se conserva el existente (o el backend pone uno TEMP-…).
          ...(setupData.ruc.trim() ? { ruc: setupData.ruc.trim() } : rucExistente ? { ruc: rucExistente } : {}),
          direccion: setupData.direccion,
          telefono: setupData.telefono,
          email: setupData.emailEmpresa,
          web: setupData.website,
          currency: setupData.currency,
          pais: setupData.pais,
          locale: setupData.locale,
          taxRate: setupData.taxEnabled ? setupData.taxRate : 0,
          taxName: setupData.taxName,
          setupCompleted: true,
        });
      } catch (error: any) {
        console.error('[SETUP] Error saving company:', error);
        // 409 = el RUC ya existe en otra empresa: se muestra el mensaje del backend.
        alert(error?.status === 409 ? error.message : 'No se pudo guardar tu empresa. Intenta de nuevo.');
        setIsSaving(false);
        return;
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
      // Fetch plans (del país de la empresa) to determine if selected plan is paid
      let isPaidPlan = false;
      try {
        const { getPlans } = await import('@/lib/subscriptions');
        const plans = await getPlans(setupData.pais);
        const selectedPlan = plans.find(p => p.id === setupData.selectedPlan);
        isPaidPlan = !!selectedPlan && selectedPlan.priceMonthly > 0;
      } catch (error) {
        console.error('[SETUP] Error fetching plans:', error);
      }

      if (isPaidPlan && setupData.pais === 'PE') {
        // Perú: el plan de pago se contrata con Culqi en Configuración › Suscripción (no hay checkout de Stripe).
        // /initialize deja el plan gratis; si la suscripción ya existía no responde `pagoPendiente`,
        // así que se redirige siempre que el plan elegido es de pago.
        try {
          await api.post('/subscriptions/initialize', { planId: setupData.selectedPlan });
        } catch (error) {
          console.error('[SETUP] Error initializing subscription:', error);
        }
        await refreshEmpresa();
        document.cookie = `preferredLocale=${setupData.locale};path=/;max-age=31536000`;
        const intervalo = setupData.billingInterval === 'monthly' ? 'MONTH' : 'YEAR';
        router.push(`/${setupData.locale}/configuracion?tab=suscripcion&contratar=${setupData.selectedPlan}&intervalo=${intervalo}`);
        return;
      }

      if (isPaidPlan) {
        // Plan de pago fuera de Perú (ya no se alcanza: el asistente siempre crea empresas PE): checkout de Stripe
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
          alert('Error al procesar el pago. Por favor intenta de nuevo.');
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
      alert('Error al completar la configuración. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex flex-col">
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
                      ${isCompleted ? 'bg-primary-500' : ''}
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
                        index < currentStep ? 'bg-primary-500' : 'bg-white/20'
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
        <div className={`w-full ${currentStep === PASO_PLAN ? 'max-w-7xl' : 'max-w-2xl'}`}>
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
              {currentStep === PASO_PLAN && (
                <PlanStep 
                  data={setupData} 
                  onUpdate={updateSetupData} 
                  onNext={nextStep}
                  onPrev={prevStep}
                />
              )}
              {currentStep === PASO_COMPLETAR && (
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