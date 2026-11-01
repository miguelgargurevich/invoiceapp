'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/common';
import { colorEstado, etiquetaEstado } from '@/lib/sunat/estados';
import type { EstadoSunat } from '@/lib/sunat/tipos';

export function EstadoSunatBadge({ estado }: { estado: EstadoSunat }) {
  const t = useTranslations('sunat');
  return <Badge variant={colorEstado(estado)}>{t(etiquetaEstado(estado))}</Badge>;
}
