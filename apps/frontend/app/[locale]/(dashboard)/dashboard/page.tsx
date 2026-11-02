'use client';

import { useAuth } from '@/contexts/AuthContext';
import { DashboardGeneral } from '@/components/dashboard/DashboardGeneral';
import { DashboardPeru } from '@/components/dashboard/DashboardPeru';

// Empresas de Perú: emisión de comprobantes SUNAT. El resto: la versión sencilla de facturas.
export default function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const { empresa } = useAuth();

  // Sin empresa cargada todavía no se sabe qué versión mostrar: no se pinta nada (evita un parpadeo).
  if (!empresa) return null;

  if (empresa.pais === 'PE') {
    return <DashboardPeru locale={locale} />;
  }

  return <DashboardGeneral locale={locale} />;
}
