const test = require('node:test');
const assert = require('node:assert/strict');
const { crearManejadores } = require('../../../src/sunat/cola/manejadores');

// El push de SUNAT: avisar cuando rechazó o cuando el envío se quedó fuera de plazo. Nunca cambia el resultado del trabajo.
function preparar(resultadoEnvio, avisos) {
  const encolados = [];
  const m = crearManejadores({
    servicioEmision: { procesarEnvio: async () => resultadoEnvio },
    servicioAnulacion: {},
    notificador: { comprobanteAceptado: async () => {} },
    encolarEnvio: async (id, s) => encolados.push([id, s]),
    encolarTicket: async () => {},
    ahora: () => new Date('2026-11-02T15:00:00Z'),
    avisos,
  });
  return { m, encolados };
}
function avisosGrabadores() {
  const llamadas = [];
  return { llamadas, comprobanteRechazado: async (id) => { llamadas.push(['rechazado', id]); }, envioFueraDePlazo: async (id) => { llamadas.push(['fuera-de-plazo', id]); } };
}

test('SUNAT rechazó: se avisa una vez y el resultado del trabajo no cambia', async () => {
  const avisos = avisosGrabadores();
  const { m } = preparar({ estado: 'RECHAZADO', intentos: 1, fechaEmision: new Date('2026-11-02T10:00:00Z') }, avisos);
  const r = await m.manejarEnvio({ facturaId: 'f1' });
  assert.equal(r.estado, 'RECHAZADO');
  assert.deepEqual(avisos.llamadas, [['rechazado', 'f1']]);
});

test('error temporal fuera de plazo: se avisa; dentro de plazo se reintenta y NO se avisa', async () => {
  const fuera = avisosGrabadores();
  await preparar({ estado: 'ERROR_TEMPORAL', intentos: 9, fechaEmision: new Date('2026-10-20T15:00:00Z') }, fuera).m.manejarEnvio({ facturaId: 'f2' });
  assert.deepEqual(fuera.llamadas, [['fuera-de-plazo', 'f2']]);

  const dentro = avisosGrabadores();
  const { m, encolados } = preparar({ estado: 'ERROR_TEMPORAL', intentos: 1, fechaEmision: new Date('2026-11-02T14:00:00Z') }, dentro);
  await m.manejarEnvio({ facturaId: 'f3' });
  assert.deepEqual(dentro.llamadas, []);
  assert.equal(encolados.length, 1);
});

test('aceptado u omitido: no se avisa', async () => {
  const avisos = avisosGrabadores();
  await preparar({ estado: 'ACEPTADO', intentos: 1, fechaEmision: new Date() }, avisos).m.manejarEnvio({ facturaId: 'f4' });
  await preparar({ omitido: true }, avisos).m.manejarEnvio({ facturaId: 'f5' });
  assert.deepEqual(avisos.llamadas, []);
});

test('si el aviso falla (rechaza o lanza), el trabajo termina igual', async () => {
  const rechaza = { comprobanteRechazado: async () => { throw new Error('FCM caído'); }, envioFueraDePlazo: async () => {} };
  const lanza = { comprobanteRechazado: () => { throw new Error('boom síncrono'); }, envioFueraDePlazo: async () => {} };
  for (const avisos of [rechaza, lanza]) {
    const { m } = preparar({ estado: 'RECHAZADO', intentos: 1, fechaEmision: new Date() }, avisos);
    assert.equal((await m.manejarEnvio({ facturaId: 'f6' })).estado, 'RECHAZADO');
  }
  await new Promise((r) => setImmediate(r)); // deja pasar el .catch del aviso que rechazó
});
