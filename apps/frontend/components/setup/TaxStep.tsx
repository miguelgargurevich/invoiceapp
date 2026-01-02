'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Percent, ChevronRight, ChevronLeft, ToggleLeft, ToggleRight } from 'lucide-react';

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

interface TaxStepProps {
  data: SetupData;
  onUpdate: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const TAX_PRESETS = [
  { name: 'No Tax', rate: 0 },
  { name: 'VAT 7%', rate: 7 },
  { name: 'VAT 10%', rate: 10 },
  { name: 'Sales Tax 8.25%', rate: 8.25 },
  { name: 'IGV 18%', rate: 18 },
  { name: 'IVA 16%', rate: 16 },
  { name: 'IVA 19%', rate: 19 },
  { name: 'IVA 21%', rate: 21 },
  { name: 'GST 10%', rate: 10 },
];

export default function TaxStep({ data, onUpdate, onNext, onPrev }: TaxStepProps) {
  const t = useTranslations('setup');

  const toggleTax = () => {
    onUpdate({ 
      taxEnabled: !data.taxEnabled,
      taxRate: !data.taxEnabled ? (data.taxRate || 10) : 0
    });
  };

  const handlePresetSelect = (preset: typeof TAX_PRESETS[0]) => {
    if (preset.rate === 0) {
      onUpdate({ taxEnabled: false, taxRate: 0, taxName: 'Tax' });
    } else {
      onUpdate({ 
        taxEnabled: true, 
        taxRate: preset.rate,
        taxName: preset.name.split(' ')[0] // Get first word like "VAT", "IGV", etc.
      });
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl mb-4">
          <Percent className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('tax.title')}</h2>
        <p className="text-white/60">{t('tax.subtitle')}</p>
      </div>

      {/* Tax Toggle */}
      <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-6">
        <div>
          <p className="text-white font-medium">{t('tax.enableTax')}</p>
          <p className="text-white/50 text-sm">{t('tax.enableTaxDesc')}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleTax}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            data.taxEnabled ? 'bg-red-500' : 'bg-white/20'
          }`}
        >
          <motion.div
            animate={{ x: data.taxEnabled ? 24 : 4 }}
            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
          />
        </motion.button>
      </div>

      {/* Tax Configuration - Only show when enabled */}
      {data.taxEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-6"
        >
          {/* Presets */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              {t('tax.presets')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TAX_PRESETS.filter(p => p.rate > 0).map((preset) => (
                <motion.button
                  key={preset.name}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePresetSelect(preset)}
                  className={`
                    p-3 rounded-xl border text-sm transition-all
                    ${data.taxRate === preset.rate
                      ? 'bg-red-500/20 border-red-500 text-white'
                      : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'}
                  `}
                >
                  {preset.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Custom Tax Input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('tax.name')}
              </label>
              <input
                type="text"
                value={data.taxName}
                onChange={(e) => onUpdate({ taxName: e.target.value })}
                placeholder="VAT, IGV, IVA..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                {t('tax.rate')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={data.taxRate}
                  onChange={(e) => onUpdate({ taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50">%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preview */}
      <div className="bg-white/5 rounded-xl p-4 mt-6 mb-8">
        <p className="text-white/60 text-sm mb-2">{t('tax.preview')}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-white/70">
            <span>Subtotal</span>
            <span>$1,000.00</span>
          </div>
          {data.taxEnabled && (
            <div className="flex justify-between text-white/70">
              <span>{data.taxName} ({data.taxRate}%)</span>
              <span>${((1000 * data.taxRate) / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
            <span>Total</span>
            <span>${(1000 + (data.taxEnabled ? (1000 * data.taxRate) / 100 : 0)).toFixed(2)}</span>
          </div>
        </div>
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
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
        >
          {t('buttons.continue')}
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
