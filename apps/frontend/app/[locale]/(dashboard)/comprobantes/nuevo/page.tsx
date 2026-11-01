'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SkeletonFormPage } from '@/components/common';
import { ComprobanteForm } from '@/components/sunat/ComprobanteForm';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { formularioInicial, formularioParaNota, type FormularioComprobante } from '@/lib/sunat/formulario';
import type { Comprobante } from '@/lib/sunat/tipos';

function NuevoComprobante({ locale }: { locale: string }) {
  const t = useTranslations('sunat');
  const { showError } = useToast();
  const parametros = useSearchParams();
  const tipo = parametros.get('tipo') ?? '01';
  const afecta = parametros.get('afecta');
  const motivo = parametros.get('motivo') ?? '';
  const [inicial, setInicial] = useState<FormularioComprobante | null>(afecta ? null : formularioInicial(tipo === '03' ? '03' : '01'));
  const [afectado, setAfectado] = useState<Comprobante | null>(null);

  useEffect(() => {
    if (!afecta) return;
    sunatApi.obtener(afecta)
      .then((c) => { setAfectado(c); setInicial(formularioParaNota(c, tipo === '08' ? '08' : '07', motivo)); })
      .catch((error) => showError(normalizarError(error, t('errores.noDisponible')).mensaje));
  }, [afecta, tipo, motivo, showError, t]);

  if (!inicial) return <SkeletonFormPage />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{afecta ? t('nuevaNota') : t('nuevo')}</h1>
      <ComprobanteForm locale={locale} inicial={inicial} documentoAfectado={afectado} />
    </div>
  );
}

export default function NuevoComprobantePage({ params: { locale } }: { params: { locale: string } }) {
  return (
    <Suspense fallback={<SkeletonFormPage />}>
      <NuevoComprobante locale={locale} />
    </Suspense>
  );
}
