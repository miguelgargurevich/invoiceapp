'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/common';
import { fechaCorta } from '@/lib/sunat/formato';
import type { EnvioSunat } from '@/lib/sunat/tipos';

export function HistorialEnvios({ envios }: { envios: EnvioSunat[] }) {
  const t = useTranslations('sunat.detalle');
  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('historial')}</h2>
      {envios.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('sinEnvios')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-2 pr-4">{t('fecha')}</th>
                <th className="py-2 pr-4">{t('operacion')}</th>
                <th className="py-2 pr-4">{t('codigo')}</th>
                <th className="py-2">{t('mensaje')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {envios.map((e) => (
                <tr key={e.id} className={e.exito ? '' : 'text-amber-700 dark:text-amber-400'}>
                  <td className="py-2 pr-4 whitespace-nowrap">{fechaCorta(e.createdAt)}</td>
                  <td className="py-2 pr-4">{e.operacion}</td>
                  <td className="py-2 pr-4">{e.codigo ?? '—'}</td>
                  <td className="py-2">{e.mensaje ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
