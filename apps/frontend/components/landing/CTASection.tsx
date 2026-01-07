'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTASection() {
  const t = useTranslations('landing');
  const locale = useLocale();

  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff1_1px,transparent_1px),linear-gradient(to_bottom,#fff1_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/30 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            {t('cta.badge')}
          </span>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {t('cta.title')}
          </h2>

          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={`/${locale}/setup`}
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-primary-700 bg-white rounded-2xl shadow-xl shadow-black/20 hover:shadow-black/30 transition-all hover:scale-105"
            >
              {t('cta.primaryButton')}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white border-2 border-white/30 hover:border-white/50 bg-white/10 backdrop-blur-sm rounded-2xl transition-all hover:bg-white/20"
            >
              {t('cta.secondaryButton')}
            </a>
          </div>

          <p className="mt-8 text-sm text-white/60">
            {t('cta.noCard')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
