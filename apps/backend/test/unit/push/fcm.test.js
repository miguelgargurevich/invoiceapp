const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const {
  crearEnviadorFcm, leerCuentaDeServicio, clasificarErrorFcm, RESULTADO, ALCANCE_FCM,
} = require('../../../src/push/fcm');

// Un par RSA de prueba (no es de nadie): la "cuenta de servicio" firma con la privada y la prueba verifica con la pública.
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const CUENTA = { correo: 'push@proyecto-prueba.iam.gserviceaccount.com', llave: privateKey, urlToken: 'https://oauth2.googleapis.com/token' };
const TOKEN_DEL_TELEFONO = 'token-de-telefono-ultra-secreto:APA91bXYZ';
const DISPOSITIVO = { token: TOKEN_DEL_TELEFONO, plataforma: 'android' };
const PAYLOAD = { titulo: 'Proforma aceptada', cuerpo: 'Tu cliente firmó la proforma P001-3.', ruta: '/es/proformas/abc' };

const respuesta = (estado, cuerpo) => ({
  ok: estado >= 200 && estado < 300,
  status: estado,
  json: async () => (typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo),
  text: async () => (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
});

/** Un fetch falso que contesta según la dirección y guarda lo que recibió. Nunca sale a la red. */
function fetchFalso({ token = [respuesta(200, { access_token: 'acceso-1', expires_in: 3600 })], envio = [respuesta(200, { name: 'm1' })] } = {}) {
  const llamadas = [];
  const colas = { token: [...token], envio: [...envio] };
  const f = async (url, init) => {
    llamadas.push({ url, init });
    const cola = url === CUENTA.urlToken ? colas.token : colas.envio;
    return cola.length > 1 ? cola.shift() : cola[0];
  };
  f.llamadas = llamadas;
  return f;
}

function logFalso() {
  const lineas = [];
  return { warn: (m) => lineas.push(m), error: (m) => lineas.push(m), lineas };
}

const crear = (opts = {}) => crearEnviadorFcm({ proyectoId: 'mi-proyecto', cuenta: CUENTA, ahora: () => new Date('2026-11-17T15:00:00Z'), log: logFalso(), ...opts });

test('un 404 a secas NO borra el token (un proyecto mal escrito lo da para todos)', () => {
  const cuerpo404 = JSON.stringify({ error: { code: 404, message: 'Requested entity was not found.', status: 'NOT_FOUND' } });
  assert.equal(clasificarErrorFcm(404, cuerpo404), RESULTADO.FALLO);
  assert.equal(clasificarErrorFcm(404, ''), RESULTADO.FALLO);
  assert.equal(clasificarErrorFcm(404, 'no es json'), RESULTADO.FALLO);
});

test('UNREGISTERED (dentro de un 404) sí borra el token', () => {
  const cuerpo = JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } });
  assert.equal(clasificarErrorFcm(404, cuerpo), RESULTADO.TOKEN_INVALIDO);
});

test('un 400 que se queja del token de registro borra el token; un 400 por otra cosa, no', () => {
  const token = JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'The registration token is not a valid FCM registration token' } });
  const mensaje = JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Invalid JSON payload received. Unknown name "foo"' } });
  assert.equal(clasificarErrorFcm(400, token), RESULTADO.TOKEN_INVALIDO);
  assert.equal(clasificarErrorFcm(400, mensaje), RESULTADO.FALLO);
});

test('credenciales (401/403), límites (429) y caídas (5xx) nunca borran el token', () => {
  for (const estado of [401, 403, 429, 500, 503]) assert.equal(clasificarErrorFcm(estado, JSON.stringify({ error: { status: 'X' } })), RESULTADO.FALLO, String(estado));
});

test('la cuenta de servicio se lee del JSON; uno incompleto o sin llave no sirve', () => {
  const json = JSON.stringify({ client_email: CUENTA.correo, private_key: privateKey, token_uri: 'https://oauth2.googleapis.com/token' });
  assert.deepEqual(leerCuentaDeServicio(json), CUENTA);
  assert.equal(leerCuentaDeServicio(JSON.stringify({ client_email: 'a@b' })), null);
  assert.equal(leerCuentaDeServicio(JSON.stringify({ client_email: 'a@b', private_key: 'no es una llave' })), null);
  for (const mal of ['', '   ', 'no es json', null, undefined, 5]) assert.equal(leerCuentaDeServicio(mal), null);
  // La llave firma un JWT que se manda a `token_uri`: si no es https se ignora y se usa la de Google.
  const http = JSON.stringify({ client_email: 'a@b', private_key: privateKey, token_uri: 'http://evil.com/token' });
  assert.equal(leerCuentaDeServicio(http).urlToken, 'https://oauth2.googleapis.com/token');
});

