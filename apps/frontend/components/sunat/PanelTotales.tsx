'use client';

import { useTranslations } from 'next-intl';
import { Card, LoadingSpinner } from '@/components/common';
import { formatearMonto, type FilaTotal } from '@/lib/sunat/formato';

interface Props {
  filas: FilaTotal[];
  total: string | null;
  montoEnLetras: string | null;
  moneda: string;
  cargando?: boolean;
  error?: string | null;
}

export function PanelTotales({ filas, total, montoEnLetras, moneda, cargando = false, error = null }: Props) {
  const t = useTranslations('sunat.totales');
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('titulo')}</h2>
        {cargando && <span className="flex items-center gap-2 text-xs text-gray-500"><LoadingSpinner size="xs" />{t('calculando')}</span>}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : total === null ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('sinDatos')}</p>
      ) : (
        <dl className="space-y-2 text-sm">
          {filas.map((f) => (
            <div key={f.clave} className="flex justify-between text-gray-600 dark:text-gray-300">
              <dt>{t(f.clave)}</dt>
              <dd className="tabular-nums">{formatearMonto(f.monto, f.clave === 'detraccion' ? 'PEN' : moneda)}</dd>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-base font-semibold text-gray-900 dark:text-gray-100">
            <dt>{t('total')}</dt>
            <dd className="tabular-nums">{formatearMonto(total, moneda)}</dd>
          </div>
          {montoEnLetras && <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">{montoEnLetras}</p>}
        </dl>
      )}
    </Card>
  );
}
