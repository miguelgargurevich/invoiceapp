'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { Card, Skeleton } from '@/components/common';
import { cn } from '@/lib/utils';
import type { Cupo, Indicadores } from '@/lib/dashboard';
import { formatearMonto } from '@/lib/sunat/formato';

interface Props {
  locale: string;
  cargando: boolean;
  indicadores: Indicadores | null;
  cupo: Cupo | null;
}

const COLOR_BARRA: Record<Cupo['nivel'], string> = {
  ok: 'bg-primary-600',
  casi: 'bg-amber-500',
  lleno: 'bg-red-500',
  ilimitado: 'bg-primary-600',
  desconocido: 'bg-gray-300',
};

export function IndicadoresPeru({ locale, cargando, indicadores, cupo }: Props) {
  const t = useTranslations('dashboard');

  if (cargando) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-24 mb-3" />
            <Skeleton className="h-2 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (!indicadores || !cupo) {
    return (
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('errorCarga')}</p>
      </Card>
    );
  }

  const marca = indicadores.incompleto ? '+' : '';
  const aviso = indicadores.incompleto ? t('incompleto') : null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Cupo del plan: comprobantes emitidos este mes */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('cupoTitulo')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {cupo.usados}
              {marca}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {cupo.nivel === 'ilimitado' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('cupoIlimitado')}</p>
        )}
        {cupo.nivel === 'desconocido' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('cupoDesconocido')}</p>
        )}
        {cupo.limite !== null && cupo.nivel !== 'desconocido' && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-label={t('cupoTitulo')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={cupo.porcentaje}
              className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
            >
              <div className={cn('h-full rounded-full transition-all', COLOR_BARRA[cupo.nivel])} style={{ width: `${cupo.porcentaje}%` }} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('cupoDe', { limite: cupo.limite })}
              {cupo.nivel === 'casi' && <span className="block text-amber-700 dark:text-amber-400">{t('cupoCasi')}</span>}
              {cupo.nivel === 'lleno' && <span className="block text-red-700 dark:text-red-400">{t('cupoLleno')}</span>}
            </p>
          </div>
        )}
        {aviso && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{aviso}</p>}
      </Card>

      {/* Ventas del mes en soles */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('ventasTitulo')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
              {formatearMonto(indicadores.ventasMes, 'PEN')}
              {marca}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('ventasNota')}</p>
        {aviso && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{aviso}</p>}
      </Card>

      {/* Comprobantes que piden una acción */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('atencionTitulo')}</p>
            <p
              className={cn(
                'text-2xl font-bold mt-1',
                indicadores.requierenAtencion > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-gray-900 dark:text-gray-100'
              )}
            >
              {indicadores.requierenAtencion}
            </p>
          </div>
          <div
            className={cn(
              'p-2.5 rounded-lg shrink-0',
              indicadores.requierenAtencion > 0
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        {indicadores.requierenAtencion > 0 ? (
          <Link href={`/${locale}/comprobantes`} className="inline-block text-sm mt-3 text-primary-700 dark:text-primary-300 hover:underline">
            {t('atencionVer')}
          </Link>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('sinAtencion')}</p>
        )}
      </Card>
    </div>
  );
}
