'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { pushWeb } from '@/lib/push/instancias';
import type { EstadoWebPush } from '@/lib/push/web';

/**
 * «Recibir avisos en este navegador» (Configuración › Notificaciones). Solo se muestra donde se puede: no en la app (ahí los avisos
 * son los del teléfono) ni en un navegador sin Web Push, ni si el servidor no lo tiene configurado.
 */
export default function AvisosPush() {
  const t = useTranslations('push');
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [estado, setEstado] = useState<EstadoWebPush | 'cargando'>('cargando');
  const [ocupado, setOcupado] = useState(false);

  const userId = user?.id ?? '';
  const leer = useCallback(async () => setEstado(await pushWeb.estado(userId)), [userId]);
  useEffect(() => { void leer(); }, [leer]);

  if (estado === 'cargando' || estado === 'no-soportado' || estado === 'no-disponible' || !user?.id) return null;

  const activo = estado === 'activo';

  const cambiar = async () => {
    if (!user?.id) return;
    setOcupado(true);
    try {
      if (activo) {
        setEstado(await pushWeb.desactivar(user.id));
        showSuccess(t('desactivado'));
      } else {
        const nuevo = await pushWeb.activar(user.id);
        setEstado(nuevo);
        if (nuevo === 'activo') showSuccess(t('activado'));
      }
    } catch {
      showError(t('error'));
      await leer();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <div className="w-1 h-5 bg-yellow-500 rounded-full"></div>
        {t('titulo')}
      </h3>
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <BellRing className="w-5 h-5 mt-0.5 text-gray-500 dark:text-gray-400 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{t('recibirEnNavegador')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{estado === 'bloqueado' ? t('bloqueado') : t('descripcion')}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={activo}
            disabled={ocupado || estado === 'bloqueado'}
            onChange={cambiar}
            aria-label={t('recibirEnNavegador')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500 peer-disabled:opacity-50"></div>
        </label>
      </div>
    </div>
  );
}
