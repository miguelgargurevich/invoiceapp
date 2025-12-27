'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  Search,
  FileBarChart,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  DatePicker,
  ClientSelect,
  ProductSelect,
  LoadingPage,
  Modal,
} from '@/components/common';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface Cliente {
  id: string;
  nombre: string;
  documento: string;
  tipoDocumento: string;
  direccion: string;
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
      subtotal: acc.subtotal + linea.subtotal,
      igv: acc.igv + linea.igv,
      total: acc.total + linea.total,
      descuento: acc.descuento + linea.descuento,
    }),
    { subtotal: 0, igv: 0, total: 0, descuento: 0 }
  );

  const selectedCliente = clientes.find((c) => c.id === clienteId);

  const handleSave = async () => {
    if (!clienteId || lineas.length === 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        empresaId: empresa?.id,
        clienteId,
        fechaEmision: fechaEmision?.toISOString(),
        fechaValidez: fechaValidez?.toISOString(),
        observaciones,
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
      router.push(`/${locale}/proformas`);
    } catch (error) {
      console.error('Error saving proforma:', error);
      alert(t('quotes.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? t('save') + '...' : t('save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client selection */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('client')}*
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsClientModalOpen(true)}
                type="button"
              >
                <Plus className="w-4 h-4 mr-1" />
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('document')}:</span>
                    <p className="font-medium">{selectedCliente.tipoDocumento}: {selectedCliente.documento}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t('address')}:</span>
                    <p className="font-medium">{selectedCliente.direccion || '-'}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </Card>

          {/* Line items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('items')}
              </h2>
              <Button size="sm" onClick={addLinea}>
                <Plus className="w-4 h-4 mr-1" />
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
                        <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase" style={{ width: '12%' }}>
                          {t('discount')}
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
                              type="number"
                              min="1"
                              value={linea.cantidad}
                              onChange={(e) =>
                                updateLinea(linea.id, { cantidad: parseInt(e.target.value) || 1 })
                              }
                              className="w-full px-2 py-1.5 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={linea.precioUnitario}
                              onChange={(e) =>
                                updateLinea(linea.id, { precioUnitario: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full px-2 py-1.5 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={linea.descuento}
                              onChange={(e) =>
                                updateLinea(linea.id, { descuento: parseFloat(e.target.value) || 0 })
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
                            type="number"
                            min="1"
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
                            type="number"
                            step="0.01"
                            value={linea.precioUnitario}
                            onChange={(e) =>
                              updateLinea(linea.id, { precioUnitario: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">{t('discount')}</label>
                          <input
                            type="number"
                            step="0.01"
                            value={linea.descuento}
                            onChange={(e) =>
                              updateLinea(linea.id, { descuento: parseFloat(e.target.value) || 0 })
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

          {/* Observations */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('observations')}
            </h2>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Condiciones, términos u otras observaciones..."
              rows={3}
            />
          </Card>

          {/* Job Information */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('jobInformation')}
            </h2>
            <div className="space-y-4">
              <Input
                label={t('jobName')}
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g., Kitchen Renovation"
              />
              <Input
                label={t('jobLocation')}
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="Job site address"
              />
              <Input
                label={t('jobPhone')}
                value={telefonoTrabajo}
                onChange={(e) => setTelefonoTrabajo(e.target.value)}
                placeholder="Job site phone"
              />
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
            </div>
          </Card>

          {/* Contractor Details */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('contractorDetails')}
            </h2>
            <div className="space-y-4">
              <Input
                label={t('architectName')}
                value={arquitectoNombre}
                onChange={(e) => setArquitectoNombre(e.target.value)}
                placeholder="Architect or designer name"
              />
              <DatePicker
                label={t('plansDate')}
                value={fechaPlanos}
                onChange={setFechaPlanos}
                locale={locale as 'es' | 'en'}
              />
              <Input
                label={t('validityDays')}
                type="number"
                value={diasValidez}
                onChange={(e) => setDiasValidez(parseInt(e.target.value) || 30)}
                placeholder="30"
              />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
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
                <span className="text-gray-500 dark:text-gray-400">{t('tax')}</span>
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
            <Button className="w-full" onClick={handleSave} disabled={saving || lineas.length === 0}>
              <Save className="w-4 h-4 mr-2" />
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
  const [formData, setFormData] = useState({
    tipoDocumento: 'RUC',
    documento: '',
    nombre: '',
    direccion: '',
    email: '',
    telefono: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        tipoDocumento: 'RUC',
        documento: '',
        nombre: '',
        direccion: '',
        email: '',
        telefono: '',
      });
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
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('documentType')}
            </label>
            <select
              value={formData.tipoDocumento}
              onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="RUC">RUC</option>
              <option value="DNI">DNI</option>
              <option value="CE">Carnet de Extranjería</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>
          
          <Input
            label={t('documentNumber')}
            value={formData.documento}
            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
            required
          />
        </div>

        <Input
          label={t('name')}
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
        />

        <Input
          label={t('address')}
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          
          <Input
            label={t('phone')}
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

