const Decimal = require('decimal.js');
const {
  AFECTACION_IGV, TIPO_OPERACION, DETRACCION_CODIGOS, PERCEPCION_REGIMENES, LEYENDAS, TEXTO_LEYENDA_DETRACCION,
} = require('../catalogos');
const { parametro } = require('../catalogos/parametros');
const { montoEnLetras } = require('./montoEnLetras');

class ErrorCalculo extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorCalculo'; }
}

const r2 = (d) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
const s2 = (d) => r2(d).toFixed(2);
const s10 = (d) => d.toDecimalPlaces(10, Decimal.ROUND_HALF_UP).toFixed(10);
const dec = (v) => new Decimal(String(v ?? 0));

function calcularLinea(linea, tasaIgv, tarifaIcbper) {
  const afectacion = linea.afectacion || AFECTACION_IGV.GRAVADO;
  if (!Object.values(AFECTACION_IGV).includes(afectacion)) {
    throw new ErrorCalculo(`Afectación de IGV no soportada: ${afectacion}`);
  }
  const tasa = afectacion === AFECTACION_IGV.GRAVADO ? dec(tasaIgv).div(100) : new Decimal(0);
  const cantidad = dec(linea.cantidad);
  if (cantidad.lte(0)) throw new ErrorCalculo(`La cantidad de «${linea.descripcion}» debe ser mayor que cero`);
  const precio = dec(linea.precio);
  if (precio.lt(0)) throw new ErrorCalculo(`El precio de «${linea.descripcion}» no puede ser negativo`);

  const valorUnitario = linea.precioIncluyeIgv ? precio.div(tasa.plus(1)) : precio;
  const precioUnitario = linea.precioIncluyeIgv ? precio : precio.mul(tasa.plus(1));
  const descuento = r2(dec(linea.descuento));
  const valorBruto = r2(cantidad.mul(valorUnitario));
  if (descuento.gt(valorBruto)) throw new ErrorCalculo(`El descuento de «${linea.descripcion}» supera el valor de la línea`);
  const valorVenta = r2(valorBruto.minus(descuento));
  const igv = r2(valorVenta.mul(tasa));
  const bolsasIcbper = Number(linea.bolsasIcbper || 0);
  const icbper = r2(dec(tarifaIcbper).mul(bolsasIcbper));

  return {
    descripcion: linea.descripcion,
    codigoProducto: linea.codigoProducto || null,
    unidad: linea.unidad || 'NIU',
    cantidad: cantidad.toString(),
    afectacion,
    porcentajeIgv: tasa.mul(100).toString(),
    precioIncluyeIgv: Boolean(linea.precioIncluyeIgv),
    precio: precio.toString(),
    valorUnitario: s10(valorUnitario),
    precioUnitario: s10(precioUnitario),
    valorBruto: s2(valorBruto),
    descuento: s2(descuento),
    valorVenta: s2(valorVenta),
    igv: s2(igv),
    bolsasIcbper,
    icbper: s2(icbper),
    total: s2(valorVenta.plus(igv).plus(icbper)),
  };
}

