const test = require('node:test');
const assert = require('node:assert/strict');
const { crearEnviadorWebPush } = require('../../../src/push/webpush');
const { RESULTADO } = require('../../../src/push/fcm');

const DISPOSITIVO = { token: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'BNc-abc', auth: 'auth123', plataforma: 'web' };
const PAYLOAD = { titulo: 'Facturas vencidas', cuerpo: 'Tienes 2 facturas vencidas por cobrar.', ruta: '/es/facturas' };

function libFalsa(comportamiento = async () => ({ statusCode: 201 })) {
  const llamadas = [];
  return { llamadas, sendNotification: async (...args) => { llamadas.push(args); return comportamiento(...args); } };
}
const falla = (statusCode) => async () => { const e = new Error('Received unexpected response code'); e.statusCode = statusCode; e.endpoint = DISPOSITIVO.token; throw e; };
const logFalso = () => { const lineas = []; return { warn: (m) => lineas.push(m), error: (m) => lineas.push(m), lineas }; };
const crear = (lib, log = logFalso()) => crearEnviadorWebPush({ lib, publica: 'PUB', privada: 'PRIV', sujeto: 'mailto:a@b.pe', log });

test('envía la suscripción con VAPID y el aviso con título, cuerpo y ruta', async () => {
  const lib = libFalsa();
  assert.equal(await crear(lib).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.ENVIADO);
  const [suscripcion, cuerpo, opciones] = lib.llamadas[0];
  assert.deepEqual(suscripcion, { endpoint: DISPOSITIVO.token, keys: { p256dh: 'BNc-abc', auth: 'auth123' } });
  assert.deepEqual(JSON.parse(cuerpo), PAYLOAD);
  assert.deepEqual(opciones.vapidDetails, { subject: 'mailto:a@b.pe', publicKey: 'PUB', privateKey: 'PRIV' });
});

test('un 404 o 410 del servicio de push (la suscripción ya no existe) la borra', async () => {
  for (const estado of [404, 410]) assert.equal(await crear(libFalsa(falla(estado))).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.TOKEN_INVALIDO, String(estado));
});

test('un 429, un 5xx, un 401 o un fallo de red NO borran la suscripción', async () => {
  for (const estado of [400, 401, 403, 413, 429, 500, 503]) assert.equal(await crear(libFalsa(falla(estado))).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.FALLO, String(estado));
  assert.equal(await crear(libFalsa(async () => { throw new Error('ECONNRESET'); })).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.FALLO);
});

test('una fila con una dirección que no es de un servicio de push no se contacta (y se descarta)', async () => {
  const lib = libFalsa();
  for (const token of ['http://169.254.169.254/latest', 'https://evil.com/x', 'https://localhost/x']) {
    assert.equal(await crear(lib).enviar({ ...DISPOSITIVO, token }, PAYLOAD), RESULTADO.TOKEN_INVALIDO, token);
  }
  assert.equal(lib.llamadas.length, 0, 'el servidor nunca le habla a una dirección no permitida');
});

test('el log no trae la dirección de la suscripción', async () => {
  const log = logFalso();
  await crear(libFalsa(falla(500)), log).enviar(DISPOSITIVO, PAYLOAD);
  assert.doesNotMatch(log.lineas.join('\n'), /fcm\.googleapis\.com|abc/);
});
