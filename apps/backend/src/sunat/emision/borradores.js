const { z } = require('zod');
const { calcularComprobante } = require('../calculo/calcular');
const { codigoUnidad, MOTIVOS_NOTA_CREDITO, MOTIVOS_NOTA_DEBITO } = require('../catalogos');
const { fechaLima } = require('../fechas');
const { ErrorBorrador } = require('../errores');

const ESTADOS_ACEPTADOS = ['ACEPTADO', 'ACEPTADO_CON_OBS'];

// Uso interno: trae los secretos cifrados del emisor. NUNCA se envía en una respuesta HTTP.
const INCLUDE_COMPROBANTE = {
  detalles: { orderBy: { orden: 'asc' } },
  cliente: true,
  cuotas: { orderBy: { numero: 'asc' } },
  empresa: { include: { emisorSunat: true } },
};

const INCLUDE_RESPUESTA = {
  detalles: { orderBy: { orden: 'asc' } },
  cliente: true,
  cuotas: { orderBy: { numero: 'asc' } },
};

const lineaSchema = z.object({
  productoId: z.string().uuid().optional(),
  codigoProducto: z.string().max(30).optional(),
  descripcion: z.string().min(1).max(500),
  cantidad: z.number().positive(),
  unidad: z.string().default('NIU'),
  precio: z.number().min(0),
  precioIncluyeIgv: z.boolean().default(true),
  descuento: z.number().min(0).default(0),
  afectacion: z.enum(['10', '20', '30', '40']).default('10'),
  bolsasIcbper: z.number().int().min(0).default(0),
});

const comprobanteSchema = z.object({
  tipoComprobante: z.enum(['01', '03', '07', '08']),
  serie: z.string().regex(/^[FB][A-Z0-9]{3}$/, 'La serie debe tener 4 caracteres y empezar con F o B'),
  clienteId: z.string().uuid(),
  tipoOperacion: z.enum(['0101', '0200', '1001']).default('0101'),
  moneda: z.enum(['PEN', 'USD', 'EUR']).default('PEN'),
  tipoCambio: z.number().positive().optional(),
  observaciones: z.string().max(1000).optional(),
  fechaVencimiento: z.string().datetime().optional(),
  lineas: z.array(lineaSchema).min(1),
  detraccion: z.object({ codigo: z.string() }).optional(),
  percepcion: z.object({ regimen: z.string() }).optional(),
  formaPago: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('Contado') }),
    z.object({
      tipo: z.literal('Credito'),
      cuotas: z.array(z.object({
        monto: z.number().positive(),
        fechaVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato AAAA-MM-DD'),
      })).min(1),
    }),
  ]).default({ tipo: 'Contado' }),
  documentoAfectado: z.object({
    facturaId: z.string().uuid(),
    motivoCodigo: z.string(),
    motivoDescripcion: z.string().max(250).optional(),
  }).optional(),
});

function entradaCalculo(datos, empresa, cliente, fecha = new Date()) {
  return {
    tipoOperacion: datos.tipoOperacion,
    tasaIgv: Number(empresa.taxRate ?? 18),
    moneda: datos.moneda,
    tipoCambio: datos.tipoCambio,
    fechaEmision: fecha,
    retencion: Boolean(cliente?.esAgenteRetencion),
    lineas: datos.lineas,
    detraccion: datos.detraccion,
    percepcion: datos.percepcion,
    formaPago: datos.formaPago,
  };
}

