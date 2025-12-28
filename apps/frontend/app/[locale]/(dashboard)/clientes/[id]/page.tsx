'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Trash2, FileText, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Card, Input, Badge, ConfirmDialog, LoadingSpinner } from '@/components/common';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface Cliente {
  id: string;
  tipoDocumento: string;
  documento: string;
  nombre: string;
  direccion: string;
  email: string;
  telefono: string;
  createdAt: string;
}

interface FacturaResumen {
  id: string;
  numero: string;
  serie: string;
  fechaEmision: string;
  total: number;
  estado: string;
}

export default function ClienteDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('clients');
  const tInvoices = useTranslations('invoices');
  const router = useRouter();
  const { empresa } = useAuth();
  const { showSuccess, showError } = useToast();
  const { formatCurrency } = useCurrency();
  
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [facturas, setFacturas] = useState<FacturaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipoDocumento: 'OTHER',
    documento: '',
    nombre: '',
    direccion: '',
    email: '',
    telefono: '',
  });

  useEffect(() => {
    loadCliente();
  }, [id]);

  const loadCliente = async () => {
    try {
      setLoading(true);
      const response: any = await api.get(`/clientes/${id}`);
      setCliente(response);
      setFormData({
        tipoDocumento: response.tipoDocumento || 'OTHER',
        documento: response.documento || '',
        nombre: response.nombre || '',
        direccion: response.direccion || '',
        email: response.email || '',
        telefono: response.telefono || '',
      });
      
      // Load client invoices
      try {
        const facturasResponse: any = await api.get('/facturas', { clienteId: id });
        setFacturas(facturasResponse.data || []);
      } catch {
        setFacturas([]);
      }
    } catch (error) {
      console.error('Error loading cliente:', error);
      showError('Error loading client');
      router.push(`/${locale}/clientes`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.documento) {
      showError('Please fill in required fields');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/clientes/${id}`, formData);
      showSuccess(t('messages.updated'));
      router.push(`/${locale}/clientes`);
    } catch (error: any) {
      console.error('Error updating cliente:', error);
      showError(error.response?.data?.error || 'Error updating client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/clientes/${id}`);
      showSuccess(t('messages.deleted'));
      router.push(`/${locale}/clientes`);
    } catch (error: any) {
      console.error('Error deleting cliente:', error);
      showError(error.response?.data?.error || 'Error deleting client');
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      PAGADA: 'success',
      EMITIDA: 'info',
      PENDIENTE: 'warning',
      VENCIDA: 'danger',
      ANULADA: 'neutral',
    };
    return variants[normalizedStatus] || 'neutral';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${locale}/clientes`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('editClient')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {cliente?.nombre}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('delete')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {/* Icon Header */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl">
                  <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('clientDetails')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Update the client information
                  </p>
                </div>
              </div>

              {/* Name */}
              <Input
                label={`${t('name')} *`}
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Client name or business name"
                required
              />

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label={`${t('phone')} *`}
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  required
                />
                
                <Input
                  label={t('email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              {/* Address */}
              <div className="space-y-3">
                <Input
                  label={t('address')}
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Full address"
                />
                
                {/* Google Maps Preview */}
                {formData.direccion && formData.direccion.trim().length > 5 && (
                  <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="aspect-video sm:aspect-[16/9] md:aspect-[21/9] lg:aspect-[16/7]">
                      <iframe
                        src={`https://www.google.com/maps?q=${encodeURIComponent(formData.direccion)}&output=embed`}
                        className="w-full h-full"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Location Map"
                      />
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.direccion)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open in Maps
                    </a>
                  </div>
                )}
              </div>

              {/* Document Type & Number (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('documentType')}
                  </label>
                  <select
                    value={formData.tipoDocumento}
                    onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  >
                    <option value="OTHER">Other / None</option>
                    <option value="SSN">SSN (Social Security Number)</option>
                    <option value="EIN">EIN (Employer ID Number)</option>
                    <option value="ITIN">ITIN (Individual Tax ID)</option>
                    <option value="DRIVER_LICENSE">Driver's License</option>
                    <option value="STATE_ID">State ID</option>
                    <option value="PASSPORT">Passport</option>
                  </select>
                </div>
                
                <Input
                  label={t('documentNumber')}
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push(`/${locale}/clientes`)}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? t('saving') : t('save')}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar - Invoice History */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('purchaseHistory')}
              </h3>
            </div>
            
            {facturas.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No invoices yet
              </p>
            ) : (
              <div className="space-y-3">
                {facturas.slice(0, 5).map((factura) => (
                  <div
                    key={factura.id}
                    onClick={() => router.push(`/${locale}/facturas/${factura.id}`)}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {factura.serie}-{factura.numero}
                      </span>
                      <Badge variant={getStatusBadge(factura.estado)} size="sm">
                        {factura.estado}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(factura.fechaEmision)}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(factura.total)}
                      </span>
                    </div>
                  </div>
                ))}
                {facturas.length > 5 && (
                  <button
                    onClick={() => router.push(`/${locale}/facturas?clienteId=${id}`)}
                    className="w-full text-sm text-primary-600 dark:text-primary-400 hover:underline py-2"
                  >
                    View all {facturas.length} invoices
                  </button>
                )}
              </div>
            )}
          </Card>
          
          {/* Created Date */}
          {cliente?.createdAt && (
            <Card className="p-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDate(cliente.createdAt)}</span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('deleteTitle')}
        message={t('deleteMessage', { name: cliente?.nombre || '' })}
        variant="danger"
      />
    </div>
  );
}
