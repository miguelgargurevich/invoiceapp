const { aDecimal, dos } = require('../numeros');
const { isoLima, fechaLima } = require('../fechas');
const { codigoDocIdentidad, LEYENDAS, TEXTO_LEYENDA_DETRACCION } = require('../catalogos');
const { esDemo } = require('../../demo/modo');

// Factura (Prisma) → JSON que entiende apps/sunat-engine. Usa los montos guardados: no recalcula.

function armarEmisor(empresa, emisor, descifrar) {
  return {
    ruc: empresa.ruc,
    razonSocial: empresa.razonSocial || empresa.nombre,
    nombreComercial: empresa.nombreComercial || empresa.nombre,
    direccion: {
      ubigeo: emisor.ubigeo,
      departamento: emisor.departamento,
      provincia: emisor.provincia,
      distrito: emisor.distrito,
      urbanizacion: emisor.urbanizacion || '-',
      direccion: emisor.direccionFiscal,
      codLocal: emisor.codigoEstablecimiento,
    },
    // En la demo el motor SIEMPRE usa BETA, aunque el emisor guardado diga otra cosa.
    ambiente: esDemo() ? 'BETA' : emisor.ambiente,
    solUsuario: emisor.solUsuario,
    solClave: descifrar(emisor.solClaveCifrada).toString('utf8'),
    certificadoPfxBase64: descifrar(emisor.certificadoCifrado).toString('base64'),
    certificadoClave: descifrar(emisor.certificadoClaveCifrada).toString('utf8'),
  };
}

function armarLinea(d, tasaIgv) {
  const igv = aDecimal(d.igv);
  const icbper = aDecimal(d.icbper);
  const descuento = aDecimal(d.descuento);
  const valorVenta = aDecimal(d.subtotal);
  return {
    codigo: d.codigoProductoSunat || null,
    unidad: d.codigoUnidadSunat,
    cantidad: aDecimal(d.cantidad).toString(),
    descripcion: d.descripcion,
    valorUnitario: aDecimal(d.valorUnitario).toFixed(10),
    precioUnitario: aDecimal(d.precioUnitarioIgv).toFixed(10),
    valorBruto: dos(valorVenta.plus(descuento)),
    descuento: dos(descuento),
    valorVenta: dos(valorVenta),
    baseIgv: dos(valorVenta),
    porcentajeIgv: d.tipoAfectacionIgv === '10' ? aDecimal(tasaIgv).toString() : '0',
    igv: dos(igv),
    afectacion: d.tipoAfectacionIgv,
    totalImpuestos: dos(igv.plus(icbper)),
    icbper: dos(icbper),
    bolsas: d.cantidadBolsasIcbper,
    factorIcbper: d.cantidadBolsasIcbper > 0 ? icbper.div(d.cantidadBolsasIcbper).toFixed(2) : '0.00',
  };
}

