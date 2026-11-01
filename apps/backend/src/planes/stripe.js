// Cancelación de suscripciones de Stripe fuera de las rutas de cobro. Vive aparte para que las pruebas
// la sustituyan (no se llama a Stripe real) y para no crear el cliente de Stripe hasta que haga falta.
let cliente = null;

function clienteStripe() {
  const clave = process.env.STRIPE_SECRET_KEY;
  if (!clave) throw new Error('STRIPE_SECRET_KEY no está configurada');
  if (!cliente) {
    // Sin reintentos y con tope corto: esto corre dentro de la lectura de la suscripción de una petición.
    cliente = require('stripe')(clave, { maxNetworkRetries: 0, timeout: 8000 });
  }
  return cliente;
}

// Cancela de inmediato la suscripción de Stripe. Lanza si Stripe falla (quien la llama decide qué hacer).
async function cancelarStripe(stripeSubscriptionId) {
  return clienteStripe().subscriptions.cancel(stripeSubscriptionId);
}

// Mensaje de un error de Stripe apto para el log: sin claves de API (Stripe a veces cita un trozo de la clave).
function mensajeSeguro(error) {
  return String((error && error.message) || error).replace(/\b[sprw]k_(?:test|live)_\w*/gi, '[clave]').slice(0, 300);
}

module.exports = { cancelarStripe, mensajeSeguro };