test('envía a FCM v1 con el token de acceso, el token del teléfono y la ruta como texto', async () => {
  const f = fetchFalso();
  const r = await crear({ fetch: f }).enviar(DISPOSITIVO, PAYLOAD);
  assert.equal(r, RESULTADO.ENVIADO);
  const envio = f.llamadas.find((l) => l.url.includes('fcm.googleapis.com/v1'));
  assert.equal(envio.url, 'https://fcm.googleapis.com/v1/projects/mi-proyecto/messages:send');
  assert.equal(envio.init.headers.Authorization, 'Bearer acceso-1');
  const msg = JSON.parse(envio.init.body).message;
  assert.equal(msg.token, TOKEN_DEL_TELEFONO);
  assert.deepEqual(msg.notification, { title: PAYLOAD.titulo, body: PAYLOAD.cuerpo });
  assert.deepEqual(msg.data, { ruta: '/es/proformas/abc' });
  assert.equal(msg.android.priority, 'HIGH');
});

test('el token de acceso se pide firmado con la cuenta de servicio (RS256, con el reloj inyectado)', async () => {
  const f = fetchFalso();
  await crear({ fetch: f }).enviar(DISPOSITIVO, PAYLOAD);
  const pedido = f.llamadas.find((l) => l.url === CUENTA.urlToken);
  const forma = new URLSearchParams(pedido.init.body);
  assert.equal(forma.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  const reclamos = jwt.verify(forma.get('assertion'), publicKey, { algorithms: ['RS256'], clockTimestamp: Math.floor(new Date('2026-11-17T15:00:00Z').getTime() / 1000) });
  assert.equal(reclamos.iss, CUENTA.correo);
  assert.equal(reclamos.scope, ALCANCE_FCM);
  assert.equal(reclamos.aud, CUENTA.urlToken);
  assert.equal(reclamos.iat, Math.floor(new Date('2026-11-17T15:00:00Z').getTime() / 1000));
  assert.equal(reclamos.exp, reclamos.iat + 3600);
});

test('el token de acceso se reusa hasta un minuto antes de que venza y luego se renueva', async () => {
  let ahora = new Date('2026-11-17T15:00:00Z');
  const f = fetchFalso({ token: [respuesta(200, { access_token: 'acceso-1', expires_in: 3600 }), respuesta(200, { access_token: 'acceso-2', expires_in: 3600 })] });
  const enviador = crear({ fetch: f, ahora: () => ahora });
  await enviador.enviar(DISPOSITIVO, PAYLOAD);
  await enviador.enviar(DISPOSITIVO, PAYLOAD);
  assert.equal(f.llamadas.filter((l) => l.url === CUENTA.urlToken).length, 1, 'el segundo envío reusa el token');
  ahora = new Date('2026-11-17T15:59:30Z'); // a menos de un minuto del vencimiento
  await enviador.enviar(DISPOSITIVO, PAYLOAD);
  assert.equal(f.llamadas.filter((l) => l.url === CUENTA.urlToken).length, 2);
  assert.equal(f.llamadas.at(-1).init.headers.Authorization, 'Bearer acceso-2');
});

test('un 401 renueva el token y reintenta UNA sola vez', async () => {
  const f = fetchFalso({
    token: [respuesta(200, { access_token: 'viejo', expires_in: 3600 }), respuesta(200, { access_token: 'nuevo', expires_in: 3600 })],
    envio: [respuesta(401, { error: { status: 'UNAUTHENTICATED' } }), respuesta(200, { name: 'ok' })],
  });
  assert.equal(await crear({ fetch: f }).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.ENVIADO);
  assert.equal(f.llamadas.filter((l) => l.url.includes('messages:send')).length, 2);

  const siempre401 = fetchFalso({ envio: [respuesta(401, { error: { status: 'UNAUTHENTICATED' } })] });
  assert.equal(await crear({ fetch: siempre401 }).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.FALLO);
  assert.equal(siempre401.llamadas.filter((l) => l.url.includes('messages:send')).length, 2, 'no insiste más de una vez');
});

test('si Google no da el token de acceso, el envío falla sin llamar a FCM', async () => {
  const f = fetchFalso({ token: [respuesta(400, { error: 'invalid_grant' })] });
  const log = logFalso();
  assert.equal(await crear({ fetch: f, log }).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.FALLO);
  assert.equal(f.llamadas.filter((l) => l.url.includes('messages:send')).length, 0);
  assert.match(log.lineas.join('\n'), /no dio el token de acceso \(400\)/);
});

test('un token inválido de FCM se reporta, y el log no trae el token del teléfono ni la llave', async () => {
  const f = fetchFalso({ envio: [respuesta(404, { error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } })] });
  const log = logFalso();
  assert.equal(await crear({ fetch: f, log }).enviar(DISPOSITIVO, PAYLOAD), RESULTADO.TOKEN_INVALIDO);
  const texto = log.lineas.join('\n');
  assert.doesNotMatch(texto, /ultra-secreto/);
  assert.doesNotMatch(texto, /PRIVATE KEY/);
  assert.match(texto, /UNREGISTERED/);
});