function datosDesdeFactura(f) {
  const datos = {
    tipoComprobante: f.tipoComprobante,
    serie: f.serie,
    clienteId: f.clienteId,
    tipoOperacion: f.tipoOperacion,
    moneda: f.moneda,
    lineas: f.detalles.map((d) => ({
      ...(d.productoId ? { productoId: d.productoId } : {}),
      ...(d.codigoProductoSunat ? { codigoProducto: d.codigoProductoSunat } : {}),
      descripcion: d.descripcion,
      cantidad: Number(d.cantidad),
      unidad: d.codigoUnidadSunat,
      precio: Number(d.precioUnitario),
      precioIncluyeIgv: d.precioIncluyeIgv,
      descuento: Number(d.descuento),
      afectacion: d.tipoAfectacionIgv,
      bolsasIcbper: d.cantidadBolsasIcbper,
    })),
    formaPago: f.formaPago === 'Credito'
      ? { tipo: 'Credito', cuotas: f.cuotas.map((c) => ({ monto: Number(c.monto), fechaVencimiento: fechaLima(c.fechaVencimiento) })) }
      : { tipo: 'Contado' },
  };
  if (f.tipoCambio) datos.tipoCambio = Number(f.tipoCambio);
  if (f.observaciones) datos.observaciones = f.observaciones;
  if (f.detraccionCodigo) datos.detraccion = { codigo: f.detraccionCodigo };
  if (f.percepcionRegimen) datos.percepcion = { regimen: f.percepcionRegimen };
  if (f.docRelacionadoId) {
    datos.documentoAfectado = {
      facturaId: f.docRelacionadoId,
      motivoCodigo: f.motivoCodigo,
      ...(f.motivoDescripcion ? { motivoDescripcion: f.motivoDescripcion } : {}),
    };
  }
  return datos;
}

async function cargarContexto(prisma, empresa, datos) {
  const cliente = await prisma.cliente.findFirst({ where: { id: datos.clienteId, empresaId: empresa.id } });
  if (!cliente) throw new ErrorBorrador('Cliente no encontrado');
  const emisor = await prisma.emisorSunat.findUnique({ where: { empresaId: empresa.id } });
  if (datos.percepcion && !emisor?.esAgentePercepcion) {
    throw new ErrorBorrador('Solo un agente de percepción puede cobrar percepción');
  }
  return { cliente, emisor };
}

async function previsualizar({ prisma, empresa, datos }) {
  const d = comprobanteSchema.parse(datos);
  const { cliente } = await cargarContexto(prisma, empresa, d);
  return calcularComprobante(entradaCalculo(d, empresa, cliente));
}

function motivoDescripcion(d) {
  if (!d.documentoAfectado) return null;
  const catalogo = d.tipoComprobante === '07' ? MOTIVOS_NOTA_CREDITO : MOTIVOS_NOTA_DEBITO;
  const descripcion = d.documentoAfectado.motivoDescripcion || catalogo[d.documentoAfectado.motivoCodigo];
  if (!descripcion) throw new ErrorBorrador('Motivo de la nota no válido');
  return descripcion;
}

function camposFactura(d, calculo, afectado) {
  const t = calculo.totales;
  return {
    tipoComprobante: d.tipoComprobante,
    serie: d.serie,
    clienteId: d.clienteId,
    tipoOperacion: calculo.tipoOperacion,
    moneda: d.moneda,
    tipoCambio: d.tipoCambio ?? null,
    observaciones: d.observaciones ?? null,
    fechaVencimiento: d.fechaVencimiento ? new Date(d.fechaVencimiento) : null,
    formaPago: calculo.formaPago,
    subtotal: t.valorVenta,
    descuento: t.descuento,
    igv: t.igv,
    total: t.total,
    totalGravadas: t.gravadas,
    totalExoneradas: t.exoneradas,
    totalInafectas: t.inafectas,
    totalExportacion: t.exportacion,
    totalIcbper: t.icbper,
    montoEnLetras: calculo.leyendas[0].valor,
    detraccionCodigo: calculo.detraccion?.codigo ?? null,
    detraccionPorcentaje: calculo.detraccion?.porcentaje ?? null,
    detraccionMonto: calculo.detraccion?.monto ?? null,
    percepcionRegimen: calculo.percepcion?.regimen ?? null,
    percepcionPorcentaje: calculo.percepcion?.porcentaje ?? null,
    percepcionBase: calculo.percepcion?.base ?? null,
    percepcionMonto: calculo.percepcion?.monto ?? null,
    retencionPorcentaje: calculo.retencion?.porcentaje ?? null,
    retencionMonto: calculo.retencion?.monto ?? null,
    netoPendiente: calculo.netoPendiente,
    docRelacionadoId: afectado?.id ?? null,
    docRelacionadoTipo: afectado?.tipoComprobante ?? null,
    docRelacionadoSerie: afectado?.serie ?? null,
    docRelacionadoNumero: afectado?.numero ?? null,
    motivoCodigo: d.documentoAfectado?.motivoCodigo ?? null,
    motivoDescripcion: motivoDescripcion(d),
  };
}

