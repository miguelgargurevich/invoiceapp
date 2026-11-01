'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Save } from 'lucide-react';
import { Button, Card, Input, Select, SkeletonCard } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { fechaCorta } from '@/lib/sunat/formato';
import type { EmisorPayload, EmisorVista } from '@/lib/sunat/tipos';

interface Props {
  ruc: string;
  onGuardado: () => void | Promise<void>;
}

const VACIO = {
  ubigeo: '', departamento: '', provincia: '', distrito: '', urbanizacion: '', direccionFiscal: '', codigoEstablecimiento: '0000',
  ambiente: 'BETA' as 'BETA' | 'PRODUCCION', solUsuario: '', cuentaDetracciones: '', esAgenteRetencion: false, esAgentePercepcion: false,
};

function leerBase64(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '');
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(archivo);
  });
}

export function EmisorForm({ ruc, onGuardado }: Props) {
  const t = useTranslations('sunat.emisor');
  const tErr = useTranslations('sunat.errores');
  const { showError, showSuccess } = useToast();
  const [emisor, setEmisor] = useState<EmisorVista | null>(null);
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState(VACIO);
  const [solClave, setSolClave] = useState('');
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [claveCertificado, setClaveCertificado] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const llenar = (e: EmisorVista) => {
    setEmisor(e);
    if (!e.configurado) return;
    setDatos({
      ubigeo: e.ubigeo ?? '', departamento: e.departamento ?? '', provincia: e.provincia ?? '', distrito: e.distrito ?? '',
      urbanizacion: e.urbanizacion ?? '', direccionFiscal: e.direccionFiscal ?? '', codigoEstablecimiento: e.codigoEstablecimiento ?? '0000',
      ambiente: e.ambiente ?? 'BETA', solUsuario: e.solUsuario ?? '', cuentaDetracciones: e.cuentaDetracciones ?? '',
      esAgenteRetencion: Boolean(e.esAgenteRetencion), esAgentePercepcion: Boolean(e.esAgentePercepcion),
    });
  };

  useEffect(() => {
    sunatApi.emisor().then(llenar).catch(() => setEmisor({ configurado: false })).finally(() => setCargando(false));
  }, []);

  const pasaAProduccion = datos.ambiente === 'PRODUCCION' && emisor?.ambiente !== 'PRODUCCION';
  const cambiar = (cambios: Partial<typeof VACIO>) => setDatos((d) => ({ ...d, ...cambios }));

  const guardar = async () => {
    if (pasaAProduccion && confirmacion.trim() !== ruc) {
      showError(t('confirmarProduccion', { ruc }));
      return;
    }
    setGuardando(true);
    try {
      const payload: EmisorPayload = {
        ubigeo: datos.ubigeo.trim(),
        departamento: datos.departamento.trim(),
        provincia: datos.provincia.trim(),
        distrito: datos.distrito.trim(),
        ...(datos.urbanizacion.trim() ? { urbanizacion: datos.urbanizacion.trim() } : {}),
        direccionFiscal: datos.direccionFiscal.trim(),
        codigoEstablecimiento: datos.codigoEstablecimiento.trim() || '0000',
        ambiente: datos.ambiente,
        ...(datos.ambiente === 'PRODUCCION' ? { confirmarProduccion: true } : {}),
        ...(datos.solUsuario.trim() ? { solUsuario: datos.solUsuario.trim() } : {}),
        ...(solClave ? { solClave } : {}),
        ...(archivo ? { certificado: { pfxBase64: await leerBase64(archivo), clave: claveCertificado } } : {}),
        cuentaDetracciones: datos.cuentaDetracciones.trim(),
        esAgenteRetencion: datos.esAgenteRetencion,
        esAgentePercepcion: datos.esAgentePercepcion,
      };
      llenar(await sunatApi.guardarEmisor(payload));
      setSolClave('');
      setCambiandoClave(false);
      setArchivo(null);
      setClaveCertificado('');
      setConfirmacion('');
      showSuccess(t('guardado'));
      await onGuardado();
    } catch (error) {
      showError(normalizarError(error, tErr('noDisponible')).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <SkeletonCard />;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('datosFiscales')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label={t('ubigeo')} value={datos.ubigeo} maxLength={6} inputMode="numeric" onChange={(e) => cambiar({ ubigeo: e.target.value })} />
          <Input label={t('codigoEstablecimiento')} value={datos.codigoEstablecimiento} maxLength={4} onChange={(e) => cambiar({ codigoEstablecimiento: e.target.value })} />
          <Input label={t('departamento')} value={datos.departamento} onChange={(e) => cambiar({ departamento: e.target.value })} />
          <Input label={t('provincia')} value={datos.provincia} onChange={(e) => cambiar({ provincia: e.target.value })} />
          <Input label={t('distrito')} value={datos.distrito} onChange={(e) => cambiar({ distrito: e.target.value })} />
          <Input label={t('urbanizacion')} value={datos.urbanizacion} onChange={(e) => cambiar({ urbanizacion: e.target.value })} />
          <div className="md:col-span-2">
            <Input label={t('direccionFiscal')} value={datos.direccionFiscal} onChange={(e) => cambiar({ direccionFiscal: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('credenciales')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={t('ambiente')}
            options={[{ value: 'BETA', label: t('beta') }, { value: 'PRODUCCION', label: t('produccion') }]}
            value={datos.ambiente}
            onChange={(e) => cambiar({ ambiente: e.target.value as 'BETA' | 'PRODUCCION' })}
          />
          {pasaAProduccion ? (
            <Input label={t('confirmarProduccion', { ruc })} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          ) : <div />}
          <Input label={t('solUsuario')} value={datos.solUsuario} autoComplete="off" onChange={(e) => cambiar({ solUsuario: e.target.value })} />
          {emisor?.tieneClaveSol && !cambiandoClave ? (
            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('solClave')}</p>
              <div className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-400">
                {t('configurada')}
                <Button variant="ghost" size="sm" onClick={() => setCambiandoClave(true)}>{t('cambiar')}</Button>
              </div>
            </div>
          ) : (
            <Input label={t('solClave')} type="password" autoComplete="new-password" value={solClave} onChange={(e) => setSolClave(e.target.value)} />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('certificado')}</label>
            <input type="file" accept=".pfx,.p12" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="text-sm" />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {emisor?.tieneCertificado && emisor.certificadoVence ? t('certificadoVence', { fecha: fechaCorta(emisor.certificadoVence) }) : t('sinCertificado')}
            </p>
          </div>
          {archivo && (
            <Input label={t('certificadoClave')} type="password" autoComplete="new-password" value={claveCertificado} onChange={(e) => setClaveCertificado(e.target.value)} />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('otros')}</h3>
        <div className="space-y-4">
          <Input label={t('cuentaDetracciones')} value={datos.cuentaDetracciones} onChange={(e) => cambiar({ cuentaDetracciones: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={datos.esAgenteRetencion} onChange={(e) => cambiar({ esAgenteRetencion: e.target.checked })} />
            {t('agenteRetencion')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={datos.esAgentePercepcion} onChange={(e) => cambiar({ esAgentePercepcion: e.target.checked })} />
            {t('agentePercepcion')}
          </label>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button icon={<Save className="w-4 h-4" />} loading={guardando} onClick={guardar}>{t('guardar')}</Button>
      </div>
    </div>
  );
}
