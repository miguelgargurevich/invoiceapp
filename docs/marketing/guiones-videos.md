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

## f1. Facturo en un minuto (promo general, 38 s)

| # | En pantalla | Voz |
|---|---|---|
| 1 | Portada pública: el título «Emite facturas y boletas electrónicas en minutos» | ¿Tienes un negocio en el Perú y emitir comprobantes electrónicos te quita tiempo? |
| 2 | Dashboard: comprobantes del mes, ventas y lo que requiere atención | Con Facturo ves en una sola pantalla lo que emitiste este mes y lo que necesita tu atención. |
| 3 | Nuevo comprobante: se elige el cliente y se agrega un producto; los totales con IGV se calculan | Eliges al cliente, agregas lo que vendiste, y el IGV se calcula solo. |
| 4 | Se emite y el comprobante queda «Aceptado» por SUNAT | Facturo firma el comprobante con tu certificado, lo envía a SUNAT y guarda su respuesta. |
| 5 | Detalle del comprobante: botones de PDF, XML y CDR | Descarga el PDF, el XML y la constancia de SUNAT cuando los necesites. |
| 6 | Proformas: una proforma aceptada → «Convertir en comprobante» | ¿Primero cotizas? Haz una proforma y conviértela en comprobante cuando tu cliente la acepte. |
| 7 | Cierre: logo de Facturo y facturo.gargurevich.dev | Facturo. Tus comprobantes electrónicos, en minutos. |

## f2. Empieza con Facturo (onboarding, 40 s)

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

## f3. Facturo en tu celular (solo celular 9:16, 19 s)

| # | En pantalla | Voz |
|---|---|---|
| 1 | Portada en el celular → sección «Lleva Facturo en tu celular» | Lleva Facturo en tu celular. Se instala desde el navegador, sin tiendas. |
| 2 | Dashboard en el celular | Mira cómo va tu mes desde donde estés. |
| 3 | Nuevo comprobante: una boleta a un cliente con DNI | Emite una boleta en el momento de la venta. |
| 4 | Detalle de la boleta aceptada | Y tu cliente recibe un comprobante válido ante SUNAT. |
| 5 | Cierre | Facturo. Tus comprobantes electrónicos, en minutos. |

## f4. Recorrido de la demo (2:06 real: montaje de 126,3 s, escritorio y celular)

