import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 2026-11-13, Miguel: «en el login de facturo ... actualmente hay que hacer scroll ... puedes quitar el texto de bienvenido ...
// la idea es no hacer scroll en el login». Se fijan las REGLAS (no comentarios): sin bloque de bienvenida y, en el celular
// (`max-sm:`, menos de 640 px), versiones compactas del logo, la tarjeta, los campos, el botón y el pie. Sin `overflow-hidden`:
// el contenido tiene que caber de verdad, no quedar cortado.
const pagina = readFileSync(new URL('../app/[locale]/login/page.tsx', import.meta.url), 'utf8');
const mensajes = [
  JSON.parse(readFileSync(new URL('../messages/es.json', import.meta.url), 'utf8')),
  JSON.parse(readFileSync(new URL('../messages/en.json', import.meta.url), 'utf8')),
];

test('el login ya no muestra el bloque de bienvenida ni en el celular ni en la computadora', () => {
  // Sin importar las comillas ni cómo se llame la función de traducción: la clave no debe aparecer en la página.
  assert.doesNotMatch(pagina, /welcomeBack|signInDescription/);
  assert.doesNotMatch(pagina, /Bienvenido de nuevo/);
});

test('las claves de la bienvenida se borraron de los mensajes (nadie más las usa)', () => {
  for (const m of mensajes) {
    assert.equal('welcomeBack' in m.auth, false);
    assert.equal('signInDescription' in m.auth, false);
  }
});

test('en el celular el login se compacta: cada pieza tiene su regla max-sm', () => {
  const reglas = [
    'max-sm:min-h-dvh', // alto de la pantalla real (sin el 100vh de Safari, que deja una franja de más)
    'max-sm:py-2', // barra superior y zona del formulario
    'max-sm:px-4',
    'max-sm:mb-4', // bloque del logo
    'max-sm:w-14 max-sm:h-14', // logo más chico
    'max-sm:text-xl', // título del logo
    'max-sm:hidden', // la bajada sale del celular
    'max-sm:p-5', // relleno de la tarjeta
    'max-sm:space-y-4', // separación entre campos
    'max-sm:py-3', // campos y botón
    'max-sm:mt-4', // pie y enlaces legales
  ];
  for (const regla of reglas) {
    assert.ok(pagina.includes(regla), `falta la regla compacta «${regla}»`);
  }
});

test('el login no se recorta con overflow-hidden: el contenido tiene que caber de verdad', () => {
  const raiz = pagina.match(/<div className="min-h-screen[^"]*"/)?.[0] ?? '';
  const zona = pagina.match(/<div className="flex-1 flex items-center justify-center[^"]*"/)?.[0] ?? '';
  assert.ok(raiz.length > 0 && zona.length > 0, 'no encuentro la raíz ni la zona del formulario');
  assert.doesNotMatch(raiz, /overflow-hidden/);
  assert.doesNotMatch(zona, /overflow-hidden/);
});
