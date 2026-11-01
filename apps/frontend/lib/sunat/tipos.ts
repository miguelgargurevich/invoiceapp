// Tipos de la API SUNAT del backend (/api/comprobantes y /api/sunat). Los montos llegan como string (Decimal de Prisma).
export type EstadoSunat =
  | 'BORRADOR' | 'PENDIENTE_ENVIO' | 'ERROR_TEMPORAL' | 'ACEPTADO' | 'ACEPTADO_CON_OBS'
  | 'RECHAZADO' | 'ANULACION_PENDIENTE' | 'ANULADO';
export type TipoComprobante = '01' | '03' | '07' | '08';
export type Afectacion = '10' | '20' | '30' | '40';
export type TipoOperacion = '0101' | '0200' | '1001';
export type Moneda = 'PEN' | 'USD' | 'EUR';
export type Monto = string;

export interface ClienteResumen {
  id: string;
  razonSocial: string;
  nombre?: string;
  tipoDocumento: string;
  numeroDocumento: string | null;
  email?: string | null;
  esAgenteRetencion?: boolean;
}

export interface ProductoResumen {
  id: string;
  codigo: string | null;
  nombre: string;
  unidadMedida: string;
  precioUnitario: Monto | number;
  precioConIgv: boolean;
}

export interface LineaComprobante {
  id: string;
  orden: number;
  productoId: string | null;
  codigoProductoSunat: string | null;
  descripcion: string;
  cantidad: Monto;
  unidadMedida: string;
  codigoUnidadSunat: string;
  precioUnitario: Monto;
  precioIncluyeIgv: boolean;
  valorUnitario: Monto | null;
  descuento: Monto;
  subtotal: Monto;
  igv: Monto;
  icbper: Monto;
  cantidadBolsasIcbper: number;
  total: Monto;
  tipoAfectacionIgv: Afectacion;
}

export interface CuotaComprobante {
  id: string;
  numero: number;
  monto: Monto;
  fechaVencimiento: string;
}

export interface EnvioSunat {
  id: string;
  operacion: string;
  codigo: string | null;
  mensaje: string | null;
  exito: boolean;
  createdAt: string;
}

export interface Comprobante {
  id: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  numero: number | null;
  fechaEmision: string;
  estadoSunat: EstadoSunat;
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  tipoCambio: Monto | null;
  formaPago: 'Contado' | 'Credito';
  observaciones: string | null;
  subtotal: Monto;
  descuento: Monto;
  igv: Monto;
  total: Monto;
  totalGravadas: Monto;
  totalExoneradas: Monto;
  totalInafectas: Monto;
  totalExportacion: Monto;
  totalIcbper: Monto;
  montoEnLetras: string | null;
  detraccionCodigo: string | null;
  detraccionMonto: Monto | null;
  percepcionRegimen: string | null;
  percepcionMonto: Monto | null;
  retencionMonto: Monto | null;
  netoPendiente: Monto | null;
  docRelacionadoId: string | null;
  docRelacionadoTipo: TipoComprobante | null;
  docRelacionadoSerie: string | null;
  docRelacionadoNumero: number | null;
  motivoCodigo: string | null;
  motivoDescripcion: string | null;
  codigoRespuestaSunat: string | null;
  mensajeRespuestaSunat: string | null;
  hashSunat: string | null;
  xmlKey: string | null;
  cdrKey: string | null;
  clienteId: string;
  cliente: ClienteResumen;
  detalles: LineaComprobante[];
  cuotas: CuotaComprobante[];
  envios?: EnvioSunat[];
}

export interface LineaPayload {
  productoId?: string;
  codigoProducto?: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio: number;
  precioIncluyeIgv: boolean;
  descuento: number;
  afectacion: Afectacion;
  bolsasIcbper: number;
}

export type FormaPagoPayload =
  | { tipo: 'Contado' }
  | { tipo: 'Credito'; cuotas: { monto: number; fechaVencimiento: string }[] };

export interface ComprobantePayload {
  tipoComprobante: TipoComprobante;
  serie: string;
  clienteId: string;
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  tipoCambio?: number;
  observaciones?: string;
  lineas: LineaPayload[];
  detraccion?: { codigo: string };
  percepcion?: { regimen: string };
  formaPago: FormaPagoPayload;
  documentoAfectado?: { facturaId: string; motivoCodigo: string; motivoDescripcion?: string };
}

export interface VistaPrevia {
  tipoOperacion: TipoOperacion;
  moneda: Moneda;
  formaPago: 'Contado' | 'Credito';
  netoPendiente: Monto;
  totales: {
    gravadas: Monto; exoneradas: Monto; inafectas: Monto; exportacion: Monto; igv: Monto; icbper: Monto;
    descuento: Monto; valorVenta: Monto; totalImpuestos: Monto; total: Monto;
  };
  leyendas: { codigo: string; valor: string }[];
  detraccion: { codigo: string; porcentaje: string; monto: Monto; montoMoneda: Monto } | null;
  percepcion: { regimen: string; porcentaje: string; base: Monto; monto: Monto; total: Monto } | null;
  retencion: { porcentaje: string; base: Monto; monto: Monto } | null;
  cuotas: { numero: number; monto: Monto; fechaVencimiento: string }[];
}

export interface EmisorVista {
  configurado: boolean;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  urbanizacion?: string | null;
  direccionFiscal?: string;
  codigoEstablecimiento?: string;
  ambiente?: 'BETA' | 'PRODUCCION';
  solUsuario?: string | null;
  tieneClaveSol?: boolean;
  tieneCertificado?: boolean;
  certificadoVence?: string | null;
  cuentaDetracciones?: string | null;
  esAgenteRetencion?: boolean;
  esAgentePercepcion?: boolean;
}

export interface EmisorPayload {
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  urbanizacion?: string;
  direccionFiscal: string;
  codigoEstablecimiento: string;
  ambiente: 'BETA' | 'PRODUCCION';
  confirmarProduccion?: boolean;
  solUsuario?: string;
  solClave?: string;
  certificado?: { pfxBase64: string; clave: string };
  cuentaDetracciones?: string;
  esAgenteRetencion?: boolean;
  esAgentePercepcion?: boolean;
}

export interface Serie {
  id: string;
  tipoDocumento: string;
  serie: string;
  ultimoNumero: number;
  activa: boolean;
}

export interface AlertasSunat {
  certificadoPorVencer: { vence: string } | null;
  comprobantesPendientes: {
    id: string; serie: string; numero: number | null; fechaEmision: string; estadoSunat: EstadoSunat;
    mensajeRespuestaSunat: string | null; diasRestantes: number;
  }[];
  ticketsAtascados: { id: string; tipo: string; ticket: string | null; createdAt: string }[];
}

export interface OpcionCatalogo {
  codigo: string;
  descripcion: string;
  porcentaje?: string;
}

export interface CatalogosSunat {
  afectaciones: OpcionCatalogo[];
  tiposOperacion: OpcionCatalogo[];
  unidades: OpcionCatalogo[];
  motivosNotaCredito: OpcionCatalogo[];
  motivosNotaDebito: OpcionCatalogo[];
  detracciones: OpcionCatalogo[];
  percepciones: OpcionCatalogo[];
}
