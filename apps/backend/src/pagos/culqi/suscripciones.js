// Contratar, cancelar y sincronizar suscripciones de Culqi (planes de Perú).
const { planGratisDe } = require('../../planes/catalogo');

class ErrorContratacion extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorContratacion'; }
}

const INTERVALO_A_DIAS = { MONTH: 31, YEAR: 366 };
// Culqi solo acepta letras y espacios en nombres (incluye tildes y ñ).
const soloLetras = (s) => String(s || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, '').replace(/\s+/g, ' ').trim();

// Busca un id de suscripción (sxn_…) dentro del data del evento, venga como objeto o como string JSON.
function idSuscripcion(data) {
  let d = data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return null; } }
  const pila = [d];
  while (pila.length) {
    const v = pila.pop();
    if (typeof v === 'string' && /^sxn_(test|live)_/.test(v)) return v;
    if (v && typeof v === 'object') pila.push(...Object.values(v));
  }
  return null;
}

function crearServicioCulqi({ prisma, culqi, ahora = () => new Date() }) {
  // Un pago a la vez por empresa: un doble clic no debe crear dos suscripciones (dos cobros) en Culqi.
  // Vale para una sola instancia del backend; con varias, hará falta un candado en la BD.
  const enCurso = new Set();

  async function asegurarCliente(sub, { empresa, email, facturacion }) {
    if (sub.culqiCustomerId) return sub.culqiCustomerId;
    let cliente;
    try {
      cliente = await culqi.crearCliente({
        first_name: soloLetras(facturacion.nombre),
        last_name: soloLetras(facturacion.apellido),
        email,
        address: String(facturacion.direccion).slice(0, 100),
        address_city: String(facturacion.ciudad).slice(0, 30),
        country_code: 'PE',
        phone_number: String(facturacion.telefono).replace(/\D/g, '').slice(0, 15),
        metadata: { empresa_id: empresa.id },
      });
    } catch (error) {
      // El email ya tiene un cliente en Culqi (p. ej. un intento anterior): se reutiliza.
      cliente = await culqi.buscarClientePorEmail(email);
      if (!cliente) throw error;
    }
    await prisma.subscription.update({ where: { id: sub.id }, data: { culqiCustomerId: cliente.id } });
    return cliente.id;
  }

  async function crearTarjeta(customerId, tokenId, authentication3DS) {
    return culqi.crearTarjeta({
      customer_id: customerId,
      token_id: tokenId,
      ...(authentication3DS ? { authentication_3DS: authentication3DS } : {}),
    });
  }

  async function suscribir(datos) {
    if (enCurso.has(datos.empresa.id)) throw new ErrorContratacion('Ya hay un pago en curso. Espera unos segundos.');
    enCurso.add(datos.empresa.id);
    try { return await contratar(datos); } finally { enCurso.delete(datos.empresa.id); }
  }

  async function contratar({ empresa, email, planSlug, intervalo, tokenId, facturacion, authentication3DS }) {
    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    const culqiPlanId = intervalo === 'YEAR' ? plan?.culqiPlanIdAnual : plan?.culqiPlanIdMensual;
    if (!plan || plan.pais !== 'PE' || !plan.isActive || Number(plan.priceMonthly) === 0 || !culqiPlanId) {
      throw new ErrorContratacion('Este plan no se puede contratar en línea');
    }
    const sub = await prisma.subscription.findUnique({ where: { empresaId: empresa.id } });
    if (!sub) throw new ErrorContratacion('Completa el asistente antes de contratar un plan');

    const customerId = await asegurarCliente(sub, { empresa, email, facturacion });
    const tarjeta = await crearTarjeta(customerId, tokenId, authentication3DS);
    if (tarjeta.requiere3DS) return { requiere3DS: true };

    const nueva = await culqi.crearSuscripcion({ card_id: tarjeta.id, plan_id: culqiPlanId, tyc: true, metadata: { empresa_id: empresa.id } });
    const anterior = sub.culqiSubscriptionId;

    const inicio = ahora();
    const fin = new Date(inicio.getTime() + INTERVALO_A_DIAS[intervalo] * 86400000);
    const subscription = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: plan.id, status: 'ACTIVE', billingInterval: intervalo, proveedorPago: 'culqi',
        culqiCardId: tarjeta.id, culqiSubscriptionId: nueva.id,
        currentPeriodStart: inicio, currentPeriodEnd: fin, cancelAtPeriodEnd: false, canceledAt: null,
        trialStart: null, trialEnd: null,
      },
      include: { plan: true },
    });

    // Cambio de plan: la anterior se cancela solo después de que la nueva existe (sin prorrateo).
    if (anterior && anterior !== nueva.id) {
      try { await culqi.cancelarSuscripcion(anterior); } catch (error) {
        console.error('[CULQI] No se pudo cancelar la suscripción anterior', anterior, error.message);
      }
    }
    return { subscription };
  }

  async function cambiarTarjeta({ empresaId, tokenId, authentication3DS }) {
    const sub = await prisma.subscription.findUnique({ where: { empresaId } });
    if (!sub?.culqiSubscriptionId || !sub.culqiCustomerId) throw new ErrorContratacion('No tienes una suscripción con Culqi');
    const tarjeta = await crearTarjeta(sub.culqiCustomerId, tokenId, authentication3DS);
    if (tarjeta.requiere3DS) return { requiere3DS: true };
    await culqi.cambiarTarjetaSuscripcion(sub.culqiSubscriptionId, tarjeta.id);
    await prisma.subscription.update({ where: { id: sub.id }, data: { culqiCardId: tarjeta.id } });
    return { ok: true };
  }

  async function cancelar(empresaId) {
    const sub = await prisma.subscription.findUnique({ where: { empresaId } });
    if (!sub?.culqiSubscriptionId) throw new ErrorContratacion('No tienes una suscripción con Culqi');
    // En Culqi la cancelación es inmediata y no hay más cobros; el plan pagado sigue hasta currentPeriodEnd.
    await culqi.cancelarSuscripcion(sub.culqiSubscriptionId);
    return prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, canceledAt: ahora() },
      include: { plan: true },
    });
  }

  async function pasarAGratis(sub) {
    const gratis = await planGratisDe(prisma, 'PE');
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: gratis.id, status: 'ACTIVE', billingInterval: 'MONTH', culqiSubscriptionId: null, culqiCardId: null,
        cancelAtPeriodEnd: false, canceledAt: ahora(), currentPeriodStart: ahora(), currentPeriodEnd: null,
      },
    });
  }

  async function procesarEvento(eventoId) {
    try {
      await prisma.eventoCulqi.create({ data: { id: eventoId, tipo: 'pendiente' } });
    } catch (error) {
      if (error.code === 'P2002') return { procesado: false };
      throw error;
    }
    try {
      // No se confía en el cuerpo del webhook (Culqi no lo firma): se vuelve a pedir con la sk.
      const evento = await culqi.consultarEvento(eventoId);
      await prisma.eventoCulqi.update({ where: { id: eventoId }, data: { tipo: String(evento.type || 'desconocido') } });
      const sxn = idSuscripcion(evento.data);
      const sub = sxn ? await prisma.subscription.findUnique({ where: { culqiSubscriptionId: sxn } }) : null;
      if (!sub) return { procesado: true };

      const remota = await culqi.consultarSuscripcion(sxn);
      if ([4, 6].includes(remota.status)) {
        // Cancelada o finalizada en Culqi. Si la canceló el usuario, conserva el plan hasta el fin del período.
        if (sub.cancelAtPeriodEnd && sub.currentPeriodEnd && sub.currentPeriodEnd > ahora()) return { procesado: true };
        await pasarAGratis(sub);
        return { procesado: true };
      }
      const data = {};
      if (remota.next_billing_date) data.currentPeriodEnd = new Date(remota.next_billing_date * 1000);
      if (evento.type === 'subscription.charge.failed') data.status = 'PAST_DUE';
      if (evento.type === 'subscription.charge.succeeded') { data.status = 'ACTIVE'; data.currentPeriodStart = ahora(); }
      if (Object.keys(data).length) await prisma.subscription.update({ where: { id: sub.id }, data });
      return { procesado: true };
    } catch (error) {
      // Se borra la marca para que el reintento de Culqi lo vuelva a procesar.
      await prisma.eventoCulqi.delete({ where: { id: eventoId } }).catch(() => {});
      throw error;
    }
  }

  return { suscribir, cambiarTarjeta, cancelar, procesarEvento, pasarAGratis };
}

module.exports = { crearServicioCulqi, ErrorContratacion, idSuscripcion };
