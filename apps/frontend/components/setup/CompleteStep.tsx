'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Rocket, 
  Check, 
  Building2, 
  Image as ImageIcon, 
  DollarSign, 
  Percent,
  ArrowRight,
  Sparkles,
  CreditCard
} from 'lucide-react';

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

interface CompleteStepProps {
  data: SetupData;
  onComplete: () => void;
  onPrev: () => void;
  isSaving: boolean;
}

export default function CompleteStep({ data, onComplete, onPrev, isSaving }: CompleteStepProps) {
  const t = useTranslations('setup');

  const summaryItems = [
    { 
      icon: Building2, 
      label: t('complete.company'), 
      value: data.companyName,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      icon: ImageIcon, 
      label: t('complete.logo'), 
      value: data.logo ? t('complete.logoUploaded') : t('complete.logoSkipped'),
      color: 'from-green-500 to-emerald-500'
    },
    { 
      icon: DollarSign, 
      label: t('complete.currency'), 
      value: `${data.currency} (${data.locale === 'en' ? 'English' : 'Español'})`,
      color: 'from-yellow-500 to-orange-500'
    },
    { 
      icon: Percent, 
      label: t('complete.tax'), 
      value: data.taxEnabled ? `${data.taxName} ${data.taxRate}%` : t('complete.noTax'),
      color: 'from-red-500 to-pink-500'
    },
    { 
      icon: CreditCard, 
      label: t('complete.plan'), 
      value: data.selectedPlan === 'free' ? t('complete.freePlan') : data.selectedPlan === 'pro' ? t('complete.proPlan') : t('complete.premiumPlan'),
      color: 'from-purple-500 to-indigo-500'
    },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl mb-4"
        >
          <Rocket className="w-10 h-10 text-white" />
        </motion.div>
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-white mb-2"
        >
          {t('complete.title')}
        </motion.h2>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/60"
        >
          {t('complete.subtitle')}
        </motion.p>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 mb-8"
      >
        {summaryItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            className="flex items-center gap-4 bg-white/5 rounded-xl p-4"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-sm">{item.label}</p>
              <p className="text-white font-medium truncate">{item.value}</p>
            </div>
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
          </motion.div>
        ))}
      </motion.div>

      {/* Logo Preview if uploaded */}
      {data.logo && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white rounded-xl p-4 shadow-xl">
            <img
              src={data.logo}
              alt="Company logo"
              className="h-16 w-auto object-contain"
            />
          </div>
        </motion.div>
      )}

      {/* What's Next */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 mb-8 border border-indigo-500/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-white font-medium">{t('complete.whatsNext')}</span>
        </div>
        <ul className="text-white/70 text-sm space-y-1 ml-7">
          <li>• {t('complete.next1')}</li>
          <li>• {t('complete.next2')}</li>
          <li>• {t('complete.next3')}</li>
        </ul>
      </motion.div>

      {/* Navigation Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="flex justify-between"
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPrev}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          {t('buttons.back')}
        </motion.button>
        
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
              {t('complete.saving')}
            </>
          ) : (
            <>
              {t('complete.launch')}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
