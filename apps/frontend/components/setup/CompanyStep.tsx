'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import api from '@/lib/api';

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
}

interface CompanyStepProps {
  data: SetupData;
  onUpdate: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function CompanyStep({ data, onUpdate, onNext, onPrev }: CompanyStepProps) {
  const t = useTranslations('setup');  const tCommon = useTranslations('common');  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.companyName.trim()) {
      onNext();
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Just store the file object, don't upload yet
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    onUpdate({ logoFile: file, logo: previewUrl });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeLogo = () => {
    // Revoke the object URL if it exists
    if (data.logo && data.logo.startsWith('blob:')) {
      URL.revokeObjectURL(data.logo);
    }
    onUpdate({ logo: null, logoFile: null });
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
          />
        </div>

        {/* Logo Upload Section */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            <ImageIcon className="w-4 h-4 inline mr-2" />
            {t('logo.title')} <span className="text-white/40 text-xs ml-1">({tCommon('optional')})</span>
          </label>
          
          {data.logo ? (
            <div className="relative bg-white/10 border-2 border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                  <img
                    src={data.logo}
                    alt="Company logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{t('logo.uploaded')}</p>
                  <p className="text-white/50 text-sm">{t('logo.uploadedDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${dragActive 
                  ? 'border-blue-400 bg-blue-500/10' 
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400" />
                  <p className="text-white/60">{t('logo.uploading')}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white/60" />
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">{t('logo.dropzone')}</p>
                    <p className="text-white/50 text-sm">{t('logo.formats')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle Optional Fields */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            {showOptionalFields ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('company.hideOptionalFields')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('company.showOptionalFields')}
              </>
            )}
          </button>
        </div>

        {/* Optional Fields - Collapsible */}
        {showOptionalFields && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 pt-2"
          >
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
                  type="text"
                  inputMode="email"
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
                type="text"
                value={data.website}
                onChange={(e) => onUpdate({ website: e.target.value })}
                placeholder="https://yourcompany.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </motion.div>
        )}

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
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 text-white font-semibold shadow-lg shadow-blue-500/30 dark:shadow-blue-600/30 hover:shadow-blue-500/50 dark:hover:shadow-blue-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
