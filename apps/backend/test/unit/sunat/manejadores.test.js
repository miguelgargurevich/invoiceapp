const test = require('node:test');
const assert = require('node:assert/strict');
const { crearManejadores } = require('../../../src/sunat/cola/manejadores');

function preparar(resultadoEnvio, resultadoTicket = { pendiente: false }) {
  const encolados = [];
  const avisos = [];
  const m = crearManejadores({
    servicioEmision: { procesarEnvio: async () => resultadoEnvio },
    servicioAnulacion: { procesarTicket: async () => resultadoTicket },
    notificador: { comprobanteAceptado: async (id) => { avisos.push(id); } },
    encolarEnvio: async (id, s) => encolados.push(['envio', id, s]),
    encolarTicket: async (id, s) => encolados.push(['ticket', id, s]),
    ahora: () => new Date('2026-11-02T15:00:00Z'),
  });
  return { m, encolados, avisos };
}

test('error temporal dentro de plazo se reintenta con espera creciente', async () => {
  const { m, encolados } = preparar({ estado: 'ERROR_TEMPORAL', intentos: 2, fechaEmision: new Date('2026-11-01T15:00:00Z') });
  await m.manejarEnvio({ facturaId: 'f1' });
  assert.deepEqual(encolados, [['envio', 'f1', 300]]);
});

test('error temporal fuera de plazo ya no se reintenta', async () => {
  const { m, encolados } = preparar({ estado: 'ERROR_TEMPORAL', intentos: 9, fechaEmision: new Date('2026-10-20T15:00:00Z') });
  await m.manejarEnvio({ facturaId: 'f1' });
  assert.deepEqual(encolados, []);
});

test('aceptado notifica por correo; si el correo falla no rompe el trabajo', async () => {
  const { m, avisos } = preparar({ estado: 'ACEPTADO', intentos: 1, fechaEmision: new Date() });
  await m.manejarEnvio({ facturaId: 'f1' });
  assert.deepEqual(avisos, ['f1']);

  const falla = crearManejadores({
    servicioEmision: { procesarEnvio: async () => ({ estado: 'ACEPTADO', intentos: 1 }) },
    servicioAnulacion: {}, notificador: { comprobanteAceptado: async () => { throw new Error('Resend caído'); } },
    encolarEnvio: async () => {}, encolarTicket: async () => {},
  });
  await assert.doesNotReject(falla.manejarEnvio({ facturaId: 'f1' }));
});

test('ticket pendiente se vuelve a consultar en 60 s', async () => {
  const { m, encolados } = preparar(null, { pendiente: true });
  await m.manejarTicket({ procesoId: 'p1' });
  assert.deepEqual(encolados, [['ticket', 'p1', 60]]);
});
