'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FilePlus2, Plus, Receipt, UserPlus, FileText } from 'lucide-react';
import { AlertasSunat } from '@/components/sunat/AlertasSunat';
import { Button, Card } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { calcularCupo, calcularIndicadores, fechaLarga, type Cupo, type Indicadores } from '@/lib/dashboard';
import { getUsage } from '@/lib/subscriptions';
import api from '@/lib/api';
import { sunatApi } from '@/lib/sunat/api';
import type { Comprobante } from '@/lib/sunat/tipos';
import { IndicadoresPeru } from './IndicadoresPeru';
import { ProformasRecientes, type ProformaResumen } from './ProformasRecientes';
import { UltimosComprobantes } from './UltimosComprobantes';

interface Datos {
  ahora: Date;
  // null = la lista no cargó; el resto de bloques sigue.
  comprobantes: Comprobante[] | null;
  // null = no se sabe si está configurado (falló la llamada).
  emisorConfigurado: boolean | null;
  // null = sin límite; undefined = no se pudo leer el plan.
  limite: number | null | undefined;
  proformas: ProformaResumen[] | null;
}

// /api/proformas responde con array o con la lista dentro de `data` / `proformas`.
function normalizarProformas(respuesta: unknown): ProformaResumen[] {
  if (Array.isArray(respuesta)) return respuesta as ProformaResumen[];
  const r = respuesta as { data?: unknown; proformas?: unknown } | null;
  if (Array.isArray(r?.data)) return r.data as ProformaResumen[];
  if (Array.isArray(r?.proformas)) return r.proformas as ProformaResumen[];
  return [];
}

// Versión para empresas de Perú: comprobantes SUNAT en primer plano; las proformas, secundarias.
export function DashboardPeru({ locale }: { locale: string }) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { empresa } = useAuth();
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.allSettled([
      sunatApi.listar(),
      sunatApi.emisor(),
      getUsage(),
      api.get<unknown>('/proformas?limit=3'),
    ]).then(([comprobantes, emisor, uso, proformas]) => {
      if (!vivo) return;
      setDatos({
        ahora: new Date(),
        comprobantes: comprobantes.status === 'fulfilled' ? comprobantes.value : null,
        emisorConfigurado: emisor.status === 'fulfilled' ? emisor.value.configurado : null,
        limite: uso.status === 'fulfilled' ? (uso.value.limits?.maxInvoices ?? null) : undefined,
        proformas: proformas.status === 'fulfilled' ? normalizarProformas(proformas.value) : null,
      });
    });
    return () => {
      vivo = false;
    };
  }, []);

  const cargando = datos === null;
  const indicadores: Indicadores | null = datos?.comprobantes ? calcularIndicadores(datos.comprobantes, datos.ahora) : null;
  const cupo: Cupo | null = datos && indicadores ? calcularCupo(indicadores.emitidosMes, datos.limite) : null;

  return (
    <div className="space-y-6">
      {/* Encabezado: saludo, fecha y los accesos secundarios */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {/* La fecha solo después de cargar: así el servidor y el cliente pintan lo mismo. */}
          {datos && <p className="text-sm text-gray-500 dark:text-gray-400">{fechaLarga(datos.ahora)}</p>}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 truncate">
            {empresa?.nombre ? t('hola', { nombre: empresa.nombre }) : t('title')}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={<FilePlus2 className="w-4 h-4" />} onClick={() => router.push(`/${locale}/proformas/nueva`)}>
            {t('nuevaProforma')}
          </Button>
          <Button variant="outline" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/clientes/nuevo`)}>
            {t('nuevoCliente')}
          </Button>
        </div>
      </div>

      {/* Sin emisor no se puede emitir: el aviso va antes que nada */}
      {datos?.emisorConfigurado === false && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">{t('emisorTitulo')}</p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">{t('emisorDescripcion')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/configuracion?tab=sunat`)}>
              {t('emisorBoton')}
            </Button>
          </div>
        </Card>
      )}

      <AlertasSunat locale={locale} />

      {/* Acción principal: la única en berenjena */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{t('emitirTitulo')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('emitirDescripcion')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/comprobantes/nuevo`)}>
              {t('emitirBoton')}
            </Button>
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />} onClick={() => router.push(`/${locale}/comprobantes/nuevo?tipo=01`)}>
              {t('accesoFactura')}
            </Button>
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />} onClick={() => router.push(`/${locale}/comprobantes/nuevo?tipo=03`)}>
              {t('accesoBoleta')}
            </Button>
          </div>
        </div>
      </Card>

      <IndicadoresPeru locale={locale} cargando={cargando} indicadores={indicadores} cupo={cupo} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0">
          <UltimosComprobantes locale={locale} cargando={cargando} comprobantes={datos?.comprobantes ?? null} />
        </div>
        <div className="min-w-0">
          <ProformasRecientes locale={locale} cargando={cargando} proformas={datos?.proformas ?? null} />
        </div>
      </div>
    </div>
  );
}
