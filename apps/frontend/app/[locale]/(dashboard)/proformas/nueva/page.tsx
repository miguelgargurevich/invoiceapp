'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  Search,
  FileBarChart,
  Users,
  Package,
  Briefcase,
  HardHat,
  Calendar,
  DollarSign,
  FileText,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  DatePicker,
  ClientSelect,
  ProductSelect,
  SkeletonFormPage,
  Modal,
} from '@/components/common';
import { TemplatePicker, type ProposalTemplate } from '@/components/proforma';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface Cliente {
  id: string;
  nombre: string;
  documento: string;
  tipoDocumento: string;
  direccion: string;
  telefono?: string;
  email?: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precioVenta: number;
  unidadMedida: string;
  afectoIgv: boolean;
}

interface LineaDetalle {
  id: string;
  productoId: string;
  producto?: Producto;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  igv: number;
  total: number;
}

export default function NuevaProformaPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('quotes');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  const { showWarning, showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [fechaEmision, setFechaEmision] = useState<Date | null>(new Date());
  const [fechaValidez, setFechaValidez] = useState<Date | null>(
    new Date(Date.now() + 30 * 86400000)
  );
  const [observaciones, setObservaciones] = useState('');
  const [condiciones, setCondiciones] = useState('');
  const [lineas, setLineas] = useState<LineaDetalle[]>([]);
  
  // Job information fields
  const [jobName, setJobName] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  
  // Contractor-specific fields
  const [arquitectoNombre, setArquitectoNombre] = useState('');
  const [fechaPlanos, setFechaPlanos] = useState<Date | null>(null);
  const [telefonoTrabajo, setTelefonoTrabajo] = useState('');
  const [diasValidez, setDiasValidez] = useState<number>(30);
  
  // Collapsible sections state
  const [showJobMoreOptions, setShowJobMoreOptions] = useState(false);
  
  // Template picker state
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);

  // Handle template selection
  const handleTemplateSelect = (template: ProposalTemplate) => {
    setSelectedTemplate(template);
    // Apply template defaults to form
    setCondiciones(template.defaultTerms || '');
    setPaymentTerms(template.defaultPaymentTerms || '');
    setObservaciones(template.defaultNotes || '');
    if (template.defaultScope) {
      setWorkDescription(template.defaultScope);
    }
    setIsTemplatePickerOpen(false);
    showSuccess(`${template.name} template applied`);
  };

  // Load data
  useEffect(() => {
    if (empresa?.id) {
      loadClientes();
      loadProductos();
    }
  }, [empresa?.id]);

  const loadClientes = async () => {
    try {
      setLoadingClientes(true);
      const params = new URLSearchParams({
        empresaId: empresa?.id || '',
        limit: '100',
      });
      const response: any = await api.get(`/clientes?${params}`);
      setClientes(response.data || []);
    } catch (error) {
      console.error('Error loading clientes:', error);
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadProductos = async () => {
    try {
      setLoadingProductos(true);
      const params = new URLSearchParams({
        empresaId: empresa?.id || '',
        limit: '100',
        activo: 'true',
      });
      const response: any = await api.get(`/productos?${params}`);
      setProductos(response.data || []);
    } catch (error) {
      console.error('Error loading productos:', error);
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  // Line item management
  const addLinea = () => {
    const newLinea: LineaDetalle = {
      id: `temp-${Date.now()}`,
      productoId: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
      subtotal: 0,
      igv: 0,
      total: 0,
    };
    setLineas([...lineas, newLinea]);
  };

  const removeLinea = (id: string) => {
    setLineas(lineas.filter((l) => l.id !== id));
  };

  const updateLinea = (id: string, updates: Partial<LineaDetalle>) => {
    setLineas(
      lineas.map((linea) => {
        if (linea.id !== id) return linea;

        const updated = { ...linea, ...updates };

        // If producto changed, update related fields
        if (updates.productoId) {
          const producto = productos.find((p) => p.id === updates.productoId);
          if (producto) {
            updated.producto = producto;
            updated.descripcion = producto.nombre;
            updated.precioUnitario = producto.precioVenta;
          }
        }

        // Recalculate totals
        const baseAmount = updated.cantidad * updated.precioUnitario;
        updated.subtotal = baseAmount - updated.descuento;
        const taxRate = empresa?.taxRate ? parseFloat(empresa.taxRate.toString()) / 100 : 0.18;
        updated.igv = updated.producto?.afectoIgv !== false ? updated.subtotal * taxRate : 0;
        updated.total = updated.subtotal + updated.igv;

        return updated;
      })
    );
  };

  // Calculate totals
  const totals = lineas.reduce(
    (acc, linea) => ({
      subtotal: acc.subtotal + Number(linea.subtotal),
      igv: acc.igv + Number(linea.igv),
      total: acc.total + Number(linea.total),
      descuento: acc.descuento + Number(linea.descuento),
    }),
    { subtotal: 0, igv: 0, total: 0, descuento: 0 }
  );

  const selectedCliente = clientes.find((c) => c.id === clienteId);

  const handleSave = async () => {
    if (!clienteId || lineas.length === 0) {
      showWarning('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        empresaId: empresa?.id,
        clienteId,
        fechaEmision: fechaEmision?.toISOString(),
        fechaValidez: fechaValidez?.toISOString(),
        observaciones: observaciones || null,
        condiciones: condiciones || null,
        moneda: empresa?.moneda || 'USD',
        // Job information
        jobName: jobName || null,
        jobLocation: jobLocation || null,
        workDescription: workDescription || null,
        paymentTerms: paymentTerms || null,
        // Contractor-specific fields
        arquitectoNombre: arquitectoNombre || null,
        fechaPlanos: fechaPlanos?.toISOString() || null,
        telefonoTrabajo: telefonoTrabajo || null,
        diasValidez: diasValidez || null,
        detalles: lineas.map((linea) => ({
          productoId: linea.productoId || null,
          descripcion: linea.descripcion,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          descuento: linea.descuento,
        })),
      };

      await api.post('/proformas', payload);
      showSuccess(t('saveSuccess'));
      router.push(`/${locale}/proformas`);
    } catch (error) {
      console.error('Error saving proforma:', error);
      showError(t('createError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SkeletonFormPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
            <FileBarChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('newQuote')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('description')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsTemplatePickerOpen(true)} 
            size="lg"
            className="border-dashed"
          >
            <FileText className="w-5 h-5 mr-2" />
            {selectedTemplate ? selectedTemplate.name : t('useTemplate') || 'Use Template'}
          </Button>
          <Button variant="outline" onClick={() => router.back()} size="lg">
            {t('cancel')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client selection */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                {t('client')}
              </h2>
              <Button
                size="md"
                variant="outline"
                onClick={() => setIsClientModalOpen(true)}
                type="button"
              >
                <Users className="w-5 h-5 mr-2" />
                {t('addClient')}
              </Button>
            </div>
            <ClientSelect
              clients={clientes}
              value={clienteId}
              onChange={setClienteId}
              loading={loadingClientes}
              placeholder={t('selectClient')}
            />
            {selectedCliente && (
              <div
                className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('phone')}:</span>
                    <p className="font-medium">{selectedCliente.telefono || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('address')}:</span>
                    <p className="font-medium">{selectedCliente.direccion || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Line items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600" />
                {t('items')}
              </h2>
              <Button size="md" onClick={addLinea}>
                <Plus className="w-5 h-5 mr-2" />
                {t('addItem')}
              </Button>
            </div>

            {lineas.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('noItems')}</p>
                <Button className="mt-4" variant="outline" onClick={addLinea}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('addFirstItem')}
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase" style={{ width: '40%' }}>
                          {t('product')}
                        </th>
                        <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase" style={{ width: '10%' }}>
                          {t('qty')}
                        </th>
                        <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase" style={{ width: '15%' }}>
                          {t('price')}
                        </th>
                        <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase" style={{ width: '15%' }}>
                          {t('subtotal')}
                        </th>
                        <th style={{ width: '8%' }}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {lineas.map((linea) => (
                        <tr key={linea.id}>
                          <td className="py-2 pr-2">
                            <ProductSelect
                              products={productos}
                              value={linea.productoId}
                              onChange={(value) => updateLinea(linea.id, { productoId: value })}
                              loading={loadingProductos}
                              placeholder={t('selectProduct')}
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={linea.cantidad}
                              onChange={(e) =>
                                updateLinea(linea.id, { cantidad: parseInt(e.target.value) || 1 })
                              }
                              className="w-full px-2 py-1.5 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={linea.precioUnitario}
                              onChange={(e) =>
                                updateLinea(linea.id, { precioUnitario: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full px-2 py-1.5 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                            />
                          </td>
                          <td className="py-2 px-1 text-right font-medium text-sm">
                            {formatCurrency(linea.subtotal)}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              onClick={() => removeLinea(linea.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-4">
                  {lineas.map((linea, index) => (
                    <div
                      key={linea.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          {t('item')} #{index + 1}
                        </span>
                        <button
                          onClick={() => removeLinea(linea.id)}
                          className="p-1 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <ProductSelect
                        products={productos}
                        value={linea.productoId}
                        onChange={(value) => updateLinea(linea.id, { productoId: value })}
                        loading={loadingProductos}
                        placeholder={t('selectProduct')}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">{t('quantity')}</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={linea.cantidad}
                            onChange={(e) =>
                              updateLinea(linea.id, { cantidad: parseInt(e.target.value) || 1 })
                            }
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">{t('price')}</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={linea.precioUnitario}
                            onChange={(e) =>
                              updateLinea(linea.id, { precioUnitario: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>{t('subtotal')}:</span>
                        <span>{formatCurrency(linea.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Job Information */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              {t('jobInformation')}
            </h2>
            <div className="space-y-4">
              <Textarea
                label={t('workDescription')}
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="Detailed description of work to be performed..."
                rows={4}
              />
              <Textarea
                label={t('paymentTerms')}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Payment schedule and terms..."
                rows={3}
              />

              {/* More Options Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowJobMoreOptions(!showJobMoreOptions)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showJobMoreOptions ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {t('moreOptions') || 'More options'}
                  <span className="text-xs text-gray-400">({t('optional') || 'Optional'})</span>
                </button>

                {/* Collapsible Content */}
                {showJobMoreOptions && (
                  <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Input
                      label={t('jobPhone')}
                      value={telefonoTrabajo}
                      onChange={(e) => setTelefonoTrabajo(e.target.value)}
                      placeholder="Job site phone"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Contractor Details - Hidden since validity is handled in Dates panel
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <HardHat className="w-5 h-5 text-primary-600" />
              {t('contractorDetails')}
            </h2>
            <div className="space-y-4">
              <Input
                label={t('validityDays')}
                type="number"
                value={diasValidez}
                onChange={(e) => setDiasValidez(parseInt(e.target.value) || 30)}
                placeholder="30"
              />
            </div>
          </Card>
          */}

          {/* Terms & Conditions */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary-600" />
              {t('termsAndConditions')}
            </h2>
            <div className="space-y-4">
              <Textarea
                label={t('termsConditionsLabel')}
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
                placeholder={t('termsConditionsPlaceholder')}
                rows={6}
              />
            </div>
          </Card>

          {/* Notes/Observations */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              {t('notes')}
            </h2>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={3}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              {t('dates')}
            </h2>
            <div className="space-y-4">
              <DatePicker
                label={t('issueDate')}
                value={fechaEmision}
                onChange={setFechaEmision}
                locale={locale as 'es' | 'en'}
              />
              <DatePicker
                label={t('validUntil')}
                value={fechaValidez}
                onChange={setFechaValidez}
                minDate={fechaEmision || undefined}
                locale={locale as 'es' | 'en'}
              />
            </div>
          </Card>

          {/* Totals */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary-600" />
              {t('totals')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t('subtotal')}</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t('discount')}</span>
                  <span className="text-red-500">-{formatCurrency(totals.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('tax').replace(' (18%)', '')}
                  {empresa?.taxRate && Number(empresa.taxRate) > 0 ? ` (${empresa.taxRate}%)` : ''}
                </span>
                <span>{formatCurrency(totals.igv)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('total')}
                  </span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="!p-4">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white" size="lg" onClick={handleSave} disabled={saving || lineas.length === 0}>
              <Save className="w-5 h-5 mr-2" />
              {saving ? t('save') + '...' : t('saveQuote')}
            </Button>
          </Card>
        </div>
      </div>

      {/* Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={async () => {
          setIsClientModalOpen(false);
          await loadClientes();
        }}
      />

      {/* Template Picker */}
      <TemplatePicker
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
        selectedTemplate={selectedTemplate?.id}
      />
    </div>
  );
}

// Client Modal Component
interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

function ClientModal({ isOpen, onClose, onSave }: ClientModalProps) {
  const t = useTranslations('clients');
  const { empresa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [formData, setFormData] = useState({
    tipoDocumento: 'OTHER',
    documento: '',
    nombre: '',
    direccion: '',
    email: '',
    telefono: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        tipoDocumento: 'OTHER',
        documento: '',
        nombre: '',
        direccion: '',
        email: '',
        telefono: '',
      });
      setShowMoreOptions(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/clientes', { ...formData, empresaId: empresa?.id });
      onSave();
    } catch (error) {
      console.error('Error saving cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('addClient')}
      subtitle={t('addClientSubtitle') || 'Add a new client to your database'}
      icon={Users}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Required contact details</p>
            </div>
          </div>
          
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('name')} *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              disabled={loading}
              placeholder={t('namePlaceholder') || 'Client name'}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('phone')} *
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
                disabled={loading}
                placeholder={t('phonePlaceholder') || '(555) 123-4567'}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
                placeholder={t('emailPlaceholder') || 'email@example.com'}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('address')}
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              disabled={loading}
              placeholder={t('addressPlaceholder') || 'Street address'}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-gray-400"
            />
          </div>

          </div>

        {/* Optional Information */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {t('moreOptions') || 'More options'}
            <span className="text-xs text-gray-400">({t('optional') || 'Optional'})</span>
          </button>

          {/* Document Type & Number (Optional - Collapsible) */}
          {showMoreOptions && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Document Information</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Optional identification details</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('documentType')}
                  </label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all"
                  >
                    <option value="OTHER">Other / None</option>
                    <option value="SSN">SSN</option>
                    <option value="EIN">EIN</option>
                    <option value="ITIN">ITIN</option>
                    <option value="DRIVER_LICENSE">Driver's License</option>
                    <option value="STATE_ID">State ID</option>
                    <option value="PASSPORT">Passport</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('documentNumber')}
                  </label>
                  <input
                    type="text"
                    value={formData.documento}
                    onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                    disabled={loading}
                    placeholder={t('optional') || 'Optional'}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11"
          >
            {t('cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !formData.nombre || !formData.telefono}
            className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('saving')}
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                {t('createClient')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

