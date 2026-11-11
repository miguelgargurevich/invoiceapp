import test from 'node:test';
import assert from 'node:assert/strict';
import { decidirInstalacion, esSafariIOS, plataformaDe } from './instalar.ts';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/130.0.2849.56 Version/18.0 Mobile/15E148 Safari/604.1',
  // iPadOS 13+ se anuncia como Mac (y tiene pantalla táctil).
  ipadSafariEscritorio: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  escritorioChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  appFacturo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1 FacturoApp',
};

const base = { instalada: false, aplicacionNativa: false, eventoInstalar: false };

test('con el evento beforeinstallprompt se ofrece el botón (Android y escritorio)', () => {
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.androidChrome, eventoInstalar: true }), { tipo: 'boton' });
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.escritorioChrome, eventoInstalar: true }), { tipo: 'boton' });
});

test('iPhone con Safari: instrucciones para Agregar a pantalla de inicio', () => {
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.iphoneSafari }), { tipo: 'instrucciones-ios' });
});

test('iPad con Safari (se anuncia como Mac con pantalla táctil): instrucciones', () => {
  assert.deepEqual(
    decidirInstalacion({ ...base, userAgent: UA.ipadSafariEscritorio, puntosTactiles: 5 }),
    { tipo: 'instrucciones-ios' },
  );
});

test('iPhone con Chrome, Firefox o Edge: pedir que abra la página en Safari', () => {
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.iphoneChrome }), { tipo: 'abrir-en-safari' });
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.iphoneFirefox }), { tipo: 'abrir-en-safari' });
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.iphoneEdge }), { tipo: 'abrir-en-safari' });
});

test('Android sin evento (criterios no cumplidos o navegador sin soporte): no muestra nada', () => {
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.androidChrome }), { tipo: 'nada' });
});

test('escritorio sin evento (Chrome, Safari de Mac): no muestra nada', () => {
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.escritorioChrome }), { tipo: 'nada' });
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.macSafari, puntosTactiles: 0 }), { tipo: 'nada' });
});

test('ya instalada (standalone): no muestra nada, ni con evento ni en iPhone', () => {
  assert.deepEqual(decidirInstalacion({ ...base, instalada: true, userAgent: UA.iphoneSafari }), { tipo: 'nada' });
  assert.deepEqual(decidirInstalacion({ ...base, instalada: true, userAgent: UA.androidChrome, eventoInstalar: true }), { tipo: 'nada' });
});

test('dentro de la app nativa (Capacitor): no muestra nada', () => {
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.appFacturo, aplicacionNativa: true }), { tipo: 'nada' });
  assert.deepEqual(decidirInstalacion({ ...base, userAgent: UA.androidChrome, aplicacionNativa: true, eventoInstalar: true }), { tipo: 'nada' });
});

test('plataformaDe distingue iOS, Android y otros', () => {
  assert.equal(plataformaDe(UA.iphoneSafari), 'ios');
  assert.equal(plataformaDe(UA.androidChrome), 'android');
  assert.equal(plataformaDe(UA.macSafari), 'otra');
  assert.equal(plataformaDe(UA.macSafari, 5), 'ios');
});

test('esSafariIOS descarta los navegadores de iOS que también dicen Safari', () => {
  assert.equal(esSafariIOS(UA.iphoneSafari), true);
  assert.equal(esSafariIOS(UA.iphoneChrome), false);
  assert.equal(esSafariIOS(UA.iphoneFirefox), false);
  assert.equal(esSafariIOS(UA.iphoneEdge), false);
  assert.equal(esSafariIOS(''), false);
});
