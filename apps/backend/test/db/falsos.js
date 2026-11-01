// Dobles de prueba para el engine, el almacén y la cola.
function engineFalso({ envio = { codigo: '0', descripcion: 'Aceptada', observaciones: [], cdrZipBase64: Buffer.from('cdr').toString('base64') }, ...otros } = {}) {
  const llamadas = [];
  const registrar = (nombre, valor) => async (...args) => {
    llamadas.push({ nombre, args });
    const v = typeof valor === 'function' ? valor(...args) : valor;
    if (v instanceof Error) throw v;
    return v;
  };
  return {
    llamadas,
    firmar: registrar('firmar', otros.firma ?? ((_e, c) => ({ xmlBase64: Buffer.from(`<xml>${c.serie}-${c.correlativo}</xml>`).toString('base64'), hash: 'HASH=', nombre: 'n' }))),
    enviar: registrar('enviar', envio),
    consultarCdr: registrar('consultarCdr', otros.cdr ?? { codigo: '0', descripcion: 'Aceptada', observaciones: [], cdrZipBase64: null }),
    enviarBaja: registrar('enviarBaja', otros.baja ?? { ticket: 'T-RA', xmlBase64: Buffer.from('<ra/>').toString('base64'), nombre: 'ra' }),
    enviarResumen: registrar('enviarResumen', otros.resumen ?? { ticket: 'T-RC', xmlBase64: Buffer.from('<rc/>').toString('base64'), nombre: 'rc' }),
    consultarTicket: registrar('consultarTicket', otros.ticket ?? { pendiente: false, codigo: '0', descripcion: 'OK', cdrZipBase64: Buffer.from('cdr').toString('base64') }),
    inspeccionarCertificado: registrar('inspeccionarCertificado', otros.certificado ?? { ruc: '20000000001', vence: '2030-01-01T00:00:00Z' }),
  };
}

function almacenFalso() {
  const archivos = new Map();
  return {
    archivos,
    async guardar(key, cuerpo) { archivos.set(key, cuerpo); return key; },
    async leer(key) { if (!archivos.has(key)) throw new Error(`No existe ${key}`); return archivos.get(key); },
    async urlFirmada(key) { return `https://firmada/${key}`; },
  };
}

function colaFalsa() {
  const trabajos = [];
  return {
    trabajos,
    async encolarEnvio(facturaId, segundos = 0) { trabajos.push({ tipo: 'envio', facturaId, segundos }); },
    async encolarTicket(procesoId, segundos = 30) { trabajos.push({ tipo: 'ticket', procesoId, segundos }); },
  };
}

module.exports = { engineFalso, almacenFalso, colaFalsa };
