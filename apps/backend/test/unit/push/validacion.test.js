const test = require('node:test');
const assert = require('node:assert/strict');
const {
  esEndpointWebPushPermitido, esTokenFcmValido, esClaveWebValida, esRutaInterna, armarPayload,
} = require('../../../src/push/validacion');

test('la dirección de una suscripción web solo se acepta de un servicio de push conocido', () => {
  for (const ok of [
    'https://fcm.googleapis.com/fcm/send/abc123',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QGxyz',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ]) assert.equal(esEndpointWebPushPermitido(ok), true, ok);
});

test('una dirección que no es de un servicio de push (SSRF) se rechaza', () => {
  for (const mal of [
    'http://fcm.googleapis.com/fcm/send/abc', // sin https
    'https://localhost/x',
    'https://127.0.0.1/x',
    'https://169.254.169.254/latest/meta-data',
    'https://evil.com/fcm.googleapis.com',
    'https://fcm.googleapis.com.evil.com/x', // el dominio permitido solo como prefijo
    'https://evilfcm.googleapis.com/x',
    'https://push.apple.com/x', // el sufijo exige un subdominio
    'https://user:clave@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'ftp://fcm.googleapis.com/x',
    'fcm.googleapis.com/x',
    '', null, undefined, 42, {},
    `https://fcm.googleapis.com/${'a'.repeat(2100)}`,
  ]) assert.equal(esEndpointWebPushPermitido(mal), false, String(mal).slice(0, 60));
});

test('un token de FCM sin espacios y de largo razonable', () => {
  assert.equal(esTokenFcmValido('fXyz:APA91b-abc_123'), true);
  for (const mal of ['', ' ', 'con espacio', 'con\nsalto', 'a'.repeat(401), null, undefined, 7]) assert.equal(esTokenFcmValido(mal), false);
  assert.equal(esTokenFcmValido('a'.repeat(400)), true);
});

test('las claves de la suscripción web son base64url', () => {
  assert.equal(esClaveWebValida('BNc-abc_DEF123=='), true);
  for (const mal of ['', 'con espacio', '<script>', 'a'.repeat(257), null, 5]) assert.equal(esClaveWebValida(mal), false);
});

test('una ruta es interna solo si empieza con «/» y no puede salir de la web', () => {
  for (const ok of ['/', '/es/facturas', '/es/comprobantes/abc-123?x=1#y']) assert.equal(esRutaInterna(ok), true, ok);
  for (const mal of ['//evil.com', '//evil.com/x', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'es/facturas', '', '/a\nb', '/a\u0000b', null, undefined, 5, `/${'a'.repeat(2000)}`])
    assert.equal(esRutaInterna(mal), false, String(mal).slice(0, 40));
});

test('el aviso lleva solo título, cuerpo corto y ruta (exactamente esas tres claves)', () => {
  const p = armarPayload({ titulo: 'Hola', cuerpo: 'Texto', ruta: '/es/facturas', extra: 'secreto', email: 'a@b.pe', monto: 1500 });
  assert.deepEqual(Object.keys(p).sort(), ['cuerpo', 'ruta', 'titulo']);
  assert.deepEqual(p, { titulo: 'Hola', cuerpo: 'Texto', ruta: '/es/facturas' });
});

test('el aviso recorta textos largos y cambia una ruta que no es interna por «/»', () => {
  const p = armarPayload({ titulo: 'T'.repeat(300), cuerpo: 'C '.repeat(300), ruta: '//evil.com' });
  assert.ok(p.titulo.length <= 80);
  assert.ok(p.cuerpo.length <= 180);
  assert.equal(p.ruta, '/');
  assert.deepEqual(armarPayload({ titulo: undefined, cuerpo: null, ruta: undefined }), { titulo: '', cuerpo: '', ruta: '/' });
});
