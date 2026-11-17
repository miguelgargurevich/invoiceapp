import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPushWeb, webPushSoportado } from './web.ts';
import { claveVapidABytes } from './ruta.ts';

const UA_APP = 'Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36 FacturoApp/1.0.0';
const UA_NAVEGADOR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';
const CLAVE = 'BPublicaVapidDePrueba_-abc';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc-123';

interface Opciones {
  permiso?: 'default' | 'granted' | 'denied';
  alPedir?: 'granted' | 'denied' | 'default';
  suscrito?: boolean;
  userAgent?: string;
  conPushManager?: boolean;
  web?: { disponible?: boolean; publicKey?: string | null };
}

function montar(o: Opciones = {}) {
  const { permiso = 'default', alPedir = 'granted', suscrito = false, userAgent = UA_NAVEGADOR, conPushManager = true, web = { disponible: true, publicKey: CLAVE } } = o;
  const eventos: string[] = [];
  const posts: [string, any][] = [];
  const almacen = new Map<string, string>();
  let sub: any = suscrito ? crearSub() : null;
  let permisoActual = permiso;

  function crearSub() {
    return {
      endpoint: ENDPOINT,
      toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'BNc-abc', auth: 'auth123' } }),
      unsubscribe: async () => { eventos.push('unsubscribe'); sub = null; return true; },
    };
  }
  const registro = {
    pushManager: {
      getSubscription: async () => sub,
      subscribe: async (opts: any) => { eventos.push('subscribe'); (registro as any).ultimas = opts; sub = crearSub(); return sub; },
    },
  };
  const win: any = {
    navigator: {
      userAgent,
      serviceWorker: {
        register: async (url: string) => { eventos.push(`register:${url}`); return registro; },
        ready: Promise.resolve(registro),
        getRegistration: async () => registro,
      },
    },
    localStorage: { getItem: (k: string) => almacen.get(k) ?? null, setItem: (k: string, v: string) => { almacen.set(k, v); }, removeItem: (k: string) => { almacen.delete(k); } },
    Notification: { get permission() { return permisoActual; }, requestPermission: async () => { eventos.push('requestPermission'); permisoActual = alPedir; return alPedir; } },
    Capacitor: userAgent === UA_APP ? { isNativePlatform: () => true } : undefined,
  };
  if (conPushManager) win.PushManager = class {};
  let api: any = {
    get: async () => ({ fcm: { disponible: false }, web }),
    post: async (e: string, d: any) => { posts.push([e, d]); },
  };
  const push = crearPushWeb({ win, api: { get: (e) => api.get(e), post: (e, d) => api.post(e, d) }, esperaDeLaBajaMs: 30 });
  return { push, win, eventos, posts, almacen, cambiarApi: (a: any) => { api = { ...api, ...a }; }, registro, suscripcion: () => sub };
}

test('dentro de la app, o en un navegador sin Web Push, no se ofrece', async () => {
  assert.equal(webPushSoportado(montar({ userAgent: UA_APP }).win), false);
  assert.equal(await montar({ userAgent: UA_APP }).push.estado('u1'), 'no-soportado');
  assert.equal(await montar({ conPushManager: false }).push.estado('u1'), 'no-soportado');
  assert.equal(webPushSoportado(undefined), false);
});

test('el estado: no disponible en el servidor, bloqueado, inactivo o activo', async () => {
  assert.equal(await montar({ web: { disponible: false, publicKey: null } }).push.estado('u1'), 'no-disponible');
  assert.equal(await montar({ web: { disponible: true, publicKey: null } }).push.estado('u1'), 'no-disponible');
  assert.equal(await montar({ permiso: 'denied' }).push.estado('u1'), 'bloqueado');
  assert.equal(await montar({ permiso: 'default' }).push.estado('u1'), 'inactivo');
  assert.equal(await montar({ permiso: 'granted', suscrito: false }).push.estado('u1'), 'inactivo');
  const quiere = montar({ permiso: 'granted', suscrito: true });
  quiere.almacen.set('facturo.push.web.u1', '1');
  assert.equal(await quiere.push.estado('u1'), 'activo');
  const sinRed = montar();
  sinRed.cambiarApi({ get: async () => { throw new Error('sin red'); } });
  assert.equal(await sinRed.push.estado('u1'), 'no-disponible');
});

test('activar pide el permiso, se suscribe con la clave del servidor y la registra con endpoint y claves', async () => {
  const m = montar({ permiso: 'default', alPedir: 'granted' });
  assert.equal(await m.push.activar('u1'), 'activo');
  assert.ok(m.eventos.includes('register:/sw.js'), 'registra el service worker de siempre (/sw.js)');
  assert.ok(m.eventos.indexOf('requestPermission') < m.eventos.indexOf('subscribe'), 'el permiso se pide antes de suscribirse');
  const opciones = (m.registro as any).ultimas;
  assert.equal(opciones.userVisibleOnly, true);
  assert.deepEqual(Array.from(opciones.applicationServerKey as Uint8Array), Array.from(claveVapidABytes(CLAVE)));
  assert.deepEqual(m.posts, [['/push/dispositivos', { tipo: 'webpush', suscripcion: { endpoint: ENDPOINT, keys: { p256dh: 'BNc-abc', auth: 'auth123' } } }]]);
  assert.equal(m.almacen.get('facturo.push.web.u1'), '1');
});

