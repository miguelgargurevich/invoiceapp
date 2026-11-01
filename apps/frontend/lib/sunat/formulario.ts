import type {
  Afectacion, ClienteResumen, Comprobante, ComprobantePayload, LineaPayload, Moneda, Serie, TipoComprobante, TipoOperacion,
} from './tipos';

export interface LineaFormulario {
  clave: string;
  productoId: string;
  codigoProducto: string;
  descripcion: string;
  cantidad: string;
  unidad: string;
  precio: string;
  precioIncluyeIgv: boolean;
  descuento: string;
  afectacion: Afectacion;
  bolsasIcbper: string;
}

export interface CuotaFormulario {
  clave: string;
  monto: string;
  fechaVencimiento: string;
}

export interface FormularioComprobante {
  tipoComprobante: TipoComprobante;
  serie: string;
  clienteId: string;
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  tipoCambio: string;
  observaciones: string;
  lineas: LineaFormulario[];
  detraccionCodigo: string;
  percepcionRegimen: string;
  formaPago: 'Contado' | 'Credito';
  cuotas: CuotaFormulario[];
  documentoAfectadoId: string;
  motivoCodigo: string;
  motivoDescripcion: string;
}

export interface CamposVisibles {
  operacion: boolean;
  detraccion: boolean;
  percepcion: boolean;
  formaPago: boolean;
  cuotas: boolean;
  tipoCambio: boolean;
  documentoAfectado: boolean;
}

let contador = 0;
export function nuevaClave(): string {
  contador += 1;
  return `k${contador}`;
}

export function esNota(tipo: TipoComprobante): boolean {
  return tipo === '07' || tipo === '08';
}

export function esRuc(tipoDocumento: string | null | undefined): boolean {
  return ['RUC', '6'].includes(String(tipoDocumento ?? '').trim().toUpperCase());
}

const UNIDADES_LEGADAS: Record<string, string> = { UND: 'NIU', UNIDAD: 'NIU', SERV: 'ZZ', SERVICIO: 'ZZ' };

export function codigoUnidad(unidad: string | null | undefined): string {
  const valor = String(unidad ?? '').trim().toUpperCase();
  if (!valor) return 'NIU';
  return UNIDADES_LEGADAS[valor] ?? valor;
}

export function lineaVacia(): LineaFormulario {
  return {
    clave: nuevaClave(), productoId: '', codigoProducto: '', descripcion: '', cantidad: '1', unidad: 'NIU', precio: '',
    precioIncluyeIgv: true, descuento: '0', afectacion: '10', bolsasIcbper: '0',
  };
}

export function formularioInicial(tipo: TipoComprobante = '01'): FormularioComprobante {
  return {
    tipoComprobante: tipo, serie: '', clienteId: '', tipoOperacion: '0101', moneda: 'PEN', tipoCambio: '', observaciones: '',
    lineas: [lineaVacia()], detraccionCodigo: '', percepcionRegimen: '', formaPago: 'Contado', cuotas: [],
    documentoAfectadoId: '', motivoCodigo: '', motivoDescripcion: '',
  };
}

export function formularioDesdeComprobante(c: Comprobante): FormularioComprobante {
  return {
    tipoComprobante: c.tipoComprobante,
    serie: c.serie,
    clienteId: c.clienteId,
    tipoOperacion: c.tipoOperacion,
    moneda: c.moneda,
    tipoCambio: c.tipoCambio ? String(c.tipoCambio) : '',
    observaciones: c.observaciones ?? '',
    lineas: [...c.detalles].sort((a, b) => a.orden - b.orden).map((d) => ({
      clave: nuevaClave(),
      productoId: d.productoId ?? '',
      codigoProducto: d.codigoProductoSunat ?? '',
      descripcion: d.descripcion,
      cantidad: String(d.cantidad),
      unidad: d.codigoUnidadSunat,
      precio: String(d.precioUnitario),
      precioIncluyeIgv: d.precioIncluyeIgv,
      descuento: String(d.descuento),
      afectacion: d.tipoAfectacionIgv,
      bolsasIcbper: String(d.cantidadBolsasIcbper),
    })),
    detraccionCodigo: c.detraccionCodigo ?? '',
    percepcionRegimen: c.percepcionRegimen ?? '',
    formaPago: c.formaPago,
    cuotas: c.cuotas.map((q) => ({ clave: nuevaClave(), monto: String(q.monto), fechaVencimiento: q.fechaVencimiento.slice(0, 10) })),
    documentoAfectadoId: c.docRelacionadoId ?? '',
    motivoCodigo: c.motivoCodigo ?? '',
    motivoDescripcion: c.motivoDescripcion ?? '',
  };
}

