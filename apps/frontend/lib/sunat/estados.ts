import type { EstadoSunat, TipoComprobante } from './tipos';

export type VarianteEstado = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'amber' | 'violet';
export type AccionComprobante =
  | 'editar' | 'eliminar' | 'emitir' | 'pdf' | 'xml' | 'cdr' | 'anular' | 'notaCredito' | 'notaDebito' | 'corregir';

interface Definicion {
  variante: VarianteEstado;
  acciones: AccionComprobante[];
  enProceso: boolean;
}

const ACEPTADO: AccionComprobante[] = ['pdf', 'xml', 'cdr', 'anular', 'notaCredito', 'notaDebito'];

const DEFINICIONES: Record<EstadoSunat, Definicion> = {
  BORRADOR: { variante: 'neutral', acciones: ['editar', 'eliminar', 'emitir'], enProceso: false },
  PENDIENTE_ENVIO: { variante: 'info', acciones: [], enProceso: true },
  ERROR_TEMPORAL: { variante: 'warning', acciones: [], enProceso: true },
  ACEPTADO: { variante: 'success', acciones: ACEPTADO, enProceso: false },
  ACEPTADO_CON_OBS: { variante: 'amber', acciones: ACEPTADO, enProceso: false },
  RECHAZADO: { variante: 'danger', acciones: ['corregir'], enProceso: false },
  ANULACION_PENDIENTE: { variante: 'violet', acciones: [], enProceso: true },
  ANULADO: { variante: 'neutral', acciones: ['pdf', 'xml', 'cdr'], enProceso: false },
};

export const ESTADOS_SUNAT = Object.keys(DEFINICIONES) as EstadoSunat[];

// Clave i18n dentro del namespace «sunat».
export function etiquetaEstado(estado: EstadoSunat): string {
  return `estados.${estado}`;
}

export function colorEstado(estado: EstadoSunat): VarianteEstado {
  return DEFINICIONES[estado]?.variante ?? 'neutral';
}

export function accionesPermitidas(estado: EstadoSunat, tipo?: TipoComprobante | null): AccionComprobante[] {
  const acciones = [...(DEFINICIONES[estado]?.acciones ?? [])];
  // Una nota de crédito (07) o de débito (08) no se corrige con otra nota.
  if (esNota(tipo)) return acciones.filter((a) => a !== 'notaCredito' && a !== 'notaDebito');
  return acciones;
}

// Notas de crédito (07) y de débito (08): modifican a otro comprobante, no admiten notas sobre ellas.
export function esNota(tipo: TipoComprobante | null | undefined): boolean {
  return tipo === '07' || tipo === '08';
}

export function estaEnProceso(estado: EstadoSunat): boolean {
  return DEFINICIONES[estado]?.enProceso ?? false;
}
