import type { TipoComprobante } from './tipos';

export interface FilaTotal {
  clave: string;
  monto: string;
}

const esCero = (valor: unknown): boolean => {
  const n = Number(valor ?? 0);
  return !Number.isFinite(n) || n === 0;
};

export function formatearMonto(valor: string | number | null | undefined, moneda = 'PEN'): string {
  const n = Number(valor ?? 0);
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda, minimumFractionDigits: 2 })
    .format(Number.isFinite(n) ? n : 0);
}

export function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(iso));
}

export function numeroComprobante(c: { serie: string; numero: number | null }): string | null {
  return c.numero == null ? null : `${c.serie}-${c.numero}`;
}

export function nombreArchivo(
  ruc: string,
  c: { tipoComprobante: TipoComprobante; serie: string; numero: number | null },
  tipo: 'pdf' | 'xml' | 'cdr',
): string {
  return `${ruc}-${c.tipoComprobante}-${c.serie}-${c.numero}.${tipo === 'cdr' ? 'cdr.zip' : tipo}`;
}

function filas(pares: [string, unknown][]): FilaTotal[] {
  return pares.filter(([, monto]) => !esCero(monto)).map(([clave, monto]) => ({ clave, monto: String(monto) }));
}

export function filasDesdeVista(v: {
  totales: { gravadas: string; exoneradas: string; inafectas: string; exportacion: string; igv: string; icbper: string };
  detraccion: { monto: string } | null;
  percepcion: { monto: string } | null;
  retencion: { monto: string } | null;
  netoPendiente: string;
}): FilaTotal[] {
  const t = v.totales;
  const conNeto = Boolean(v.detraccion || v.retencion);
  return filas([
    ['gravadas', t.gravadas], ['exoneradas', t.exoneradas], ['inafectas', t.inafectas], ['exportacion', t.exportacion],
    ['igv', t.igv], ['icbper', t.icbper], ['detraccion', v.detraccion?.monto], ['percepcion', v.percepcion?.monto],
    ['retencion', v.retencion?.monto], ['neto', conNeto ? v.netoPendiente : null],
  ]);
}

export function filasDesdeComprobante(c: {
  totalGravadas: string; totalExoneradas: string; totalInafectas: string; totalExportacion: string; igv: string;
  totalIcbper: string; detraccionMonto: string | null; percepcionMonto: string | null; retencionMonto: string | null;
  netoPendiente: string | null;
}): FilaTotal[] {
  const conNeto = !esCero(c.detraccionMonto) || !esCero(c.retencionMonto);
  return filas([
    ['gravadas', c.totalGravadas], ['exoneradas', c.totalExoneradas], ['inafectas', c.totalInafectas],
    ['exportacion', c.totalExportacion], ['igv', c.igv], ['icbper', c.totalIcbper], ['detraccion', c.detraccionMonto],
    ['percepcion', c.percepcionMonto], ['retencion', c.retencionMonto], ['neto', conNeto ? c.netoPendiente : null],
  ]);
}
