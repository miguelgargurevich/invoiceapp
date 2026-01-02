'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { DollarSign, ChevronRight, ChevronLeft, Check } from 'lucide-react';

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

interface CurrencyStepProps {
  data: SetupData;
  onUpdate: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', locale: 'es' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', locale: 'es' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', locale: 'es' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', locale: 'es' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'es' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', locale: 'en' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', locale: 'en' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'en' },
];

const LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export default function CurrencyStep({ data, onUpdate, onNext, onPrev }: CurrencyStepProps) {
  const t = useTranslations('setup');

  const handleCurrencySelect = (currency: typeof CURRENCIES[0]) => {
    onUpdate({ 
      currency: currency.code,
      locale: currency.locale
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl mb-4">
          <DollarSign className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('currency.title')}</h2>
        <p className="text-white/60">{t('currency.subtitle')}</p>
      </div>

      {/* Language Selection */}
      <div className="mb-6">
        <label className="block text-white/80 text-sm font-medium mb-3">
          {t('currency.language')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {LOCALES.map((locale) => (
            <motion.button
              key={locale.code}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onUpdate({ locale: locale.code })}
              className={`
                relative flex items-center gap-3 p-4 rounded-xl border transition-all
                ${data.locale === locale.code
                  ? 'bg-yellow-500/20 border-yellow-500 text-white'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}
              `}
            >
              <span className="text-2xl">{locale.flag}</span>
              <span className="font-medium">{locale.name}</span>
              {data.locale === locale.code && (
                <Check className="w-5 h-5 text-yellow-400 absolute right-3" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Currency Selection */}
      <div className="mb-8">
        <label className="block text-white/80 text-sm font-medium mb-3">
          {t('currency.select')}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
          {CURRENCIES.map((currency) => (
            <motion.button
              key={currency.code}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCurrencySelect(currency)}
              className={`
                relative flex flex-col items-start p-4 rounded-xl border transition-all
                ${data.currency === currency.code
                  ? 'bg-yellow-500/20 border-yellow-500 text-white'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">{currency.symbol}</span>
                <span className="font-medium">{currency.code}</span>
              </div>
              <span className="text-xs text-white/50">{currency.name}</span>
              {data.currency === currency.code && (
                <Check className="w-4 h-4 text-yellow-400 absolute top-3 right-3" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white/5 rounded-xl p-4 mb-8">
        <p className="text-white/60 text-sm mb-2">{t('currency.preview')}</p>
        <p className="text-2xl font-bold text-white">
          {new Intl.NumberFormat(data.locale === 'es' ? 'es-ES' : 'en-US', {
            style: 'currency',
            currency: data.currency
          }).format(1234.56)}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPrev}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('buttons.back')}
        </motion.button>
        
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all"
        >
          {t('buttons.continue')}
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