export function formularioParaNota(afectado: Comprobante, tipo: '07' | '08', motivoCodigo = ''): FormularioComprobante {
  return {
    ...formularioDesdeComprobante(afectado),
    tipoComprobante: tipo,
    serie: '',
    tipoOperacion: afectado.tipoOperacion === '0200' ? '0200' : '0101',
    observaciones: '',
    detraccionCodigo: '',
    percepcionRegimen: '',
    formaPago: 'Contado',
    cuotas: [],
    documentoAfectadoId: afectado.id,
    motivoCodigo,
    motivoDescripcion: '',
  };
}

const aNumero = (valor: string): number => Number(String(valor).trim().replace(',', '.'));

export function aPayload(f: FormularioComprobante): ComprobantePayload {
  const nota = esNota(f.tipoComprobante);
  const tipoOperacion: TipoOperacion = nota && f.tipoOperacion === '1001' ? '0101' : f.tipoOperacion;
  const exportacion = tipoOperacion === '0200';
  const payload: ComprobantePayload = {
    tipoComprobante: f.tipoComprobante,
    // El backend exige ^[FB][A-Z0-9]{3}$: la interfaz acepta minúsculas, así que se normaliza aquí.
    serie: f.serie.trim().toUpperCase(),
    clienteId: f.clienteId,
    tipoOperacion,
    moneda: f.moneda,
    lineas: f.lineas.map((l): LineaPayload => ({
      ...(l.productoId ? { productoId: l.productoId } : {}),
      ...(l.codigoProducto.trim() ? { codigoProducto: l.codigoProducto.trim() } : {}),
      descripcion: l.descripcion.trim(),
      cantidad: aNumero(l.cantidad),
      unidad: l.unidad,
      precio: aNumero(l.precio || '0'),
      precioIncluyeIgv: l.precioIncluyeIgv,
      descuento: aNumero(l.descuento || '0'),
      afectacion: exportacion ? '40' : l.afectacion,
      bolsasIcbper: Number.parseInt(l.bolsasIcbper || '0', 10) || 0,
    })),
    formaPago: !nota && f.formaPago === 'Credito'
      ? { tipo: 'Credito', cuotas: f.cuotas.map((c) => ({ monto: aNumero(c.monto), fechaVencimiento: c.fechaVencimiento })) }
      : { tipo: 'Contado' },
  };
  if (f.moneda !== 'PEN' && f.tipoCambio.trim()) payload.tipoCambio = aNumero(f.tipoCambio);
  if (f.observaciones.trim()) payload.observaciones = f.observaciones.trim();
  if (!nota && tipoOperacion === '1001' && f.detraccionCodigo) payload.detraccion = { codigo: f.detraccionCodigo };
  if (!nota && f.percepcionRegimen) payload.percepcion = { regimen: f.percepcionRegimen };
  if (nota && f.documentoAfectadoId) {
    payload.documentoAfectado = {
      facturaId: f.documentoAfectadoId,
      motivoCodigo: f.motivoCodigo,
      ...(f.motivoDescripcion.trim() ? { motivoDescripcion: f.motivoDescripcion.trim() } : {}),
    };
  }
  return payload;
}

