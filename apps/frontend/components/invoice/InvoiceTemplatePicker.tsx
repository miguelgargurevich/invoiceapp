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

export interface InvoiceTemplate {
  id: string;
  industry: 'contractor' | 'freelancer' | 'agency' | 'consultant';
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultWorkDescription: string;
  defaultPaymentTerms: string;
  defaultNotes?: string;
  defaultTerms?: string;
  suggestedItems: { description: string; isLabor: boolean }[];
}

const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'contractor',
    industry: 'contractor',
    name: 'Contractor',
    description: 'Construction, renovation, electrical, plumbing',
    icon: HardHat,
    color: 'from-orange-500 to-amber-500',
    defaultWorkDescription: 
`Work completed as per agreement:
• Site preparation and cleanup
• Material installation as specified
• Quality inspection completed
• All work performed to code standards`,
    defaultPaymentTerms: `Payment due upon receipt. Late payments subject to 1.5% monthly interest.`,
    defaultNotes: `If an attorney is used to enforce or collect any obligations due on this obligation, then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.`,
    defaultTerms: `All material is guaranteed to be as specified. All work to be completed in a workmanlike manner according to standard practices. Any alteration or deviation from above specifications involving extra costs will be executed only upon written orders, and will become an extra charge over and above the estimate.
All agreements contingent upon strikes, accidents or delays beyond our control. Owner to carry fire, windstorm and other necessary insurance.
Our workers are fully covered by Workman's Compensation Insurance.`,
    suggestedItems: [
      { description: 'Labor - Installation', isLabor: true },
      { description: 'Labor - Site Preparation', isLabor: true },
      { description: 'Materials', isLabor: false },
      { description: 'Equipment Rental', isLabor: false },
      { description: 'Permits & Fees', isLabor: false },
    ]
  },
  {
    id: 'freelancer',
    industry: 'freelancer',
    name: 'Freelancer',
    description: 'Design, development, writing, marketing',
    icon: Laptop,
    color: 'from-purple-500 to-pink-500',
    defaultWorkDescription: 
`Services rendered:
• Project completed as per specifications
• All deliverables provided in required formats
• Revision rounds completed
• Final files delivered`,
    defaultPaymentTerms: `Payment due within 14 days. Accepted: Bank transfer, PayPal, Credit card.`,
    defaultNotes: `Thank you for the opportunity to work on this project. Looking forward to future collaborations.`,
    suggestedItems: [
      { description: 'Design Services', isLabor: true },
      { description: 'Development Hours', isLabor: true },
      { description: 'Project Management', isLabor: true },
      { description: 'Stock Assets / Licenses', isLabor: false },
      { description: 'Hosting / Domain', isLabor: false },
    ]
  },
  {
    id: 'agency',
    industry: 'agency',
    name: 'Agency',
    description: 'Full-service marketing, creative, digital',
    icon: Building2,
    color: 'from-blue-500 to-cyan-500',
    defaultWorkDescription: 
`Services provided this billing period:
• Strategic planning and consultation
• Creative development and production
• Campaign management
• Performance reporting`,
    defaultPaymentTerms: `Net 30 payment terms. Third-party costs billed separately.`,
    defaultNotes: `Monthly performance report attached. Contact your account manager for any questions.`,
    suggestedItems: [
      { description: 'Monthly Retainer', isLabor: true },
      { description: 'Creative Services', isLabor: true },
      { description: 'Media Management', isLabor: true },
      { description: 'Ad Spend (pass-through)', isLabor: false },
      { description: 'Production Costs', isLabor: false },
    ]
  },
  {
    id: 'consultant',
    industry: 'consultant',
    name: 'Consultant',
    description: 'Business, IT, management, strategy',
    icon: Briefcase,
    color: 'from-emerald-500 to-teal-500',
    defaultWorkDescription: 
`Consulting services provided:
• Discovery and assessment sessions
• Analysis and research
• Recommendations developed
• Presentation to stakeholders`,
    defaultPaymentTerms: `Payment due within 15 days of invoice date. Travel expenses billed at cost.`,
    defaultNotes: `Summary report attached. Follow-up session available upon request.`,
    suggestedItems: [
      { description: 'Consulting Hours', isLabor: true },
      { description: 'Assessment & Analysis', isLabor: true },
      { description: 'Report Preparation', isLabor: true },
      { description: 'Travel Expenses', isLabor: false },
      { description: 'Software / Tools', isLabor: false },
    ]
  }
];

interface InvoiceTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: InvoiceTemplate) => void;
  selectedTemplate?: string;
}

export function InvoiceTemplatePicker({ isOpen, onClose, onSelect, selectedTemplate }: InvoiceTemplatePickerProps) {
  const t = useTranslations('templates');
  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplate | null>(null);

  const handleSelect = (template: InvoiceTemplate) => {
    onSelect(template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t('selectInvoiceTemplate')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('invoiceTemplateSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
            {previewTemplate ? (
              /* Template Preview */
              <div className="space-y-6">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  ← {t('backToTemplates')}
                </button>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${previewTemplate.color}`}>
                    <previewTemplate.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {t(`industries.${previewTemplate.industry}.name`)}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {t(`industries.${previewTemplate.industry}.description`)}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t('workDescription')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                          {previewTemplate.defaultWorkDescription}
                        </pre>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {t('paymentTerms')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                          {previewTemplate.defaultPaymentTerms}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {t('suggestedItems')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <ul className="space-y-2">
                          {previewTemplate.suggestedItems.map((item, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                item.isLabor 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {item.isLabor ? 'Labor' : 'Material'}
                              </span>
                              {item.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {previewTemplate.defaultNotes && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {t('notes')}
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {previewTemplate.defaultNotes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleSelect(previewTemplate)}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {t('useThisTemplate')}
                  </button>
                </div>
              </div>
            ) : (
              /* Template Grid */
              <div className="grid md:grid-cols-2 gap-4">
                {INVOICE_TEMPLATES.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTemplate === template.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                    onClick={() => setPreviewTemplate(template)}
                  >
                    {selectedTemplate === template.id && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${template.color}`}>
                        <template.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {t(`industries.${template.industry}.name`)}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {t(`industries.${template.industry}.description`)}
                        </p>
                        <div className="flex items-center gap-1 mt-3 text-sm text-primary-600 dark:text-primary-400">
                          {t('preview')}
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { INVOICE_TEMPLATES };
