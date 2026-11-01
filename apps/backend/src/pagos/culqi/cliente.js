// Cliente mínimo de la API de Culqi v2 (https://apidocs.culqi.com). La sk nunca sale de aquí ni va a los logs.
const BASE = 'https://api.culqi.com';

class ErrorCulqi extends Error {
  constructor({ status, tipo, mensajeUsuario, mensajeComercio }) {
    super(mensajeComercio || mensajeUsuario || `Culqi respondió ${status}`);
    this.name = 'ErrorCulqi';
    this.status = status;
    this.tipo = tipo || null;
    this.mensajeUsuario = mensajeUsuario || 'No se pudo procesar el pago. Intenta con otra tarjeta.';
  }
}

// Soles (número o Decimal como texto) → céntimos enteros, que es lo que pide Culqi.
const aCentimos = (valor) => Math.round(Number(valor) * 100);

function crearClienteCulqi({ secretKey = process.env.CULQI_SECRET_KEY, fetch: hacerFetch = globalThis.fetch } = {}) {
  if (!secretKey) throw new Error('Falta CULQI_SECRET_KEY');

  async function pedir(metodo, ruta, cuerpo) {
    const r = await hacerFetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await r.text();
    let datos = {};
    try { datos = texto ? JSON.parse(texto) : {}; } catch { datos = {}; }
    if (r.status >= 400 || datos.object === 'error') {
      throw new ErrorCulqi({
        status: r.status, tipo: datos.type, mensajeUsuario: datos.user_message, mensajeComercio: datos.merchant_message,
      });
    }
    return datos;
  }

  return {
    crearCliente: (datos) => pedir('POST', '/v2/customers', datos),
    buscarClientePorEmail: async (email) => {
      const r = await pedir('GET', `/v2/customers?email=${encodeURIComponent(email)}`);
      return r.data?.[0] || null;
    },
    crearTarjeta: async (datos) => {
      const r = await pedir('POST', '/v2/cards', datos);
      if (r.action_code === 'REVIEW') return { requiere3DS: true };
      return r;
    },
    crearPlan: (datos) => pedir('POST', '/v2/recurrent/plans/create', datos),
    consultarPlan: (id) => pedir('GET', `/v2/recurrent/plans/${encodeURIComponent(id)}`),
    crearSuscripcion: (datos) => pedir('POST', '/v2/recurrent/subscriptions/create', datos),
    consultarSuscripcion: (id) => pedir('GET', `/v2/recurrent/subscriptions/${encodeURIComponent(id)}`),
    cambiarTarjetaSuscripcion: (id, cardId) => pedir('PATCH', `/v2/recurrent/subscriptions/${encodeURIComponent(id)}`, { card_id: cardId }),
    cancelarSuscripcion: (id) => pedir('DELETE', `/v2/recurrent/subscriptions/${encodeURIComponent(id)}`),
    consultarEvento: (id) => pedir('GET', `/v2/events/${encodeURIComponent(id)}`),
  };
}

module.exports = { crearClienteCulqi, ErrorCulqi, aCentimos };
