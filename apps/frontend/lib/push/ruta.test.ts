import test from 'node:test';
import assert from 'node:assert/strict';
import { claveVapidABytes, esRutaInterna } from './ruta.ts';

test('una ruta interna empieza con «/» y no puede salir de la web', () => {
  for (const ok of ['/', '/es/facturas', '/es/comprobantes/abc-123?x=1#y']) assert.equal(esRutaInterna(ok), true, ok);
});

test('//otro-sitio, \\, esquemas, vacío, controles y tipos raros NO son rutas internas', () => {
  for (const mal of ['//evil.com', '//evil.com/x', '/\\evil.com', '\\\\evil', 'https://evil.com', 'javascript:alert(1)', 'es/facturas', '', '/a\nb', '/a\u0000b', null, undefined, 5, {}, `/${'a'.repeat(2000)}`])
    assert.equal(esRutaInterna(mal), false, String(mal).slice(0, 40));
});

test('la clave VAPID base64url pasa a los bytes que pide el navegador', () => {
  // 65 bytes de una clave pública P-256 sin comprimir (0x04 + 64): ida y vuelta.
  const bytes = Uint8Array.from({ length: 65 }, (_, i) => (i === 0 ? 4 : (i * 7) % 256));
  const b64url = Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.deepEqual(Array.from(claveVapidABytes(b64url)), Array.from(bytes));
  assert.equal(claveVapidABytes(b64url).length, 65);
});