function detallesFactura(d, calculo) {
  return calculo.lineas.map((l, i) => ({
    productoId: d.lineas[i].productoId ?? null,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    unidadMedida: l.unidad,
    codigoUnidadSunat: codigoUnidad(l.unidad),
    precioUnitario: l.precio,
    precioIncluyeIgv: l.precioIncluyeIgv,
    valorUnitario: l.valorUnitario,
    precioUnitarioIgv: l.precioUnitario,
    descuento: l.descuento,
    subtotal: l.valorVenta,
    igv: l.igv,
    icbper: l.icbper,
    cantidadBolsasIcbper: l.bolsasIcbper,
    total: l.total,
    tipoAfectacionIgv: l.afectacion,
    codigoProductoSunat: l.codigoProducto,
    orden: i,
  }));
}

function cuotasFactura(calculo) {
  return calculo.cuotas.map((c) => ({
    numero: c.numero,
    monto: c.monto,
    // Mediodía en Lima para que fechaLima() devuelva siempre el mismo día.
    fechaVencimiento: new Date(`${c.fechaVencimiento}T12:00:00-05:00`),
  }));
}

async function guardarBorrador({ prisma, empresa, userId, datos, facturaId = null }) {
  const d = comprobanteSchema.parse(datos);
  const { cliente } = await cargarContexto(prisma, empresa, d);

  const serie = await prisma.configuracionSeries.findFirst({
    where: { empresaId: empresa.id, tipoDocumento: d.tipoComprobante, serie: d.serie, activa: true },
  });
  if (!serie) throw new ErrorBorrador(`La serie ${d.serie} no está configurada para este tipo de comprobante`);

  let afectado = null;
  if (d.documentoAfectado) {
    afectado = await prisma.factura.findFirst({ where: { id: d.documentoAfectado.facturaId, empresaId: empresa.id } });
    if (!afectado || !ESTADOS_ACEPTADOS.includes(afectado.estadoSunat)) {
      throw new ErrorBorrador('El comprobante que modifica la nota debe estar aceptado por SUNAT');
    }
  }
  if (['07', '08'].includes(d.tipoComprobante) && !afectado) {
    throw new ErrorBorrador('Una nota debe indicar el comprobante que modifica');
  }

  const calculo = calcularComprobante(entradaCalculo(d, empresa, cliente));
  const campos = camposFactura(d, calculo, afectado);
  const detalles = detallesFactura(d, calculo);
  const cuotas = cuotasFactura(calculo);

  if (facturaId) {
    const actual = await prisma.factura.findFirst({ where: { id: facturaId, empresaId: empresa.id } });
    if (!actual) throw new ErrorBorrador('Comprobante no encontrado');
    if (actual.estadoSunat !== 'BORRADOR') throw new ErrorBorrador('Solo se puede editar un comprobante en borrador');
    return prisma.$transaction(async (tx) => {
      await tx.detalleFactura.deleteMany({ where: { facturaId } });
      await tx.cuotaFactura.deleteMany({ where: { facturaId } });
      return tx.factura.update({
        where: { id: facturaId },
        data: { ...campos, detalles: { create: detalles }, cuotas: { create: cuotas } },
        include: INCLUDE_RESPUESTA,
      });
    });
  }

  return prisma.factura.create({
    data: {
      ...campos,
      empresaId: empresa.id,
      userId,
      estadoSunat: 'BORRADOR',
      numero: null,
      fechaEmision: new Date(),
      detalles: { create: detalles },
      cuotas: { create: cuotas },
    },
    include: INCLUDE_RESPUESTA,
  });
}

module.exports = {
  comprobanteSchema,
  INCLUDE_COMPROBANTE,
  INCLUDE_RESPUESTA,
  entradaCalculo,
  datosDesdeFactura,
  previsualizar,
  guardarBorrador,
};
