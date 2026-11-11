// Service worker mínimo de Facturo. Existe para que el navegador ofrezca instalar la app
// (Chrome exige un handler de fetch real; los vacíos no cuentan). No cachea nada:
// cada petición va a la red tal como llega, así que los datos y la API nunca se guardan.
// Las navegaciones no se interceptan: las resuelve el navegador.

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') return;
  event.respondWith(fetch(event.request));
});
