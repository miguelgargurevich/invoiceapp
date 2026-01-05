'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  FileText, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Play
} from 'lucide-react';

export function HeroSection() {
  const t = useTranslations('landing');
  const locale = useLocale();

  const benefits = [
    t('hero.benefit1'),
    t('hero.benefit2'),
    t('hero.benefit3'),
  ];

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/20 to-primary-500/20 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {t('hero.badge')}
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            <span className="text-slate-900 dark:text-white">{t('hero.titleLine1')}</span>
            <br />
            <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-cyan-500 bg-clip-text text-transparent">
              {t('hero.titleLine2')}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* Benefits List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6"
          >
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm md:text-base">{benefit}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href={`/${locale}/register`}
              className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10">{t('hero.cta.primary')}</span>
              <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            
            <a
              href="#features"
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Play className="w-5 h-5 text-primary-600" />
              {t('hero.cta.secondary')}
            </a>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 flex flex-col items-center"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">{t('hero.socialProof.count')}</span>
              {' '}{t('hero.socialProof.text')}
            </p>
          </motion.div>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-16 md:mt-24 relative"
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-500 via-purple-500 to-cyan-500 rounded-3xl blur-2xl opacity-20" />
            
            {/* Browser Mockup */}
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400 font-mono">
                    app.invoiceapp.io
                  </div>
                </div>
              </div>
              
              {/* Dashboard Preview */}
              <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Stats Cards */}
                  {[
                    { label: t('hero.preview.invoices'), value: '247', color: 'primary' },
                    { label: t('hero.preview.revenue'), value: '$48,500', color: 'green' },
                    { label: t('hero.preview.clients'), value: '89', color: 'purple' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                      className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                      <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>
                
                {/* Recent Invoices Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                  className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('hero.preview.recentInvoices')}</h3>
                    <div className="h-6 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <div className="h-4 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
                            <div className="h-3 w-16 bg-slate-50 dark:bg-slate-800 rounded mt-1" />
                          </div>
                        </div>
                        <div className="h-6 w-16 bg-green-100 dark:bg-green-900/30 rounded-full" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
