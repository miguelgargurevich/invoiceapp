'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Image as ImageIcon, ChevronRight, ChevronLeft, Upload, X, Sparkles } from 'lucide-react';
import api from '@/lib/api';

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

interface LogoStepProps {
  data: SetupData;
  onUpdate: (data: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function LogoStep({ data, onUpdate, onNext, onPrev }: LogoStepProps) {
  const t = useTranslations('setup');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post('/api/empresa/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.logoUrl) {
        onUpdate({ logo: response.data.logoUrl });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setIsUploading(false);
    }
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
    onUpdate({ logo: null });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mb-4">
          <ImageIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('logo.title')}</h2>
        <p className="text-white/60">{t('logo.subtitle')}</p>
      </div>

      {/* Logo Upload Area */}
      <div className="mb-8">
        {data.logo ? (
          <div className="relative">
            <div className="relative mx-auto w-48 h-48 bg-white rounded-2xl shadow-xl overflow-hidden">
              <img
                src={data.logo}
                alt="Company logo"
                className="w-full h-full object-contain p-4"
              />
              <button
                onClick={removeLogo}
                className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-green-400 mt-4 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('logo.uploaded')}
            </p>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative mx-auto w-full max-w-sm h-48 border-2 border-dashed rounded-2xl
              flex flex-col items-center justify-center gap-4 cursor-pointer
              transition-all duration-300
              ${dragActive 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-white/30 hover:border-white/50 hover:bg-white/5'}
            `}
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
            ) : (
              <>
                <Upload className={`w-10 h-10 ${dragActive ? 'text-green-400' : 'text-white/40'}`} />
                <div className="text-center">
                  <p className="text-white/80">{t('logo.dropzone')}</p>
                  <p className="text-white/40 text-sm mt-1">{t('logo.formats')}</p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Skip notice */}
      <p className="text-center text-white/40 text-sm mb-8">
        {t('logo.skipNotice')}
      </p>

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
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all"
        >
          {data.logo ? t('buttons.continue') : t('buttons.skip')}
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
