const { calcularComprobante } = require('../calculo/calcular');
const { verificarCupo } = require('../../planes/cupo');
const { INCLUDE_COMPROBANTE, entradaCalculo, datosDesdeFactura } = require('./borradores');
const { validarParaEmision } = require('./validacion');
const { ESTADO, clasificarRespuesta } = require('./estados');
const { armarEmisor, armarComprobante, nombreBase } = require('../engine/mapper');
const { dos } = require('../numeros');
const {
  ErrorEstado, ErrorValidacion, ErrorEngineNoDisponible, ErrorConstruccion,
} = require('../errores');

const ACEPTADOS = [ESTADO.ACEPTADO, ESTADO.ACEPTADO_CON_OBS];

function claveArchivo(empresa, f, numero, extension) {
  return `sunat/${empresa.id}/${nombreBase(empresa, { ...f, numero })}.${extension}`;
}

function crearServicioEmision({ prisma, engine, almacen, descifrar, cola, ahora = () => new Date() }) {
  async function emitir(facturaId, empresaId) {
    const id = await prisma.$transaction(async (tx) => {
      // Bloquea la fila antes de leerla: una segunda emisión (o una edición) del mismo borrador espera
      // aquí y, al continuar, ya ve el estado nuevo en vez de pasar también el chequeo de BORRADOR.
      await tx.$queryRaw`
        SELECT id FROM facturas
        WHERE id = ${facturaId} AND empresa_id = ${empresaId}
        FOR UPDATE`;
      const f = await tx.factura.findFirst({ where: { id: facturaId, empresaId }, include: INCLUDE_COMPROBANTE });
      if (!f) throw new ErrorEstado('Comprobante no encontrado');
      if (f.estadoSunat !== ESTADO.BORRADOR) throw new ErrorEstado('Solo se puede emitir un comprobante en borrador');

      const emisor = f.empresa.emisorSunat;
      const fecha = ahora();
      await verificarCupo(tx, empresaId, fecha);
      const errores = validarParaEmision(f, emisor, fecha);
      if (errores.length) throw new ErrorValidacion(errores);

      // Los parámetros (p. ej. tarifa ICBPER) pudieron cambiar desde que se guardó el borrador.
      const recalculo = calcularComprobante(entradaCalculo(datosDesdeFactura(f), f.empresa, f.cliente, fecha));
      if (recalculo.totales.total !== dos(f.total)) {
        throw new ErrorValidacion(['Los montos cambiaron con los parámetros vigentes: vuelve a guardar el borrador antes de emitir']);
      }

      const filas = await tx.$queryRaw`
        SELECT id, ultimo_numero FROM configuracion_series
        WHERE empresa_id = ${empresaId} AND tipo_documento = ${f.tipoComprobante} AND serie = ${f.serie} AND activa = true
        FOR UPDATE`;
      if (filas.length === 0) throw new ErrorValidacion([`La serie ${f.serie} no está configurada`]);
      const numero = Number(filas[0].ultimo_numero) + 1;
      await tx.configuracionSeries.update({ where: { id: filas[0].id }, data: { ultimoNumero: numero } });

      const comprobante = armarComprobante(
        { ...f, numero, fechaEmision: fecha },
        { tasaIgv: f.empresa.taxRate, cuentaDetracciones: emisor.cuentaDetracciones },
      );
      // Si el motor falla aquí, la transacción se revierte y el número no se consume.
      const firma = await engine.firmar(armarEmisor(f.empresa, emisor, descifrar), comprobante);
      const xmlKey = claveArchivo(f.empresa, f, numero, 'xml');
      await almacen.guardar(xmlKey, Buffer.from(firma.xmlBase64, 'base64'), 'application/xml');

      await tx.factura.update({
        where: { id: f.id },
        data: { numero, fechaEmision: fecha, estadoSunat: ESTADO.PENDIENTE_ENVIO, hashSunat: firma.hash, xmlKey },
      });
      return f.id;
    }, { timeout: 30000 });

    await cola.encolarEnvio(id);
    return prisma.factura.findUnique({ where: { id } });
  }

  async function llamarRegistrando(facturaId, operacion, llamada) {
    const inicio = Date.now();
    let respuesta;
    try {
      respuesta = await llamada();
    } catch (error) {
      if (!(error instanceof ErrorEngineNoDisponible || error instanceof ErrorConstruccion)) throw error;
      respuesta = { codigo: null, descripcion: error.message, observaciones: [], cdrZipBase64: null, excepcion: true };
    }
    const estado = clasificarRespuesta(respuesta);
    await prisma.envioSunat.create({
      data: {
        facturaId,
        operacion,
        codigo: respuesta.codigo ?? null,
        mensaje: respuesta.descripcion ?? null,
        exito: ACEPTADOS.includes(estado),
        duracionMs: Date.now() - inicio,
      },
    });
    return { respuesta, estado };
  }

  async function procesarEnvio(facturaId) {
    const f = await prisma.factura.findUnique({ where: { id: facturaId }, include: INCLUDE_COMPROBANTE });
    if (!f || ![ESTADO.PENDIENTE_ENVIO, ESTADO.ERROR_TEMPORAL].includes(f.estadoSunat)) {
      return { omitido: true, estado: f?.estadoSunat ?? null };
    }

    const emisor = armarEmisor(f.empresa, f.empresa.emisorSunat, descifrar);
    const xml = await almacen.leer(f.xmlKey);
    let { respuesta, estado } = await llamarRegistrando(f.id, 'sendBill', () => engine.enviar(emisor, {
      tipoDoc: f.tipoComprobante, nombre: nombreBase(f.empresa, f), xmlBase64: xml.toString('base64'),
    }));

    if (estado === 'CONSULTAR_CDR') {
      ({ respuesta, estado } = await llamarRegistrando(f.id, 'getStatusCdr', () => engine.consultarCdr(emisor, {
        tipoDoc: f.tipoComprobante, serie: f.serie, correlativo: String(f.numero),
      })));
      if (estado === 'CONSULTAR_CDR') estado = ESTADO.ERROR_TEMPORAL;
    }

    let { cdrKey } = f;
    if (respuesta.cdrZipBase64) {
      cdrKey = claveArchivo(f.empresa, f, f.numero, 'cdr.zip');
      await almacen.guardar(cdrKey, Buffer.from(respuesta.cdrZipBase64, 'base64'), 'application/zip');
    }

    const intentos = f.intentosEnvio + 1;
    await prisma.factura.update({
      where: { id: f.id },
      data: {
        estadoSunat: estado,
        codigoRespuestaSunat: respuesta.codigo ?? null,
        mensajeRespuestaSunat: respuesta.descripcion ?? null,
        ...(respuesta.observaciones?.length ? { observacionesSunat: respuesta.observaciones } : {}),
        cdrKey,
        intentosEnvio: intentos,
        fechaEnvioSunat: ahora(),
        enviadoSunat: ACEPTADOS.includes(estado),
      },
    });
    return { estado, intentos, fechaEmision: f.fechaEmision };
  }

  return { emitir, procesarEnvio };
}

module.exports = { crearServicioEmision, claveArchivo };
