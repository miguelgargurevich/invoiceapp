const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const webPush = require('web-push');
const { crearEnviadores } = require('../../../src/push/config');
const { iniciarPush } = require('../../../src/push');
const { crearManejadores } = require('../../../src/sunat/cola/manejadores');

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const CUENTA_JSON = JSON.stringify({ client_email: 'push@p.iam.gserviceaccount.com', private_key: privateKey });
const logFalso = () => { const lineas = []; return { warn: (m) => lineas.push(m), error: (m) => lineas.push(m), log: () => {}, lineas }; };

test('sin variables PUSH_* los dos canales quedan apagados, con un aviso en el log y sin lanzar', () => {
  const log = logFalso();
  const r = crearEnviadores({ env: {}, log });
  assert.equal(r.fcm, null);
  assert.equal(r.webpush, null);
  assert.equal(r.vapidPublica, null);
  assert.equal(log.lineas.length, 2);
  assert.match(log.lineas[0], /FCM apagado/);
  assert.match(log.lineas[1], /Web Push apagado/);
});

test('FCM a medias (solo el proyecto, o una cuenta que no sirve) queda apagado y dice qué falta, sin imprimir valores', () => {
  const solo = logFalso();
  assert.equal(crearEnviadores({ env: { PUSH_FCM_PROJECT_ID: 'mi-proyecto' }, log: solo }).fcm, null);
  assert.match(solo.lineas.join('\n'), /la cuenta de servicio no es un JSON válido/);

  const sinProyecto = logFalso();
  assert.equal(crearEnviadores({ env: { PUSH_FCM_CUENTA_JSON: CUENTA_JSON }, log: sinProyecto }).fcm, null);
  assert.match(sinProyecto.lineas.join('\n'), /falta PUSH_FCM_PROJECT_ID/);
  assert.doesNotMatch(sinProyecto.lineas.join('\n'), /PRIVATE KEY|client_email/);

  assert.equal(crearEnviadores({ env: { PUSH_FCM_PROJECT_ID: 'p', PUSH_FCM_CUENTA_JSON: '{"basura":1}' }, log: logFalso() }).fcm, null);
});

test('FCM completo: la cuenta de servicio sirve en JSON o en base64', () => {
  const json = crearEnviadores({ env: { PUSH_FCM_PROJECT_ID: 'p', PUSH_FCM_CUENTA_JSON: CUENTA_JSON }, log: logFalso() });
  const b64 = crearEnviadores({ env: { PUSH_FCM_PROJECT_ID: 'p', PUSH_FCM_CUENTA_BASE64: Buffer.from(CUENTA_JSON).toString('base64') }, log: logFalso() });
  assert.equal(json.fcm?.tipo, 'fcm');
  assert.equal(b64.fcm?.tipo, 'fcm');
});

test('claves VAPID válidas activan Web Push y exponen solo la pública', () => {
  const claves = webPush.generateVAPIDKeys();
  const r = crearEnviadores({ env: { PUSH_VAPID_PUBLIC_KEY: claves.publicKey, PUSH_VAPID_PRIVATE_KEY: claves.privateKey, PUSH_VAPID_SUBJECT: 'mailto:avisos@facturo.pe' }, log: logFalso() });
  assert.equal(r.webpush?.tipo, 'webpush');
  assert.equal(r.vapidPublica, claves.publicKey);
  assert.equal(JSON.stringify(Object.keys(r.webpush)).includes('privada'), false);
});

test('claves VAPID mal pegadas o una sola de las dos: apagado, sin lanzar y sin imprimir las claves', () => {
  const claves = webPush.generateVAPIDKeys();
  const mala = logFalso();
  const r = crearEnviadores({ env: { PUSH_VAPID_PUBLIC_KEY: claves.publicKey, PUSH_VAPID_PRIVATE_KEY: 'no-es-una-clave' }, log: mala });
  assert.equal(r.webpush, null);
  assert.match(mala.lineas.join('\n'), /Web Push apagado: las claves VAPID no son válidas/);
  assert.doesNotMatch(mala.lineas.join('\n'), new RegExp(claves.publicKey));

  const una = logFalso();
  assert.equal(crearEnviadores({ env: { PUSH_VAPID_PUBLIC_KEY: claves.publicKey }, log: una }).webpush, null);
  assert.match(una.lineas.join('\n'), /falta una de las dos claves VAPID/);
});

test('iniciarPush sin variables no lanza, no programa temporizadores y las rutas existen', () => {
  const log = logFalso();
  const push = iniciarPush({ prisma: {}, auth: (_q, _s, n) => n(), env: {}, log });
  assert.equal(push.servicio.activo(), false);
  assert.equal(typeof push.router, 'function');
  assert.equal(typeof push.detener, 'function');
  push.detener();
});

test('los manejadores de SUNAT funcionan igual sin avisos (por defecto no hacen nada)', async () => {
  const m = crearManejadores({
    servicioEmision: { procesarEnvio: async () => ({ estado: 'RECHAZADO', intentos: 1 }) },
    servicioAnulacion: {}, notificador: {}, encolarEnvio: async () => {}, encolarTicket: async () => {},
  });
  assert.equal((await m.manejarEnvio({ facturaId: 'f1' })).estado, 'RECHAZADO');
});
