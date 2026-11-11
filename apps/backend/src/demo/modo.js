// Modo demo: el ÚNICO lugar que decide si esta instalación es la demo pública de Facturo.
// Es configuración del despliegue (variable MODO_DEMO=si solo en el recurso `facturo-demo`), no un dato del negocio.
// Se lee en cada llamada (no al cargar el módulo) para que un cambio de entorno se note de inmediato.
// Sin la variable no hay rutas nuevas ni bloqueos: producción se comporta exactamente igual que antes.
const LIMITE_DIARIO = 30; // comprobantes emitidos por empresa y por día (hora de Lima)

const esDemo = () => process.env.MODO_DEMO === 'si';

// Peticiones permitidas por IP cada 15 minutos. Producción y desarrollo quedan como antes.
// En la demo pública se suben: muchos visitantes llegan desde la misma red (una oficina, un evento) y
// cada página nueva consulta /api/auth/me; con 50 por IP, un grupo probando a la vez se quedaba sin cupo.
function limitesPeticiones(env = process.env) {
  if (env.MODO_DEMO === 'si') return { general: 3000, auth: 500, entrarDemo: 150 };
  if (env.NODE_ENV === 'development') return { general: 1000, auth: 200, entrarDemo: 200 };
  return { general: 300, auth: 50, entrarDemo: 30 };
}

module.exports = { esDemo, LIMITE_DIARIO, limitesPeticiones };
