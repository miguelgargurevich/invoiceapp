'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, Plus } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '@/components/common';
import { EstadoSunatBadge } from '@/components/sunat/EstadoSunatBadge';
import { fechaCorta, formatearMonto, numeroComprobante } from '@/lib/sunat/formato';
import type { Comprobante } from '@/lib/sunat/tipos';

const FILAS = 6;

interface Props {
  locale: string;
  cargando: boolean;
  comprobantes: Comprobante[] | null;
}

export function UltimosComprobantes({ locale, cargando, comprobantes }: Props) {
  const t = useTranslations('dashboard');
  const ts = useTranslations('sunat');
  const router = useRouter();

  const cabecera = (
    <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
      <h2 className="!text-base font-semibold text-gray-900 dark:text-gray-100">{t('ultimosTitulo')}</h2>
      <Link href={`/${locale}/comprobantes`} className="text-sm text-primary-700 dark:text-primary-300 hover:underline">
        {t('verTodos')}
      </Link>
    </div>
  );

  if (cargando) {
    return (
      <Card padding="none">
        {cabecera}
        <div className="p-4 md:p-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (comprobantes === null) {
    return (
      <Card padding="none">
        {cabecera}
        <p className="p-4 md:p-6 text-sm text-gray-500 dark:text-gray-400">{t('errorCarga')}</p>
      </Card>
    );
  }

  if (comprobantes.length === 0) {
    return (
      <Card padding="none">
        {cabecera}
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title={t('ultimosVacio')}
          action={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/comprobantes/nuevo`)}>
              {t('ultimosVacioAccion')}
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card padding="none">
      {cabecera}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 md:px-6 py-2.5 font-medium">{ts('columnas.numero')}</th>
              <th className="px-4 py-2.5 font-medium">{ts('columnas.cliente')}</th>
              <th className="px-4 py-2.5 font-medium whitespace-nowrap">{ts('columnas.fecha')}</th>
              <th className="px-4 py-2.5 font-medium text-right whitespace-nowrap">{ts('columnas.total')}</th>
              <th className="px-4 md:px-6 py-2.5 font-medium">{ts('columnas.estado')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {comprobantes.slice(0, FILAS).map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                  <Link href={`/${locale}/comprobantes/${c.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:underline">
                    {numeroComprobante(c) ?? ts('borrador')}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[12rem] truncate">{c.cliente?.razonSocial ?? ''}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fechaCorta(c.fechaEmision)}</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatearMonto(c.total, c.moneda)}</td>
                <td className="px-4 md:px-6 py-3">
                  <EstadoSunatBadge estado={c.estadoSunat} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
