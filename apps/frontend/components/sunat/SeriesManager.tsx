'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Button, Card, Input, Select } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import { validarSerie } from '@/lib/sunat/formulario';
import type { Serie, TipoComprobante } from '@/lib/sunat/tipos';

export function SeriesManager() {
  const t = useTranslations('sunat');
  const { showError, showSuccess } = useToast();
  const [series, setSeries] = useState<Serie[]>([]);
  const [tipo, setTipo] = useState<TipoComprobante>('01');
  const [serie, setSerie] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () => sunatApi.series().then(setSeries).catch(() => setSeries([]));
  useEffect(() => { cargar(); }, []);

  const letras = serie ? validarSerie(tipo, serie) : null;

  const crear = async () => {
    setGuardando(true);
    try {
      await sunatApi.crearSerie({ tipoComprobante: tipo, serie: serie.trim().toUpperCase() });
      showSuccess(t('series.creada'));
      setSerie('');
      await cargar();
    } catch (error) {
      showError(normalizarError(error, t('errores.noDisponible')).mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('series.titulo')}</h3>
      {series.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('series.vacio')}</p>
      ) : (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="py-2 pr-4">{t('series.tipo')}</th>
              <th className="py-2 pr-4">{t('series.serie')}</th>
              <th className="py-2">{t('series.ultimoNumero')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {series.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-4">{t(`tipos.${s.tipoDocumento}`)}</td>
                <td className="py-2 pr-4 font-mono">{s.serie}</td>
                <td className="py-2">{s.ultimoNumero}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label={t('series.tipo')}
          options={(['01', '03', '07', '08'] as const).map((x) => ({ value: x, label: t(`tipos.${x}`) }))}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoComprobante)}
        />
        <Input
          label={t('series.serie')}
          value={serie}
          maxLength={4}
          onChange={(e) => setSerie(e.target.value.toUpperCase())}
          error={letras ? t('series.letraInvalida', { letras }) : undefined}
        />
        <Button icon={<Plus className="w-4 h-4" />} loading={guardando} disabled={!serie || Boolean(letras)} onClick={crear}>
          {t('series.agregar')}
        </Button>
      </div>
    </Card>
  );
}
