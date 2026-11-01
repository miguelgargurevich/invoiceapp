'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SkeletonFormPage } from '@/components/common';
import { ComprobanteForm } from '@/components/sunat/ComprobanteForm';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { formularioDesdeComprobante, type FormularioComprobante } from '@/lib/sunat/formulario';
import type { Comprobante } from '@/lib/sunat/tipos';

export default function EditarComprobantePage({ params: { locale, id } }: { params: { locale: string; id: string } }) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError } = useToast();
  const [inicial, setInicial] = useState<FormularioComprobante | null>(null);
  const [afectado, setAfectado] = useState<Comprobante | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await sunatApi.obtener(id);
        if (c.estadoSunat !== 'BORRADOR') {
          router.replace(`/${locale}/comprobantes/${id}`);
          return;
        }
        if (c.docRelacionadoId) setAfectado(await sunatApi.obtener(c.docRelacionadoId));
        setInicial(formularioDesdeComprobante(c));
      } catch (error) {
        showError(normalizarError(error, t('errores.noDisponible')).mensaje);
      }
    })();
  }, [id, locale, router, showError, t]);

  if (!inicial) return <SkeletonFormPage />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('editar')}</h1>
      <ComprobanteForm locale={locale} inicial={inicial} comprobanteId={id} documentoAfectado={afectado} />
    </div>
  );
}
