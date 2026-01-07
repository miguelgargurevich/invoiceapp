'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  FileText,
  Send,
  PenTool,
  DollarSign,
  ArrowRight
} from 'lucide-react';

export function HowItWorksSection() {
  const t = useTranslations('landing');

  // Timeline steps matching proposal flow: Created → Sent → Signed → Invoiced → Paid
  const steps = [
    { 
      icon: FileText, 
      color: 'blue',
      gradient: 'from-blue-500 to-blue-700',
      shadow: 'shadow-blue-500/30'
    },
    { 
      icon: Send, 
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-700',
      shadow: 'shadow-indigo-500/30'
    },
    { 
      icon: PenTool, 
      color: 'violet',
      gradient: 'from-violet-500 to-violet-700',
      shadow: 'shadow-violet-500/30'
    },
    { 
      icon: FileText, 
      color: 'amber',
      gradient: 'from-amber-500 to-amber-700',
      shadow: 'shadow-amber-500/30'
    },
    { 
      icon: DollarSign, 
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-700',
      shadow: 'shadow-emerald-500/30'
    },
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

        {/* Steps Timeline */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 -translate-y-1/2" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="text-center">
                    {/* Timeline Icon */}
                    <div className="relative inline-flex mb-6">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-xl ${step.shadow}`}>
                        <Icon className="w-9 h-9 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      {t(`howItWorks.steps.${index}.title`)}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                      {t(`howItWorks.steps.${index}.description`)}
                    </p>
                  </div>
                  
                  {/* Arrow (Mobile/Tablet) */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center py-6">
                      <ArrowRight className="w-6 h-6 text-slate-400 rotate-90 md:rotate-0" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            {t('howItWorks.socialProof')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
