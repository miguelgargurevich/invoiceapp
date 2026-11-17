import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// El service worker real (public/sw.js) corre en una caja con un `self` falso: ningún navegador de por medio.
const CODIGO = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
const ORIGEN = 'https://facturo.gargurevich.dev';

function cargar({ ventanas = [] as any[] } = {}) {
  const manejadores: Record<string, (e: any) => void> = {};
  const mostradas: [string, any][] = [];
  const abiertas: string[] = [];
  const self: any = {
    location: { origin: ORIGEN },
    addEventListener: (nombre: string, fn: (e: any) => void) => { manejadores[nombre] = fn; },
    registration: { showNotification: async (titulo: string, opciones: any) => { mostradas.push([titulo, opciones]); } },
    clients: { matchAll: async () => ventanas, openWindow: async (url: string) => { abiertas.push(url); } },
  };
  vm.runInNewContext(CODIGO, { self, URL, fetch: async () => ({}) });
  return { manejadores, mostradas, abiertas };
}

// Lo que sale de la caja de vm tiene otros prototipos: se compara como datos planos.
const plano = (x: unknown) => JSON.parse(JSON.stringify(x));

async function empujar(manejadores: Record<string, (e: any) => void>, datos: unknown, { jsonRoto = false } = {}) {
  let trabajo: Promise<unknown> = Promise.resolve();
  manejadores.push({ data: { json: () => { if (jsonRoto) throw new SyntaxError('x'); return datos; } }, waitUntil: (p: Promise<unknown>) => { trabajo = p; } });
  await trabajo;
}
async function tocar(manejadores: Record<string, (e: any) => void>, ruta: unknown) {
  let trabajo: Promise<unknown> = Promise.resolve();
  let cerrada = false;
  manejadores.notificationclick({ notification: { data: { ruta }, close: () => { cerrada = true; } }, waitUntil: (p: Promise<unknown>) => { trabajo = p; } });
  await trabajo;
  return cerrada;
}

test('un aviso del servidor se dibuja con su título, cuerpo y ruta', async () => {
  const { manejadores, mostradas } = cargar();
  await empujar(manejadores, { titulo: 'Proforma aceptada', cuerpo: 'Tu cliente firmó la proforma P001-3.', ruta: '/es/proformas/abc' });
  assert.equal(mostradas.length, 1);
  assert.equal(mostradas[0][0], 'Proforma aceptada');
  assert.equal(mostradas[0][1].body, 'Tu cliente firmó la proforma P001-3.');
  assert.deepEqual(plano(mostradas[0][1].data), { ruta: '/es/proformas/abc' });
  assert.equal(mostradas[0][1].icon, '/marca/icon-192.png');
});

test('un aviso roto o sin datos igual se muestra (el navegador exige que todo push sea visible)', async () => {
  const roto = cargar();
  await empujar(roto.manejadores, null, { jsonRoto: true });
  const vacio = cargar();
  await empujar(vacio.manejadores, {});
  for (const c of [roto, vacio]) {
    assert.equal(c.mostradas.length, 1);
    assert.equal(c.mostradas[0][0], 'Facturo');
    assert.deepEqual(plano(c.mostradas[0][1].data), { ruta: '/es/dashboard' });
  }
});

test('un aviso con una ruta que no es de esta web se muestra pero apunta al panel', async () => {
  for (const ruta of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)']) {
    const { manejadores, mostradas } = cargar();
    await empujar(manejadores, { titulo: 'T', cuerpo: 'C', ruta });
    assert.deepEqual(plano(mostradas[0][1].data), { ruta: '/es/dashboard' }, ruta);
  }
});

test('al tocar el aviso: cierra la notificación y abre la ruta (ventana nueva si no hay ninguna abierta)', async () => {
  const { manejadores, abiertas } = cargar();
  assert.equal(await tocar(manejadores, '/es/facturas'), true);
  assert.deepEqual(abiertas, [`${ORIGEN}/es/facturas`]);
});

test('al tocar el aviso con una ventana de Facturo abierta, la reusa en lugar de abrir otra', async () => {
  const llamadas: string[] = [];
  const ventana = { url: `${ORIGEN}/es/clientes`, navigate: async (u: string) => { llamadas.push(`navigate:${u}`); }, focus: async () => { llamadas.push('focus'); } };
  const { manejadores, abiertas } = cargar({ ventanas: [ventana] });
  await tocar(manejadores, '/es/comprobantes/9');
  assert.deepEqual(llamadas, [`navigate:${ORIGEN}/es/comprobantes/9`, 'focus']);
  assert.deepEqual(abiertas, []);
});

test('al tocar un aviso con una ruta externa NUNCA se abre fuera: va al panel', async () => {
  for (const ruta of ['//evil.com', 'https://evil.com', '/\\evil.com', undefined, 42]) {
    const { manejadores, abiertas } = cargar();
    await tocar(manejadores, ruta);
    assert.deepEqual(abiertas, [`${ORIGEN}/es/dashboard`], String(ruta));
  }
});

test('el service worker conserva lo que ya hacía: un handler de fetch que no cachea nada', () => {
  const { manejadores } = cargar();
  assert.equal(typeof manejadores.fetch, 'function');
  let respondio = false;
  manejadores.fetch({ request: { mode: 'navigate' }, respondWith: () => { respondio = true; } });
  assert.equal(respondio, false, 'las navegaciones no se interceptan');
  manejadores.fetch({ request: { mode: 'cors' }, respondWith: () => { respondio = true; } });
  assert.equal(respondio, true);
});

test('el service worker nuevo toma el control de inmediato (los navegadores con el viejo, solo fetch, si no no recibirían los push)', async () => {
  const llamadas: string[] = [];
  const manejadores: Record<string, (e: any) => void> = {};
  const self: any = {
    location: { origin: ORIGEN },
    addEventListener: (nombre: string, fn: (e: any) => void) => { manejadores[nombre] = fn; },
    skipWaiting: () => { llamadas.push('skipWaiting'); return Promise.resolve(); },
    clients: { claim: () => { llamadas.push('claim'); return Promise.resolve(); } },
  };
  vm.runInNewContext(CODIGO, { self, URL, fetch: async () => ({}) });
  assert.equal(typeof manejadores.install, 'function');
  assert.equal(typeof manejadores.activate, 'function');
  manejadores.install({});
  let trabajo: Promise<unknown> = Promise.resolve();
  manejadores.activate({ waitUntil: (p: Promise<unknown>) => { trabajo = p; } });
  await trabajo;
  assert.deepEqual(llamadas, ['skipWaiting', 'claim']);
});
