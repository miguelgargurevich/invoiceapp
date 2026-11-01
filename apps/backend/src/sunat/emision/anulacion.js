const { INCLUDE_COMPROBANTE } = require('./borradores');
const { ESTADO } = require('./estados');
const { dentroDePlazoBaja } = require('./plazos');
const { armarEmisor, armarBaja, armarResumen } = require('../engine/mapper');
const { fechaLima } = require('../fechas');
const {
  ErrorEstado, ErrorFueraDePlazo, ErrorValidacion, ErrorEngineNoDisponible,
} = require('../errores');

const ACEPTADOS = [ESTADO.ACEPTADO, ESTADO.ACEPTADO_CON_OBS];

function crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola, ahora = () => new Date() }) {
  async function solicitarAnulacion(facturaId, empresaId, motivo) {
    const motivoLimpio = String(motivo || '').trim();
    if (!motivoLimpio) throw new ErrorValidacion(['Indica el motivo de la anulación']);

    const procesoId = await prisma.$transaction(async (tx) => {
      // Bloquea la fila antes de leerla: una segunda solicitud del mismo comprobante espera aquí y,
      // al continuar, ya lo ve en ANULACION_PENDIENTE en vez de pasar también el chequeo de estado.
      await tx.$queryRaw`
        SELECT id FROM facturas
        WHERE id = ${facturaId} AND empresa_id = ${empresaId}
        FOR UPDATE`;
      const f = await tx.factura.findFirst({ where: { id: facturaId, empresaId }, include: INCLUDE_COMPROBANTE });
      if (!f) throw new ErrorEstado('Comprobante no encontrado');
      if (!ACEPTADOS.includes(f.estadoSunat)) throw new ErrorEstado('Solo se puede anular un comprobante aceptado por SUNAT');
      const fecha = ahora();
      if (!dentroDePlazoBaja(f.fechaEmision, fecha)) {
        throw new ErrorFueraDePlazo('El plazo para dar de baja este comprobante venció: emite una nota de crédito por anulación');
      }

      const tipo = f.serie.startsWith('B') ? 'RC' : 'RA';
      const fechaGeneracion = fechaLima(fecha);
      const fechaReferencia = fechaLima(f.fechaEmision);

      // Correlativo diario por empresa y tipo, serializado con un candado de transacción.
      await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext(${`${empresaId}:${tipo}`}))) AS candado`;
      const [{ siguiente }] = await tx.$queryRaw`
        SELECT (COALESCE(MAX(correlativo), 0) + 1)::int AS siguiente FROM procesos_sunat
        WHERE empresa_id = ${empresaId} AND tipo = ${tipo} AND fecha_generacion = ${fechaGeneracion}::date`;

      const emisor = armarEmisor(f.empresa, f.empresa.emisorSunat, descifrar);
      const datos = { correlativo: siguiente, fechaGeneracion, fechaReferencia, items: [{ factura: f, motivo: motivoLimpio }] };
      const r = tipo === 'RC'
        ? await engine.enviarResumen(emisor, armarResumen(datos))
        : await engine.enviarBaja(emisor, armarBaja(datos));
      if (!r.ticket) {
        throw new ErrorValidacion([`SUNAT no recibió la anulación: ${r.descripcion || 'sin detalle'}`]);
      }

      const xmlKey = `sunat/${empresaId}/${f.empresa.ruc}-${tipo}-${fechaGeneracion.replaceAll('-', '')}-${siguiente}.xml`;
      if (r.xmlBase64) await almacen.guardar(xmlKey, Buffer.from(r.xmlBase64, 'base64'), 'application/xml');

      const proceso = await tx.procesoSunat.create({
        data: {
          empresaId,
          tipo,
          fechaGeneracion: new Date(`${fechaGeneracion}T00:00:00Z`),
          fechaReferencia: new Date(`${fechaReferencia}T00:00:00Z`),
          correlativo: siguiente,
          ticket: r.ticket,
          estado: 'ENVIADO',
          xmlKey,
          items: { create: [{ facturaId: f.id, motivo: motivoLimpio, estadoPrevio: f.estadoSunat }] },
        },
      });
      await tx.factura.update({ where: { id: f.id }, data: { estadoSunat: ESTADO.ANULACION_PENDIENTE } });
      return proceso.id;
    }, { timeout: 60000 });

    await cola.encolarTicket(procesoId, 30);
    return procesoId;
  }

  async function procesarTicket(procesoId) {
    const p = await prisma.procesoSunat.findUnique({
      where: { id: procesoId },
      include: { items: true, empresa: { include: { emisorSunat: true } } },
    });
    if (!p || p.estado !== 'ENVIADO') return { omitido: true };

    const emisor = armarEmisor(p.empresa, p.empresa.emisorSunat, descifrar);
    const inicio = Date.now();
    let r;
    try {
      r = await engine.consultarTicket(emisor, p.ticket);
    } catch (error) {
      if (error instanceof ErrorEngineNoDisponible) return { pendiente: true };
      throw error;
    }
    await prisma.envioSunat.create({
      data: {
        procesoId: p.id, operacion: 'getStatus', codigo: r.codigo ?? null, mensaje: r.descripcion ?? null,
        exito: r.codigo === '0', duracionMs: Date.now() - inicio,
      },
    });
    if (r.pendiente) return { pendiente: true };

    let cdrKey = null;
    if (r.cdrZipBase64) {
      cdrKey = p.xmlKey.replace(/\.xml$/, '.cdr.zip');
      await almacen.guardar(cdrKey, Buffer.from(r.cdrZipBase64, 'base64'), 'application/zip');
    }
    const aceptado = r.codigo === '0';
    await prisma.$transaction([
      prisma.procesoSunat.update({
        where: { id: p.id },
        data: { estado: aceptado ? 'ACEPTADO' : 'RECHAZADO', codigoRespuesta: r.codigo ?? null, mensajeRespuesta: r.descripcion ?? null, cdrKey },
      }),
      ...p.items.map((item) => prisma.factura.update({
        where: { id: item.facturaId },
        data: aceptado
          ? { estadoSunat: ESTADO.ANULADO, estado: 'anulada' }
          : { estadoSunat: item.estadoPrevio, mensajeRespuestaSunat: `Anulación rechazada: ${r.descripcion || r.codigo}` },
      })),
    ]);
    return { pendiente: false, aceptado };
  }

  return { solicitarAnulacion, procesarTicket };
}

module.exports = { crearServicioAnulacion };
