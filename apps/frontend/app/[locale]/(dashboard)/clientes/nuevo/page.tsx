'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Card, Input } from '@/components/common';
import api from '@/lib/api';

export default function NuevoClientePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('clients');
  const router = useRouter();
  const { empresa } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipoDocumento: 'RUC',
    documento: '',
    nombre: '',
    direccion: '',
    email: '',
    telefono: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.documento) {
      showError('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/clientes', { ...formData, empresaId: empresa?.id });
      showSuccess(t('messages.created'));
      router.push(`/${locale}/clientes`);
    } catch (error: any) {
      console.error('Error saving cliente:', error);
      showError(error.response?.data?.error || 'Error saving client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/${locale}/clientes`)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('newClient')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Form */}
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
                Fill in the client information
              </p>
            </div>
          </div>

          {/* Document Type & Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('documentType')} *
              </label>
              <select
                value={formData.tipoDocumento}
                onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              >
                <option value="RUC">RUC</option>
                <option value="DNI">DNI</option>
                <option value="CE">Carnet de Extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            
            <Input
              label={`${t('documentNumber')} *`}
              value={formData.documento}
              onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              placeholder="Enter document number"
              required
            />
          </div>

          {/* Name */}
          <Input
            label={`${t('name')} *`}
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Client name or business name"
            required
          />

          {/* Address */}
          <Input
            label={t('address')}
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            placeholder="Full address"
          />

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label={t('email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
            
            <Input
              label={t('phone')}
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+1 (555) 123-4567"
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
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
