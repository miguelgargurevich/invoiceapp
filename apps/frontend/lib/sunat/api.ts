import api from '@/lib/api';
import { descargarArchivo } from '@/lib/descargas';
import type {
  AlertasSunat, CatalogosSunat, Comprobante, ComprobantePayload, EmisorPayload, EmisorVista, Serie, VistaPrevia,
} from './tipos';

const sinVacios = (filtros: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(filtros).filter((par): par is [string, string] => Boolean(par[1])));

export const sunatApi = {
  listar: (filtros: { estadoSunat?: string; tipoComprobante?: string } = {}) =>
    api.get<Comprobante[]>('/comprobantes', sinVacios(filtros)),
  obtener: (id: string) => api.get<Comprobante>(`/comprobantes/${id}`),
  vistaPrevia: (payload: ComprobantePayload) => api.post<VistaPrevia>('/comprobantes/preview', payload),
  crear: (payload: ComprobantePayload) => api.post<Comprobante>('/comprobantes', payload),
  actualizar: (id: string, payload: ComprobantePayload) => api.put<Comprobante>(`/comprobantes/${id}`, payload),
  eliminar: (id: string) => api.delete<void>(`/comprobantes/${id}`),
  emitir: (id: string) => api.post<Comprobante>(`/comprobantes/${id}/emitir`),
  anular: (id: string, motivo: string) => api.post<{ procesoId: string }>(`/comprobantes/${id}/anular`, { motivo }),
  corregir: (id: string) => api.post<Comprobante>(`/comprobantes/${id}/corregir`),
  descargar: (id: string, tipo: 'pdf' | 'xml' | 'cdr') => api.getBlob(`/comprobantes/${id}/${tipo}`),
  emisor: () => api.get<EmisorVista>('/sunat/emisor'),
  guardarEmisor: (datos: EmisorPayload) => api.put<EmisorVista>('/sunat/emisor', datos),
  series: () => api.get<Serie[]>('/sunat/series'),
  crearSerie: (datos: { tipoComprobante: string; serie: string }) => api.post<Serie>('/sunat/series', datos),
  alertas: () => api.get<AlertasSunat>('/sunat/alertas'),
  catalogos: () => api.get<CatalogosSunat>('/sunat/catalogos'),
};

export async function guardarArchivo(id: string, tipo: 'pdf' | 'xml' | 'cdr', nombre: string): Promise<void> {
  const blob = await sunatApi.descargar(id, tipo);
  await descargarArchivo(blob, nombre);
}
