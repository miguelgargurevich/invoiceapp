'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FileText, Plus } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, Select, type Column } from '@/components/common';
import { EstadoSunatBadge } from '@/components/sunat/EstadoSunatBadge';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { ESTADOS_SUNAT, etiquetaEstado } from '@/lib/sunat/estados';
import { normalizarError } from '@/lib/sunat/errores';
import { fechaCorta, formatearMonto, numeroComprobante } from '@/lib/sunat/formato';
import type { Comprobante } from '@/lib/sunat/tipos';

export default function ComprobantesPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError } = useToast();
  const [items, setItems] = useState<Comprobante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    setCargando(true);
    sunatApi.listar({ tipoComprobante: tipo, estadoSunat: estado })
      .then(setItems)
      .catch((error) => showError(normalizarError(error, t('errores.noDisponible')).mensaje))
      .finally(() => setCargando(false));
  }, [tipo, estado, showError, t]);

  const columnas: Column<Comprobante>[] = [
    { key: 'numero', header: t('columnas.numero'), render: (c) => numeroComprobante(c) ?? t('borrador') },
    { key: 'tipo', header: t('columnas.tipo'), render: (c) => t(`tipos.${c.tipoComprobante}`) },
    { key: 'cliente', header: t('columnas.cliente'), render: (c) => c.cliente?.razonSocial ?? '' },
    { key: 'fecha', header: t('columnas.fecha'), render: (c) => fechaCorta(c.fechaEmision) },
    { key: 'total', header: t('columnas.total'), render: (c) => formatearMonto(c.total, c.moneda) },
    { key: 'estado', header: t('columnas.estado'), render: (c) => <EstadoSunatBadge estado={c.estadoSunat} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('titulo')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitulo')}</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => router.push(`/${locale}/comprobantes/nuevo`)}>{t('nuevo')}</Button>
      </div>
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Select
            options={[{ value: '', label: t('filtros.todosTipos') }, ...(['01', '03', '07', '08'] as const).map((x) => ({ value: x, label: t(`tipos.${x}`) }))]}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
          <Select
            options={[{ value: '', label: t('filtros.todosEstados') }, ...ESTADOS_SUNAT.map((x) => ({ value: x, label: t(etiquetaEstado(x)) }))]}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          />
        </div>
        <DataTable
          data={items}
          columns={columnas}
          keyExtractor={(c) => c.id}
          isLoading={cargando}
          onRowClick={(c) => router.push(`/${locale}/comprobantes/${c.id}`)}
          emptyState={<EmptyState icon={<FileText className="w-6 h-6" />} title={t('vacio')} description={t('vacioDescripcion')} />}
        />
      </Card>
    </div>
  );
}
