'use client';

import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select } from '@/components/common';
import { codigoUnidad, lineaVacia, type LineaFormulario } from '@/lib/sunat/formulario';
import type { Afectacion, OpcionCatalogo, ProductoResumen } from '@/lib/sunat/tipos';

interface Props {
  lineas: LineaFormulario[];
  onChange: (lineas: LineaFormulario[]) => void;
  productos: ProductoResumen[];
  unidades: OpcionCatalogo[];
  afectaciones: OpcionCatalogo[];
  exportacion: boolean;
}

export function LineasEditor({ lineas, onChange, productos, unidades, afectaciones, exportacion }: Props) {
  const t = useTranslations('sunat.form');
  const cambiar = (clave: string, cambios: Partial<LineaFormulario>) =>
    onChange(lineas.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));

  const elegirProducto = (clave: string, productoId: string) => {
    const p = productos.find((x) => x.id === productoId);
    if (!p) {
      cambiar(clave, { productoId: '' });
      return;
    }
    cambiar(clave, {
      productoId: p.id,
      codigoProducto: p.codigo ?? '',
      descripcion: p.nombre,
      precio: String(p.precioUnitario),
      precioIncluyeIgv: p.precioConIgv,
      unidad: codigoUnidad(p.unidadMedida),
    });
  };

  const opcionesProductos = [{ value: '', label: t('sinProducto') }, ...productos.map((p) => ({ value: p.id, label: p.nombre }))];
  const opcionesUnidades = unidades.map((u) => ({ value: u.codigo, label: `${u.codigo} · ${u.descripcion}` }));
  const opcionesAfectacion = afectaciones
    .filter((a) => (exportacion ? a.codigo === '40' : a.codigo !== '40'))
    .map((a) => ({ value: a.codigo, label: a.descripcion }));

  return (
    <div className="space-y-4">
      {lineas.map((l, i) => (
        <div key={l.clave} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('linea', { n: i + 1 })}</span>
            {lineas.length > 1 && (
              <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => onChange(lineas.filter((x) => x.clave !== l.clave))}>
                {t('quitar')}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select label={t('producto')} options={opcionesProductos} value={l.productoId} onChange={(e) => elegirProducto(l.clave, e.target.value)} />
            <div className="md:col-span-2">
              <Input label={t('descripcion')} value={l.descripcion} onChange={(e) => cambiar(l.clave, { descripcion: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Input label={t('cantidad')} inputMode="decimal" value={l.cantidad} onChange={(e) => cambiar(l.clave, { cantidad: e.target.value })} />
            <Select label={t('unidad')} options={opcionesUnidades} value={l.unidad} onChange={(e) => cambiar(l.clave, { unidad: e.target.value })} />
            <Input label={t('precio')} inputMode="decimal" value={l.precio} onChange={(e) => cambiar(l.clave, { precio: e.target.value })} />
            <Input label={t('descuento')} inputMode="decimal" value={l.descuento} onChange={(e) => cambiar(l.clave, { descuento: e.target.value })} />
            <Select
              label={t('afectacion')}
              options={opcionesAfectacion}
              value={exportacion ? '40' : l.afectacion}
              disabled={exportacion}
              onChange={(e) => cambiar(l.clave, { afectacion: e.target.value as Afectacion })}
            />
            <Input label={t('bolsas')} inputMode="numeric" value={l.bolsasIcbper} onChange={(e) => cambiar(l.clave, { bolsasIcbper: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={l.precioIncluyeIgv} onChange={(e) => cambiar(l.clave, { precioIncluyeIgv: e.target.checked })} />
            {t('incluyeIgv')}
          </label>
        </div>
      ))}
      <Button
        variant="outline"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => onChange([...lineas, { ...lineaVacia(), afectacion: exportacion ? '40' : '10' }])}
      >
        {t('agregarLinea')}
      </Button>
    </div>
  );
}
