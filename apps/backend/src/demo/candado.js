// Candado de la demo: cada bloqueo responde 403 { error, codigo: 'DEMO_BLOQUEADO' }. Solo actúa con MODO_DEMO=si.
const { esDemo } = require('./modo');

const CODIGO_BLOQUEADO = 'DEMO_BLOQUEADO';

function responderBloqueo(res, mensaje) {
  return res.status(403).json({ error: mensaje, codigo: CODIGO_BLOQUEADO });
}

// Middleware de ruta: en la demo corta con 403; fuera de ella deja pasar sin tocar nada.
const bloquearEnDemo = (mensaje) => (req, res, next) => (esDemo() ? responderBloqueo(res, mensaje) : next());

const MENSAJES = Object.freeze({
  cobros: 'Esto es una demostración de Facturo: los cobros están apagados. Crea tu cuenta real para contratar un plan.',
  plan: 'Esto es una demostración de Facturo: no se puede cambiar de plan. Crea tu cuenta real para elegir el tuyo.',
  registro: 'Esto es una demostración de Facturo: aquí no se crean cuentas. Regístrate en la web real de Facturo.',
  cuenta: 'Esto es una demostración de Facturo: no se puede cambiar la contraseña, el correo ni la cuenta.',
  produccion: 'Esto es una demostración de Facturo: solo funciona el ambiente de pruebas (BETA) de SUNAT.',
  credenciales: 'Esto es una demostración de Facturo: no se pueden subir ni cambiar el certificado, su clave ni la clave SOL.',
  archivos: 'Esto es una demostración de Facturo: no se suben archivos. Crea tu cuenta real para poner tu logo y tus fotos.',
});

// Dentro de /api/auth la demo solo deja iniciar y cerrar sesión y ver quién eres.
// Lo demás (registro, cambio de contraseña o de correo, hoy o mañana) queda cerrado por defecto.
const AUTH_PERMITIDO = new Set(['POST /login', 'POST /logout', 'GET /me']);
function bloquearAuthEnDemo(req, res, next) {
  if (!esDemo() || AUTH_PERMITIDO.has(`${req.method} ${req.path}`)) return next();
  return responderBloqueo(res, req.path === '/register' ? MENSAJES.registro : MENSAJES.cuenta);
}

module.exports = { CODIGO_BLOQUEADO, MENSAJES, responderBloqueo, bloquearEnDemo, bloquearAuthEnDemo };