Se graba contra la **demo pública** (https://demo.facturo.gargurevich.dev), no contra la app local. Voz «Dora», una por escena (`.claude/videos/f4/voz/e<N>.wav`).

| # | En pantalla | Voz |
|---|---|---|
| 1 | `/demo`: título y las tres tarjetas | Esta es la demo de Facturo. Puedes probarla sin registrarte: solo elige cómo quieres entrar. |
| 2 | El cursor recorre las tres tarjetas | Hay tres perfiles: un emprendedor que emite boletas, una empresa de servicios que factura con detracción, y el cliente que recibe y firma una proforma. |
| 3 | Entrar como emprendedor: el dashboard con la franja de demo | Empecemos como emprendedor. Arriba ves que estás en la demo: los datos son de ejemplo y se borran cada noche. |
| 4 | Tarjetas del dashboard (comprobantes, ventas, requieren atención) | En el dashboard están los comprobantes del mes, las ventas aceptadas por SUNAT y lo que requiere tu atención. |
| 5 | Panel «Qué probar» | A la derecha tienes la guía Qué probar, con los pasos que te recomendamos para este perfil. |
| 6 | Nueva boleta: cliente con DNI y un producto; los totales con IGV | Emitir una boleta es simple: eliges a tu cliente con su DNI, agregas el producto, y el IGV se calcula solo. |
| 7 | Se emite y queda «Aceptado» | Al emitirla, Facturo la firma y la envía a SUNAT. En la demo usamos el ambiente de pruebas de SUNAT, así que no tiene valor legal. |
| 8 | Detalle: botones PDF, XML y CDR; el PDF con la marca DEMOSTRACIÓN | Desde el detalle descargas el PDF, el XML y la constancia de SUNAT. En la demo, el PDF lleva la marca Demostración. |
| 9 | Productos: la lista | Tus productos quedan guardados con su precio, para que no tengas que escribirlos cada vez. |
| 10 | «Cambiar de perfil» → Empresa de servicios: el panel con su color | Ahora cambiamos de perfil a una empresa de servicios. Fíjate que el panel usa el color de su marca. |
| 11 | «Requieren atención» → la factura rechazada con su motivo | Aquí hay un comprobante que requiere atención. Facturo te muestra el motivo, para que sepas qué corregir. |
| 12 | Nueva factura: operación con detracción y forma de pago a crédito | También emites facturas con detracción o a crédito en cuotas, como las piden las empresas grandes. |
| 13 | Proformas: la lista con sus estados | Las proformas te ayudan a cotizar: ves cuáles están pendientes, aceptadas, rechazadas o vencidas. |
| 14 | Proforma aceptada → «Convertir a Factura» | Cuando tu cliente acepta una proforma, la conviertes en factura con un clic. |
| 15 | Configuración › Empresa › Color de tu marca | Y en la configuración eliges el color de tu marca. Sale en tu panel, en el PDF y en los correos. |
| 16 | `/demo` → «Tu cliente»: la página de firma | Por último, el lado de tu cliente. Recibe un enlace, revisa la proforma, y no necesita crear una cuenta. |
| 17 | Se dibuja una firma y se marca el consentimiento. **No se envía** | Firma con el dedo o con el mouse, y la proforma queda aceptada del lado de la empresa. |
| 18 | `/demo` con la dirección demo.facturo.gargurevich.dev visible | Pruébala tú mismo con el enlace que ves en pantalla. Y cuando quieras, crea tu cuenta gratis. |
| 19 | Cierre | Facturo. Tus comprobantes electrónicos, en minutos. |

---

## Cómo se arma (para regrabar)

Todo local, sobre la base de videos (`invoiceapp_videos`); nada de producción. Desde la raíz del repo:

1. **Entorno.** `source scripts/marketing/entorno-videos.sh`. Exporta la base de videos, los puertos y claves FALSAS para correo, cobros y R2, así que nada sale a un proveedor real. Los secretos locales (`SUNAT_MASTER_SECRET`, `JWT_SECRET`) quedan en `.claude/videos/entorno.env`, fuera del repo.
2. **Base.** `scripts/marketing/preparar-base-videos.sh`: crea `invoiceapp_videos` en el Postgres del compose (5435) si no existe, aplica el esquema con `prisma db push` y carga los planes. No usa `prisma migrate deploy` (la primera migración supone una tabla `empresas` que no existe en una base nueva) y NO carga `seed_sitio.sql` (trae datos legales reales). La base `invoiceapp` no se toca.
3. **Servicios.** `scripts/marketing/arrancar-facturo.sh backend` (API en 4001) y `scripts/marketing/arrancar-facturo.sh frontend` (Next en modo desarrollo, 3000). `estado` y `parar` para revisar o cerrar. `next build` falla al pre-generar páginas en este worktree («Cannot read properties of null (reading 'useContext')»), por eso se graba en desarrollo.
4. **Datos.** `node scripts/marketing/sembrar-videos.js`: idempotente. Entra por la API (registro, emisor con certificado de prueba cifrado por el backend, clientes, productos, comprobantes) y envía los comprobantes a SUNAT beta (usuario MODDATOS). Cuentas, solo local: `demo@facturo.example` (empresa «Comercial Ejemplo S.A.C.», plan pe-negocio, configurada) y `nuevo@facturo.example` (sin configurar, para el asistente de f2). Clave de prueba en el script, dominio `.example`.
5. **Voces.** `.claude/videos/<f>/voz/e<N>.wav`, una por escena (voz «Dora», Kokoro `ef_dora`). La duración de cada escena la manda su audio. No se regeneran ni se cambian los textos.
6. **Grabación.** `node scripts/marketing/grabar-video.mjs <f1|f2|f3|f4> <escritorio|celular>` (Playwright, un navegador a la vez; f3 es solo celular).
   - **f4 se graba contra la demo pública** (`https://demo.facturo.gargurevich.dev`, API `https://api.demo.facturo.gargurevich.dev`), no contra la app local. El script se niega a correr f4 contra otra dirección. Entra con `POST /api/demo/entrar` (sin contraseña) y guarda el token en `.claude/videos/sesiones/demo-<perfil>.json`.
   - **Límites de la demo al grabar.** La API limita por IP: 300 peticiones cada 15 min en general y 50 en `/api/auth/me` (el navegador la llama al cargar cada página). Una corrida completa de f4 gasta casi todo el cupo de `auth/me`: graba **una corrida por ventana de 15 min**, nunca dos seguidas. Si aparece un 429, espera la ventana antes de reintentar.
   - **Emisión (f4, escena 7).** Una boleta por toma, emitida fuera de cámara. `SIN_EMISION=1` no emite: ensayo sin gastar cupo de la demo (usa una boleta ya aceptada). Ventanas 1600×900 y 540×960, tema claro, cursor berenjena `#6B2C6E`. Cada escena empieza cuando la pantalla ya está lista (`recortes.json`); las acciones que tardan van en `antes`, fuera de cámara.
7. **Montaje.** `scripts/marketing/montar-video.sh <f> <formato>` (ffmpeg, H.264 + AAC) → `.claude/videos/<f>/facturo-<f>-<formato>.mp4`, 1920×1080 o 1080×1920. Cierre: logo de Facturo sobre berenjena, «facturo.gargurevich.dev».
8. **Revisión.** `python3 scripts/marketing/revisar-video.py <f> <formato>`: cuadros a 1 por segundo, hoja de contacto `.claude/videos/<f>/hoja-<formato>.png` y OCR con `tesseract -l spa`. Sale con código 1 si aparece `gargurevich`, `miguel`, `10409241862` o `gmail`. El dominio del cierre (`facturo.gargurevich.dev`) se quita del texto antes de buscar: lo pide el guion.

### Decisiones y límites (10-nov-2026)

- **Base aparte.** El RUC de pruebas `20000000001` (el que SUNAT beta usa con MODDATOS) ya existe en `invoiceapp`, así que la grabación no lo escribe ahí.
- **Certificado de prueba.** Autofirmado, generado con openssl en `.claude/videos/cert/` (fuera del repo). No es de SUNAT; el emisor en BETA lo acepta.
- **Emisión fuera de cámara (f2, escena 7).** SUNAT tarda varios segundos; la factura se emite antes de la escena y el clip muestra su estado «Aceptado». En f1 y f3 el clip usa comprobantes ya aceptados.
- **Texto del botón.** La proforma tiene el botón «Convertir a Factura», no «Convertir en comprobante» como dice el guion. La voz dice «conviértela en comprobante»; el video muestra el botón de la app.
- **Teléfono obligatorio.** El backend pide teléfono en cada cliente, aunque el formulario de Perú no lo marque. El seed le pone un número ficticio.
- **Cifras de la portada.** La landing trae cifras de ejemplo en su vista previa («126», «S/ 18,450.00», «98 %») que no salen de la base de videos.
- **Asistente oscuro.** La pantalla «¡Bienvenido…!» de `/es/setup` es oscura por diseño de la app; no sigue el tema claro de la grabación.
- **Numeración.** Cada grabación de f2 (escena 7) manda una factura nueva a SUNAT beta; por eso la serie F001 sigue avanzando. Las facturas de prueba son ficticias, pero quedan registradas en SUNAT beta.

### Decisiones y límites de f4 (11-nov-2026)

- **Lo que no sale como dice el guion.**
  - Escena 18: la dirección `demo.facturo.gargurevich.dev` no aparece en pantalla (la grabación no muestra barra de direcciones y la página no la imprime). La voz dice «el enlace que ves en pantalla».
  - Escena 11: va directo al comprobante rechazado de muestra, no pasa por el botón «Requieren atención».
  - Escena 17: se dibuja la firma y se marca el consentimiento; «Enviar Firma» NO se pulsa. La voz dice «la proforma queda aceptada», y el clip no lo muestra.
  - Escenas 7 y 8: el PDF se abre en otra pestaña, que la grabación no captura.
- **Lo que no se toca en la demo.** Escena 12 (factura con detracción y crédito): se elige, no se envía. Escena 14: se señala «Convertir a Factura», no se pulsa. Escena 15: se señala el bloque «Color de tu marca», no se elige color ni se guarda.
- **Demo compartida.** Una boleta por formato (escena 7). Los datos se reinician cada noche a las 3:00 (Lima); puede haber otras personas usándola.
- **Panel «Qué probar».** En celular se cierra al final de la escena 5. En escritorio, la app lo muestra abierto también en la escena 7: es comportamiento de la app, no de la grabación.