function armarComprobante(f, { tasaIgv, cuentaDetracciones = null }) {
  const igv = aDecimal(f.igv);
  const icbper = aDecimal(f.totalIcbper);
  const total = aDecimal(f.total);
  const comprobante = {
    tipoDoc: f.tipoComprobante,
    serie: f.serie,
    correlativo: String(f.numero),
    fechaEmision: isoLima(f.fechaEmision),
    tipoOperacion: f.tipoOperacion,
    moneda: f.moneda,
    cliente: {
      tipoDoc: codigoDocIdentidad(f.cliente.tipoDocumento),
      numDoc: f.cliente.numeroDocumento || '-',
      razonSocial: f.cliente.razonSocial,
      direccion: f.cliente.direccion || null,
    },
    totales: {
      gravadas: dos(f.totalGravadas),
      exoneradas: dos(f.totalExoneradas),
      inafectas: dos(f.totalInafectas),
      exportacion: dos(f.totalExportacion),
      igv: dos(igv),
      icbper: dos(icbper),
      totalImpuestos: dos(igv.plus(icbper)),
      valorVenta: dos(f.subtotal),
      subTotal: dos(total),
      total: dos(total),
    },
    lineas: [...f.detalles].sort((a, b) => a.orden - b.orden).map((d) => armarLinea(d, tasaIgv)),
    leyendas: [{ codigo: LEYENDAS.MONTO_EN_LETRAS, valor: f.montoEnLetras }],
    formaPago: null,
    detraccion: null,
    percepcion: null,
    retencion: null,
    documentoAfectado: null,
  };

  if (f.tipoComprobante === '07' || f.tipoComprobante === '08') {
    comprobante.documentoAfectado = {
      tipoDoc: f.docRelacionadoTipo,
      numero: `${f.docRelacionadoSerie}-${f.docRelacionadoNumero}`,
      motivoCodigo: f.motivoCodigo,
      motivoDescripcion: f.motivoDescripcion,
    };
    return comprobante;
  }

  comprobante.formaPago = f.formaPago === 'Credito'
    ? {
      tipo: 'Credito',
      monto: dos(f.netoPendiente),
      cuotas: f.cuotas.map((c) => ({ monto: dos(c.monto), fechaPago: fechaLima(c.fechaVencimiento) })),
    }
    : { tipo: 'Contado' };

  if (f.detraccionCodigo) {
    comprobante.detraccion = {
      codigo: f.detraccionCodigo,
      porcentaje: aDecimal(f.detraccionPorcentaje).toString(),
      monto: dos(f.detraccionMonto),
      cuentaBanco: cuentaDetracciones,
      medioPago: '001',
    };
    comprobante.leyendas.push({ codigo: LEYENDAS.DETRACCION, valor: TEXTO_LEYENDA_DETRACCION });
  }
  if (f.percepcionRegimen) {
    comprobante.percepcion = {
      regimen: f.percepcionRegimen,
      porcentaje: aDecimal(f.percepcionPorcentaje).toString(),
      base: dos(f.percepcionBase),
      monto: dos(f.percepcionMonto),
      total: dos(total.plus(aDecimal(f.percepcionMonto))),
    };
  }
  if (f.retencionMonto) {
    comprobante.retencion = {
      porcentaje: aDecimal(f.retencionPorcentaje).toString(),
      base: dos(total),
      monto: dos(f.retencionMonto),
    };
  }
  return comprobante;
}

function armarBaja({ correlativo, fechaGeneracion, fechaReferencia, items }) {
  return {
    correlativo: String(correlativo),
    fecGeneracion: fechaReferencia,
    fecComunicacion: fechaGeneracion,
    detalles: items.map(({ factura, motivo }) => ({
      tipoDoc: factura.tipoComprobante, serie: factura.serie, correlativo: String(factura.numero), motivo,
    })),
  };
}

// Greenter escribe <cbc:Percent> en el resumen: sin él SUNAT rechaza el RC (2992, tasa del tributo faltante).
function porcentajeIgvResumen(f) {
  if (aDecimal(f.igv).isZero()) return '0';
  return f.empresa && f.empresa.taxRate != null ? aDecimal(f.empresa.taxRate).toString() : '18';
}

function armarResumen({ correlativo, fechaGeneracion, fechaReferencia, items }) {
  return {
    correlativo: String(correlativo),
    fecGeneracion: fechaReferencia,
    fecResumen: fechaGeneracion,
    moneda: items[0].factura.moneda,
    detalles: items.map(({ factura: f }) => ({
      tipoDoc: f.tipoComprobante,
      serieNro: `${f.serie}-${f.numero}`,
      estado: '3', // 3 = anulado
      clienteTipo: codigoDocIdentidad(f.cliente.tipoDocumento),
      clienteNro: f.cliente.numeroDocumento || '-',
      total: dos(f.total),
      gravadas: dos(f.totalGravadas),
      exoneradas: dos(f.totalExoneradas),
      inafectas: dos(f.totalInafectas),
      exportacion: dos(f.totalExportacion),
      igv: dos(f.igv),
      icbper: dos(f.totalIcbper),
      porcentajeIgv: porcentajeIgvResumen(f),
      docReferencia: f.docRelacionadoSerie
        ? { tipoDoc: f.docRelacionadoTipo, numero: `${f.docRelacionadoSerie}-${f.docRelacionadoNumero}` }
        : null,
    })),
  };
}

function nombreBase(empresa, f) {
  return `${empresa.ruc}-${f.tipoComprobante}-${f.serie}-${f.numero}`;
}

module.exports = { armarEmisor, armarComprobante, armarBaja, armarResumen, nombreBase };
