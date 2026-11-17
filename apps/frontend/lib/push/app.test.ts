import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPushApp, resolverPuerto } from './app.ts';

const UA_APP = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 FacturoApp/1.0.0';
const UA_NAVEGADOR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';

type Oyentes = Record<string, (datos: any) => void>;

/** La app fingida: el puente de Capacitor con un plugin de push que contesta lo que se le diga. */
function montar({ permiso = 'granted', pedido = 'granted', plataforma = 'android', userAgent = UA_APP, conPlugin = true, registrarFalla = false } = {}) {
  const llamadas: string[] = [];
  const oyentes: Oyentes = {};
  const win: any = {
    navigator: { userAgent },
    Capacitor: {
      isNativePlatform: () => userAgent === UA_APP,
      getPlatform: () => plataforma,
      PluginHeaders: conPlugin ? [{ name: 'PushNotifications' }, { name: 'Share' }] : [{ name: 'Share' }],
      nativePromise: async (plugin: string, metodo: string) => {
        llamadas.push(`${plugin}.${metodo}`);
        if (metodo === 'checkPermissions') return { receive: permiso };
        if (metodo === 'requestPermissions') return { receive: pedido };
        if (metodo === 'register' && registrarFalla) throw new Error('sin Google Play Services');
        return undefined;
      },
      addListener: (_plugin: string, evento: string, fn: (d: any) => void) => { oyentes[evento] = fn; return { remove: async () => {} }; },
    },
  };
  const posts: [string, any][] = [];
  const navegadas: string[] = [];
  const avisos: string[] = [];
  let api = async (endpoint: string, datos?: any) => { posts.push([endpoint, datos]); };
  const app = crearPushApp({
    win, esperaDeLaBajaMs: 30,
    api: { post: (e, d) => api(e, d) },
    navegar: (r) => navegadas.push(r),
    avisar: (t) => avisos.push(t),
  });
  return { app, win, llamadas, oyentes, posts, navegadas, avisos, cambiarApi: (f: typeof api) => { api = f; } };
}

test('en el navegador (fuera de la app) no hay puerto y no se hace nada', async () => {
  const m = montar({ userAgent: UA_NAVEGADOR });
  assert.equal(resolverPuerto(m.win), null);
  await m.app.iniciar();
  assert.deepEqual(m.llamadas, []);
  assert.deepEqual(m.posts, []);
});

test('una app sin el plugin de push (un APK anterior) tampoco hace nada', async () => {
  const m = montar({ conPlugin: false });
  assert.equal(resolverPuerto(m.win), null);
  await m.app.iniciar();
  assert.deepEqual(m.llamadas, []);
});

test('con permiso concedido registra el teléfono sin volver a preguntar', async () => {
  const m = montar({ permiso: 'granted' });
  await m.app.iniciar();
  assert.deepEqual(m.llamadas, ['PushNotifications.checkPermissions', 'PushNotifications.register']);
});

test('con el permiso en «preguntar» lo pide una vez y, si lo dan, se registra', async () => {
  const m = montar({ permiso: 'prompt', pedido: 'granted' });
  await m.app.iniciar();
  assert.deepEqual(m.llamadas, ['PushNotifications.checkPermissions', 'PushNotifications.requestPermissions', 'PushNotifications.register']);
});

test('si deniegan el permiso se respeta: no se registra', async () => {
  for (const [permiso, pedido] of [['denied', 'denied'], ['prompt', 'denied']]) {
    const m = montar({ permiso, pedido });
    await m.app.iniciar();
    assert.ok(!m.llamadas.includes('PushNotifications.register'), `${permiso}/${pedido}`);
  }
});

test('un fallo del plugin (sin Google Play Services, sin google-services.json) no rompe nada', async () => {
  const m = montar({ registrarFalla: true });
  await assert.doesNotReject(m.app.iniciar());
});

test('cuando el sistema entrega el token se manda al servidor con la plataforma', async () => {
  const m = montar({ plataforma: 'android' });
  await m.app.iniciar();
  m.oyentes.registration({ value: '  tok-123  ' });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(m.posts, [['/push/dispositivos', { tipo: 'fcm', plataforma: 'android', token: 'tok-123' }]]);
  assert.equal(m.app.tokenActual(), 'tok-123');
});

test('un token con la sesión ya cerrada no se manda; una plataforma desconocida tampoco', async () => {
  const cerrada = montar();
  await cerrada.app.iniciar();
  await cerrada.app.darDeBaja();
  cerrada.oyentes.registration({ value: 'tarde' });
  assert.deepEqual(cerrada.posts, []);

  const web = montar({ plataforma: 'web' });
  await web.app.iniciar();
  web.oyentes.registration({ value: 'tok' });
  assert.deepEqual(web.posts, []);
});

test('al tocar un aviso solo se abre una ruta interna', async () => {
  const m = montar();
  await m.app.iniciar();
  const tocar = (ruta: unknown) => m.oyentes.pushNotificationActionPerformed({ notification: { data: { ruta } } });
  tocar('//evil.com');
  tocar('https://evil.com');
  tocar('/\\evil.com');
  tocar('javascript:alert(1)');
  tocar(undefined);
  assert.deepEqual(m.navegadas, []);
  tocar('/es/proformas/abc');
  assert.deepEqual(m.navegadas, ['/es/proformas/abc']);
});

test('con la app abierta el aviso se muestra como mensaje (título · cuerpo)', async () => {
  const m = montar();
  await m.app.iniciar();
  m.oyentes.pushNotificationReceived({ title: 'Proforma aceptada', body: 'Tu cliente firmó.' });
  m.oyentes.pushNotificationReceived({});
  assert.deepEqual(m.avisos, ['Proforma aceptada · Tu cliente firmó.']);
});

test('al cerrar sesión se da de baja el teléfono con su token, y solo una vez', async () => {
  const m = montar();
  await m.app.iniciar();
  m.oyentes.registration({ value: 'tok-baja' });
  await new Promise((r) => setImmediate(r));
  m.posts.length = 0;
  await m.app.darDeBaja();
  assert.deepEqual(m.posts, [['/push/dispositivos/baja', { token: 'tok-baja' }]]);
  assert.equal(m.app.tokenActual(), null);
  await m.app.darDeBaja();
  assert.equal(m.posts.length, 1, 'la segunda vez no encuentra nada que borrar');
});

test('sin token (navegador, o permiso denegado) la baja termina al instante y no manda nada', async () => {
  const m = montar({ permiso: 'denied', pedido: 'denied' });
  await m.app.iniciar();
  await m.app.darDeBaja();
  assert.deepEqual(m.posts, []);
});

test('la baja nunca bloquea el cierre de sesión: un error o una espera larga también terminan', async () => {
  const falla = montar();
  await falla.app.iniciar();
  falla.oyentes.registration({ value: 'tok-a' });
  await new Promise((r) => setImmediate(r));
  falla.cambiarApi(async () => { throw new Error('sin red'); });
  await assert.doesNotReject(falla.app.darDeBaja());

  const colgada = montar();
  await colgada.app.iniciar();
  colgada.oyentes.registration({ value: 'tok-b' });
  await new Promise((r) => setImmediate(r));
  colgada.cambiarApi(() => new Promise(() => {})); // nunca contesta
  const t0 = Date.now();
  await colgada.app.darDeBaja();
  assert.ok(Date.now() - t0 < 1000, 'se rinde a los 30 ms de prueba, no espera para siempre');
});
