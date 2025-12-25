'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Building2,
  User,
  Palette,
  FileText,
  Bell,
  Shield,
  Save,
  Upload,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button, Card, Input, Textarea, LoadingSpinner } from '@/components/common';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

type Tab = 'empresa' | 'usuario' | 'apariencia' | 'facturacion' | 'notificaciones';

export default function ConfiguracionPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('settings');
  const { user, empresa, refreshEmpresa } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>('empresa');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Company form
  const [empresaForm, setEmpresaForm] = useState({
    ruc: '',
    razonSocial: '',
    nombreComercial: '',
    direccion: '',
    telefono: '',
    email: '',
    web: '',
  });

  // User form
  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Invoice config
  const [invoiceConfig, setInvoiceConfig] = useState({
    serieBoleta: 'B001',
    serieFactura: 'F001',
    correlativoBoleta: 1,
    correlativoFactura: 1,
    igv: 18,
    moneda: 'PEN',
    condicionesPago: '30 días',
    notasPie: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailFactura: true,
    emailVencimiento: true,
    emailPago: true,
    diasAntesVencimiento: 5,
  });

  useEffect(() => {
    if (empresa) {
      setEmpresaForm({
        ruc: empresa.ruc || '',
        razonSocial: empresa.razonSocial || '',
        nombreComercial: empresa.nombreComercial || '',
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        email: empresa.email || '',
        web: empresa.web || '',
      });
    }
    if (user) {
      setUserForm((prev) => ({
        ...prev,
        nombre: user.user_metadata?.nombre || '',
        email: user.email || '',
      }));
    }
  }, [empresa, user]);

  const handleSaveEmpresa = async () => {
    try {
      setSaving(true);
      await api.put(`/empresa/${empresa?.id}`, empresaForm);
      refreshEmpresa?.();
      setMessage(t('savedSuccessfully'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving empresa:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (userForm.newPassword && userForm.newPassword !== userForm.confirmPassword) {
      setMessage(t('passwordMismatch'));
      return;
    }
    try {
      setSaving(true);
      // Update user profile logic here
      setMessage(t('savedSuccessfully'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoiceConfig = async () => {
    try {
      setSaving(true);
      // Save invoice config logic here
      setMessage(t('savedSuccessfully'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'empresa' as Tab, label: t('company'), icon: Building2 },
    { id: 'usuario' as Tab, label: t('user'), icon: User },
    { id: 'apariencia' as Tab, label: t('appearance'), icon: Palette },
    { id: 'facturacion' as Tab, label: t('invoicing'), icon: FileText },
    { id: 'notificaciones' as Tab, label: t('notifications'), icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Success message */}
      {message && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{message}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <Card className="!p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Company Settings */}
          {activeTab === 'empresa' && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('companySettings')}</h2>
                  <p className="text-sm text-gray-500">{t('companySettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('ruc')}
                    value={empresaForm.ruc}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, ruc: e.target.value })}
                  />
                  <Input
                    label={t('businessName')}
                    value={empresaForm.razonSocial}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, razonSocial: e.target.value })}
                  />
                </div>

                <Input
                  label={t('tradeName')}
                  value={empresaForm.nombreComercial}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, nombreComercial: e.target.value })}
                />

                <Input
                  label={t('address')}
                  value={empresaForm.direccion}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, direccion: e.target.value })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('phone')}
                    value={empresaForm.telefono}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })}
                  />
                  <Input
                    label={t('email')}
                    type="email"
                    value={empresaForm.email}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                  />
                </div>

                <Input
                  label={t('website')}
                  value={empresaForm.web}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, web: e.target.value })}
                  placeholder="https://www.ejemplo.com"
                />

                {/* Logo upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('logo')}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">{t('dragDropLogo')}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      {t('selectFile')}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button onClick={handleSaveEmpresa} disabled={saving}>
                    {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* User Settings */}
          {activeTab === 'usuario' && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('userSettings')}</h2>
                  <p className="text-sm text-gray-500">{t('userSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('name')}
                    value={userForm.nombre}
                    onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  />
                  <Input
                    label={t('email')}
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    disabled
                  />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-md font-medium mb-4">{t('changePassword')}</h3>
                  <div className="space-y-4">
                    <Input
                      label={t('currentPassword')}
                      type="password"
                      value={userForm.currentPassword}
                      onChange={(e) => setUserForm({ ...userForm, currentPassword: e.target.value })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={t('newPassword')}
                        type="password"
                        value={userForm.newPassword}
                        onChange={(e) => setUserForm({ ...userForm, newPassword: e.target.value })}
                      />
                      <Input
                        label={t('confirmPassword')}
                        type="password"
                        value={userForm.confirmPassword}
                        onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button onClick={handleSaveUser} disabled={saving}>
                    {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Appearance Settings */}
          {activeTab === 'apariencia' && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('appearanceSettings')}</h2>
                  <p className="text-sm text-gray-500">{t('appearanceSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('theme')}
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {['light', 'dark', 'system'].map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => setTheme(themeOption as 'light' | 'dark' | 'system')}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all',
                          theme === themeOption
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        )}
                      >
                        <div className={cn(
                          'w-full h-20 rounded mb-2',
                          themeOption === 'light' ? 'bg-white border' :
                          themeOption === 'dark' ? 'bg-gray-800' :
                          'bg-gradient-to-r from-white to-gray-800'
                        )} />
                        <span className="text-sm font-medium capitalize">{t(themeOption)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('language')}
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => window.location.href = '/es/configuracion'}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
                        locale === 'es'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Español</span>
                    </button>
                    <button
                      onClick={() => window.location.href = '/en/configuracion'}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
                        locale === 'en'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <Globe className="w-4 h-4" />
                      <span>English</span>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Invoice Settings */}
          {activeTab === 'facturacion' && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('invoiceSettings')}</h2>
                  <p className="text-sm text-gray-500">{t('invoiceSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('invoiceSeries')}
                    value={invoiceConfig.serieFactura}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, serieFactura: e.target.value })}
                  />
                  <Input
                    label={t('receiptSeries')}
                    value={invoiceConfig.serieBoleta}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, serieBoleta: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('igvRate')}
                    type="number"
                    value={invoiceConfig.igv.toString()}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, igv: parseInt(e.target.value) || 18 })}
                    suffix="%"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('currency')}
                    </label>
                    <select
                      value={invoiceConfig.moneda}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, moneda: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="PEN">PEN - Sol Peruano</option>
                      <option value="USD">USD - Dólar Americano</option>
                    </select>
                  </div>
                </div>

                <Input
                  label={t('paymentTerms')}
                  value={invoiceConfig.condicionesPago}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, condicionesPago: e.target.value })}
                />

                <Textarea
                  label={t('footerNotes')}
                  value={invoiceConfig.notasPie}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, notasPie: e.target.value })}
                  rows={3}
                  placeholder={t('footerNotesPlaceholder')}
                />

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button onClick={handleSaveInvoiceConfig} disabled={saving}>
                    {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notificaciones' && (
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t('notificationSettings')}</h2>
                  <p className="text-sm text-gray-500">{t('notificationSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-medium">{t('emailOnInvoice')}</p>
                    <p className="text-sm text-gray-500">{t('emailOnInvoiceDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.emailFactura}
                      onChange={(e) => setNotifications({ ...notifications, emailFactura: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-medium">{t('emailOnDue')}</p>
                    <p className="text-sm text-gray-500">{t('emailOnDueDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.emailVencimiento}
                      onChange={(e) => setNotifications({ ...notifications, emailVencimiento: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-medium">{t('emailOnPayment')}</p>
                    <p className="text-sm text-gray-500">{t('emailOnPaymentDesc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.emailPago}
                      onChange={(e) => setNotifications({ ...notifications, emailPago: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <label className="block font-medium mb-2">{t('daysBeforeDue')}</label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={notifications.diasAntesVencimiento.toString()}
                    onChange={(e) => setNotifications({ ...notifications, diasAntesVencimiento: parseInt(e.target.value) || 5 })}
                    className="max-w-[120px]"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button disabled={saving}>
                    {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {t('save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
