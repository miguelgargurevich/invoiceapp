'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Package, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Card, Input, Textarea, Badge, ConfirmDialog, LoadingSpinner } from '@/components/common';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioVenta: number;
  unidadMedida: string;
  tipo: string;
  afectoIgv: boolean;
  createdAt: string;
}

export default function ProductoDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('products');
  const tUnits = useTranslations('products.units');
  const router = useRouter();
  const { empresa } = useAuth();
  const { showSuccess, showError } = useToast();
  const { currencySymbol, formatCurrency } = useCurrency();
  
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precioVenta: '',
    unidadMedida: 'UNIDAD',
    tipo: 'PRODUCTO',
    afectoIgv: true,
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load product
      const response: any = await api.get(`/productos/${id}`);
      setProducto(response);
      
      const tipo = response.tipo || 'PRODUCTO';
      
      setFormData({
        codigo: response.codigo || '',
        nombre: response.nombre || '',
        descripcion: response.descripcion || '',
        precioVenta: response.precioVenta?.toString() || '',
        unidadMedida: response.unidadMedida || 'UNIDAD',
        tipo: tipo,
        afectoIgv: response.afectoIgv ?? true,
      });
    } catch (error) {
      console.error('Error loading producto:', error);
      showError('Error loading product');
      router.push(`/${locale}/productos`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.codigo || !formData.nombre || !formData.precioVenta) {
      showError('Please fill in required fields');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        precioVenta: parseFloat(formData.precioVenta),
      };
      
      await api.put(`/productos/${id}`, payload);
      showSuccess(t('messages.updated'));
      router.push(`/${locale}/productos`);
    } catch (error: any) {
      console.error('Error updating producto:', error);
      showError(error.response?.data?.error || 'Error updating product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/productos/${id}`);
      showSuccess(t('messages.deleted'));
      router.push(`/${locale}/productos`);
    } catch (error: any) {
      console.error('Error deleting producto:', error);
      showError(error.response?.data?.error || 'Error deleting product');
    }
  };

  const unidades = [
    { value: 'UNIDAD', label: tUnits('UNIDAD') },
    { value: 'HORA', label: tUnits('HORA') },
    { value: 'DIA', label: tUnits('DIA') },
    { value: 'MES', label: tUnits('MES') },
    { value: 'KG', label: tUnits('KG') },
    { value: 'LT', label: tUnits('LT') },
    { value: 'MT', label: tUnits('MT') },
    { value: 'M2', label: tUnits('M2') },
    { value: 'SERVICIO', label: tUnits('SERVICIO') },
  ];

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
            onClick={() => router.push(`/${locale}/productos`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('editProduct')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {producto?.nombre}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {/* Icon Header */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                  <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t('productDetails')}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Update the product or service information
                  </p>
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('type')} *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'PRODUCTO' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.tipo === 'PRODUCTO'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Package className={`w-6 h-6 mx-auto mb-2 ${
                      formData.tipo === 'PRODUCTO' ? 'text-primary-600' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      formData.tipo === 'PRODUCTO' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Product
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'SERVICIO', unidadMedida: 'SERVICIO' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.tipo === 'SERVICIO'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <svg className={`w-6 h-6 mx-auto mb-2 ${
                      formData.tipo === 'SERVICIO' ? 'text-primary-600' : 'text-gray-400'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-sm font-medium ${
                      formData.tipo === 'SERVICIO' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Service
                    </span>
                  </button>
                </div>
              </div>

              {/* Code & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label={t('code')}
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="SKU-001"
                  required
                />
                
                <Input
                  label={t('name')}
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Product or service name"
                  required
                />
              </div>

              {/* Description */}
              <Textarea
                label={t('description')}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detailed description..."
                rows={3}
              />

              {/* Price, Unit - different layout for Product vs Service */}
              {formData.tipo === 'PRODUCTO' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('unitPrice')} * ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precioVenta}
                      onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('unitMeasure')} *
                    </label>
                    <select
                      value={formData.unidadMedida}
                      onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    >
                      {unidades.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('unitPrice')} * ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioVenta}
                    onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              {/* Tax Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="afectoIgv"
                  checked={formData.afectoIgv}
                  onChange={(e) => setFormData({ ...formData, afectoIgv: e.target.checked })}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="afectoIgv" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('priceWithTax')}
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push(`/${locale}/productos`)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar - Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Quick Info Card */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('quickInfo')}
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  {t('currentPrice')}
                </span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(producto?.precioVenta || 0)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={formData.tipo === 'PRODUCTO' ? 'info' : 'success'}>
                  {formData.tipo === 'PRODUCTO' ? t('typeProduct') : t('typeService')}
                </Badge>
              </div>
            </div>
          </Card>
          
          {/* Created Date */}
          {producto?.createdAt && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Created {formatDate(producto.createdAt)}</span>
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
        title="Delete Product"
        message={`Are you sure you want to delete "${producto?.nombre}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
