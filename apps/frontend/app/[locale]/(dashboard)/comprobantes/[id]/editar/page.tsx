'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw, Receipt } from 'lucide-react';
import { Button, ErrorState, PageHeader, SkeletonFormPage } from '@/components/common';
import { ComprobanteForm } from '@/components/sunat/ComprobanteForm';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { formularioDesdeComprobante, type FormularioComprobante } from '@/lib/sunat/formulario';
import type { Comprobante } from '@/lib/sunat/tipos';

export default function EditarComprobantePage({ params: { locale, id } }: { params: { locale: string; id: string } }) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const [inicial, setInicial] = useState<FormularioComprobante | null>(null);
  const [afectado, setAfectado] = useState<Comprobante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setError(null);
    (async () => {
      try {
        const c = await sunatApi.obtener(id);
        if (cancelado) return;
        if (c.estadoSunat !== 'BORRADOR') {
          router.replace(`/${locale}/comprobantes/${id}`);
          return;
        }
        if (c.docRelacionadoId) setAfectado(await sunatApi.obtener(c.docRelacionadoId));
        setInicial(formularioDesdeComprobante(c));
      } catch (error) {
        if (!cancelado) setError(normalizarError(error, t('errores.noDisponible')).mensaje);
      }
    })();
    return () => { cancelado = true; };
  }, [id, locale, router, intento, t]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('editar')}
          subtitle={t('editarSubtitulo')}
          icon={Receipt}
          backHref={`/${locale}/comprobantes/${id}`}
        />
        <ErrorState
          title={t('cargaError')}
          description={error}
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => setIntento((n) => n + 1)}>
                {t('reintentar')}
              </Button>
              <Button variant="outline" href={`/${locale}/comprobantes/${id}`}>{t('volver')}</Button>
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
        title={t('editar')}
        subtitle={t('editarSubtitulo')}
        icon={Receipt}
        backHref={`/${locale}/comprobantes/${id}`}
      />
      <ComprobanteForm locale={locale} inicial={inicial} comprobanteId={id} documentoAfectado={afectado} />
    </div>
  );
}
