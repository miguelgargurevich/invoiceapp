'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Receipt } from 'lucide-react';
import { Button, Card, EmptyState, LoadingSpinner, PageHeader, SkeletonDetailPage } from '@/components/common';
import { AccionesComprobante } from '@/components/sunat/AccionesComprobante';
import { EstadoSunatBadge } from '@/components/sunat/EstadoSunatBadge';
import { HistorialEnvios } from '@/components/sunat/HistorialEnvios';
import { PanelTotales } from '@/components/sunat/PanelTotales';
import { useAuth } from '@/contexts/AuthContext';
import { sunatApi } from '@/lib/sunat/api';
import { estaEnProceso } from '@/lib/sunat/estados';
import { normalizarError } from '@/lib/sunat/errores';
import { fechaCorta, filasDesdeComprobante, formatearMonto, numeroComprobante } from '@/lib/sunat/formato';
import type { Comprobante } from '@/lib/sunat/tipos';

const MAXIMO_REFRESCOS = 24; // 24 × 5 s = 2 min

export default function DetalleComprobantePage({ params: { locale, id } }: { params: { locale: string; id: string } }) {
  const t = useTranslations('sunat');
  const { empresa } = useAuth();
  const [c, setC] = useState<Comprobante | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescos, setRefrescos] = useState(0);

  const cargar = useCallback(async () => {
    try {
      setC(await sunatApi.obtener(id));
      setError(null);
    } catch (e) {
      setError(normalizarError(e, t('errores.noDisponible')).mensaje);
    }
  }, [id, t]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!c || !estaEnProceso(c.estadoSunat) || refrescos >= MAXIMO_REFRESCOS) return undefined;
    const temporizador = setTimeout(() => { setRefrescos((n) => n + 1); cargar(); }, 5000);
    return () => clearTimeout(temporizador);
  }, [c, refrescos, cargar]);

  if (error && !c) return <EmptyState title={t('detalle.noEncontrado')} description={error} />;
  if (!c) return <SkeletonDetailPage />;

  const enProceso = estaEnProceso(c.estadoSunat);
  const afectado = c.docRelacionadoSerie ? `${c.docRelacionadoSerie}-${c.docRelacionadoNumero}` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={numeroComprobante(c) ?? t('borrador')}
        subtitle={`${t(`tipos.${c.tipoComprobante}`)} · ${c.cliente?.razonSocial ?? ''} · ${fechaCorta(c.fechaEmision)}`}
        icon={Receipt}
        backHref={`/${locale}/comprobantes`}
        badge={<EstadoSunatBadge estado={c.estadoSunat} />}
      />

      {enProceso && (
        <Card className="border-blue-300 dark:border-blue-700">
          <div className="flex items-center justify-between gap-4 text-sm text-blue-800 dark:text-blue-300">
            <span className="flex items-center gap-2">
              {refrescos < MAXIMO_REFRESCOS && <LoadingSpinner size="sm" />}{t('detalle.enProceso')}
            </span>
            {refrescos >= MAXIMO_REFRESCOS && (
              <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => { setRefrescos(0); cargar(); }}>
                {t('detalle.actualizar')}
              </Button>
            )}
          </div>
        </Card>
      )}

      {c.mensajeRespuestaSunat && (
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('detalle.mensajeSunat')}</p>
          <p className="text-gray-900 dark:text-gray-100">{c.mensajeRespuestaSunat}</p>
        </Card>
      )}

      <AccionesComprobante comprobante={c} locale={locale} ruc={empresa?.ruc ?? ''} onCambio={() => { setRefrescos(0); cargar(); }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          {afectado && (
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              <p>{t('detalle.modifica', { documento: afectado })}</p>
              {c.motivoDescripcion && <p>{t('detalle.motivo', { motivo: c.motivoDescripcion })}</p>}
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('detalle.lineas')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-2 pr-4">{t('form.cantidad')}</th>
                  <th className="py-2 pr-4">{t('form.descripcion')}</th>
                  <th className="py-2 pr-4 text-right">{t('form.precio')}</th>
                  <th className="py-2 text-right">{t('columnas.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[...c.detalles].sort((a, b) => a.orden - b.orden).map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">{Number(d.cantidad)} {d.codigoUnidadSunat}</td>
                    <td className="py-2 pr-4">{d.descripcion}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatearMonto(d.precioUnitario, c.moneda)}</td>
                    <td className="py-2 text-right tabular-nums">{formatearMonto(d.total, c.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <PanelTotales filas={filasDesdeComprobante(c)} total={c.total} montoEnLetras={c.montoEnLetras} moneda={c.moneda} />
      </div>

      <HistorialEnvios envios={c.envios ?? []} />
    </div>
  );
}
