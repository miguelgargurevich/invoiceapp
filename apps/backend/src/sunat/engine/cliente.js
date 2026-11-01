const { ErrorEngineNoDisponible, ErrorConstruccion } = require('../errores');

// Cliente HTTP del microservicio apps/sunat-engine (contrato en la tarea 8 del plan).
function crearClienteEngine({
  url = process.env.SUNAT_ENGINE_URL,
  token = process.env.SUNAT_ENGINE_TOKEN,
  fetchImpl = globalThis.fetch,
  timeoutMs = 60000,
} = {}) {
  async function llamar(ruta, cuerpo) {
    let respuesta;
    try {
      respuesta = await fetchImpl(`${url}${ruta}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-engine-token': token },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new ErrorEngineNoDisponible(`No se pudo contactar al motor SUNAT: ${error.message}`);
    }
    const json = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 422) throw new ErrorConstruccion(json.error || 'Datos inválidos para el motor SUNAT', json.detalle);
    if (!respuesta.ok) throw new ErrorEngineNoDisponible(json.error || `El motor SUNAT respondió ${respuesta.status}`);
    return json;
  }

  return {
    inspeccionarCertificado: (pfxBase64, clave) => llamar('/certificado/inspeccionar', { pfxBase64, clave }),
    firmar: (emisor, comprobante) => llamar('/comprobantes/firmar', { emisor, comprobante }),
    enviar: (emisor, { tipoDoc, nombre, xmlBase64 }) => llamar('/comprobantes/enviar', { emisor, tipoDoc, nombre, xmlBase64 }),
    consultarCdr: (emisor, { tipoDoc, serie, correlativo }) => llamar('/comprobantes/cdr', { emisor, tipoDoc, serie, correlativo }),
    enviarResumen: (emisor, resumen) => llamar('/resumenes/enviar', { emisor, resumen }),
    enviarBaja: (emisor, baja) => llamar('/bajas/enviar', { emisor, baja }),
    consultarTicket: (emisor, ticket) => llamar('/tickets/consultar', { emisor, ticket }),
  };
}

module.exports = { crearClienteEngine };
