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
  // Condiciones: se copian al campo «Condiciones» de la proforma.
  defaultTerms: string;
  defaultPaymentTerms: string;
  defaultScope?: string;
  defaultNotes?: string;
  suggestedSections: string[];
}

// Textos neutros para Perú. Lo que va entre corchetes (montos, días) hay que completarlo antes de enviar.
// Precios: el IGV (18 %) se marca como incluido o no, según el caso.
const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'contractor',
    industry: 'contractor',
    name: 'Contratista',
    description: 'Construcción, renovación, electricidad, plomería',
    icon: HardHat,
    color: 'from-orange-500 to-amber-500',
    defaultTerms:
`1. Todo el material será el especificado en esta proforma.
2. Los trabajos se realizarán de forma profesional y según las prácticas habituales del oficio.
3. Los cambios o trabajos adicionales con costo extra se ejecutarán solo con orden escrita y se cobrarán aparte.
4. Los plazos pueden variar por huelgas, accidentes u otras causas fuera de nuestro control.
5. Garantía: [30] días desde la entrega, por defectos de nuestra mano de obra.
6. La validez de esta proforma es la indicada al pie del documento.`,
    defaultPaymentTerms: `FORMA DE PAGO:
• [50] % de adelanto para programar el trabajo
• [25] % al avance de la obra
• [25] % al terminar el trabajo
• Precios en soles: [IGV incluido] (o [más IGV 18 %] si corresponde)`,
    defaultScope: `ALCANCE DEL TRABAJO:
• Retiro y disposición del material existente
• Suministro e instalación del material especificado
• Limpieza del área de trabajo al terminar
• Revisión final con el cliente
• Plazo de ejecución: [X] días calendario desde la aceptación`,
    defaultNotes: `Gracias por la oportunidad. Quedamos a su disposición para cualquier consulta.`,
    suggestedSections: ['Materiales', 'Mano de obra', 'Plazos', 'Permisos', 'Garantía']
  },
  {
    id: 'freelancer',
    industry: 'freelancer',
    name: 'Freelancer',
    description: 'Diseño, desarrollo, redacción, marketing',
    icon: Laptop,
    color: 'from-purple-500 to-pink-500',
    defaultTerms:
`1. Los entregables pasan a ser del cliente al completar el pago final.
2. El cliente enviará sus comentarios dentro de [5] días hábiles.
3. Incluye [2] rondas de revisión por entregable; las adicionales se cotizan aparte.
4. Entrega urgente disponible con recargo de [50] %.
5. Garantía: [30] días desde la entrega para corregir errores de nuestro trabajo.
6. La validez de esta proforma es la indicada al pie del documento.`,
    defaultPaymentTerms: `FORMA DE PAGO:
• [50] % de adelanto para iniciar el trabajo
• [50] % al entregar el proyecto
• Pago dentro de [14] días desde la factura
• Medio de pago: transferencia bancaria
• Precios en soles: [IGV incluido] (o [más IGV 18 %] si corresponde)`,
    defaultScope: `ALCANCE DEL PROYECTO:
• Levantamiento de requerimientos
• Propuestas de diseño y sus revisiones
• Entregables en los formatos acordados
• [30] días de soporte después de la entrega
• Plazo de ejecución: [X] días calendario desde la aceptación`,
    defaultNotes: `Gracias por confiar en nuestro trabajo. Quedamos a su disposición para cualquier consulta.`,
    suggestedSections: ['Entregables', 'Plazos', 'Revisiones', 'Licencias']
  },
  {
    id: 'agency',
    industry: 'agency',
    name: 'Agencia',
    description: 'Servicios completos de marketing, creatividad y medios digitales',
    icon: Building2,
    color: 'from-primary-500 to-cyan-500',
    defaultTerms:
`1. El cliente conserva los derechos del trabajo final aprobado una vez pagado por completo.
2. La agencia puede mostrar el trabajo en su portafolio con permiso del cliente.
3. El cliente entregará la marca y sus materiales dentro de [5] días hábiles desde el inicio.
4. Los costos de terceros (fotos, tipografías, hosting) se facturan aparte.
5. Garantía: corregimos sin costo los errores de ejecución reportados dentro de [15] días desde la entrega.
6. La validez de esta proforma es la indicada al pie del documento.`,
    defaultPaymentTerms: `FORMA DE PAGO:
• Servicio mensual (retainer): pago el día 1 de cada mes
• Proyectos: [30] % de adelanto, [40] % a mitad de avance y [30] % al completar
• Costos de configuración y de terceros: pago por adelantado
• Precios en soles: [IGV incluido] (o [más IGV 18 %] si corresponde)`,
    defaultScope: `ALCANCE DEL SERVICIO:
• Planificación y asesoría estratégica
• Desarrollo y producción creativa
• Gestión y optimización de campañas
• Reporte mensual de resultados
• Ejecutivo de cuenta asignado`,
    defaultNotes: `Gracias por confiar en nosotros. Le enviaremos el reporte mensual de resultados.`,
    suggestedSections: ['Estrategia', 'Creatividad', 'Medios', 'Reportes', 'Plazos']
  },
  {
    id: 'consultant',
    industry: 'consultant',
    name: 'Consultor',
    description: 'Negocios, TI, gestión, estrategia',
    icon: Briefcase,
    color: 'from-slate-500 to-slate-700',
    defaultTerms:
`1. El consultor mantendrá la confidencialidad de la información del cliente.
2. Los entregables son para uso interno del cliente, salvo que se acuerde otra cosa.
3. El cliente dará acceso al personal y a la información necesarios.
4. Las recomendaciones son de carácter asesor; la decisión de implementarlas es del cliente.
5. Los gastos de viaje se facturan al costo más [15] % de gestión.
6. Garantía: [30] días de soporte para aclarar dudas sobre los entregables.
7. La validez de esta proforma es la indicada al pie del documento.`,
    defaultPaymentTerms: `FORMA DE PAGO:
• Por horas: facturación semanal, pago a [15] días
• Por proyecto: [25] % de adelanto y facturación mensual del avance
• Retainer: cuota mensual por adelantado
• Gastos: facturados cada mes con sustento
• Precios en soles: [IGV incluido] (o [más IGV 18 %] si corresponde)`,
    defaultScope: `ALCANCE DEL ENCARGO:
• Evaluación inicial y diagnóstico
• Análisis y desarrollo de recomendaciones
• Presentación de resultados a los responsables
• Apoyo en la implementación
• Sesión de seguimiento final`,
    defaultNotes: `Gracias por confiar en nosotros. Quedamos a su disposición para cualquier consulta.`,
    suggestedSections: ['Diagnóstico', 'Análisis', 'Recomendaciones', 'Implementación', 'Seguimiento']
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

                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {t('preview.suggestedSections')}
                      </h4>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <ul className="space-y-2">
                          {previewTemplate.suggestedSections.map((section, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
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
