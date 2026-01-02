'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Building2, ChevronRight, ChevronLeft, MapPin, Phone, Mail, Globe } from 'lucide-react';

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

interface CompanyStepProps {
  data: SetupData;
  onUpdate: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function CompanyStep({ data, onUpdate, onNext, onPrev }: CompanyStepProps) {
  const t = useTranslations('setup');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.companyName.trim()) {
      onNext();
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('company.title')}</h2>
        <p className="text-white/60">{t('company.subtitle')}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Name - Required */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            {t('company.name')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder={t('company.namePlaceholder')}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
            autoFocus
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            <MapPin className="w-4 h-4 inline mr-2" />
            {t('company.address')}
          </label>
          <textarea
            value={data.direccion}
            onChange={(e) => onUpdate({ direccion: e.target.value })}
            placeholder={t('company.addressPlaceholder')}
            rows={2}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Contact Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              {t('company.phone')}
            </label>
            <input
              type="tel"
              value={data.telefono}
              onChange={(e) => onUpdate({ telefono: e.target.value })}
              placeholder={t('company.phonePlaceholder')}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              {t('company.email')}
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder={t('company.emailPlaceholder')}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            <Globe className="w-4 h-4 inline mr-2" />
            {t('company.website')}
          </label>
          <input
            type="url"
            value={data.website}
            onChange={(e) => onUpdate({ website: e.target.value })}
            placeholder="https://yourcompany.com"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
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
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!data.companyName.trim()}
          >
            {t('buttons.continue')}
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
