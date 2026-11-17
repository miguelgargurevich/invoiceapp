// Qué se avisa por push y con qué texto. Ver docs/push/README.md (la lista y el porqué).
// Solo cuatro cosas valen un aviso: algo que pasó y el dueño tiene que saber (o hacer) hoy.
//   1. Un cliente firmó una proforma o una factura        → firmaRecibida
//   2. SUNAT rechazó un comprobante                        → comprobanteRechazado
//   3. Un comprobante se quedó sin enviar a SUNAT a tiempo → envioFueraDePlazo
//   4. Hay facturas vencidas por cobrar (resumen diario)   → facturasVencidas
//
// El texto lleva solo lo mínimo para decidir si abrir la app: el tipo de documento y su número, o una cuenta. NUNCA montos, nombres
// de clientes, RUC, correos (la pantalla bloqueada los muestra a cualquiera). Las rutas llevan el idioma (/es/…): la web siempre lo usa.

const { servicioPushApagado } = require('./servicio');

const ZONA = 'America/Lima';
const HORA_DESDE = 9; // el resumen diario no sale de madrugada
const HORA_HASTA = 20;

function diaYHoraLima(fecha) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(fecha)
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return { dia: `${partes.year}-${partes.month}-${partes.day}`, hora: Number(partes.hour) };
}

const numeroDe = (f) => (f.serie && f.numero != null ? `${f.serie}-${f.numero}` : null);

function crearAvisos({ prisma, servicio = servicioPushApagado, ahora = () => new Date() }) {
  return {
    /** Un cliente firmó. `solicitud` es la SignatureRequest ya cargada (con `factura` o `proforma`). Avisa a quien la pidió. */
    async firmaRecibida(solicitud) {
      const esProforma = solicitud.documentType === 'PROFORMA';
      const doc = esProforma ? solicitud.proforma : solicitud.factura;
      if (!solicitud.requestedBy || !solicitud.empresaId) return;
      const numero = doc ? numeroDe(doc) : null;
      const que = esProforma ? 'proforma' : 'factura';
      const ruta = !doc ? '/es/dashboard'
        : esProforma ? `/es/proformas/${doc.id}`
          : `/es/${doc.tipoComprobante ? 'comprobantes' : 'facturas'}/${doc.id}`;
      return servicio.avisar({
        userId: solicitud.requestedBy,
        empresaId: solicitud.empresaId,
        clave: `firma:${solicitud.id}`,
        titulo: esProforma ? 'Proforma aceptada' : 'Factura firmada',
        cuerpo: numero ? `Tu cliente firmó la ${que} ${numero}.` : `Tu cliente firmó la ${que}.`,
        ruta,
      });
    },

    /** SUNAT rechazó el comprobante: el dueño tiene que corregirlo. */
    async comprobanteRechazado(facturaId) {
      const f = await prisma.factura.findUnique({
        where: { id: facturaId },
        select: { id: true, serie: true, numero: true, empresaId: true, empresa: { select: { userId: true } } },
      });
      if (!f) return;
      const numero = numeroDe(f);
      return servicio.avisar({
        userId: f.empresa.userId,
        empresaId: f.empresaId,
        clave: `sunat-rechazo:${f.id}`,
        titulo: 'SUNAT rechazó un comprobante',
        cuerpo: numero ? `${numero} fue rechazado. Revísalo y corrígelo.` : 'Un comprobante fue rechazado. Revísalo y corrígelo.',
        ruta: `/es/comprobantes/${f.id}`,
      });
    },

    /** El comprobante no llegó a SUNAT dentro del plazo y se dejó de reintentar. */
    async envioFueraDePlazo(facturaId) {
      const f = await prisma.factura.findUnique({
        where: { id: facturaId },
        select: { id: true, serie: true, numero: true, empresaId: true, empresa: { select: { userId: true } } },
      });
      if (!f) return;
      const numero = numeroDe(f);
      return servicio.avisar({
        userId: f.empresa.userId,
        empresaId: f.empresaId,
        clave: `sunat-plazo:${f.id}`,
        titulo: 'Comprobante sin enviar a SUNAT',
        cuerpo: numero ? `${numero} no se pudo enviar a tiempo. Reinténtalo desde la app.` : 'Un comprobante no se pudo enviar a tiempo. Reinténtalo desde la app.',
        ruta: `/es/comprobantes/${f.id}`,
      });
    },

    /**
     * El resumen diario de facturas vencidas con saldo pendiente (la misma definición del dashboard: estado «emitida», fecha de vencimiento
     * pasada y pagos menores al total). Solo para empresas con algún dispositivo. Una vez por empresa y por día de Lima, entre las 9 y las 20 h.
     */
    async facturasVencidas() {
      if (!servicio.activo()) return { omitido: 'apagado' };
      const ahoraDate = ahora();
      const { dia, hora } = diaYHoraLima(ahoraDate);
      if (hora < HORA_DESDE || hora >= HORA_HASTA) return { omitido: 'fuera-de-horario' };

      const destinos = await prisma.dispositivoPush.findMany({ select: { userId: true, empresaId: true }, distinct: ['userId', 'empresaId'] });
      let avisados = 0;
      for (const { userId, empresaId } of destinos) {
        const facturas = await prisma.factura.findMany({
          where: { empresaId, estado: 'emitida', fechaVencimiento: { lt: ahoraDate, not: null } },
          select: { total: true, pagos: { select: { monto: true } } },
        });
        const n = facturas.filter((f) => Number(f.total) - f.pagos.reduce((s, p) => s + Number(p.monto), 0) > 0).length;
        if (n === 0) continue;
        const r = await servicio.avisar({
          userId,
          empresaId,
          clave: `vencidas:${empresaId}:${dia}`,
          titulo: 'Facturas vencidas',
          cuerpo: n === 1 ? 'Tienes 1 factura vencida por cobrar.' : `Tienes ${n} facturas vencidas por cobrar.`,
          ruta: '/es/facturas',
        });
        if (r?.motivo === 'enviado') avisados += 1;
      }
      return { avisados };
    },
  };
}

/** Revisa cada hora si toca el resumen diario. `unref`: el temporizador no impide que el proceso termine. Devuelve cómo detenerlo. */
function programarVencidas({ avisos, cadaMs = 60 * 60 * 1000, primeraVezMs = 2 * 60 * 1000, log = console }) {
  let corriendo = false;
  const correr = async () => {
    if (corriendo) return;
    corriendo = true;
    try { await avisos.facturasVencidas(); } catch (error) {
      log.error(`[Push] El resumen de facturas vencidas falló: ${String(error?.message || error).split('\n')[0].slice(0, 120)}`);
    } finally { corriendo = false; }
  };
  const inicial = setTimeout(correr, primeraVezMs);
  const periodico = setInterval(correr, cadaMs);
  inicial.unref?.();
  periodico.unref?.();
  return () => { clearTimeout(inicial); clearInterval(periodico); };
}

module.exports = { crearAvisos, programarVencidas, diaYHoraLima };
