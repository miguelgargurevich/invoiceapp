# Guiones de los videos de Facturo

Versión del 10-nov-2026. Mismo método que los videos de Torre (repo `house`, `docs/marketing/guiones-videos.md`):

- **Formatos:** escritorio (16:9, 1920×1080) y celular (9:16, 1080×1920), salvo que se indique otra cosa.
- **Pantallas:** las reales de Facturo, en local, con una empresa de prueba ficticia («Comercial Ejemplo S.A.C.»). Ningún dato real: ni el nombre ni el RUC de Miguel, ni clientes reales.
- **Voz:** la femenina «Dora» de My Workspace (Kokoro `ef_dora`), una por escena. La duración de cada escena la manda su audio.

Reglas de los textos:
- Tuteo y frases cortas.
- Sin cifras inventadas: solo las que se ven en pantalla.
- Cada escena cuenta UNA cosa.
- Cierre de todos: «Facturo. Tus comprobantes electrónicos, en minutos.» y la dirección del sitio.

---

## f1. Facturo en un minuto (promo general, ≈ 60 s)

| # | En pantalla | Voz |
|---|---|---|
| 1 | Portada pública: el título «Emite facturas y boletas electrónicas en minutos» | ¿Tienes un negocio en el Perú y emitir comprobantes electrónicos te quita tiempo? |
| 2 | Dashboard: comprobantes del mes, ventas y lo que requiere atención | Con Facturo ves en una sola pantalla lo que emitiste este mes y lo que necesita tu atención. |
| 3 | Nuevo comprobante: se elige el cliente y se agrega un producto; los totales con IGV se calculan | Eliges al cliente, agregas lo que vendiste, y el IGV se calcula solo. |
| 4 | Se emite y el comprobante queda «Aceptado» por SUNAT | Facturo firma el comprobante con tu certificado, lo envía a SUNAT y guarda su respuesta. |
| 5 | Detalle del comprobante: botones de PDF, XML y CDR | Descarga el PDF, el XML y la constancia de SUNAT cuando los necesites. |
| 6 | Proformas: una proforma aceptada → «Convertir en comprobante» | ¿Primero cotizas? Haz una proforma y conviértela en comprobante cuando tu cliente la acepte. |
| 7 | Cierre: logo de Facturo y facturo.gargurevich.dev | Facturo. Tus comprobantes electrónicos, en minutos. |

## f2. Empieza con Facturo (onboarding, ≈ 80 s)

| # | En pantalla | Voz |
|---|---|---|
| 1 | Registro: se llenan los datos. NO se envía | Crea tu cuenta gratis, sin tarjeta. |
| 2 | Asistente, paso de empresa: RUC y razón social de prueba | Escribe el RUC y los datos de tu negocio. |
| 3 | Configuración › SUNAT: usuario secundario SOL y certificado digital (campos visibles; no se muestran valores) | Para emitir, Facturo usa tu usuario secundario SOL y tu certificado digital. Se guardan cifrados. |
| 4 | Configuración › SUNAT: series F001 y B001 | Tus series de facturas y boletas ya vienen listas. |
| 5 | Productos → nuevo producto con precio | Registra tus productos y servicios con su precio, una sola vez. |
| 6 | Clientes → lista con RUC y DNI | Guarda a tus clientes, con su RUC o su DNI. |
| 7 | Nuevo comprobante → emitir → «Aceptado» | Y emite tu primera factura o boleta. En segundos tienes la respuesta de SUNAT. |
| 8 | Configuración › Empresa › Color de tu marca: se elige un color y el panel cambia | Ponle el color de tu marca: sale en tu panel, en el PDF y en los correos. |
| 9 | Cierre | Facturo. Tus comprobantes electrónicos, en minutos. |

## f3. Facturo en tu celular (solo celular 9:16, ≈ 40 s)

| # | En pantalla | Voz |
|---|---|---|
| 1 | Portada en el celular → sección «Lleva Facturo en tu celular» | Lleva Facturo en tu celular. Se instala desde el navegador, sin tiendas. |
| 2 | Dashboard en el celular | Mira cómo va tu mes desde donde estés. |
| 3 | Nuevo comprobante: una boleta a un cliente con DNI | Emite una boleta en el momento de la venta. |
| 4 | Detalle de la boleta aceptada | Y tu cliente recibe un comprobante válido ante SUNAT. |
| 5 | Cierre | Facturo. Tus comprobantes electrónicos, en minutos. |

---

## Cómo se arma (para regrabar)

Se completa al construir los scripts: datos de prueba, grabación (`scripts/marketing/grabar-video.mjs`), voces (`.claude/videos/<v>/voz/e<N>.wav`) y montaje (`scripts/marketing/montar-video.sh`).
