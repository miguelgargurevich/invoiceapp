'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, Skeleton } from '@/components/common';
import { formatearMonto } from '@/lib/sunat/formato';

// Forma mínima de una proforma en /api/proformas (la lista puede venir como array o dentro de `data`/`proformas`).
export interface ProformaResumen {
  id: string;
  numero: string;
  cliente?: { nombre?: string };
  total: number | string;
  moneda?: string;
}

interface Props {
  locale: string;
  cargando: boolean;
  proformas: ProformaResumen[] | null;
}

// Bloque secundario: colores neutros, sin insignias ni verde.
export function ProformasRecientes({ locale, cargando, proformas }: Props) {
  const t = useTranslations('dashboard');

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h2 className="!text-sm font-semibold text-gray-700 dark:text-gray-300">{t('proformasTitulo')}</h2>
        <Link href={`/${locale}/proformas`} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
          {t('proformasVer')}
        </Link>
      </div>

      {cargando && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      )}

      {!cargando && proformas === null && <p className="text-sm text-gray-500 dark:text-gray-400">{t('errorCarga')}</p>}

      {!cargando && proformas !== null && proformas.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('proformasVacio')}</p>
      )}

      {!cargando && proformas !== null && proformas.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {proformas.slice(0, 3).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="text-gray-700 dark:text-gray-300 truncate">{p.numero}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.cliente?.nombre ?? ''}</p>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatearMonto(p.total, p.moneda ?? 'PEN')}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