function calcularComprobante(entrada) {
  const fecha = entrada.fechaEmision ? new Date(entrada.fechaEmision) : new Date();
  const moneda = entrada.moneda || 'PEN';
  const tipoOperacion = entrada.tipoOperacion || TIPO_OPERACION.VENTA_INTERNA;
  if (!entrada.lineas || entrada.lineas.length === 0) {
    throw new ErrorCalculo('El comprobante debe tener al menos una línea');
  }

  const tarifaIcbper = parametro('ICBPER_TARIFA', fecha);
  const lineas = entrada.lineas.map((l) => calcularLinea(l, entrada.tasaIgv ?? 18, tarifaIcbper));

  const esExportacion = tipoOperacion === TIPO_OPERACION.EXPORTACION;
  if (esExportacion && lineas.some((l) => l.afectacion !== AFECTACION_IGV.EXPORTACION)) {
    throw new ErrorCalculo('En una exportación todas las líneas deben tener afectación 40 (exportación)');
  }
  if (!esExportacion && lineas.some((l) => l.afectacion === AFECTACION_IGV.EXPORTACION)) {
    throw new ErrorCalculo('La afectación 40 solo se usa en operaciones de exportación');
  }

  const suma = (campo, filtro = () => true) =>
    lineas.filter(filtro).reduce((acc, l) => acc.plus(l[campo]), new Decimal(0));
  const porAfectacion = (afectacion) => suma('valorVenta', (l) => l.afectacion === afectacion);

  const gravadas = porAfectacion(AFECTACION_IGV.GRAVADO);
  const exoneradas = porAfectacion(AFECTACION_IGV.EXONERADO);
  const inafectas = porAfectacion(AFECTACION_IGV.INAFECTO);
  const exportacion = porAfectacion(AFECTACION_IGV.EXPORTACION);
  const igv = suma('igv');
  const icbper = suma('icbper');
  const valorVenta = gravadas.plus(exoneradas).plus(inafectas).plus(exportacion);
  const totalImpuestos = igv.plus(icbper);
  const total = valorVenta.plus(totalImpuestos);

  const tipoCambio = moneda === 'PEN' ? new Decimal(1) : dec(entrada.tipoCambio);
  const enSoles = (monto) => {
    if (tipoCambio.lte(0)) throw new ErrorCalculo('Indica el tipo de cambio para operar en moneda extranjera');
    return monto.mul(tipoCambio);
  };

  const leyendas = [{ codigo: LEYENDAS.MONTO_EN_LETRAS, valor: montoEnLetras(total, moneda) }];

  let detraccion = null;
  if (tipoOperacion === TIPO_OPERACION.DETRACCION) {
    const codigo = entrada.detraccion?.codigo;
    const definicion = DETRACCION_CODIGOS[codigo];
    if (!definicion) throw new ErrorCalculo('Indica el código de bien o servicio sujeto a detracción');
    const umbral = parametro('DETRACCION_UMBRAL', fecha);
    const totalSoles = enSoles(total);
    if (totalSoles.lte(umbral)) throw new ErrorCalculo(`La detracción solo aplica a operaciones mayores a S/ ${umbral}`);
    const montoSoles = totalSoles.mul(definicion.porcentaje).div(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
    const montoMoneda = moneda === 'PEN' ? montoSoles : r2(total.mul(definicion.porcentaje).div(100));
    detraccion = { codigo, porcentaje: definicion.porcentaje, monto: montoSoles.toFixed(2), montoMoneda: s2(montoMoneda) };
    leyendas.push({ codigo: LEYENDAS.DETRACCION, valor: TEXTO_LEYENDA_DETRACCION });
  } else if (entrada.detraccion) {
    throw new ErrorCalculo('La detracción requiere el tipo de operación 1001');
  }

  let percepcion = null;
  if (entrada.percepcion) {
    const definicion = PERCEPCION_REGIMENES[entrada.percepcion.regimen];
    if (!definicion) throw new ErrorCalculo('Régimen de percepción no soportado');
    if (moneda !== 'PEN') throw new ErrorCalculo('La percepción se calcula en soles: emite el comprobante en PEN');
    const monto = r2(total.mul(definicion.porcentaje).div(100));
    percepcion = {
      regimen: entrada.percepcion.regimen, porcentaje: definicion.porcentaje,
      base: s2(total), monto: s2(monto), total: s2(total.plus(monto)),
    };
  }

  // SUNAT: si la operación está sujeta a detracción no se aplica retención.
  let retencion = null;
  if (entrada.retencion && !detraccion && enSoles(total).gt(parametro('RETENCION_UMBRAL', fecha))) {
    const porcentaje = parametro('RETENCION_PORCENTAJE', fecha);
    retencion = { porcentaje, base: s2(total), monto: s2(r2(total.mul(porcentaje).div(100))) };
  }

  const netoPendiente = total
    .minus(detraccion ? detraccion.montoMoneda : 0)
    .minus(retencion ? retencion.monto : 0);

  const formaPago = entrada.formaPago || { tipo: 'Contado' };
  let cuotas = [];
  if (formaPago.tipo === 'Credito') {
    if (!formaPago.cuotas || formaPago.cuotas.length === 0) {
      throw new ErrorCalculo('Una venta al crédito debe tener al menos una cuota');
    }
    cuotas = formaPago.cuotas.map((c, i) => {
      if (!c.fechaVencimiento) throw new ErrorCalculo(`La cuota ${i + 1} no tiene fecha de vencimiento`);
      return { numero: i + 1, monto: s2(dec(c.monto)), fechaVencimiento: c.fechaVencimiento };
    });
    const sumaCuotas = cuotas.reduce((acc, c) => acc.plus(c.monto), new Decimal(0));
    if (!sumaCuotas.eq(r2(netoPendiente))) {
      throw new ErrorCalculo(
        `La suma de las cuotas (${sumaCuotas.toFixed(2)}) debe ser igual al neto pendiente de pago (${s2(netoPendiente)})`,
      );
    }
  } else if (formaPago.tipo !== 'Contado') {
    throw new ErrorCalculo('La forma de pago debe ser Contado o Credito');
  }

  return {
    tipoOperacion,
    moneda,
    formaPago: formaPago.tipo,
    netoPendiente: s2(netoPendiente),
    lineas,
    totales: {
      gravadas: s2(gravadas),
      exoneradas: s2(exoneradas),
      inafectas: s2(inafectas),
      exportacion: s2(exportacion),
      igv: s2(igv),
      icbper: s2(icbper),
      descuento: s2(suma('descuento')),
      valorVenta: s2(valorVenta),
      totalImpuestos: s2(totalImpuestos),
      total: s2(total),
    },
    leyendas,
    detraccion,
    percepcion,
    retencion,
    cuotas,
  };
}

module.exports = { calcularComprobante, ErrorCalculo };
