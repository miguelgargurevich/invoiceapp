'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  HardHat, 
  Laptop, 
  Building2, 
  Briefcase, 
  Check, 
  ChevronRight,
  FileText,
  X
} from 'lucide-react';

export interface ProposalTemplate {
  id: string;
  industry: 'contractor' | 'freelancer' | 'agency' | 'consultant';
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultTerms: string;
  defaultPaymentTerms: string;
  defaultWarranty?: string;
  defaultScope?: string;
  suggestedSections: string[];
}

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'contractor',
    industry: 'contractor',
    name: 'Contractor',
    description: 'Construction, renovation, electrical, plumbing',
    icon: HardHat,
    color: 'from-orange-500 to-amber-500',
    defaultTerms: `TERMS AND CONDITIONS:
1. All work to be completed in a workmanlike manner according to standard practices.
2. Any changes to the scope of work will require a written change order.
3. Client is responsible for obtaining necessary permits unless otherwise specified.
4. Contractor maintains general liability and workers compensation insurance.
5. All materials and labor guaranteed for one (1) year from completion date.`,
    defaultPaymentTerms: `PAYMENT TERMS:
• 50% deposit required to schedule work
• 25% upon substantial completion
• 25% final payment upon project completion
• Late payments subject to 1.5% monthly interest`,
    defaultWarranty: `WARRANTY:
All workmanship warranted for one (1) year from date of completion. Materials carry manufacturer's warranty. Warranty does not cover damage caused by improper use or maintenance.`,
    defaultScope: `SCOPE OF WORK:
• Remove and dispose of existing materials
• Supply and install new materials as specified
• Clean up work area upon completion
• Final walkthrough with client`,
    suggestedSections: ['Materials', 'Labor', 'Timeline', 'Permits', 'Warranty']
  },
  {
    id: 'freelancer',
    industry: 'freelancer',
    name: 'Freelancer',
    description: 'Design, development, writing, marketing',
    icon: Laptop,
    color: 'from-purple-500 to-pink-500',
    defaultTerms: `TERMS AND CONDITIONS:
1. All deliverables remain property of client upon final payment.
2. Client will provide timely feedback within 5 business days.
3. Revisions limited to 2 rounds per deliverable unless otherwise specified.
4. Additional revisions billed at hourly rate.
5. Rush delivery available at 50% premium.`,
    defaultPaymentTerms: `PAYMENT TERMS:
• 50% deposit required to begin work
• 50% due upon project completion
• Payment due within 14 days of invoice
• Accepted: Bank transfer, PayPal, Credit card`,
    defaultScope: `PROJECT SCOPE:
• Initial discovery and requirements gathering
• Design concepts and revisions
• Final deliverables in specified formats
• 30 days of post-delivery support`,
    suggestedSections: ['Deliverables', 'Timeline', 'Revisions', 'Licensing']
  },
  {
    id: 'agency',
    industry: 'agency',
    name: 'Agency',
    description: 'Full-service marketing, creative, digital',
    icon: Building2,
    color: 'from-blue-500 to-cyan-500',
    defaultTerms: `TERMS AND CONDITIONS:
1. Client retains ownership of all final approved work upon full payment.
2. Agency retains right to use work in portfolio with client permission.
3. Client provides brand guidelines and assets within 5 business days of kickoff.
4. Third-party costs (stock photos, fonts, hosting) billed separately.
5. Campaign performance metrics provided monthly.`,
    defaultPaymentTerms: `PAYMENT TERMS:
• Monthly retainer: Due 1st of each month
• Project work: 30% deposit, 40% midpoint, 30% completion
• Net 30 payment terms for established clients
• Setup fees and third-party costs due upfront`,
    defaultScope: `SCOPE OF SERVICES:
• Strategic planning and consultation
• Creative development and production
• Campaign management and optimization
• Monthly reporting and analytics
• Dedicated account manager`,
    suggestedSections: ['Strategy', 'Creative', 'Media', 'Reporting', 'Timeline']
  },
  {
    id: 'consultant',
    industry: 'consultant',
    name: 'Consultant',
    description: 'Business, IT, management, strategy',
    icon: Briefcase,
    color: 'from-emerald-500 to-teal-500',
    defaultTerms: `TERMS AND CONDITIONS:
1. Consultant maintains confidentiality of all client information.
2. Deliverables are for client's internal use only unless otherwise specified.
3. Client provides access to necessary personnel and information.
4. Recommendations are advisory; implementation decisions rest with client.
5. Travel expenses billed at cost plus 15% administration fee.`,
    defaultPaymentTerms: `PAYMENT TERMS:
• Hourly engagements: Invoiced weekly, Net 15
• Project engagements: 25% deposit, monthly progress billing
• Retainer: Monthly fee due in advance
• Expenses: Invoiced monthly with receipts`,
    defaultScope: `ENGAGEMENT SCOPE:
• Initial assessment and discovery phase
• Analysis and recommendations development
• Presentation of findings to stakeholders
• Implementation support and guidance
• Follow-up review session`,
    suggestedSections: ['Assessment', 'Analysis', 'Recommendations', 'Implementation', 'Follow-up']
  }
];

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: ProposalTemplate) => void;
  selectedTemplate?: string;
}