test('si no dan el permiso no se suscribe ni se manda nada', async () => {
  const bloqueado = montar({ alPedir: 'denied' });
  assert.equal(await bloqueado.push.activar('u1'), 'bloqueado');
  const cerrado = montar({ alPedir: 'default' });
  assert.equal(await cerrado.push.activar('u1'), 'inactivo');
  for (const m of [bloqueado, cerrado]) {
    assert.ok(!m.eventos.includes('subscribe'));
    assert.deepEqual(m.posts, []);
    assert.equal(m.almacen.size, 0);
  }
});

test('si el servidor falla al registrar, la suscripción del navegador se cancela (no queda a medias)', async () => {
  const m = montar({ permiso: 'granted' });
  m.cambiarApi({ post: async () => { throw new Error('500'); } });
  await assert.rejects(m.push.activar('u1'), /500/);
  assert.equal(m.suscripcion(), null);
  assert.equal(m.almacen.size, 0);
});

test('desactivar borra la suscripción del servidor y del navegador y olvida que la quería', async () => {
  const m = montar({ permiso: 'granted', suscrito: true });
  m.almacen.set('facturo.push.web.u1', '1');
  assert.equal(await m.push.desactivar('u1'), 'inactivo');
  assert.deepEqual(m.posts, [['/push/dispositivos/baja', { token: ENDPOINT }]]);
  assert.equal(m.suscripcion(), null);
  assert.equal(m.almacen.has('facturo.push.web.u1'), false);
});

test('reanudar: solo si ESTA persona los quería y el permiso sigue concedido; nunca pregunta', async () => {
  const quiere = montar({ permiso: 'granted' });
  quiere.almacen.set('facturo.push.web.u1', '1');
  await quiere.push.reanudar('u1');
  assert.equal(quiere.posts.length, 1);
  assert.ok(!quiere.eventos.includes('requestPermission'));

  const otra = montar({ permiso: 'granted' });
  otra.almacen.set('facturo.push.web.u1', '1');
  await otra.push.reanudar('u2'); // otra persona en el mismo navegador
  assert.deepEqual(otra.posts, []);

  const sinPermiso = montar({ permiso: 'default', alPedir: 'granted' });
  sinPermiso.almacen.set('facturo.push.web.u1', '1');
  await sinPermiso.push.reanudar('u1');
  assert.deepEqual(sinPermiso.posts, []);
  assert.ok(!sinPermiso.eventos.includes('requestPermission'), 'el permiso solo se pide al tocar «Activar»');

  const nuncaQuiso = montar({ permiso: 'granted' });
  await nuncaQuiso.push.reanudar('u1');
  assert.deepEqual(nuncaQuiso.posts, []);
});

test('reanudar nunca lanza (sin red o sin servidor)', async () => {
  const m = montar({ permiso: 'granted' });
  m.almacen.set('facturo.push.web.u1', '1');
  m.cambiarApi({ post: async () => { throw new Error('sin red'); } });
  await assert.doesNotReject(m.push.reanudar('u1'));
});

test('al cerrar sesión: baja en el servidor y cancela en el navegador, pero recuerda que esa persona los quería', async () => {
  const m = montar({ permiso: 'granted', suscrito: true });
  m.almacen.set('facturo.push.web.u1', '1');
  await m.push.darDeBaja();
  assert.deepEqual(m.posts, [['/push/dispositivos/baja', { token: ENDPOINT }]]);
  assert.ok(m.eventos.includes('unsubscribe'));
  assert.equal(m.almacen.get('facturo.push.web.u1'), '1');
});

test('la baja del cierre de sesión nunca bloquea: sin suscripción, con error o con el servidor colgado termina', async () => {
  await assert.doesNotReject(montar({ suscrito: false }).push.darDeBaja());
  const falla = montar({ suscrito: true });
  falla.cambiarApi({ post: async () => { throw new Error('sin red'); } });
  await assert.doesNotReject(falla.push.darDeBaja());
  assert.ok(falla.eventos.includes('unsubscribe'), 'aunque el servidor falle, el navegador cancela');
  const colgada = montar({ suscrito: true });
  colgada.cambiarApi({ post: () => new Promise(() => {}) });
  const t0 = Date.now();
  await colgada.push.darDeBaja();
  assert.ok(Date.now() - t0 < 1000);
});

test('una suscripción que dejó OTRA persona (su sesión venció sin cerrar) no se le muestra como activa y se cancela al entrar', async () => {
  const m = montar({ permiso: 'granted', suscrito: true });
  m.almacen.set('facturo.push.web.u1', '1'); // la persona anterior la había activado; u2 no
  assert.equal(await m.push.estado('u2'), 'inactivo', 'el interruptor de u2 no aparece encendido');
  assert.equal(await m.push.estado('u1'), 'activo', 'el de u1 sí');
  await m.push.reanudar('u2');
  assert.deepEqual(m.posts, [], 'no registra nada en nombre de u2');
  assert.ok(m.eventos.includes('unsubscribe'), 'cancela la suscripción ajena en este navegador');
  assert.equal(m.suscripcion(), null);
  assert.equal(m.almacen.get('facturo.push.web.u1'), '1', 'u1 sigue queriendo sus avisos: se reanudan cuando vuelva');
});

test('reanudar de la persona que sí los quería NO cancela su suscripción', async () => {
  const m = montar({ permiso: 'granted', suscrito: true });
  m.almacen.set('facturo.push.web.u1', '1');
  await m.push.reanudar('u1');
  assert.ok(!m.eventos.includes('unsubscribe'));
  assert.equal(m.posts.length, 1);
});
