'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Smartphone,
  Zap,
  Clock,
  FileSignature,
  Camera,
  Receipt,
  FilePen,
  ShieldCheck,
  Calculator,
  Percent,
  IdCard,
  FileDown,
  XCircle,
  ClipboardList,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface ItemLanding {
  // Clave dentro de `landing.features.items` de cada idioma.
  key: string;
  icon: LucideIcon;
  color: string;
}

// Español (Perú): lo que Facturo resuelve para emitir comprobantes en regla.
const ITEMS_ES: ItemLanding[] = [
  { icon: FileText, color: 'primary', key: 'comprobantes' },
  { icon: FilePen, color: 'purple', key: 'notas' },
  { icon: ShieldCheck, color: 'slate', key: 'envio' },
  { icon: Calculator, color: 'orange', key: 'igv' },
  { icon: Percent, color: 'pink', key: 'regimenes' },
  { icon: IdCard, color: 'cyan', key: 'clientes' },
  { icon: FileDown, color: 'primary', key: 'pdf' },
  { icon: XCircle, color: 'red', key: 'anulaciones' },
  { icon: ClipboardList, color: 'slate', key: 'proformas' },
  { icon: BarChart3, color: 'blue', key: 'reportes' },
  { icon: AlertTriangle, color: 'amber', key: 'rechazos' },
  { icon: Lock, color: 'violet', key: 'claves' },
];

export function FeaturesSection() {
  const t = useTranslations('landing');
  const features = ITEMS_ES;

  const colorClasses: Record<string, { bg: string; icon: string; glow: string }> = {
    primary: {
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      icon: 'text-primary-600 dark:text-primary-400',
      glow: 'group-hover:shadow-primary-500/25',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      icon: 'text-purple-600 dark:text-purple-400',
      glow: 'group-hover:shadow-purple-500/25',
    },
    cyan: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      icon: 'text-cyan-600 dark:text-cyan-400',
      glow: 'group-hover:shadow-cyan-500/25',
    },
    slate: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      icon: 'text-slate-600 dark:text-slate-300',
      glow: 'group-hover:shadow-slate-500/25',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      icon: 'text-orange-600 dark:text-orange-400',
      glow: 'group-hover:shadow-orange-500/25',
    },
    blue: {
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      icon: 'text-primary-600 dark:text-primary-400',
      glow: 'group-hover:shadow-primary-500/25',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-400',
      glow: 'group-hover:shadow-red-500/25',
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      icon: 'text-pink-600 dark:text-pink-400',
      glow: 'group-hover:shadow-pink-500/25',
    },
    indigo: {
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      icon: 'text-primary-600 dark:text-primary-400',
      glow: 'group-hover:shadow-primary-500/25',
    },
    violet: {
      bg: 'bg-violet-100 dark:bg-violet-900/30',
      icon: 'text-violet-600 dark:text-violet-400',
      glow: 'group-hover:shadow-violet-500/25',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      icon: 'text-amber-600 dark:text-amber-400',
      glow: 'group-hover:shadow-amber-500/25',
    },
  };

  return (
    <section id="features" className="py-20 md:py-32 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
            {t('features.badge')}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {t('features.subtitle')}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colors = colorClasses[feature.color];

            return (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className={`group relative p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:shadow-xl ${colors.glow}`}
              >
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {t(`features.items.${feature.key}.title`)}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t(`features.items.${feature.key}.description`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
