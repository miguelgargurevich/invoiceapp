'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  UserPlus,
  Settings,
  Send,
  ArrowRight
} from 'lucide-react';

export function HowItWorksSection() {
  const t = useTranslations('landing');

  const steps = [
    { icon: UserPlus, color: 'primary', number: '01' },
    { icon: Settings, color: 'purple', number: '02' },
    { icon: Send, color: 'green', number: '03' },
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4">
            {t('howItWorks.badge')}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
            {t('howItWorks.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {t('howItWorks.subtitle')}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary-500 via-purple-500 to-green-500 -translate-y-1/2" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className="relative"
                >
                  <div className="text-center">
                    {/* Step Number & Icon */}
                    <div className="relative inline-flex mb-6">
                      <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${
                        step.color === 'primary' ? 'from-primary-500 to-primary-700' :
                        step.color === 'purple' ? 'from-purple-500 to-purple-700' :
                        'from-green-500 to-green-700'
                      } flex items-center justify-center shadow-xl ${
                        step.color === 'primary' ? 'shadow-primary-500/30' :
                        step.color === 'purple' ? 'shadow-purple-500/30' :
                        'shadow-green-500/30'
                      }`}>
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white shadow-lg border border-slate-200 dark:border-slate-700">
                        {step.number}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                      {t(`howItWorks.steps.${index}.title`)}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                      {t(`howItWorks.steps.${index}.description`)}
                    </p>
                  </div>
                  
                  {/* Arrow (Mobile) */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center py-6">
                      <ArrowRight className="w-6 h-6 text-slate-400 rotate-90" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
