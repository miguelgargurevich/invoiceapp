'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button, Card, Input, Textarea, LoadingSpinner, PageHeader } from '@/components/common';
import { cn } from '@/lib/utils';
import api, { ApiError } from '@/lib/api';
import SignatureCanvas from '@/components/signature/SignatureCanvas';
import SubscriptionTab from '@/components/settings/SubscriptionTab';
import { useModoDemo } from '@/lib/hooks/useModoDemo';
import { TEXTO_NO_DISPONIBLE_DEMO } from '@/lib/demo';
import { ColorMarca } from '@/components/settings/ColorMarca';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SunatTab } from '@/components/sunat/SunatTab';
import {
  Building2,
  User,
  Palette,
  FileText,
  Bell,
  Shield,
  Save,
  Upload,
  X,
  ImageIcon,
  Settings,
  CreditCard,
  Landmark,
} from 'lucide-react';

type Tab = 'empresa' | 'usuario' | 'apariencia' | 'facturacion' | 'notificaciones' | 'sunat' | 'suscripcion';

export default function ConfiguracionPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('settings');
  const tSub = useTranslations('subscription');
  const tSunat = useTranslations('sunat.emisor');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, empresa, refreshEmpresa } = useAuth();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();
  const { plan, loading: cargandoPlan } = useSubscription();
  // En la demo no se suben archivos, no se cambia la contraseña ni el correo (la API lo bloquea).
  const { esDemo } = useModoDemo();

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
  // Color de marca: '#RRGGBB' o null (predeterminado). errorColor: mensaje del backend si rechaza el color.
  const [colorMarca, setColorMarca] = useState<string | null>(null);
  const [errorColor, setErrorColor] = useState<string | null>(null);

  // Detect tab from URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['empresa', 'usuario', 'apariencia', 'facturacion', 'notificaciones', 'sunat', 'suscripcion'].includes(tabParam)) {
      setActiveTab(tabParam as Tab);
    }
  }, [searchParams]);

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
      setColorMarca(empresa.colorPrimario ?? null);
      setErrorColor(null);
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
    // colorPrimario viaja solo si cambió. Si una empresa sin plan conserva un color guardado,
    // mandarlo en cada guardado daría 403 y bloquearía también el RUC, la dirección, etc.
    const cambioColor = colorMarca !== (empresa?.colorPrimario ?? null);
    try {
      setSaving(true);
      setErrorColor(null);
      //console.log('[CONFIG] Saving empresa data:', empresaForm);
      const payload = cambioColor ? { ...empresaForm, colorPrimario: colorMarca } : empresaForm;
      const response = await api.put('/empresas/mi-empresa', payload) as any;
      //console.log('[CONFIG] Save response:', response);
      
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
      if (cambioColor && error instanceof ApiError && error.status === 403) {
        // El plan no incluye colores de marca: se muestra el mensaje del backend junto al bloque de color.
        setErrorColor(error.message);
      } else {
        setMessage(t('errorSaving'));
        setTimeout(() => setMessage(''), 3000);
      }
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

      // Subir al servidor
      const formData = new FormData();
      formData.append('logo', file);

      const data = await api.upload<{ logoUrl: string }>('/empresas/logo', formData);
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
      
      //console.log('[SIGNATURE] Saved signature response:', response.firmaEmpresa);
      
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

  const handleSaveInvoiceConfig = async () => {
    try {
      setSaving(true);
      //console.log('[CONFIG] Saving invoice config:', invoiceConfig);
      const response = await api.put('/empresas/mi-empresa/config', invoiceConfig) as any;
      //console.log('[CONFIG] Invoice config save response:', response);
      
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
      //console.log('[CONFIG] Saving notification settings:', notifications);
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
    { id: 'sunat' as Tab, label: tSunat('pestana'), icon: Landmark },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} icon={Settings} />

      {/* Success message */}
      {message && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
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
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium'
                  )}
                >
                  <tab.icon className={cn(
                    "w-5 h-5",
                    activeTab === tab.id ? "text-primary-600 dark:text-primary-400" : ""
                  )} />
                  <span>{tab.label}</span>
                </button>
              ))}
              
              {/* Subscription Tab */}
              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('suscripcion')}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200',
                    activeTab === 'suscripcion'
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium'
                  )}
                >
                  <CreditCard className={cn(
                    "w-5 h-5",
                    activeTab === 'suscripcion' ? "text-primary-600 dark:text-primary-400" : ""
                  )} />
                  <span>{tSub('title')}</span>
                </button>
              </div>
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Company Settings */}
          {activeTab === 'empresa' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl">
                  <Building2 className="w-6 h-6" />
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
                    <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                    {t('basicInformation') || 'Basic Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t('ruc')}
                      value={empresaForm.ruc}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, ruc: e.target.value })}
                      className="focus:ring-primary-500"
                    />
                    <Input
                      label={t('businessName')}
                      value={empresaForm.razonSocial}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, razonSocial: e.target.value })}
                      className="focus:ring-primary-500"
                    />
                  </div>
                </div>

                <Input
                  label={t('tradeName')}
                  value={empresaForm.nombreComercial}
                  onChange={(e) => setEmpresaForm({ ...empresaForm, nombreComercial: e.target.value })}
                  className="focus:ring-primary-500"
                />

                {/* Contact Information */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                    {t('contactInformation') || 'Contact Information'}
                  </h3>
                  <div className="space-y-4">
                    <Input
                      label={t('address')}
                      value={empresaForm.direccion}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, direccion: e.target.value })}
                      className="focus:ring-primary-500"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={t('phone')}
                        value={empresaForm.telefono}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })}
                        className="focus:ring-primary-500"
                      />
                      <Input
                        label={t('email')}
                        type="text"
                        inputMode="email"
                        value={empresaForm.email}
                        onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                        className="focus:ring-primary-500"
                      />
                    </div>

                    <Input
                      label={t('website')}
                      value={empresaForm.web}
                      onChange={(e) => setEmpresaForm({ ...empresaForm, web: e.target.value })}
                      placeholder="https://www.ejemplo.com"
                      className="focus:ring-primary-500"
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
                  
                  {esDemo ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{TEXTO_NO_DISPONIBLE_DEMO}</p>
                  ) : logoPreview ? (
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
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </Button>
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

                {/* Color de marca (plan con hasCustomBranding) */}
                <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                  <ColorMarca
                    valor={colorMarca}
                    onChange={(valor) => {
                      setColorMarca(valor);
                      setErrorColor(null);
                    }}
                    puedeCambiar={!!plan?.hasCustomBranding}
                    cargando={cargandoPlan}
                    locale={locale}
                    error={errorColor}
                  />
                </div>

                {/* Company Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('companySignature')}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {t('companySignatureDesc')}
                  </p>
                  
                  {companySignature ? (
                    <div className="space-y-3">
                      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('currentSignature')}</span>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={handleDeleteSignature}
                            disabled={uploadingSignature}
                          >
                            {t('delete')}
                          </Button>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-200 rounded border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-center min-h-[100px]">
                          <Image
                            src={companySignature}
                            alt={t('companySignature')}
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
                        {t('createNewSignature')}
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
                        variant="outline"
                        onClick={saveSignature}
                        disabled={!pendingSignature || uploadingSignature}
                        className="w-full"
                        loading={uploadingSignature}
                        icon={<Save className="w-4 h-4" />}
                      >
                        {uploadingSignature ? t('saving') : t('saveSignature')}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleSaveEmpresa}
                    disabled={saving}
                    loading={saving}
                    icon={<Save className="w-4 h-4" />}
                  >
                    {saving ? t('saving') : t('save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* User Settings */}
          {activeTab === 'usuario' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl">
                  <User className="w-6 h-6" />
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
                      type="text"
                      inputMode="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800/50"
                    />
                  </div>
                </div>

                {/* Show authentication provider info */}
                {user?.app_metadata?.provider === 'google' ? (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          {t('signedInWithGoogle')}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          {t('googleAccountManaged')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : esDemo ? (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {TEXTO_NO_DISPONIBLE_DEMO}: el cambio de contraseña y de correo.
                    </p>
                  </div>
                ) : (
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
                )}

                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={handleSaveUser}
                    disabled={saving}
                    loading={saving}
                    icon={<Save className="w-4 h-4" />}
                  >
                    {saving ? t('saving') : t('save')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Appearance Settings */}
          {activeTab === 'apariencia' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl">
                  <Palette className="w-6 h-6" />
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
                        {themeOption === 'system' ? (
                          <div className="w-full h-20 rounded mb-2 flex overflow-hidden border">
                            <div className="w-1/2 bg-white" />
                            <div className="w-1/2 bg-gray-800" />
                          </div>
                        ) : (
                          <div className={cn(
                            'w-full h-20 rounded mb-2',
                            themeOption === 'light' ? 'bg-white border' : 'bg-gray-800'
                          )} />
                        )}
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

              </div>
            </Card>
          )}

          {/* Invoice Settings */}
          {activeTab === 'facturacion' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl">
                  <FileText className="w-6 h-6" />
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
                    <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                    {t('seriesConfiguration') || 'Series Configuration'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label={t('invoiceSeries')}
                      value={invoiceConfig.serieFactura}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, serieFactura: e.target.value })}
                      className="focus:ring-primary-500"
                    />
                    <Input
                      label={t('receiptSeries')}
                      value={invoiceConfig.serieBoleta}
                      onChange={(e) => setInvoiceConfig({ ...invoiceConfig, serieBoleta: e.target.value })}
                      className="focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Tax Configuration */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="PEN">PEN - {t('currencies.PEN')}</option>
                      <option value="USD">USD - {t('currencies.USD')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
                  {t('paymentTerms') || 'Payment Terms'}
                </h3>
                <Input
                  label={t('paymentTerms')}
                  value={invoiceConfig.condicionesPago}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, condicionesPago: e.target.value })}
                  className="focus:ring-primary-500"
                />
              </div>
            </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleSaveInvoiceConfig}
                  disabled={saving}
                  loading={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? t('saving') : t('save')}
                </Button>
              </div>
            </Card>
          )}

          {/* Notification Settings */}
          {activeTab === 'notificaciones' && (
            <Card className="shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl">
                  <Bell className="w-6 h-6" />
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
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
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

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
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

                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
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
                <Button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  loading={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? t('saving') : t('save')}
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'sunat' && (
            <SunatTab ruc={empresa?.ruc ?? ''} esPeru={empresa?.pais === 'PE'} onGuardado={refreshEmpresa} />
          )}

          {/* Subscription Settings */}
          {activeTab === 'suscripcion' && (
            <SubscriptionTab locale={locale} />
          )}
        </div>
      </div>
    </div>
  );
}
