'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, FilePlus2, Plus, UserPlus } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { getInvoiceStatusInfo, type InvoiceDocument } from '@/lib/hooks/useDocumentStatus';
import api from '@/lib/api';

// Forma mínima de /dashboard/ultimas-facturas.
interface FacturaReciente {
  id: string;
  numero: string;
  cliente: { nombre: string };
  total: number;
  estado: string;
  fechaEmision: string;
  saldoPendiente?: number;
  signatureStatus?: InvoiceDocument['signatureStatus'];
}

// Versión sencilla para empresas que no son de Perú: las facturas de siempre, sin tarjetas grandes.
export function DashboardGeneral({ locale }: { locale: string }) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  const [cargando, setCargando] = useState(true);
  // null tras cargar = no se pudo leer la lista.
  const [facturas, setFacturas] = useState<FacturaReciente[] | null>(null);

  useEffect(() => {
    let vivo = true;
    api
      .get<FacturaReciente[]>('/dashboard/ultimas-facturas')
      .then((lista) => {
        if (vivo) setFacturas(Array.isArray(lista) ? lista.slice(0, 8) : []);
      })
      .catch(() => {
        if (vivo) setFacturas(null);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const etiquetas = {
    statusPending: t('statusPending'),
    statusSent: t('statusIssued'),
    statusSigned: t('statusSigned'),
    statusInvoiced: t('statusInvoiced'),
    statusPaid: t('statusPaid'),
    statusOverdue: t('statusOverdue'),
    statusCancelled: t('statusCancelled'),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 min-w-0 truncate">
          {empresa?.nombre ? t('hola', { nombre: empresa.nombre }) : t('title')}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/facturas/nueva`)}>
            {t('nuevaFactura')}
          </Button>
          <Button variant="outline" size="sm" icon={<FilePlus2 className="w-4 h-4" />} onClick={() => router.push(`/${locale}/proformas/nueva`)}>
            {t('nuevaProforma')}
          </Button>
          <Button variant="outline" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/clientes/nuevo`)}>
            {t('nuevoCliente')}
          </Button>
        </div>
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('recentInvoices')}</h2>
          <Link href={`/${locale}/facturas`} className="text-sm text-primary-700 dark:text-primary-300 hover:underline">
            {t('viewAll')}
          </Link>
        </div>

        {cargando && (
          <div className="p-4 md:p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {!cargando && facturas === null && (
          <p className="p-4 md:p-6 text-sm text-gray-500 dark:text-gray-400">{t('errorCarga')}</p>
        )}

        {!cargando && facturas !== null && facturas.length === 0 && (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={t('sinFacturas')}
            action={
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/facturas/nueva`)}>
                {t('nuevaFactura')}
              </Button>
            }
          />
        )}

        {!cargando && facturas !== null && facturas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 md:px-6 py-2.5 font-medium">{t('invoiceNumber')}</th>
                  <th className="px-4 py-2.5 font-medium">{t('client')}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t('amount')}</th>
                  <th className="px-4 md:px-6 py-2.5 font-medium">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {facturas.map((f) => {
                  const doc: InvoiceDocument = {
                    id: f.id,
                    estado: f.estado,
                    fechaEmision: f.fechaEmision,
                    saldoPendiente: Number(f.saldoPendiente ?? 0),
                    signatureStatus: f.signatureStatus ?? null,
                  };
                  const etiqueta = getInvoiceStatusInfo(doc, etiquetas);
                  return (
                    <tr
                      key={f.id}
                      onClick={() => router.push(`/${locale}/facturas/${f.id}`)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className="px-4 md:px-6 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">{f.numero}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[12rem] truncate">{f.cliente?.nombre ?? ''}</td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(f.total)}</td>
                      <td className="px-4 md:px-6 py-3">
                        <Badge variant={etiqueta.variant}>{etiqueta.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
