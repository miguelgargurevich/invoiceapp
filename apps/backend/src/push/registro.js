// Los avisos push que usan los módulos que no se arman con fábrica (hoy, la firma pública). app.js los pone al arrancar con
// `establecerAvisos(push.avisos)`; mientras tanto (y en las pruebas que no los piden) son avisos que no hacen nada.
const SIN_AVISOS = Object.freeze({
  firmaRecibida: async () => {},
  comprobanteRechazado: async () => {},
  envioFueraDePlazo: async () => {},
  facturasVencidas: async () => ({ omitido: 'apagado' }),
});

let actuales = SIN_AVISOS;

function establecerAvisos(avisos) { actuales = avisos || SIN_AVISOS; }
function avisosActuales() { return actuales; }

/** Lanza un aviso sin esperarlo: ni un error de él ni su demora tocan el flujo que lo pidió. */
function avisarSinEsperar(nombre, ...args) {
  try {
    Promise.resolve(actuales[nombre](...args)).catch((error) => {
      console.error(`[Push] No se pudo avisar (${nombre}):`, String(error?.message || error).split('\n')[0]);
    });
  } catch (error) {
    console.error(`[Push] No se pudo avisar (${nombre}):`, String(error?.message || error).split('\n')[0]);
  }
}

module.exports = { establecerAvisos, avisosActuales, avisarSinEsperar, SIN_AVISOS };
