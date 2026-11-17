// Service worker de Facturo. Hace dos cosas:
//  1. Existe para que el navegador ofrezca instalar la app (Chrome exige un handler de fetch real; los vacíos no cuentan). No cachea
//     nada: cada petición va a la red tal como llega, así que los datos y la API nunca se guardan. Las navegaciones no se interceptan.
//  2. Avisos push (Web Push): dibuja el aviso que manda el servidor ({ titulo, cuerpo, ruta }) y, al tocarlo, abre esa ruta.
// Solo hay UN service worker por origen: los dos van aquí. Ver docs/push/README.md.

// Los navegadores que ya tienen el service worker anterior (solo fetch) deben pasar al nuevo YA: sin esto el nuevo espera a que se cierren
// todas las pestañas, y mientras tanto los push llegarían al viejo, que no sabe dibujarlos (Chrome muestra «el sitio se actualizó» y Safari
// puede revocar una suscripción que recibe push sin mostrar nada). Es seguro porque este worker no cachea nada.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') return;
  event.respondWith(fetch(event.request));
});

// La misma regla que lib/push/ruta.ts y el backend: una ruta es de ESTA web si empieza con «/», no con «//», sin «\» ni caracteres de control.
function esRutaInterna(ruta) {
  if (typeof ruta !== 'string' || ruta.length === 0 || ruta.length > 2000) return false;
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return false;
  return !/[\\\u0000-\u001f\u007f]/.test(ruta);
}

const RUTA_POR_DEFECTO = '/es/dashboard';

self.addEventListener('push', (event) => {
  let datos = null;
  try { datos = event.data ? event.data.json() : null; } catch (e) { datos = null; }
  const titulo = datos && typeof datos.titulo === 'string' && datos.titulo ? datos.titulo : 'Facturo';
  const cuerpo = datos && typeof datos.cuerpo === 'string' ? datos.cuerpo : 'Tienes un aviso nuevo.';
  const ruta = datos && esRutaInterna(datos.ruta) ? datos.ruta : RUTA_POR_DEFECTO;
  // Siempre se muestra algo: el navegador exige que cada push sea visible (userVisibleOnly).
  event.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/marca/icon-192.png',
    badge: '/marca/icon-192.png',
    data: { ruta },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const pedida = event.notification.data && event.notification.data.ruta;
  const ruta = esRutaInterna(pedida) ? pedida : RUTA_POR_DEFECTO;
  event.waitUntil((async () => {
    const destino = new URL(ruta, self.location.origin);
    // Doble comprobación: aunque la ruta pasó la regla, el destino tiene que ser de este mismo origen.
    if (destino.origin !== self.location.origin) return;
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const ventana of ventanas) {
      if (new URL(ventana.url).origin !== self.location.origin) continue;
      if ('navigate' in ventana) await ventana.navigate(destino.href);
      if ('focus' in ventana) await ventana.focus();
      return;
    }
    await self.clients.openWindow(destino.href);
  })());
});
