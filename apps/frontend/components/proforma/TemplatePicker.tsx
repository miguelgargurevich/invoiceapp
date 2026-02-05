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
  defaultNotes?: string;
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
    defaultTerms: 
`All material is guaranteed to be as specified. All work to be completed in a workmanlike manner according to standard practices. Any alteration or deviation from above specifications involving extra costs will be executed only upon written orders, and will become an extra charge over and above the estimate.
All agreements contingent upon strikes, accidents or delays beyond our control. Owner to carry fire, windstorm and other necessary insurance.
Our workers are fully covered by Workman's Compensation Insurance.`,
    defaultPaymentTerms: `PAYMENT TERMS:
• 50% deposit required to schedule work
• 25% upon substantial completion
• 25% final payment upon project completion
• Late payments subject to 1.5% monthly interest`,
    defaultWarranty: `If an attorney is used to enforce or collect any obligations due on this obligation, then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.`,
    defaultScope: `SCOPE OF WORK:
• Remove and dispose of existing materials
• Supply and install new materials as specified
• Clean up work area upon completion
• Final walkthrough with client`,
    defaultNotes: `If an attorney is used to enforce or collect any obligations due on this obligation, then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.`,
    suggestedSections: ['Materials', 'Labor', 'Timeline', 'Permits', 'Warranty']
  },
  {
    id: 'freelancer',
    industry: 'freelancer',
    name: 'Freelancer',
    description: 'Design, development, writing, marketing',
    icon: Laptop,
    color: 'from-purple-500 to-pink-500',
    defaultTerms: 
`1. All deliverables remain property of client upon final payment.
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
    defaultNotes: `If an attorney is used to enforce or collect any obligations due on this obligation, then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.`,
    suggestedSections: ['Deliverables', 'Timeline', 'Revisions', 'Licensing']
  },
  {
    id: 'agency',
    industry: 'agency',
    name: 'Agency',
    description: 'Full-service marketing, creative, digital',
    icon: Building2,
    color: 'from-blue-500 to-cyan-500',
    defaultTerms: 
`1. Client retains ownership of all final approved work upon full payment.
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
    defaultNotes: `If an attorney is used to enforce or collect any obligations due on this obligation, then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.`,
    suggestedSections: ['Strategy', 'Creative', 'Media', 'Reporting', 'Timeline']
  },
  {
    id: 'consultant',
    industry: 'consultant',
    name: 'Consultant',
    description: 'Business, IT, management, strategy',
    icon: Briefcase,
    color: 'from-emerald-500 to-teal-500',
    defaultTerms: 
`1. Consultant maintains confidentiality of all client information.
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
    defaultNotes: `If an attorney is used to enforce or collect any obligations due on this obligation, then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.`,
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
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 100 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t('title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('subtitle')}
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
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {previewTemplate ? (
              /* Template Preview */
              <div className="space-y-4 sm:space-y-6">
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
                        {t('preview.terms')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                          {previewTemplate.defaultTerms}
                        </pre>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {t('preview.paymentTerms')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                          {previewTemplate.defaultPaymentTerms}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {previewTemplate.defaultScope && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {t('preview.scope')}
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                            {previewTemplate.defaultScope}
                          </pre>
                        </div>
                      </div>
                    )}

                    {previewTemplate.defaultWarranty && (
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {t('preview.attorneyFees')}
                        </h4>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                            {previewTemplate.defaultWarranty}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {t('preview.suggestedSections')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <ul className="space-y-2">
                          {previewTemplate.suggestedSections.map((section, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {section}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      onSelect(previewTemplate);
                      onClose();
                    }}
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    {t('useTemplate')}
                  </button>
                </div>
              </div>
            ) : (
              /* Template Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {PROPOSAL_TEMPLATES.map((template) => (
                  <motion.div
                    key={template.id}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-4 sm:p-5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${
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
                          {t('preview.view')}
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

export { PROPOSAL_TEMPLATES };
export default TemplatePicker;
