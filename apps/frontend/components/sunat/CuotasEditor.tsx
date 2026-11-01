'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { diferenciaCuotas, nuevaClave, repartirCuotas, sumarMeses, type CuotaFormulario } from '@/lib/sunat/formulario';
import { formatearMonto } from '@/lib/sunat/formato';

interface Props {
  cuotas: CuotaFormulario[];
  onChange: (cuotas: CuotaFormulario[]) => void;
  neto: string | null;
  moneda: string;
}

const hoy = () => new Date().toISOString().slice(0, 10);

export function CuotasEditor({ cuotas, onChange, neto, moneda }: Props) {
  const t = useTranslations('sunat.form');
  const [numero, setNumero] = useState('1');
  const [primera, setPrimera] = useState(() => sumarMeses(hoy(), 1));
  const cambiar = (clave: string, cambios: Partial<CuotaFormulario>) =>
    onChange(cuotas.map((c) => (c.clave === clave ? { ...c, ...cambios } : c)));
  const diferencia = neto ? diferenciaCuotas(cuotas, neto) : null;
  const n = Math.max(1, Math.min(36, Number.parseInt(numero, 10) || 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input label={t('numeroCuotas')} type="number" min={1} max={36} value={numero} onChange={(e) => setNumero(e.target.value)} className="w-28" />
        <Input label={t('primeraFecha')} type="date" value={primera} onChange={(e) => setPrimera(e.target.value)} />
        <Button variant="outline" disabled={!neto} onClick={() => neto && onChange(repartirCuotas(neto, n, primera))}>{t('repartir')}</Button>
      </div>
      {cuotas.map((c, i) => (
        <div key={c.clave} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-3">
          <span className="pb-3 text-sm text-gray-500">{i + 1}</span>
          <Input label={t('monto')} inputMode="decimal" value={c.monto} onChange={(e) => cambiar(c.clave, { monto: e.target.value })} />
          <Input label={t('vencimiento')} type="date" value={c.fechaVencimiento} onChange={(e) => cambiar(c.clave, { fechaVencimiento: e.target.value })} />
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => onChange(cuotas.filter((x) => x.clave !== c.clave))}>
            {''}
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => onChange([...cuotas, { clave: nuevaClave(), monto: '', fechaVencimiento: primera }])}
      >
        {t('agregarCuota')}
      </Button>
      {diferencia === null ? (
        <p className="text-xs text-gray-500">{t('esperaTotales')}</p>
      ) : diferencia !== '0.00' && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {diferencia.startsWith('-')
            ? t('sobraCuotas', { monto: formatearMonto(diferencia.slice(1), moneda) })
            : t('faltaCuotas', { monto: formatearMonto(diferencia, moneda) })}
        </p>
      )}
    </div>
  );
}
