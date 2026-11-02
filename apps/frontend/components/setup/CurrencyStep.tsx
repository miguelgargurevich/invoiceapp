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
  { code: 'USD', symbol: '$', name: 'Dólar estadounidense' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Libra esterlina' },
  { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
  { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  { code: 'ARS', symbol: '$', name: 'Peso argentino' },
  { code: 'COP', symbol: '$', name: 'Peso colombiano' },
  { code: 'CLP', symbol: '$', name: 'Peso chileno' },
  { code: 'BRL', symbol: 'R$', name: 'Real brasileño' },
  { code: 'CAD', symbol: '$', name: 'Dólar canadiense' },
  { code: 'AUD', symbol: '$', name: 'Dólar australiano' },
  { code: 'JPY', symbol: '¥', name: 'Yen japonés' },
];

export default function CurrencyStep({ data, onUpdate, onNext, onPrev }: CurrencyStepProps) {
  const t = useTranslations('setup');

  const handleCurrencySelect = (currency: typeof CURRENCIES[0]) => {
    onUpdate({ currency: currency.code });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl mb-4">
          <DollarSign className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('currency.title')}</h2>
        <p className="text-white/60">{t('currency.subtitle')}</p>
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
                  ? 'bg-primary-500/20 border-primary-400 text-white'
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">{currency.symbol}</span>
                <span className="font-medium">{currency.code}</span>
              </div>
              <span className="text-xs text-white/50">{currency.name}</span>
              {data.currency === currency.code && (
                <Check className="w-4 h-4 text-primary-300 absolute top-3 right-3" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white/5 rounded-xl p-4 mb-8">
        <p className="text-white/60 text-sm mb-2">{t('currency.preview')}</p>
        <p className="text-2xl font-bold text-white">
          {new Intl.NumberFormat('es-PE', {
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
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all"
        >
          {t('buttons.continue')}
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
