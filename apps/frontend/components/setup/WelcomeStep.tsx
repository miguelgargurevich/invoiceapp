'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Sparkles, Clock, Shield, Zap, ChevronRight, ArrowLeft } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  const t = useTranslations('setup');
  const router = useRouter();

  const features = [
    { icon: Clock, text: t('welcome.feature1'), color: 'text-blue-400' },
    { icon: Shield, text: t('welcome.feature2'), color: 'text-green-400' },
    { icon: Zap, text: t('welcome.feature3'), color: 'text-yellow-400' },
  ];

  return (
    <div className="text-center">
      {/* Animated Logo/Icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-50" />
          <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-6">
            <Sparkles className="w-16 h-16 text-white" />
          </div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold text-white mb-4"
      >
        {t('welcome.title')}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-white/70 mb-12 max-w-md mx-auto"
      >
        {t('welcome.subtitle')}
      </motion.p>

      {/* Features */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid gap-4 mb-12 max-w-md mx-auto"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-center gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
          >
            <feature.icon className={`w-6 h-6 ${feature.color}`} />
            <span className="text-white/80 text-left">{feature.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-white/60 hover:text-white/90 font-medium px-6 py-4 rounded-xl border border-white/10 hover:border-white/30 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('welcome.backToHome')}
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNext}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
        >
          {t('welcome.getStarted')}
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
}
