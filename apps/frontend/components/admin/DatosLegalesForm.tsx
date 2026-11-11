'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Scale } from 'lucide-react';
import { Card, Button, Input, LoadingSpinner } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { datosLegalesDesdeRespuesta, type DatosLegales } from '@/lib/legal';
import { validarWhatsappDemo } from '@/lib/demo';

type Campo = keyof DatosLegales;

const VACIO: Record<Campo, string> = {
  legalMarca: '', legalRazonSocial: '', legalRuc: '', legalDomicilio: '', legalCorreo: '',
};

// Edición de «quién presta el servicio» (Términos, Privacidad, Contacto y pie). Solo SUPER_ADMIN (la API también lo exige).
export function DatosLegalesForm() {
  const t = useTranslations('admin.datosLegales');
  const { showToast } = useToast();
  const [valores, setValores] = useState<Record<Campo, string>>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // WhatsApp de la franja de la demo (ConfiguracionSitio.demoWhatsapp). Vacío = la franja no lo muestra.
  const [whatsappDemo, setWhatsappDemo] = useState('');
  const [errorWhatsapp, setErrorWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    api.get('/sitio/legal')
      .then((r) => {
        const d = datosLegalesDesdeRespuesta(r);
        const wa = (r as { demoWhatsapp?: unknown } | null)?.demoWhatsapp;
        if (vivo && typeof wa === 'string') setWhatsappDemo(wa);
        if (vivo && d) setValores({ ...VACIO, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])) });
      })
      .catch(() => { if (vivo) setError(t('errorCargar')); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [t]);

  const cambiar = (campo: Campo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValores((v) => ({ ...v, [campo]: e.target.value }));

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const avisoWhatsapp = validarWhatsappDemo(whatsappDemo);
    setErrorWhatsapp(avisoWhatsapp);
    if (avisoWhatsapp) return;
    setGuardando(true);
    setError(null);
    try {
      const guardado = datosLegalesDesdeRespuesta(await api.put('/admin/sitio/legal', { ...valores, demoWhatsapp: whatsappDemo.trim() }));
      if (guardado) setValores({ ...VACIO, ...Object.fromEntries(Object.entries(guardado).map(([k, v]) => [k, v ?? ''])) });
      showToast(t('guardado'), 'success');
    } catch (err: any) {
      const mensaje = err?.message || t('errorGuardar');
      setError(mensaje);
      showToast(mensaje, 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <Card>
      <form onSubmit={guardar} className="space-y-5 max-w-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Scale className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('titulo')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('descripcion')}</p>
          </div>
        </div>

        <Input label={t('marca')} value={valores.legalMarca} onChange={cambiar('legalMarca')} maxLength={200} />
        <Input
          label={t('razonSocial')}
          value={valores.legalRazonSocial}
          onChange={cambiar('legalRazonSocial')}
          maxLength={200}
          hint={t('avisoVacio')}
        />
        <Input label={t('ruc')} value={valores.legalRuc} onChange={cambiar('legalRuc')} inputMode="numeric" maxLength={11} />
        <Input label={t('domicilio')} value={valores.legalDomicilio} onChange={cambiar('legalDomicilio')} maxLength={200} />
        <Input
          label={t('correo')}
          type="email"
          value={valores.legalCorreo}
          onChange={cambiar('legalCorreo')}
          maxLength={200}
          hint={t('avisoVacio')}
        />

        <div className="border-t border-gray-200 pt-5 dark:border-gray-800">
          <Input
            label={t('whatsappDemo')}
            type="tel"
            inputMode="tel"
            value={whatsappDemo}
            onChange={(e) => { setWhatsappDemo(e.target.value); setErrorWhatsapp(null); }}
            maxLength={20}
            error={errorWhatsapp ?? undefined}
            hint={t('whatsappDemoAviso')}
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

        <Button type="submit" loading={guardando}>{t('guardar')}</Button>
      </form>
    </Card>
  );
}
