// Modo demo: el ÚNICO lugar que decide si esta instalación es la demo pública de Facturo.
// Es configuración del despliegue (variable MODO_DEMO=si solo en el recurso `facturo-demo`), no un dato del negocio.
// Se lee en cada llamada (no al cargar el módulo) para que un cambio de entorno se note de inmediato.
// Sin la variable no hay rutas nuevas ni bloqueos: producción se comporta exactamente igual que antes.
const LIMITE_DIARIO = 30; // comprobantes emitidos por empresa y por día (hora de Lima)

const esDemo = () => process.env.MODO_DEMO === 'si';

module.exports = { esDemo, LIMITE_DIARIO };
