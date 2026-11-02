'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/common';
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
  suggestedItems: { description: string; isLabor: boolean }[];
}

// Textos neutros para Perú. Los valores entre corchetes (días, porcentajes) hay que completarlos antes de emitir.
const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'contractor',
    industry: 'contractor',
    name: 'Contratista',
    description: 'Construcción, renovación, electricidad, plomería',
    icon: HardHat,
    color: 'bg-orange-500',
    defaultWorkDescription:
`Trabajo realizado según lo acordado:
• Preparación y limpieza del lugar
• Instalación del material especificado
• Inspección de calidad completada
• Trabajo ejecutado según las normas técnicas aplicables`,
    defaultPaymentTerms: `Pago al recibir la factura. Los pagos atrasados generan interés de [1.5] % mensual.`,
    defaultNotes: `Gracias por su preferencia.`,
    suggestedItems: [
      { description: 'Mano de obra - instalación', isLabor: true },
      { description: 'Mano de obra - preparación del lugar', isLabor: true },
      { description: 'Materiales', isLabor: false },
      { description: 'Alquiler de equipos', isLabor: false },
      { description: 'Permisos y tasas', isLabor: false },
    ]
  },
  {
    id: 'freelancer',
    industry: 'freelancer',
    name: 'Freelancer',
    description: 'Diseño, desarrollo, redacción, marketing',
    icon: Laptop,
    color: 'bg-purple-600',
    defaultWorkDescription:
`Servicios prestados:
• Proyecto completado según las especificaciones
• Entregables enviados en los formatos acordados
• Rondas de revisión completadas
• Archivos finales entregados`,
    defaultPaymentTerms: `Pago dentro de [14] días desde la emisión. Medio de pago: transferencia bancaria.`,
    defaultNotes: `Gracias por la oportunidad de trabajar en este proyecto. Quedamos a su disposición para futuros trabajos.`,
    suggestedItems: [
      { description: 'Servicios de diseño', isLabor: true },
      { description: 'Horas de desarrollo', isLabor: true },
      { description: 'Gestión del proyecto', isLabor: true },
      { description: 'Licencias de recursos (imágenes, fuentes)', isLabor: false },
      { description: 'Hosting / dominio', isLabor: false },
    ]
  },
  {
    id: 'agency',
    industry: 'agency',
    name: 'Agencia',
    description: 'Servicios completos de marketing, creatividad y medios digitales',
    icon: Building2,
    color: 'bg-primary-600',
    defaultWorkDescription:
`Servicios prestados en este período:
• Planificación y asesoría estratégica
• Desarrollo y producción creativa
• Gestión de campañas
• Reporte de resultados`,
    defaultPaymentTerms: `Pago a [30] días. Los costos de terceros se facturan aparte.`,
    defaultNotes: `Se adjunta el reporte mensual de resultados. Consulte a su ejecutivo de cuenta ante cualquier duda.`,
    suggestedItems: [
      { description: 'Retainer mensual', isLabor: true },
      { description: 'Servicios creativos', isLabor: true },
      { description: 'Gestión de medios', isLabor: true },
      { description: 'Inversión publicitaria (a cuenta del cliente)', isLabor: false },
      { description: 'Costos de producción', isLabor: false },
    ]
  },
  {
    id: 'consultant',
    industry: 'consultant',
    name: 'Consultor',
    description: 'Negocios, TI, gestión, estrategia',
    icon: Briefcase,
    color: 'bg-slate-600',
    defaultWorkDescription:
`Servicios de consultoría prestados:
• Sesiones de diagnóstico y evaluación
• Análisis e investigación
• Recomendaciones elaboradas
• Presentación a los responsables`,
    defaultPaymentTerms: `Pago dentro de [15] días desde la fecha de la factura. Los gastos de viaje se facturan al costo.`,
    defaultNotes: `Se adjunta el informe resumen. Sesión de seguimiento disponible a solicitud.`,
    suggestedItems: [
      { description: 'Horas de consultoría', isLabor: true },
      { description: 'Diagnóstico y análisis', isLabor: true },
      { description: 'Elaboración de informe', isLabor: true },
      { description: 'Gastos de viaje', isLabor: false },
      { description: 'Software / herramientas', isLabor: false },
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
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {previewTemplate ? (
              /* Template Preview */
              <div className="space-y-4 sm:space-y-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                  className="-ml-3 text-primary-600 hover:text-primary-700"
                >
                  ← {t('backToTemplates')}
                </Button>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${previewTemplate.color}`}>
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
                                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {item.isLabor ? 'Mano de obra' : 'Material'}
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
                  <Button
                    onClick={() => handleSelect(previewTemplate)}
                    size="lg"
                    icon={<Check className="w-5 h-5" />}
                  >
                    {t('useThisTemplate')}
                  </Button>
                </div>
              </div>
            ) : (
              /* Template Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {INVOICE_TEMPLATES.map((template) => (
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
                      <div className={`p-3 rounded-xl ${template.color}`}>
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

export { INVOICE_TEMPLATES };
