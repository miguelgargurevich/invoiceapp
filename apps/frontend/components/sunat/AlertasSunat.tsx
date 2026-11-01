'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/common';
import { sunatApi } from '@/lib/sunat/api';
import { fechaCorta, numeroComprobante } from '@/lib/sunat/formato';
import type { AlertasSunat as Alertas } from '@/lib/sunat/tipos';

export function AlertasSunat({ locale }: { locale: string }) {
  const t = useTranslations('sunat.alertas');
  const [alertas, setAlertas] = useState<Alertas | null>(null);

  useEffect(() => {
    sunatApi.alertas().then(setAlertas).catch(() => setAlertas(null));
  }, []);

  if (!alertas) return null;
  const { certificadoPorVencer, comprobantesPendientes, ticketsAtascados } = alertas;
  if (!certificadoPorVencer && comprobantesPendientes.length === 0 && ticketsAtascados.length === 0) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">{t('titulo')}</p>
          {certificadoPorVencer && <p>{t('certificado', { fecha: fechaCorta(certificadoPorVencer.vence) })}</p>}
          {comprobantesPendientes.map((c) => (
            <p key={c.id}>
              <Link href={`/${locale}/comprobantes/${c.id}`} className="underline">
                {t('pendiente', { numero: numeroComprobante(c) ?? c.serie, dias: c.diasRestantes })}
              </Link>
            </p>
          ))}
          {ticketsAtascados.length > 0 && <p>{t('tickets', { n: ticketsAtascados.length })}</p>}
        </div>
      </div>
    </Card>
  );
}