// El neto pendiente no depende de las cuotas: la vista previa se pide al contado para poder repartirlas.
export function payloadVistaPrevia(f: FormularioComprobante): ComprobantePayload {
  return { ...aPayload(f), formaPago: { tipo: 'Contado' } };
}

export function listoParaVistaPrevia(f: FormularioComprobante): boolean {
  const lineasOk = f.lineas.length > 0 && f.lineas.every((l) =>
    l.descripcion.trim() !== '' && aNumero(l.cantidad) > 0 && l.precio.trim() !== '' && Number.isFinite(aNumero(l.precio)));
  const notaOk = !esNota(f.tipoComprobante) || Boolean(f.documentoAfectadoId && f.motivoCodigo);
  return Boolean(f.clienteId && f.serie) && lineasOk && notaOk;
}

function aCentimos(valor: string): number {
  const limpio = String(valor).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return Number.NaN;
  const negativo = limpio.startsWith('-');
  const [entero, decimales = ''] = limpio.replace('-', '').split('.');
  const centimos = Number(entero) * 100 + Number(`${decimales}00`.slice(0, 2));
  return negativo ? -centimos : centimos;
}

function deCentimos(centimos: number): string {
  const absoluto = Math.abs(centimos);
  return `${centimos < 0 ? '-' : ''}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

export function sumarMeses(fecha: string, meses: number): string {
  // Una fecha vacía o a medio escribir no debe reventar la pantalla (toISOString lanza con fechas inválidas).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return '';
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const objetivo = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(dia, ultimoDia));
  return objetivo.toISOString().slice(0, 10);
}

export function repartirCuotas(neto: string, n: number, primeraFecha: string): CuotaFormulario[] {
  const total = aCentimos(neto);
  if (!Number.isFinite(total) || total <= 0 || n < 1) return [];
  const base = Math.floor(total / n);
  const residuo = total - base * n;
  return Array.from({ length: n }, (_, i) => ({
    clave: nuevaClave(),
    monto: deCentimos(base + (i === n - 1 ? residuo : 0)),
    fechaVencimiento: sumarMeses(primeraFecha, i),
  }));
}

// Positivo: falta para llegar al neto. Negativo: sobra.
export function diferenciaCuotas(cuotas: CuotaFormulario[], neto: string): string {
  const suma = cuotas.reduce((acc, c) => {
    const centimos = aCentimos(c.monto);
    return acc + (Number.isFinite(centimos) ? centimos : 0);
  }, 0);
  return deCentimos(aCentimos(neto) - suma);
}

export function camposVisibles(f: FormularioComprobante, emisor: { esAgentePercepcion?: boolean } | null): CamposVisibles {
  const nota = esNota(f.tipoComprobante);
  return {
    operacion: !nota,
    detraccion: !nota && f.tipoOperacion === '1001',
    percepcion: !nota && Boolean(emisor?.esAgentePercepcion),
    formaPago: !nota,
    cuotas: !nota && f.formaPago === 'Credito',
    tipoCambio: f.moneda !== 'PEN',
    documentoAfectado: nota,
  };
}

// null si es válida; si no, las letras permitidas («F», «B» o «F o B»).
export function validarSerie(tipo: TipoComprobante, serie: string): string | null {
  const s = serie.trim().toUpperCase();
  const letras = tipo === '01' ? ['F'] : tipo === '03' ? ['B'] : ['F', 'B'];
  if (!/^[FB][A-Z0-9]{3}$/.test(s) || !letras.includes(s[0])) return letras.join(' o ');
  return null;
}

export function seriesDeTipo(series: Serie[], tipo: TipoComprobante): Serie[] {
  return series.filter((s) => s.tipoDocumento === tipo && s.activa);
}

export function clientesPermitidos<T extends Pick<ClienteResumen, 'tipoDocumento'>>(clientes: T[], f: FormularioComprobante): T[] {
  if (f.tipoComprobante === '01' && f.tipoOperacion !== '0200') return clientes.filter((c) => esRuc(c.tipoDocumento));
  return clientes;
}
