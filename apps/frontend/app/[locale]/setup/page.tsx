'use client';

import { useState, useEffect } from 'react';
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
  Rocket
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// Step Components
import { 
  WelcomeStep, 
  CompanyStep, 
  LogoStep, 
  CurrencyStep, 
  TaxStep, 
  CompleteStep 
} from '@/components/setup';

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
  { id: 'company', icon: Building2, color: 'from-blue-500 to-cyan-500' },
  { id: 'logo', icon: ImageIcon, color: 'from-green-500 to-emerald-500' },
  { id: 'currency', icon: DollarSign, color: 'from-yellow-500 to-orange-500' },
  { id: 'tax', icon: Percent, color: 'from-red-500 to-pink-500' },
  { id: 'complete', icon: Rocket, color: 'from-indigo-500 to-purple-500' },
];

export default function SetupWizardPage() {
  const t = useTranslations('setup');
  const router = useRouter();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [setupData, setSetupData] = useState<SetupData>({
    companyName: '',
    direccion: '',
    telefono: '',
    email: '',
    website: '',
    logo: null,
    currency: 'USD',
    locale: 'en',
    taxRate: 0,
    taxName: 'Tax',
    taxEnabled: false,
  });

  // Check if user already completed setup
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
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
        // No empresa yet, that's fine
        console.log('No empresa found, starting fresh setup');
      } finally {
        setIsLoading(false);
      }
    };

    checkSetupStatus();
  }, [router]);

  const updateSetupData = (data: Partial<SetupData>) => {
    setSetupData(prev => ({ ...prev, ...data }));
  };

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
      // Save empresa data
      await api.put('/empresas/mi-empresa', {
        nombre: setupData.companyName,
        direccion: setupData.direccion,
        telefono: setupData.telefono,
        email: setupData.email,
        web: setupData.website,
        logoUrl: setupData.logo,
        currency: setupData.currency,
        locale: setupData.locale,
        taxRate: setupData.taxEnabled ? setupData.taxRate : 0,
        taxName: setupData.taxName,
        setupCompleted: true,
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing setup:', error);
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

  const CurrentStepComponent = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={nextStep} />;
      case 1:
        return (
          <CompanyStep 
            data={setupData} 
            onUpdate={updateSetupData} 
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 2:
        return (
          <LogoStep 
            data={setupData} 
            onUpdate={updateSetupData} 
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <CurrencyStep 
            data={setupData} 
            onUpdate={updateSetupData} 
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <TaxStep 
            data={setupData} 
            onUpdate={updateSetupData} 
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 5:
        return (
          <CompleteStep 
            data={setupData} 
            onComplete={completeSetup}
            onPrev={prevStep}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

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
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent />
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
