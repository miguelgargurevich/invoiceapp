'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Receipt, RefreshCw } from 'lucide-react';
import { Button, ErrorState, PageHeader, SkeletonFormPage } from '@/components/common';
import { ComprobanteForm } from '@/components/sunat/ComprobanteForm';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { formularioInicial, formularioParaNota, type FormularioComprobante } from '@/lib/sunat/formulario';
import type { Comprobante } from '@/lib/sunat/tipos';

function NuevoComprobante({ locale }: { locale: string }) {
  const t = useTranslations('sunat');
  const parametros = useSearchParams();
  const tipo = parametros.get('tipo') ?? '01';
  const afecta = parametros.get('afecta');
  const motivo = parametros.get('motivo') ?? '';
  const [inicial, setInicial] = useState<FormularioComprobante | null>(afecta ? null : formularioInicial(tipo === '03' ? '03' : '01'));
  const [afectado, setAfectado] = useState<Comprobante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!afecta) return undefined;
    let cancelado = false;
    setError(null);
    sunatApi.obtener(afecta)
      .then((c) => {
        if (cancelado) return;
        setAfectado(c);
        setInicial(formularioParaNota(c, tipo === '08' ? '08' : '07', motivo));
      })
      .catch((e) => {
        if (!cancelado) setError(normalizarError(e, t('errores.noDisponible')).mensaje);
      });
    return () => { cancelado = true; };
  }, [afecta, tipo, motivo, intento, t]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={afecta ? t('nuevaNota') : t('nuevo')}
          subtitle={afecta ? t('notaSubtitulo') : t('nuevoSubtitulo')}
          icon={Receipt}
          backHref={`/${locale}/comprobantes`}
        />
        <ErrorState
          title={t('cargaError')}
          description={error}
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => setIntento((n) => n + 1)}>
                {t('reintentar')}
              </Button>
              <Button variant="outline" href={`/${locale}/comprobantes`}>{t('volver')}</Button>
            </div>
          )}
        />
      </div>
    );
  }
  if (!inicial) return <SkeletonFormPage />;
  return (
    <div className="space-y-6">
      <PageHeader
        title={afecta ? t('nuevaNota') : t('nuevo')}
        subtitle={afecta ? t('notaSubtitulo') : t('nuevoSubtitulo')}
        icon={Receipt}
        backHref={`/${locale}/comprobantes`}
      />
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