export function TemplatePicker({ isOpen, onClose, onSelect, selectedTemplate }: TemplatePickerProps) {
  const t = useTranslations('templates');
  const [previewTemplate, setPreviewTemplate] = useState<ProposalTemplate | null>(null);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                {t('title')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('subtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
            {previewTemplate ? (
              /* Template Preview */
              <div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-sm text-primary-500 hover:text-primary-600 mb-4 flex items-center gap-1"
                >
                  ← {t('backToTemplates')}
                </button>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${previewTemplate.color}`}>
                    <previewTemplate.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {t(`industries.${previewTemplate.industry}.name`)}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {t(`industries.${previewTemplate.industry}.description`)}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Terms Preview */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('preview.terms')}
                    </h4>
                    <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
                      {previewTemplate.defaultTerms}
                    </pre>
                  </div>

                  {/* Payment Terms Preview */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('preview.paymentTerms')}
                    </h4>
                    <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
                      {previewTemplate.defaultPaymentTerms}
                    </pre>
                  </div>

                  {/* Scope Preview */}
                  {previewTemplate.defaultScope && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {t('preview.scope')}
                      </h4>
                      <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
                        {previewTemplate.defaultScope}
                      </pre>
                    </div>
                  )}

                  {/* Warranty Preview (for contractors) */}
                  {previewTemplate.defaultWarranty && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {t('preview.warranty')}
                      </h4>
                      <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans">
                        {previewTemplate.defaultWarranty}
                      </pre>
                    </div>
                  )}

                  {/* Suggested Sections */}
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('preview.suggestedSections')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {previewTemplate.suggestedSections.map((section) => (
                        <span
                          key={section}
                          className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onSelect(previewTemplate);
                    onClose();
                  }}
                  className={`w-full mt-6 py-3 rounded-xl bg-gradient-to-r ${previewTemplate.color} text-white font-semibold flex items-center justify-center gap-2`}
                >
                  <Check className="w-5 h-5" />
                  {t('useTemplate')}
                </motion.button>
              </div>
            ) : (
              /* Template Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROPOSAL_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;
                  
                  return (
                    <motion.div
                      key={template.id}
                      whileHover={{ scale: 1.02 }}
                      className={`
                        relative p-5 rounded-xl border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
                      `}
                      onClick={() => setPreviewTemplate(template)}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${template.color} flex-shrink-0`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {t(`industries.${template.industry}.name`)}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {t(`industries.${template.industry}.description`)}
                          </p>
                          <button
                            className="text-sm text-primary-500 hover:text-primary-600 mt-2 flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTemplate(template);
                            }}
                          >
                            {t('preview.view')} <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { PROPOSAL_TEMPLATES };
export default TemplatePicker;
