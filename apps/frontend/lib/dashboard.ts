// Lógica pura del dashboard de Perú: meses en hora de Lima, cupo del plan, ventas e indicadores.
// Sin React ni llamadas a la API (así se prueba con node:test).
import type { Comprobante, EstadoSunat, TipoComprobante } from './sunat/tipos';

export const ZONA_LIMA = 'America/Lima';

// GET /api/comprobantes devuelve como mucho 100 (take: 100), ordenados por createdAt desc.
export const LIMITE_LISTA_COMPROBANTES = 100;

// Umbral a partir del cual el cupo se marca como «casi lleno».
const UMBRAL_CASI_LLENO = 80;

const formatoMesLima = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_LIMA, year: 'numeric', month: '2-digit' });

// Clave «AAAA-MM» del mes calendario de Lima para una fecha. Vacía si la fecha no es válida.
export function claveMesLima(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (Number.isNaN(d.getTime())) return '';
  const partes = formatoMesLima.formatToParts(d);
  const anio = partes.find((p) => p.type === 'year')?.value ?? '';
  const mes = partes.find((p) => p.type === 'month')?.value ?? '';
  return anio && mes ? `${anio}-${mes}` : '';
}

export function esDelMes(fechaIso: string, ahora: Date): boolean {
  const clave = claveMesLima(fechaIso);
  return clave !== '' && clave === claveMesLima(ahora);
}

// Cuenta para el cupo lo que SUNAT ya recibió: todo lo emitido, sin borradores (igual que planes/cupo.js).
export function esEmitido(estado: EstadoSunat | null | undefined): boolean {
  return Boolean(estado) && estado !== 'BORRADOR';
}

const ESTADOS_ACEPTADOS: EstadoSunat[] = ['ACEPTADO', 'ACEPTADO_CON_OBS'];
const ESTADOS_ATENCION: EstadoSunat[] = ['RECHAZADO', 'ACEPTADO_CON_OBS', 'ERROR_TEMPORAL'];

export function requiereAtencion(estado: EstadoSunat): boolean {
  return ESTADOS_ATENCION.includes(estado);
}

// Las notas de crédito restan ventas; facturas, boletas y notas de débito suman.
function signoVenta(tipo: TipoComprobante): 1 | -1 {
  return tipo === '07' ? -1 : 1;
}

export interface Indicadores {
  emitidosMes: number;
  // Soles, neto de notas de crédito. Solo comprobantes en PEN.
  ventasMes: number;
  requierenAtencion: number;
  // La lista llegó al tope y su último comprobante ya es de este mes: puede haber más sin mostrar.
  incompleto: boolean;
}

// Trabaja en céntimos enteros para no acumular errores de coma flotante.
export function calcularIndicadores(lista: Comprobante[], ahora: Date): Indicadores {
  let emitidosMes = 0;
  let centimos = 0;
  let requierenAtencion = 0;

  for (const c of lista) {
    if (requiereAtencion(c.estadoSunat)) requierenAtencion += 1;
    if (!esDelMes(c.fechaEmision, ahora) || !esEmitido(c.estadoSunat)) continue;
    emitidosMes += 1;
    if (ESTADOS_ACEPTADOS.includes(c.estadoSunat) && c.moneda === 'PEN') {
      centimos += signoVenta(c.tipoComprobante) * Math.round(Number(c.total) * 100);
    }
  }

  const ultimo = lista[lista.length - 1];
  const incompleto = lista.length >= LIMITE_LISTA_COMPROBANTES && Boolean(ultimo) && esDelMes(ultimo.fechaEmision, ahora);

  return { emitidosMes, ventasMes: centimos / 100, requierenAtencion, incompleto };
}

export type NivelCupo = 'ok' | 'casi' | 'lleno' | 'ilimitado' | 'desconocido';

export interface Cupo {
  usados: number;
  limite: number | null;
  porcentaje: number;
  nivel: NivelCupo;
}

// limite: null o negativo = sin límite; undefined = no se pudo leer el plan.
export function calcularCupo(usados: number, limite: number | null | undefined): Cupo {
  if (limite === undefined) return { usados, limite: null, porcentaje: 0, nivel: 'desconocido' };
  if (limite === null || limite < 0) return { usados, limite: null, porcentaje: 0, nivel: 'ilimitado' };
  if (limite === 0) return { usados, limite, porcentaje: 100, nivel: 'lleno' };
  const porcentaje = Math.min(100, Math.round((usados / limite) * 100));
  if (usados >= limite) return { usados, limite, porcentaje: 100, nivel: 'lleno' };
  if (porcentaje >= UMBRAL_CASI_LLENO) return { usados, limite, porcentaje, nivel: 'casi' };
  return { usados, limite, porcentaje, nivel: 'ok' };
}

// «domingo, 2 de noviembre de 2026», en español de Perú y hora de Lima.
export function fechaLarga(ahora: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: ZONA_LIMA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(ahora);
}
