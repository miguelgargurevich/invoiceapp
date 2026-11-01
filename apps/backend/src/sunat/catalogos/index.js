// Catálogos SUNAT (anexos de la RS 097-2012/SUNAT y modificatorias) usados por el núcleo de emisión.
// Cambian por resolución: se versionan en código y pasan por revisión.

const TIPO_COMPROBANTE = Object.freeze({
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08',
});

// Catálogo 06
const TIPO_DOC_IDENTIDAD = Object.freeze({
  SIN_DOCUMENTO: '0',
  DNI: '1',
  CARNET_EXTRANJERIA: '4',
  RUC: '6',
  PASAPORTE: '7',
});

// Catálogo 07 (solo las afectaciones de la v1)
const AFECTACION_IGV = Object.freeze({
  GRAVADO: '10',
  EXONERADO: '20',
  INAFECTO: '30',
  EXPORTACION: '40',
});

// Catálogo 51
const TIPO_OPERACION = Object.freeze({
  VENTA_INTERNA: '0101',
  EXPORTACION: '0200',
  DETRACCION: '1001',
});

// Catálogo 09
const MOTIVOS_NOTA_CREDITO = Object.freeze({
  '01': 'Anulación de la operación',
  '02': 'Anulación por error en el RUC',
  '03': 'Corrección por error en la descripción',
  '04': 'Descuento global',
  '05': 'Descuento por ítem',
  '06': 'Devolución total',
  '07': 'Devolución por ítem',
  '09': 'Disminución en el valor',
  '13': 'Ajustes de montos y/o fechas de pago',
});

// Catálogo 10
const MOTIVOS_NOTA_DEBITO = Object.freeze({
  '01': 'Intereses por mora',
  '02': 'Aumento en el valor',
  '03': 'Penalidades / otros conceptos',
});

// Catálogo 03 (subconjunto de uso común)
const UNIDADES = Object.freeze({
  NIU: 'Unidad (bienes)',
  ZZ: 'Unidad (servicios)',
  KGM: 'Kilogramo',
  MTR: 'Metro',
  LTR: 'Litro',
  HUR: 'Hora',
  DAY: 'Día',
  BX: 'Caja',
  GLL: 'Galón',
});

const UNIDADES_LEGADAS = Object.freeze({ UND: 'NIU', UNIDAD: 'NIU', SERV: 'ZZ', SERVICIO: 'ZZ' });

// Catálogo 54 (subconjunto). Porcentajes a verificar contra la norma vigente antes de producción.
const DETRACCION_CODIGOS = Object.freeze({
  '012': { descripcion: 'Intermediación laboral y tercerización', porcentaje: '12' },
  '019': { descripcion: 'Arrendamiento de bienes muebles', porcentaje: '10' },
  '020': { descripcion: 'Mantenimiento y reparación de bienes muebles', porcentaje: '12' },
  '022': { descripcion: 'Otros servicios empresariales', porcentaje: '12' },
  '030': { descripcion: 'Contratos de construcción', porcentaje: '4' },
  '037': { descripcion: 'Demás servicios gravados con el IGV', porcentaje: '12' },
});

// Catálogo 53 (percepciones)
const PERCEPCION_REGIMENES = Object.freeze({
  '51': { descripcion: 'Percepción venta interna', porcentaje: '2' },
  '52': { descripcion: 'Percepción a la adquisición de combustible', porcentaje: '1' },
  '53': { descripcion: 'Percepción al agente de percepción con tasa especial', porcentaje: '0.5' },
});

// Catálogo 52
const LEYENDAS = Object.freeze({
  MONTO_EN_LETRAS: '1000',
  DETRACCION: '2006',
});

const TEXTO_LEYENDA_DETRACCION = 'Operación sujeta al Sistema de Pago de Obligaciones Tributarias';

const DOC_IDENTIDAD_LEGADO = Object.freeze({
  RUC: '6',
  DNI: '1',
  CE: '4',
  'CARNET DE EXTRANJERIA': '4',
  PASAPORTE: '7',
  PASSPORT: '7',
});

// Los clientes antiguos guardan "RUC"/"DNI"; los nuevos, el código del catálogo 06.
function codigoDocIdentidad(tipoDocumento) {
  if (!tipoDocumento) return TIPO_DOC_IDENTIDAD.SIN_DOCUMENTO;
  const valor = String(tipoDocumento).trim().toUpperCase();
  if (Object.values(TIPO_DOC_IDENTIDAD).includes(valor)) return valor;
  return DOC_IDENTIDAD_LEGADO[valor] || TIPO_DOC_IDENTIDAD.SIN_DOCUMENTO;
}

function codigoUnidad(unidad) {
  if (!unidad) return 'NIU';
  const valor = String(unidad).trim().toUpperCase();
  if (UNIDADES[valor]) return valor;
  return UNIDADES_LEGADAS[valor] || 'NIU';
}

module.exports = {
  TIPO_COMPROBANTE,
  TIPO_DOC_IDENTIDAD,
  AFECTACION_IGV,
  TIPO_OPERACION,
  MOTIVOS_NOTA_CREDITO,
  MOTIVOS_NOTA_DEBITO,
  UNIDADES,
  DETRACCION_CODIGOS,
  PERCEPCION_REGIMENES,
  LEYENDAS,
  TEXTO_LEYENDA_DETRACCION,
  codigoDocIdentidad,
  codigoUnidad,
};
