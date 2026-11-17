import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// El cableado que no se puede ejecutar con node --test (React, alias «@/»): se prueba leyendo el código, como lib/loginCompacto.test.ts.
const leer = (ruta: string) => readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8');

test('al cerrar sesión, los avisos se dan de baja ANTES de quitar el token de la sesión', () => {
  const fuente = leer('contexts/AuthContext.tsx');
  const inicio = fuente.indexOf('const signOut = async () => {');
  assert.ok(inicio > 0, 'existe signOut');
  const cuerpo = fuente.slice(inicio, fuente.indexOf('return (', inicio));
  const baja = cuerpo.indexOf('await bajaDePush()');
  const cierre = cuerpo.indexOf("apiClient.post('/auth/logout')");
  const quitaToken = cuerpo.indexOf('apiClient.clearToken()');
  assert.ok(baja >= 0, 'signOut espera la baja de los avisos');
  assert.ok(baja < cierre, 'la baja va antes del cierre en el servidor');
  assert.ok(baja < quitaToken, 'la baja va antes de quitar el token (si no, el DELETE llegaría sin sesión y el siguiente en este dispositivo recibiría los avisos)');
  assert.match(fuente, /import \{ bajaDePush \} from '@\/lib\/push\/instancias'/);
});

test('si la sesión no se puede restaurar (venció sin «Cerrar sesión»), también se cancela la suscripción de avisos del navegador', () => {
  const fuente = leer('contexts/AuthContext.tsx');
  const inicio = fuente.indexOf('const bootstrapAuth = async () => {');
  const catchBloque = fuente.slice(fuente.indexOf('} catch {', inicio), fuente.indexOf('} finally {', inicio));
  assert.match(catchBloque, /void bajaDePush\(\)/);
  assert.ok(catchBloque.indexOf('bajaDePush') < catchBloque.indexOf('apiClient.clearToken()'));
});

test('el panel monta el iniciador de avisos y Configuración › Notificaciones tiene el interruptor del navegador', () => {
  assert.match(leer('app/[locale]/(dashboard)/layout.tsx'), /<PushIniciador \/>/);
  const config = leer('app/[locale]/(dashboard)/configuracion/page.tsx');
  assert.match(config, /import AvisosPush from '@\/components\/settings\/AvisosPush'/);
  assert.match(config, /<AvisosPush \/>/);
});

test('el service worker de la web es UNO: el de siempre, con fetch, install/activate, push y notificationclick', () => {
  const sw = leer('public/sw.js');
  for (const evento of ['install', 'activate', 'fetch', 'push', 'notificationclick']) assert.match(sw, new RegExp(`addEventListener\\('${evento}'`), evento);
});

test('los textos del interruptor existen en español y en inglés', () => {
  for (const archivo of ['messages/es.json', 'messages/en.json']) {
    const push = JSON.parse(leer(archivo)).push;
    for (const clave of ['titulo', 'recibirEnNavegador', 'descripcion', 'bloqueado', 'activado', 'desactivado', 'error']) assert.ok(push?.[clave], `${archivo}: ${clave}`);
  }
});
