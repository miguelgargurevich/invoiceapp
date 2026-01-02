'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
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
  X,
  ImageIcon,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Button, Card, Input, Textarea, LoadingSpinner } from '@/components/common';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import SignatureCanvas from '@/components/signature/SignatureCanvas';

type Tab = 'empresa' | 'usuario' | 'apariencia' | 'facturacion' | 'notificaciones';

export default function ConfiguracionPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('settings');
  const router = useRouter();
  const pathname = usePathname();
  const { user, empresa, refreshEmpresa } = useAuth();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const { updatePreferences } = usePreferences();

  const [activeTab, setActiveTab] = useState<Tab>('empresa');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companySignature, setCompanySignature] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [signatureKey, setSignatureKey] = useState(0); // Key to force remount of SignatureCanvas

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
    igv: 0,
    moneda: 'PEN',
    condicionesPago: '30 días',
    notasPie: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailFactura: false,
    emailVencimiento: false,
    emailPago: false,
    diasAntesVencimiento: 5,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await api.get<any>('/preferences');
      if (prefs) {
        setNotifications({
          emailFactura: prefs.emailFactura ?? false,
          emailVencimiento: prefs.emailVencimiento ?? false,
          emailPago: prefs.emailPago ?? false,
          diasAntesVencimiento: prefs.diasAntesVencimiento ?? 5,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

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
      // Establecer el logo actual si existe
      if (empresa.logoUrl) {
        setLogoPreview(empresa.logoUrl);
      }
      
      // Establecer la firma actual si existe
      if (empresa.firmaEmpresa) {
        setCompanySignature(empresa.firmaEmpresa);
      } else {
        setCompanySignature(null);
      }
      
      // Cargar configuración de facturación desde empresa
      setInvoiceConfig({
        serieBoleta: empresa.serieProforma || 'B001',
        serieFactura: empresa.serieFactura || 'F001',
        correlativoBoleta: 1,
        correlativoFactura: 1,
        igv: empresa.taxRate ? parseFloat(empresa.taxRate.toString()) : 0,
        moneda: empresa.moneda || 'PEN',
        condicionesPago: '30 días',
        notasPie: '',
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
      console.log('[CONFIG] Saving empresa data:', empresaForm);
      const response = await api.put('/empresas/mi-empresa', empresaForm) as any;
      console.log('[CONFIG] Save response:', response);
      
      // Actualizar el formulario con la respuesta ANTES de refrescar el contexto
      setEmpresaForm({
        ruc: response.ruc || '',
        razonSocial: response.razonSocial || '',
        nombreComercial: response.nombreComercial || '',
        direccion: response.direccion || '',
        telefono: response.telefono || '',
        email: response.email || '',
        web: response.web || '',
      });
      
      // Luego actualizar el contexto
      await refreshEmpresa?.();
      
      setMessage(t('savedSuccessfully'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('[CONFIG] Error saving empresa:', error);
      setMessage(t('errorSaving'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelect = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setMessage(t('invalidFileType'));
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Validar tamaño (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage(t('fileTooLarge'));
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setUploadingLogo(true);

      // Crear preview local
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Obtener el token de Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Subir al servidor
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/empresas/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error uploading logo');
      }

      const data = await response.json();
      setLogoPreview(data.logoUrl);
      refreshEmpresa?.();
      setMessage(t('logoUploaded'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage(t('errorUploadingLogo'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setUploadingLogo(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setPendingSignature(dataUrl);
  };

  const saveSignature = async () => {
    if (!pendingSignature) return;

    try {
      setUploadingSignature(true);
      
      const response = await api.post('/empresas/firma', {
        signatureDataUrl: pendingSignature
      }) as any;
      
      console.log('[SIGNATURE] Saved signature response:', response.firmaEmpresa);
      
      // Update local state first
      setCompanySignature(response.firmaEmpresa);
      setPendingSignature(null);
      
      // Refresh empresa context to update all components
      await refreshEmpresa?.();
      
      setMessage(t('messages.signatureSaved'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving signature:', error);
      setMessage(t('messages.errorSavingSignature'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    try {
      setUploadingSignature(true);
      await api.delete('/empresas/firma');
      setCompanySignature(null);
      setPendingSignature(null);
      setSignatureKey(prev => prev + 1); // Force remount for new signature creation
      await refreshEmpresa?.();
      setMessage(t('messages.signatureDeleted'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting signature:', error);
      setMessage(t('messages.errorDeletingSignature'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setUploadingSignature(false);
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

  const handleChangeLanguage = async (newLocale: string) => {
    try {
      // Guardar preferencia en BD, localStorage y cookie
      await updatePreferences({ locale: newLocale as 'es' | 'en' });
      
      // Pequeña espera para asegurar que la cookie se haya guardado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirigir a la nueva ruta con el idioma
      const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
      router.push(newPath);
      router.refresh(); // Forzar refresh para que el middleware lea la nueva cookie
    } catch (error) {
      console.error('[CONFIG] Error changing language:', error);
    }
  };

  const handleSaveInvoiceConfig = async () => {
    try {
      setSaving(true);
      console.log('[CONFIG] Saving invoice config:', invoiceConfig);
      const response = await api.put('/empresas/mi-empresa/config', invoiceConfig) as any;
      console.log('[CONFIG] Invoice config save response:', response);
      
      // Actualizar el contexto
      await refreshEmpresa?.();
      
      setMessage(t('savedSuccessfully'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('[CONFIG] Error saving invoice config:', error);
      setMessage(t('errorSaving'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      console.log('[CONFIG] Saving notification settings:', notifications);
      await api.put('/preferences', notifications);
      
      setMessage(t('savedSuccessfully'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('[CONFIG] Error saving notification settings:', error);
      setMessage(t('errorSaving'));
      setTimeout(() => setMessage(''), 3000);
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
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
          <Settings className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Success message */}
      {message && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-green-700 dark:text-green-400 font-medium">{message}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-72 shrink-0">
          <Card className="!p-3 shadow-sm">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-400 shadow-sm font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium'
                  )}
                >
                  <tab.icon className={cn(
                    "w-5 h-5",
                    activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : ""
                  )} />
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
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('companySettings')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('companySettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                    {t('basicInformation') || 'Basic Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t('ruc')}
                      value={empresaForm.ruc}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, ruc: e.target.value })}
                      className="focus:ring-blue-500"
                    />
                    <Input
                      label={t('businessName')}
                      value={empresaForm.razonSocial}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, razonSocial: e.target.value })}
                      className="focus:ring-blue-500"
                    />
                  </div>
                </div>

                <Input
                  label={t('tradeName')}
                  value={empresaForm.nombreComercial}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, nombreComercial: e.target.value })}
                  className="focus:ring-blue-500"
                />

                {/* Contact Information */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                    {t('contactInformation') || 'Contact Information'}
                  </h3>
                  <div className="space-y-4">
                    <Input
                      label={t('address')}
                      value={empresaForm.direccion}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, direccion: e.target.value })}
                      className="focus:ring-blue-500"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={t('phone')}
                        value={empresaForm.telefono}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })}
                        className="focus:ring-blue-500"
                      />
                      <Input
                        label={t('email')}
                        type="email"
                        value={empresaForm.email}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                        className="focus:ring-blue-500"
                      />
                    </div>

                    <Input
                      label={t('website')}
                      value={empresaForm.web}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, web: e.target.value })}
                      placeholder="https://www.ejemplo.com"
                      className="focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Logo upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('logo')}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <div className="relative w-32 h-32 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                        <Image
                          src={logoPreview}
                          alt="Logo"
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={handleLogoSelect}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {t('changeLogo')}
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={handleLogoSelect}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {uploadingLogo ? (
                        <LoadingSpinner size="md" className="mx-auto mb-2" />
                      ) : (
                        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      )}
                      <p className="text-sm text-gray-500 mb-1">{t('dragDropLogo')}</p>
                      <p className="text-xs text-gray-400">{t('maxFileSize')}</p>
                      <Button variant="outline" size="sm" className="mt-3" disabled={uploadingLogo}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('selectFile')}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Company Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Signature
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    This signature will appear on your proposals in the "Authorized Signature" section
                  </p>
                  
                  {companySignature ? (
                    <div className="space-y-3">
                      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Signature:</span>
                          <button
                            type="button"
                            onClick={handleDeleteSignature}
                            disabled={uploadingSignature}
                            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-center min-h-[100px]">
                          <Image
                            src={companySignature}
                            alt="Company Signature"
                            width={200}
                            height={80}
                            className="max-h-20 w-auto object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCompanySignature(null);
                          setPendingSignature(null);
                          setSignatureKey(prev => prev + 1); // Force remount
                        }}
                        disabled={uploadingSignature}
                        className="w-full"
                      >
                        Create New Signature
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                        <SignatureCanvas
                          key={signatureKey}
                          onSignatureChange={handleSignatureChange}
                          disabled={uploadingSignature}
                        />
                      </div>
                      <Button
                        onClick={saveSignature}
                        disabled={!pendingSignature || uploadingSignature}
                        className="w-full"
                      >
                        {uploadingSignature ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Signature
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSaveEmpresa}
                    disabled={saving}
                    className="h-11 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-base font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="sm" />
                        {t('saving')}
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {t('save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* User Settings */}
          {activeTab === 'usuario' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-md">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('userSettings')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('userSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    {t('personalInformation') || 'Personal Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t('name')}
                      value={userForm.nombre}
                      onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                      className="focus:ring-purple-500"
                    />
                    <Input
                      label={t('email')}
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800/50"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    <Shield className="w-5 h-5 text-purple-500" />
                    {t('changePassword')}
                  </h3>
                  <div className="space-y-4">
                    <Input
                      label={t('currentPassword')}
                      type="password"
                      value={userForm.currentPassword}
                      onChange={(e) => setUserForm({ ...userForm, currentPassword: e.target.value })}
                      className="focus:ring-purple-500"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={t('newPassword')}
                        type="password"
                        value={userForm.newPassword}
                        onChange={(e) => setUserForm({ ...userForm, newPassword: e.target.value })}
                        className="focus:ring-purple-500"
                      />
                      <Input
                        label={t('confirmPassword')}
                        type="password"
                        value={userForm.confirmPassword}
                        onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                        className="focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSaveUser}
                    disabled={saving}
                    className="h-11 px-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-base font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="sm" />
                        {t('saving')}
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {t('save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Appearance Settings */}
          {activeTab === 'apariencia' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl shadow-md">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('appearanceSettings')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('appearanceSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {/* Theme */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-orange-500 rounded-full"></div>
                    {t('theme')}
                  </h3>
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

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('fontSize')}
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {t('fontSizeDesc')}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'small', label: t('fontSizeSmall'), size: '14px' },
                      { value: 'medium', label: t('fontSizeMedium'), size: '16px' },
                      { value: 'large', label: t('fontSizeLarge'), size: '18px' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFontSize(option.value as 'small' | 'medium' | 'large')}
                        className={cn(
                          'p-4 rounded-lg border-2 transition-all',
                          fontSize === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        )}
                      >
                        <div className="mb-2 font-medium" style={{ fontSize: option.size }}>
                          Aa
                        </div>
                        <span className="text-sm">{option.label}</span>
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
                      onClick={() => handleChangeLanguage('es')}
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
                      onClick={() => handleChangeLanguage('en')}
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
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('invoiceSettings')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('invoiceSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {/* Series Configuration */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                    {t('seriesConfiguration') || 'Series Configuration'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t('invoiceSeries')}
                      value={invoiceConfig.serieFactura}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, serieFactura: e.target.value })}
                      className="focus:ring-green-500"
                    />
                    <Input
                      label={t('receiptSeries')}
                      value={invoiceConfig.serieBoleta}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, serieBoleta: e.target.value })}
                      className="focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Tax Configuration */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                    {t('taxConfiguration') || 'Tax Configuration'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('taxRate')}
                      </label>
                      <input
                        type="text"
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      value={invoiceConfig.igv.toString()}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setInvoiceConfig({ ...invoiceConfig, igv: value === '' ? 0 : parseFloat(value) || 0 });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('currency')}
                    </label>
                    <select
                      value={invoiceConfig.moneda}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, moneda: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="PEN">PEN - Sol Peruano</option>
                      <option value="USD">USD - Dólar Americano</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                  {t('paymentTerms') || 'Payment Terms'}
                </h3>
                <Input
                  label={t('paymentTerms')}
                  value={invoiceConfig.condicionesPago}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, condicionesPago: e.target.value })}
                  className="focus:ring-green-500"
                />
              </div>
            </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveInvoiceConfig}
                  disabled={saving}
                  className="h-11 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-base font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notificaciones' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-md">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('notificationSettings')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('notificationSettingsDesc')}</p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {/* Email Notifications */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-yellow-500 rounded-full"></div>
                    {t('emailNotifications') || 'Email Notifications'}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{t('emailOnInvoice')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('emailOnInvoiceDesc')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.emailFactura}
                          onChange={(e) => setNotifications({ ...notifications, emailFactura: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{t('emailOnDue')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('emailOnDueDesc')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.emailVencimiento}
                          onChange={(e) => setNotifications({ ...notifications, emailVencimiento: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{t('emailOnPayment')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('emailOnPaymentDesc')}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.emailPago}
                          onChange={(e) => setNotifications({ ...notifications, emailPago: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Reminder Settings */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-yellow-500 rounded-full"></div>
                    {t('reminderSettings') || 'Reminder Settings'}
                  </h3>
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">{t('daysBeforeDue')}</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={notifications.diasAntesVencimiento.toString()}
                      onChange={(e) => setNotifications({ ...notifications, diasAntesVencimiento: parseInt(e.target.value) || 5 })}
                      className="max-w-[120px] focus:ring-yellow-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="h-11 px-6 bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-base font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
