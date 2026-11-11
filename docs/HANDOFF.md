# Handoff — InvoiceApp

> Actualizado: 2026-11-11 por claude-code (Haiku 5.5, worktree `.claude/worktrees/demo`, rama `feat/demo`, fase B de la demo: datos de ejemplo y reinicio)
> Actualizado: 2026-11-11 por claude-code (Sonnet 5.5, worktree `.claude/worktrees/demo`, rama `feat/demo` sobre `main` cd65ec3)
> Actualizado: 2026-11-11 por claude-code (Haiku 5.5, worktree `.claude/worktrees/demo-front`, rama `feat/demo-front`, fase C de la demo)
> Actualizado: 2026-11-10 por claude-code (Haiku 5.5, worktree `.claude/worktrees/videos`, rama `feat/videos` sobre `main` cd65ec3)
> Actualizado: 2026-11-10 por claude-code (Haiku 5.5, worktree `.claude/worktrees/instalar-web`, rama `feat/instalar-web` sobre `main` 4f91050)
> Actualizado: 2026-11-10 por claude-code (Haiku 5.5, worktree `.claude/worktrees/app-movil`, rama `feat/app-movil` sobre `main` 48d9973)
> Actualizado: 2026-11-07 por claude-code (Opus 5.5, orquestó; construyeron DeepSeek V4.1 Flash y Nemotron 3.5 Super VL vía OpenCode Zen)
> Actualizado: 2026-11-04 por claude-code (Sonnet 5.5)
> Actualizado: 2026-11-02 por claude-code (Haiku 5.5)
> Actualizado: 2026-11-02 por claude-code

## Estado actual

- App de facturación orientada a EE. UU. (Next.js 14 + Express + Prisma + Postgres, R2, Stripe) en producción.
- Facturación electrónica SUNAT (Perú): núcleo de emisión CONSTRUIDO en la rama local `feat/sunat-diseno` (sin push):
  backend `src/sunat/**` + API `/api/comprobantes` y `/api/sunat` + motor `apps/sunat-engine` (PHP/Greenter).
  E2E contra SUNAT beta: 8/8 aceptados (factura contado, factura crédito+detracción, boleta, NC, ND, baja RA, anulación RC).
  Suites: `npm test` 92/92, `npm run test:db` 44/44.
- Frontend SUNAT para empresas `PE` CONSTRUIDO en la rama local `feat/sunat-frontend` (sin push): sección `/comprobantes`,
  pestaña Configuración › SUNAT, menú, alertas y clientes peruanos. Probado en el navegador contra SUNAT beta (ver «Última sesión»).
  Suites: backend 104/104 y 47/47; frontend 35/35, `tsc` y `next build` en verde. Falta: despliegue y verificar parámetros contra la norma.

## Última sesión

- 2026-11-11 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/video-demo`, rama `feat/video-demo`, sin push): **video f4, recorrido de la demo pública**. Guion en `docs/marketing/guiones-videos.md` (sección f4, 19 escenas, voces ya hechas). Scripts en `scripts/marketing/` (`grabar-video.mjs`, `montar-video.sh`, `revisar-video.py`). Solo se tocó `scripts/marketing/**`, `docs/marketing/**` y este archivo.
  - **Resultado:** `.claude/videos/f4/facturo-f4-escritorio.mp4` (126,3 s, con emisión real de la boleta B001-314074) y `.claude/videos/f4/facturo-f4-celular.mp4` (126,3 s, ensayo final con `SIN_EMISION=1`, usa una boleta aceptada anterior). Hojas de contactos y OCR en la misma carpeta. OCR sin datos prohibidos (`gargurevich|miguel|10409241862|gmail`). No se commitean los MP4 (`.claude/` fuera de git).
  - **Grabación contra la demo pública** (`APP_URL`/`API_URL` por defecto para f4; el script se niega a usar otra dirección). Entrada con `POST /api/demo/entrar`; tokens en `.claude/videos/sesiones/demo-<perfil>.json`.
  - **Límites de la demo:** `/api/auth/me` tiene 50 peticiones cada 15 min por IP (el navegador la llama al cargar cada página) y la API general 300. Una corrida completa de f4 casi agota el cupo de `auth/me`: grabar **una corrida por ventana**. Un 429 deja escenas en blanco, así que hay que esperar la ventana antes de reintentar.
  - **Demo compartida:** dos boletas emitidas en total (escritorio final y una corrida de celular antes del último ensayo). Límite de 30 por empresa y día.
  - **Gotchas:** el script esperaba la respuesta de `/api/comprobantes` como lista (la demo la devuelve como lista, pero un 429 devuelve un objeto de error); `tocar` espera 8 s por elementos ausentes y no avisa si no existen (revisar en la hoja de contactos); en celular hay dos botones «Cambiar de perfil» (escritorio oculto y menú), solo cuenta el visible.
  - **NO verificado:** el PDF que se abre en otra pestaña (escenas 7 y 8) no se ve en el clip; la escena 18 no muestra la dirección de la demo en pantalla; la voz de la escena 17 dice «la proforma queda aceptada» y el clip no lo muestra (no se envía la firma).
  - **Próximos pasos:** Miguel revisa los dos MP4 y decide si se suben; actualizar `docs/demo/ENVIAR-DEMO.md` y el recurso de My Workspace con el enlace del video.

- 2026-11-11 (Claude Code con Opus 5.5): **guía para enviar la demo** (fase F). `docs/demo/ENVIAR-DEMO.md` y publicada en My Workspace con `web_crear` (diseño manual, recurso `cmwc97omh000nrpcohicr1wsi`): perfil recomendado según el negocio, mensajes de WhatsApp y correo, preguntas frecuentes y qué hacer si falla. Video f4 (2:06, escritorio y celular) en MinIO `videos-facturo/` y enlazado en la guía. La guía publicada se actualizó reemplazando su HTML en el bucket (misma URL).
  - Gotcha (Opus): el clip de cierre de f4-escritorio salió de 1 s y en blanco (el mismo fallo de f3). Se rehízo a mano: captura de la tarjeta `CIERRE` con Playwright → `e19.webm` de 5 s con ffmpeg → `recortes.json` e19=0 → `montar-video.sh`. Conviene que `grabar-video.mjs` arme el cierre así siempre.
  - Gotcha: grabar contra la demo pública choca con los límites por IP (300 peticiones/15 min en la API y 50/15 min en `/api/auth`). Para visitantes reales detrás de una misma red (oficina) podría pasar lo mismo: evaluar subir esos límites solo con `MODO_DEMO`.
- 2026-11-11 (Claude Code con Opus 5.5): **demo pública de Facturo publicada** (fase D). https://demo.facturo.gargurevich.dev/es/demo y https://api.demo.facturo.gargurevich.dev.
  - Coolify: proyecto Facturo › entorno `demo` › recurso `facturo-demo` (uuid `tj1xb34jzf1ceshqmsox5aoe`), mismo repo, rama main y `docker-compose.coolify.yml`; base y volúmenes propios. Variables puestas a mano: `MODO_DEMO=si`, `FRONTEND_URL`, `PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` (las de la demo). Claves: las mágicas de Coolify, propias del recurso. Web demo con «Noindex».
  - El compose ahora toma esas direcciones y `MODO_DEMO` de variables, con los valores de producción por defecto (`d92d0d5`): producción no define ninguna y queda igual.
  - Tarea programada «Reinicio nocturno de la demo»: `npm run demo:reiniciar` en el contenedor backend, `0 8 * * *` (Coolify en UTC = 3:00 de Lima), tope 1800 s.
  - Verificado en internet: `/api/demo/estado` con los 3 perfiles y su `enlaceFirma`; entrar como emprendedor desde `/demo` (franja, panel «Qué probar», datos sembrados); registro en la demo → 403 `DEMO_BLOQUEADO` y en producción sigue igual (400 por datos vacíos).
  - Gotchas: el campo de puerto de los dominios de Coolify no se guarda (igual que en producción); el ruteo va por `SERVICE_FQDN_*`. Chrome autocompleta el correo de Miguel en el «Comment» de las variables: revisar antes de guardar. WhatsApp de la franja: vacío; cuando Miguel lo dé, se carga en `configuracion_sitio.demo_whatsapp` de la base de la demo (el reinicio no lo toca).
  - Falta: el primer reinicio nocturno real (revisar su log mañana), el video de 2:30 y la guía para enviar (fases E y F).
- 2026-11-11 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/demo`, rama `feat/demo`, sin push): **demo pública de Facturo, fase B (datos de ejemplo y reinicio)**. Diseño: `docs/superpowers/specs/2026-11-11-demo-facturo-design.md` (puntos 1 y 2, y Anexo).
  - **Siembra** (`src/demo/siembra.js`, con `scripts/demo/sembrar-demo.js`): dos cuentas, `emprendedor@demo.facturo.example` («Bodega Don Lucho», RUC 10 ficticio, plan `pe-emprendedor`) y `servicios@demo.facturo.example` («Soluciones Andinas S.A.C.», RUC `20000000001`, plan `pe-negocio`, color `#0F766E`). Emisores BETA con MODDATOS y un certificado de prueba autofirmado que se genera al sembrar con openssl (`src/demo/certificado.js`), en una carpeta temporal que se borra: nada de llaves en el repo ni en la base en claro. La contraseña de las cuentas es aleatoria y no se imprime (entra por `/api/demo/entrar`).
  - **Conteos de la siembra real** (11-nov, SUNAT beta): «emprendedor» 8 clientes, 7 productos, 0 proformas, 79 comprobantes (73 boletas, 5 facturas, 1 nota de crédito). «servicios» 5 clientes, 4 productos, 4 proformas (pendiente, aceptada, rechazada, vencida), 37 comprobantes (34 facturas, 1 rechazada de muestra, 1 nota de crédito, 1 nota de débito); incluye una factura con detracción (`037`) y otra a crédito en dos cuotas. Hay una solicitud de firma PENDIENTE y vigente sobre la proforma pendiente.
  - **SUNAT beta: todo se envía de verdad.** 115 comprobantes aceptados (79 + 36), cada uno con XML y CDR reales. Probé que beta acepta fechas de hace 60 y 118 días, así que no hizo falta marcar nada como «histórico de ejemplo». Las fechas van de hace 118 a hace 2 días en hora de Lima; nada cae hoy, así que no gasta el límite diario de 30.
  - **Reinicio**: `src/demo/borrado.js` borra solo las dos cuentas y sus empresas, en orden de claves foráneas; no toca planes, `configuracion_sitio` ni otras cuentas. `scripts/demo/reiniciar-demo.js` (`npm run demo:reiniciar`) = borrar + sembrar. Idempotente: la prueba corre dos reinicios y compara conteos.
  - **Arranque**: `scripts/arranque-produccion.sh` corre `sembrar-demo.js --si-falta` solo con `MODO_DEMO=si`, después de planes y datos legales. Si la siembra falla, la API arranca igual y el reinicio nocturno lo reintenta. «Demo completa» = las dos cuentas + la solicitud pendiente (así una siembra cortada a medias se rehace).
  - **Guardas** (`src/demo/guardas.js`): sin `MODO_DEMO=si` la siembra aborta. En local (`NODE_ENV` distinto de `production`) la base debe empezar con `invoiceapp_demo` o `invoiceapp_test`.
  - **Entorno local**: `scripts/demo/entorno-demo.sh` (`source` desde `apps/backend`): base `invoiceapp_demo` en el Postgres del compose (5435), secretos generados en `.claude/demo/entorno.env` (ignorado por git). No se tocó `invoiceapp` ni `invoiceapp_videos`.
  - Suites: `npm test` 175/175 (eran 165); `npm run test:db` 157/157 con `TEST_DATABASE_URL=…/invoiceapp_test_demo` (eran 147). Mutación: quitar la guarda de `MODO_DEMO` en `sembrarDemo` → fallan las 2 pruebas de aborto; restaurado con `cp` + `cmp`.
  - **Decisiones y gotchas**:
    - La factura **rechazada** es de MUESTRA, no un rechazo real de SUNAT. Beta aceptó todo lo que probé: un cliente con RUC de dígito verificador incorrecto, una nota de crédito sobre un comprobante que SUNAT no conoce y una factura con fecha futura. Por eso se marca `RECHAZADO` a mano, con código `2800` (el mismo que usan las pruebas de estados) y un mensaje que dice «de ejemplo de la demostración». Decidir si se mantiene.
    - **Correlativos**: cada día de siembra empieza en otro millar (`correlativoBase`: días desde 2026-01-01 × 1000; hoy 314000). Así una siembra en otro día no repite números que beta ya registró para el mismo RUC (código 1033).
    - **RUC 10 en beta**: el emisor de «emprendedor» NO necesita `20000000001`; beta aceptó sus boletas con MODDATOS.
    - **Experimentos**: en beta quedaron facturas de prueba con serie `F001` (números 36 a 39) y `FC01-2` del RUC `20000000001`. Son de pruebas, sin valor legal.
    - **Logo**: la demo NO trae logo (subirlo sería guardar un archivo de terceros). Queda pendiente.
    - **Dockerfile**: ya instala openssl; no se cambió.
    - El botón «Reiniciar demo» del superadmin queda fuera de esta fase. La tarea nocturna de Coolify (fase D) correrá `npm run demo:reiniciar`.
  - **NO verificado**: el contenedor de la demo (no se levantó Docker con `MODO_DEMO=si`); el arranque con la siembra dentro del contenedor; el reinicio nocturno real; `GET /api/demo/estado` por HTTP con estos datos (la prueba consulta la misma lógica, pero no pasa por HTTP); el aspecto en el navegador.
  - Próximos pasos: fase D (recurso `facturo-demo` en Coolify, dominios, base, `MODO_DEMO=si` y la tarea nocturna `npm run demo:reiniciar`) con OK de Miguel. Antes: decidir la factura de muestra y el logo.

- 2026-11-11 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/demo`, rama `feat/demo`, sin push): **demo pública de Facturo, fase A (backend)**. Diseño y contrato con el frontend: `docs/superpowers/specs/2026-11-11-demo-facturo-design.md` (Anexo). El frontend (fase C) va en otro worktree; esta sesión no tocó `apps/frontend`.
  - **Interruptor:** `src/demo/modo.js` → `esDemo()` lee `process.env.MODO_DEMO === 'si'` en cada llamada. Sin la variable no existe ninguna ruta nueva (404) ni se aplica ningún bloqueo; hay pruebas explícitas (registro, emisor en producción, certificado, cambio de plan, Culqi, subidas y límite diario siguen igual).
  - **Rutas** (`src/demo/rutas.js`, montada en `app.js` como `/api/demo`): `GET /estado` (contrato del Anexo; `enlaceFirma` = solicitud de firma PENDIENTE **y no vencida** más reciente de la empresa de `servicios@demo.facturo.example`) y `POST /entrar { perfil: 'emprendedor'|'servicios' }` (limitador propio, 30 por 15 min por IP; devuelve lo mismo que `/api/auth/login`, con `generateAccessToken` y el nuevo `sanitizeUser` de `middleware/auth.js`). El correo sale SIEMPRE de `src/demo/perfiles.js`, nunca del cuerpo; además un guardián exige correo de demo, `isActive` y `role === 'USER'` (si no, 503). «cliente» o cualquier otro perfil → 400.
  - **Candado** (`src/demo/candado.js`, 403 `{ error, codigo: 'DEMO_BLOQUEADO' }`): correo (una sola salida, `enviarPorResend` en `emailService.js`, devuelve `{ data: { id: 'demo-sin-envio' }, error: null }`); Culqi (`/suscribir`, `/tarjeta`); Stripe (`create-checkout-session`, `create-portal-session`, `sync-from-session`); plan (`cancel`, `reactivate`, `switch-to-free`); `/api/auth` solo deja `POST /login`, `POST /logout` y `GET /me` (todo lo demás, incluido `/register` y cualquier ruta futura de contraseña o correo, queda cerrado); emisor SUNAT (`PUT /api/sunat/emisor`: ambiente PRODUCCION, certificado, clave SOL y un `solUsuario` distinto del guardado → 403; dirección, ubigeo y detracciones se editan); subidas (`POST /api/empresas/logo`, `POST /api/job-photos`, `POST /api/job-receipts`, antes de leer el archivo). El motor usa BETA siempre (`armarEmisor`). Webhooks sin tocar.
  - **Límite diario:** `src/demo/limite.js`, en `POST /api/comprobantes/:id/emitir`: 30 emitidos por empresa y día de Lima, contados en la base (`estadoSunat` no nulo ni BORRADOR y `fechaEmision` de hoy) → 429 `DEMO_LIMITE`. Los rechazados cuentan; los borradores no. **Ojo con la siembra (fase B):** los comprobantes sembrados con fecha de HOY ya gastan cupo.
  - **Marca de agua** en `sunat/pdf/representacion.js`: «DEMOSTRACIÓN», 45°, gris 0.9, tamaño 78, dibujada ANTES del contenido de cada página.
  - **`demoWhatsapp`:** columna `configuracion_sitio.demo_whatsapp` (migración `20261111000000_demo_whatsapp`, con `IF NOT EXISTS`; `*.sql` está en `.gitignore`, se versionó con `git add -f` como las demás). `PUT /api/admin/sitio/legal` la acepta: celular peruano (`9` + 8 dígitos, con o sin `+51`, ignora espacios y guiones), se guarda como **`+51XXXXXXXXX`**; vacío o null = null; **ausente = no se toca** (el formulario de producción no la envía). La respuesta del PUT y `GET /api/sitio/legal` NO la incluyen (no cambian de forma); se lee por `GET /api/demo/estado` (`whatsapp: '+51987654321'` o null). El frontend debe armar el enlace con los dígitos (`wa.me/` + el valor sin `+`).
  - Suites: `npm test` 165/165 (151 + 14 nuevas), `npm run test:db` 147/147 (120 + 27 nuevas). Una corrida de `test:db` falló una vez en «GET /api/subscriptions/usage… crea pe-gratis» (5 s) y pasó sola en las dos siguientes; no tiene relación con el demo, pero conviene vigilarla.
  - Mutaciones (todas restauradas con `cp` + `cmp`): quitar el guardián de correo de demo o el de rol en `/entrar` → falla la prueba del usuario normal; quitar `esDemo()` (o el bloqueo entero) de cada candado (emisor, Culqi, Stripe plan y cobros, `/api/auth`, logo, fotos, recibos, límite, correo, PDF, motor BETA, 404 de `/api/demo`) → falla su prueba; poner `esDemo()` fijo en verdadero → falla la prueba «sin MODO_DEMO».
  - **Decisiones y huecos:** no existen rutas de cambiar contraseña ni correo ni de borrar la empresa, por eso `/api/auth` queda cerrado por defecto en lugar de bloquear rutas concretas. `POST /api/subscriptions/initialize` NO se bloquea (con suscripción existente no cambia nada; la usa el asistente `/setup`). `POST/DELETE /api/empresas/firma` (firma de la empresa) y `PUT /mi-empresa` (acepta un `logoUrl` de texto) NO se bloquean: no son subidas de archivos de terceros según el diseño. El límite diario se comprueba antes de emitir (no dentro de la transacción): dos emisiones en paralelo en el borde podrían pasarse por una o dos. No se probó contra SUNAT beta real ni con el motor PHP.
  - Próximos pasos: fase B (siembra relativa a hoy de los 3 perfiles; las cuentas se llaman `emprendedor@demo.facturo.example` y `servicios@demo.facturo.example`, rol USER, activas); fase C (frontend); fase D (Coolify, con `MODO_DEMO=si` solo en `facturo-demo`).
- 2026-11-11 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/demo-front`, rama `feat/demo-front`, sin push): **fase C de la demo de Facturo** (frontend). Diseño y contrato con el backend: `docs/superpowers/specs/2026-11-11-demo-facturo-design.md` (punto 3, 4 y anexo). Brief de Miguel: lógica pura probada, página `/demo`, franja, panel «Qué probar», candado y marca «DEMOSTRACIÓN».
  - Commits (sin push): `e90028a` lógica pura y pruebas; `4be1f7d` hook, `entrarDemo`, aviso del candado y página `/demo`; `dc2f45e` franja y panel; `e01dac7` controles ocultos; `8ca59f5` marca de agua; `63fd77b` WhatsApp de la demo en Datos legales; `daccf40` compuerta del panel.
  - Lógica en `lib/demo.ts` (+ `lib/demo.test.ts`, 20 pruebas). Hook `lib/hooks/useModoDemo.ts`: una petición a `/api/demo/estado` por carga; 404 o red = no es demo. `AuthContext.entrarDemo` reusa `guardarSesion` (el mismo código que `signIn`).
  - Candado: `lib/api.ts` emite `facturo:demo-bloqueo` cuando el error trae `DEMO_BLOQUEADO` o `DEMO_LIMITE`; `ToastContext` lo muestra con `showWarning`. Un solo sitio.
  - Ocultos con «No disponible en la demo»: registro (la página vuelve a `/demo`), cambiar contraseña, logo, cambiar de plan y pagos (queda el plan actual), clave SOL, certificado y ambiente PRODUCCION en Configuración › SUNAT. El correo ya estaba deshabilitado. La firma de la empresa (`firmaEmpresa`) NO se bloqueó: no está en la lista del diseño.
  - Pasos de «Qué probar» en `pasosDemo`. Cliente: los dos primeros llevan al enlace de firma; el tercero lleva a `/demo`.
  - Verificación: `npx tsc --noEmit` exit 0; `npm test` 151/151. Mutación: quitar la caché de `crearCargaEstado` (base de `useModoDemo`) deja 1 prueba en rojo; quitar `DEMO_BLOQUEADO` de `detectarBloqueoDemo` deja 2 en rojo. Restaurado con `cp` y `cmp`.
  - Gotcha: el `Header` recibe `enDemo` para bajar a `top-10` bajo la franja; el panel de escritorio ocupa `md:mr-80` de la columna.
  - Gotcha: el GET público `/sitio/legal` debe devolver `demoWhatsapp` para que el campo del admin se rellene al recargar. El frontend lo lee si viene; el contrato solo fija el PUT.
  - NO verificado: `next build` (lo corre Opus), el aspecto en el navegador, y los 403/429 reales contra el backend de la fase A.
  - Próximos pasos: Opus prueba `/demo` y el candado contra el backend; decidir si la firma de la empresa también se bloquea; confirmar que el GET de sitio legal trae `demoWhatsapp`.

- 2026-11-10 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/videos`, rama `feat/videos` sobre `main` cd65ec3, sin push): **videos de marketing de Facturo** (f1, f2 y f3), hechos como los de Torre. Pedido de Miguel: «haz los videos para promocionar Facturo así como hicimos los videos para Torre». Guion y cómo se arma: `docs/marketing/guiones-videos.md`.
  - Resultado, fuera del repo (`.claude/videos/`): `f1/facturo-f1-escritorio.mp4` y `f1/facturo-f1-celular.mp4` (38 s), `f2/facturo-f2-escritorio.mp4` y `f2/facturo-f2-celular.mp4` (40 s), `f3/facturo-f3-celular.mp4` (19 s). Hojas de contacto: `<f>/hoja-<formato>.png`. OCR sin coincidencias de datos prohibidos.
  - Scripts nuevos en `scripts/marketing/`: `entorno-videos.sh` (exporta todo; claves falsas para correo, Stripe, Culqi y R2), `preparar-base-videos.sh`, `arrancar-facturo.sh` (backend 4001, frontend 3000, `estado`, `parar`), `sembrar-videos.js` (idempotente, por la API), `grabar-video.mjs`, `montar-video.sh`, `revisar-video.py` (cuadros, hoja y OCR con `tesseract -l spa`).
  - Base APARTE `invoiceapp_videos` en el mismo Postgres (5435). `invoiceapp` (datos de Miguel) no se toca. El RUC de pruebas `20000000001` ya existía en `invoiceapp`, por eso no se usó esa base. Se usa `prisma db push`: `migrate deploy` falla en una base vacía (la primera migración supone la tabla `empresas`). No se carga `seed_sitio.sql` (datos legales reales).
  - Datos: empresa «Comercial Ejemplo S.A.C.» (RUC 20000000001, emisor BETA con MODDATOS y certificado autofirmado de prueba fuera del repo), plan `pe-negocio`, series F001/B001/FC01/FD01/BC01, 6 clientes, 5 productos, 1 proforma aceptada, y 8 comprobantes ACEPTADOS por SUNAT beta (5 del seed, 3 de las grabaciones de f2). Segundo usuario `nuevo@facturo.example` sin configurar, para el asistente.
  - Gotcha: `next build` falla en este worktree al pre-generar páginas («Cannot read properties of null (reading 'useContext')»; `node_modules` enlazado a `marca-frontend`). Por eso se graba con `next dev`.
  - Gotcha: el cliente de Prisma generado en `marca-backend` es anterior al esquema (no tiene `configuracionSitio`): `GET /api/sitio/legal` responde 500 y el footer lo oculta. No se regeneró porque ese `node_modules` está compartido.
  - Gotcha: sin `SUNAT_ALMACEN_DIR` (o `R2_PRIVATE_BUCKET`) el módulo SUNAT no arranca. Con la clave de Resend falsa, el envío de correo de la emisión llega a Resend y se rechaza (`invalid_token`): no sale ningún correo.
  - Gotcha: el cierre salió en blanco una vez (el clip duraba 1 s): la escena ahora espera a que la tarjeta esté pintada. Se comprobó que el último segundo de los 5 MP4 es morado.
  - Gotcha: el backend exige `telefono` en cada cliente, aunque la ficha de Perú no lo marque. Los productos usan `tipo` en mayúsculas (`PRODUCTO` / `SERVICIO`).
  - Gotcha: la emisión queda en `PENDIENTE_ENVIO` y pasa a `ACEPTADO` en varios segundos. Por eso la escena de emisión (f2, escena 7) emite antes, fuera de cámara.
  - Diferencia guion/pantalla: el botón de la proforma dice «Convertir a Factura»; el guion dice «Convertir en comprobante». La voz no se tocó.
  - Verificado: seed idempotente (segunda corrida sin duplicados ni reenvíos); OCR limpio en los 5 MP4; cada hoja revisada a ojo en los 5 videos. NO verificado: audio (no se escuchó), iPhone real (solo Android simulado), y el build de producción (`next build`).
  - Próximos pasos: Opus revisa las 5 hojas y los MP4 antes de subir nada; decidir si se publican y dónde; `prisma generate` en `marca-backend` cuando se toque ese checkout; probar `next build` en un checkout limpio con `npm ci`.

- 2026-11-10 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/instalar-web`, rama `feat/instalar-web` sobre `main` 4f91050, sin push): **«Instalar en tu celular» desde el landing (PWA, sin tiendas)**. Pedido de Miguel: «que se puedan descargar desde la landing»; eligió instalar la web, no la app de tienda.
  - Lógica pura `lib/instalar.ts` (`decidirInstalacion`): con evento `beforeinstallprompt` → botón que llama a `prompt()` (Android, Chrome, Edge); iPhone o iPad con Safari → pasos «Compartir → Agregar a pantalla de inicio»; iPhone con Chrome, Firefox o Edge → «abre esta página en Safari»; instalada, app nativa (`FacturoApp`) o escritorio sin evento → nada. Pruebas en `lib/instalar.test.ts` (10). Mutación: quitar `aplicacionNativa` deja 1 prueba en rojo; restaurado con `cp` + `cmp`.
  - Hook `lib/hooks/useInstalacion.ts`: captura el evento una vez por carga (módulo compartido) y decide después de montar. El servidor y el primer render no muestran nada.
  - Sección `#instalar` (`components/landing/InstalarSection.tsx`), entre Precios y Preguntas: va después de los planes porque instalar sirve sobre todo a quien ya tiene cuenta. Ítem «Instalar app» solo en el menú móvil (`LandingHeader`), con la misma decisión; apunta a `#instalar`.
  - Service worker mínimo `public/sw.js`: un handler de `fetch` que pasa cada petición a la red (no cachea nada, no toca navegaciones). Hace falta porque Chrome sigue exigiendo un `fetch` real para `beforeinstallprompt` (los handlers vacíos no cuentan; fuente: blog de Chrome «Revisiting Chrome's installability criteria»). Se registra en `/sw.js` solo en el navegador y fuera de la app nativa.
  - Manifest: `start_url` pasa de `/` a `/es/dashboard`. Razón: quien instala ya tiene cuenta; el dashboard lo deja entrar y sin sesión lo manda a login. Antes `/` pasaba por dos redirecciones (`/` → `/es` → `/es/landing`). Ícono `purpose: maskable` nuevo `public/marca/icon-maskable-512.png`: `icon-512.png` llega casi a los bordes y se recortaría con la máscara; la versión nueva pone el mismo logo al 52 % sobre `#6B2C6E`.
  - Textos en `messages/es.json` (`landing.instalar`, `landing.nav.instalar`), con tuteo.
  - iPhone con Chrome: la prensa de 2023 dice que iOS 16.4 y posteriores permiten «Agregar a inicio» también desde Chrome y Edge. No es documentación oficial de Apple, así que las instrucciones siguen mandando a Safari. Confirmar antes de cambiarlo.
  - Verificación: `npm test` 131/131, `npx tsc --noEmit` exit 0. NO verificado: el aspecto en el navegador, la instalación real en Android y en el simulador de iPhone, y `next build` (lo corre Opus).
  - Gotcha: `Share` de lucide-react existe (el ícono de Compartir de iOS); `Share2` es otro.

- 2026-11-10 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/ios-sin-conexion`, rama `fix/ios-sin-conexion` sobre `main` 4f91050, sin push): **«Sin conexión» en iOS**.
  - Sin cambios de código nativo: iOS ya usa `server.errorPath` (`WebViewDelegationHandler`, `didFail` y `didFailProvisionalNavigation`). Probado en el simulador «Facturo iPhone 17 Pro» con una copia de la app que apunta a `https://facturo-sin-red.invalid`: aparece la pantalla. Captura `mobile/capturas/ios-sin-conexion.png`. Build de producción: `mobile/capturas/ios-prueba-produccion.png`.
  - «Reintentar» probado por Opus en el simulador: carga la portada de producción (`mobile/capturas/ios-reintentar.png`).
  - Gotcha (Xcode): `xcodebuild` falla con «fatal: cannot use bare repository» si el git global tiene `safe.bareRepository=explicit`. Se resolvió con `-clonedSourcePackagesDirPath build/SourcePackages -disableAutomaticPackageResolution` (paquetes ya resueltos en DerivedData). No se cambió la configuración de git.
  - Gotcha: el simulador de Torre también está encendido; no se tocó.
- 2026-11-10 (Claude Code con Opus 5.5, revisión de `feat/app-movil`): **app probada en Android e iOS**.
  - Android (emulador propio, API 34): portada, menú, login, botón Atrás y pantalla «Sin conexión» con modo avión. Arreglado: el logo de esa pantalla (ruta relativa con `server.url` no carga sin red; ahora el SVG va en línea).
  - iOS: instalado Xcode 26.6 y el simulador iOS 26.5; `xcodebuild` OK y probado en un iPhone 17 Pro (portada, menú, login). El texto con degradado del landing se ve bien; en el WebView 113 del emulador Android sale como franja sólida.
  - Gotcha: la primera carga tarda 10–20 s con la pantalla en blanco (carga la web de producción sin caché).
  - Gotcha (Mac): `simctl runtime delete` de runtimes «duplicados» borra la imagen compartida; no hacerlo.
  - Falta: sesión iniciada, descargas reales (Filesystem/Share), selector de archivos y decidir la clave de cámara en iOS.
- 2026-11-10 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/app-movil`, rama `feat/app-movil` sobre `main` 48d9973, sin push): **app móvil fase 1 (iOS y Android) con Capacitor 8.6** (pedido de Miguel: «así como lo está haciendo Torre»). Guía completa en `docs/APP-MOVIL.md`.
  - Proyecto `mobile/` (appId `pe.facturo.app`): envuelve `https://facturo.gargurevich.dev` con `server.url`. `FACTURO_URL` solo para pruebas (http solo en localhost); `npm run verificar` falla si el build no es de producción. Navegación limitada a facturo; lo demás sale al navegador o app del sistema. Botón Atrás en `MainActivity.java`; pantalla «Sin conexión» con `errorPath`; vertical; zona segura con `SystemBars`.
  - Descargas en la app: `apps/frontend/lib/descargas.ts` (Filesystem + Share dentro de la app; navegador sin cambios). Sitios cambiados: SUNAT `guardarArchivo`, CSV de clientes/productos/facturas, PDF de vistas previas y de detalle de factura y proforma. `npm test` 121/121, `tsc` exit 0, mutación en rojo y restaurada.
  - Android: `./gradlew assembleDebug` OK (APK en `mobile/android/app/build/outputs/apk/debug/app-debug.apk`), instalado en el emulador compartido `emulator-5556`. Pendiente: capturas, Atrás, sin conexión y selector de archivos en el dispositivo (el emulador estaba ocupado por otra app).
  - iOS: proyecto generado (SPM, sin CocoaPods). **Sin compilar** (no hay Xcode). `Info.plist`: vertical y claves de cámara y fotos en español (la cámara por el selector de «Tomar foto»; decisión pendiente de Miguel).
  - Permisos Android: ninguno extra. Notificaciones push: NO construidas (plan de fase 2 en la guía).
  - Gotcha: `npm run sync` reescribe `www/sin-conexion.html` con la URL del build; el archivo versionado debe quedar con la URL de producción.
  - Gotcha: el emulador es compartido con otra sesión (Torre). No se cierra; se reusa el que esté en línea. Nunca dos a la vez.
- 2026-11-07 (OpenCode: DeepSeek V4.1 Flash hizo los puntos 1 y 2 y se quedó sin cupo gratis; Nemotron 3.5 Super VL terminó el 3 y el 4; revisó e integró Claude Code con Opus 5.5, worktree `.claude/worktrees/pendientes-frontend`, rama `fix/pendientes-frontend` sobre `origin/main` 4fee4d2): **pendientes del frontend: estado de error en comprobantes y `next lint`**. Commits de esta rama ya integrados: CommandPalette con prefijo de locale y comprobantes para empresas PE (`e2a75ff`) y notas que no ofrecen notas ni anulación con NC (`ac25e28`).
  - Punto 3 (estado de error): `nuevo/page.tsx` (ya cargaba error con ErrorState + Reintentar/Volver de la sesión previa, sin commitear) y `editar/page.tsx`: si la carga inicial falla, la pantalla ya no se queda en `<SkeletonFormPage />` para siempre; muestra `ErrorState` (reusa `EmptyState`, ícono de alerta ámbar) con título `sunat.cargaError`, mensaje vía `normalizarError`, botón «Reintentar» (re-carga mediante `intento`) y «Volver» al detalle `/${locale}/comprobantes/{id}` (o al listado desde nuevo). `ErrorState` se exporta desde `components/common/index.ts`. Textos nuevos `cargaError` y `reintentar` en `messages/es.json` y `messages/en.json`.
  - Punto 4 (`next lint`): causa, `eslint-config-next` ^16 (solo flat config/ESM) junto a ESLint 8 con `.eslintrc.json` → «Converting circular structure to JSON … property 'react' closes the circle»; se alineó a `eslint-config-next@^14.2.35` (misma versión que Next 14.2.35) con `npm install --legacy-peer-deps` (node_modules propio del worktree, sin tocar el checkout principal). `npx next lint` ahora corre y reporta 223 errores y 25 avisos en 51 archivos preexistentes; ninguno de los archivos tocados en este encargo añade problemas nuevos. Por encargo no se corrigió ningún aviso/error de código existente.
  - Verificación de esta sesión: `npm test` 107/107, `npx tsc --noEmit` exit 0, `npx next build` exit 0, `npx next lint` ejecuta (código 1 solo por problemas preexistentes de código).
  - Revisión de Opus (diff completo): tras `npm ci --legacy-peer-deps` limpio con el lockfile nuevo (el del Dockerfile), `npm test` 107/107, `tsc` exit 0, `next build` exit 0, `next lint` corre. Mutaciones: `esNota` → `false` deja 2 pruebas en rojo; quitar la ruta PE de «new-invoice» deja 1 en rojo; restaurado con `cp` + `cmp`. NO verificado: el aspecto en el navegador (paleta en PE, pantalla de error, modal de anular una nota fuera de plazo).
  - Regla nueva: una nota (07/08) no ofrece «Nota de crédito/débito» y, si venció el plazo de baja, el modal de anular solo avisa que no se anula con otra nota (`esNota` en `lib/sunat/estados.ts`). La paleta (Ctrl+K) usa `lib/paletaComandos.ts`.
- 2026-11-04 (Claude Code con Opus 5.5, revisión e integración de `feat/datos-legales`): la siembra `seed_sitio.sql` ya trae la razón social que confirmó Miguel (MIGUEL ARTURO FERNANDEZ GARGUREVICH) y el correo del producto `facturo@gargurevich.dev`. **El buzón todavía no existe**: Miguel lo creará. Verificado: backend 151/151 y test:db 120/120; frontend 101/101, `tsc` y `next build` en verde. Mutación: sin `requireSuperAdmin` en el PUT, la prueba de 403/401 falla.
- 2026-11-04 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/datos-legales`, rama `feat/datos-legales` sobre `main` c257008): **datos legales del servicio en BD** (pedido de Miguel vía Torre: mostrar quién presta el servicio; «nada de variables de entorno, todo en BD»). Sin push.
  - **Modelo** `ConfiguracionSitio` (`configuracion_sitio`, una sola fila, `id = "global"`): `legalMarca`, `legalRazonSocial`, `legalRuc`, `legalDomicilio`, `legalCorreo` (todos `String?`, columnas `legal_*`) y `updatedAt`. Migración `20261104000000_datos_legales`.
  - **Siembra** `prisma/seed_sitio.sql` (`ON CONFLICT (id) DO NOTHING`), llamada en `scripts/arranque-produccion.sh` tras los planes. Valores iniciales: marca «Ing. Miguel F. Gargurevich», RUC 10409241862, domicilio «Av. Las Gaviotas 2121, Santiago de Surco, Lima, Perú». **Si la fila ya existe no se toca.**
  - **API**: `GET /api/sitio/legal` (pública, solo los 5 campos; `src/routes/sitio.js`) y `PUT /api/admin/sitio/legal` (solo `requireSuperAdmin`, en `src/routes/admin.js`). Valida RUC (11 dígitos + dígito verificador módulo 11, `rucValido` en `src/sitio/legal.js`: el backend no tenía uno), correo y máx. 200 caracteres; recorta espacios y `''` → `null`. 400 con mensaje en español; 403 para ADMIN/USER; 401 sin sesión.
  - **Dónde se edita**: Admin › pestaña «Datos legales» (solo SUPER_ADMIN), `components/admin/DatosLegalesForm.tsx`.
  - **Dónde se ve**: `lib/legal.ts` (lógica pura) + hook `lib/hooks/useDatosLegales.ts` (una petición compartida). Bloque «Quién presta el servicio» (`components/legal/QuienPresta.tsx`) en Términos y Privacidad, sin numerar, antes de la sección 1; página de Contacto; `CorreoContacto` (ayuda, FAQ, precios, legal); pie del landing, login y registro («Facturo · por Ing. Miguel F. Gargurevich · RUC 10409241862», reemplaza «Desarrollado por Gargurevich Dev»; si la API falla la línea se oculta).
  - **Variable retirada**: `NEXT_PUBLIC_CORREO_CONTACTO` / `CORREO_CONTACTO` (`lib/sitio.ts`, `.env.example`) ya no existen; **sustituye la nota «Correo de contacto por variable» de más abajo**. Claves fijas `legal.contactPage.companyName/companyType/address.line1/line2` quitadas de `es.json`.
  - **Por confirmar (vacío → el sitio muestra «por confirmar»)**: **razón social** (nombre completo exacto de la consulta RUC de SUNAT; no es la marca ni «GARGUREVICH MIGUEL FERNANDO») y **correo de contacto**. Cargarlos en Admin › Datos legales, sin desplegar.
  - Pruebas: `test/db/datos-legales.test.js` (8: GET público, PUT SUPER_ADMIN normaliza, RUC inválido 400, correo/largo/tipo 400, ADMIN/USER 403 y sin sesión 401, siembra y que no pisa), `test/unit/legal-ruc.test.js` y `lib/legal.test.ts` (frontend).
  - Gotcha: `*.sql` está en `.gitignore`; la migración y `seed_sitio.sql` se agregaron con `git add -f` (como las anteriores). Producción: `prisma db push` crea la tabla sola y luego corre la siembra.
- 2026-11-02 (Claude Code con Opus 5.5): la **firma pública** (`routes/signaturesPublic.js`, POST de envío de firma) llamaba a `sendSignatureConfirmationEmail` con parámetros viejos (`to`, `companyName`…) y sin empresa, así que la confirmación fallaba en silencio. Ahora usa `datosConfirmacionFirma(signatureRequest, signature)` (exportada para pruebas): firmante, documento (factura o proforma), empresa (con `logoUrl` y `colorPrimario` en el `select`) y la fecha de firma. Prueba en `test/unit/firma-publica-confirmacion.test.js`. `npm test` 148/148; mutación (sin empresa) en rojo.
- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/correos-firma`, rama `fix/correos-firma` sobre `main` 7f42609): **correos de firma en español y para Perú** (pedido de Miguel: «Sí, tradúcelos»). Sin push.
  - `src/services/emailService.js`: la solicitud (`sendSignatureRequestEmail`) y la confirmación (`sendSignatureConfirmationEmail`) pasan a español neutro con tuteo. Asuntos: «Firma requerida: Proforma P001-3», «Confirmación: firmaste la Proforma P001-3», «Firmado: Proforma P001-3 por <nombre>». Tipo «Factura» o «Proforma». Fechas `es-PE` en `America/Lima`. Plantilla común (`plantillaFirma`, `estilosFirma`). El aviso al dueño arma su propio texto (ya no hace `replace` de frases en inglés).
  - Quitado: ESIGN, UETA, «U.S.» y toda frase de validez legal. El pie dice lo que la ruta sí guarda: fecha, hora e IP (`ipAddress` en `routes/signatures.js` y `signaturesPublic.js`).
  - Color: la cabecera de la confirmación usa el color de marca (`acento`) en vez del degradado verde. La solicitud también pasa a color de marca (cabecera y botón, antes gris). El recuadro verde «Firma confirmada» se queda (es éxito).
  - Monto en `S/` (antes `$` fijo; `total` puede venir como texto, así que va por `Number`). Quitados los emojis de estos dos correos.
  - Defecto `locale = 'es'` en todas las funciones de `emailService.js`. `routes/signatures.js` pasa `locale: 'es'` en sus dos llamadas (y en la comentada). El enlace sale `/es/sign/<token>`.
  - Pruebas nuevas: `test/unit/correos-firma.test.js` (8), con el doble de Resend de `correos-marca.test.js`.
  - Verificado: firma + marca 13/13 con un stub de `resend` puesto en el scratchpad (fuera del repo). Mutación de un asunto del dueño: 2 pruebas en rojo, restaurado con `cp` + `cmp`.
  - NO verificado: `npm test` real. El worktree no trae las dependencias del backend (`node_modules` solo tiene `concurrently`) y no se instaló nada. Con el stub, la suite completa da 67 de 78: los 11 fallos son `Cannot find module` (`pg-boss`, `zod`, `decimal.js`, `pdf-lib`, `@aws-sdk/client-s3`). Falta correr `npm ci` en `apps/backend` y repetir. Tampoco se vio el correo en un cliente real (Gmail, Outlook).
  - Gotchas: `routes/signaturesPublic.js` sigue llamando a la confirmación sin `empresa` (ya roto, ver la sesión de marca). El ⚠️ de la proforma (`sendProformaEmail`) sigue: no es de firma y no se tocó.

- 2026-11-02 (Claude Code con Opus 5.5): **restos en inglés traducidos** en el frontend. Archivos: el lienzo de firma (`components/signature/SignatureCanvas.tsx`), las vistas previas de proforma y factura (`ProformaPreview.tsx`, `InvoicePreview.tsx`; también salen en el PDF que se genera desde ellas) y las etiquetas de rol en Admin. Revisé el texto visible de las 23 pantallas del panel y de dos detalles de proforma y de comprobante (con iframes en local); no quedó nada en inglés. Pendiente: los correos de firma del backend (`emailService.js`: solicitud y confirmación) siguen en inglés y citan ESIGN/UETA de EE. UU.
- 2026-11-02 (Claude Code con Opus 5.5): la cabecera del menú lateral muestra «RUC …» bajo el nombre de la empresa cuando hay RUC (`components/global/Sidebar.tsx`). `tsc` exit 0 y visto en local. Además, la empresa de Miguel en producción pasó a `pe-negocio` (solo `plan_id`; sin cobro).
- 2026-11-02 (Claude Code con Opus 5.5, worktree `.claude/worktrees/por-facturo`): **selector de color visual** en «Color de tu marca» (pedido de Miguel). `components/settings/SelectorColor.tsx`: cuadro de saturación y brillo más barra de tono, con arrastre (pointer capture) y flechas del teclado (`role="slider"`), sin dependencias nuevas; reemplaza el `<input type="color">`. Guarda el HSV aparte para no perder el tono al pasar por grises. `lib/paleta.ts`: `hexAHsv` y `hsvAHex` (con pruebas). Verificado: `npm test` 96/96, `tsc --noEmit` exit 0, y en local: arrastrar cambia el código y la vista previa, y un color sugerido mueve el selector. Ojo: en producción la cuenta de Miguel está en plan Gratis, por eso el bloque sale bloqueado.
- 2026-11-02 (Claude Code con Opus 5.5, worktree `.claude/worktrees/por-facturo`): **firma de Facturo** en el pie del menú lateral: una sola fila con el ícono de Facturo, el nombre «Facturo» y el ícono de Ayuda (enlace a `/ayuda`, sin texto) (`components/global/Sidebar.tsx`); primero estuvo bajo el nombre de la empresa y Miguel pidió moverla. Con el menú colapsado queda solo el ícono. «Facturo» va en berenjena fijo (`#6B2C6E`, oscuro `#D7B3D9`), no en el color de marca de la empresa. Verificado: `tsc --noEmit` exit 0 y visto en local (con la empresa en azul, la firma sigue berenjena).
- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/marca-frontend`, rama `feat/marca-frontend` sobre `main` cdd6c5f): **color de marca de la empresa** (pedido de Miguel: «sentido de pertenencia»). Sin push. Decidido con Opus: un color principal por empresa; la escala se genera sola.
  - Escala `primary` en tripletas RGB (`globals.css`, `tailwind.config.ts`) para que funcionen las opacidades. `lib/paleta.ts`: `generarEscala` (el color elegido es el paso 600), `ajustarParaTextoBlanco` (oscurece hasta 4.5:1 con texto blanco), `esHexValido`.
  - Se aplica solo en el panel: `components/global/TemaMarca.tsx` (montado en `app/[locale]/(dashboard)/layout.tsx`) escribe las `--primary-*` en `<html>` y las quita al desmontar. Landing, login, registro, asistente y firma no leen `colorPrimario`.
  - Selector en Configuración › Empresa (`components/settings/ColorMarca.tsx`): 8 colores sugeridos, selector y campo hex, vista previa en vivo, aviso de ajuste, «Restablecer» (null). Sin plan `hasCustomBranding`: bloque deshabilitado con «Disponible desde el plan Negocio».
  - Commits: `2adc94a`, `db9f846`, `648d185` (y esta entrada).
  - Verificado: `npm test` 93/93; `npx tsc --noEmit` exit 0; `npx next build` exit 0 (35 páginas, sin avisos). Mutación de `ajustarParaTextoBlanco` (bucle desactivado): 1 prueba en rojo, restaurado con `cp` + `cmp`.
  - NO verificado: el aspecto en el navegador (modo claro y oscuro, el selector con plan y sin plan, el 403 real); el backend (`colorPrimario`) lo agrega la otra sesión.
  - Gotchas: (a) `colorPrimario` va en el PUT solo si cambió (un 403 bloquearía todo el guardado de una empresa sin plan que conserva color). (b) «Predeterminado» guarda `null`, no `#6B2C6E`. (c) El color se ajusta para el texto blanco; esa misma escala sirve para texto `primary-600` sobre blanco. (d) `lib/culqi.ts` sigue con el berenjena en el widget de cobro: pendiente de decisión. (e) `settings.errorSaving` no existe en `es.json` (ya estaba así). (f) El PDF del comprobante y los correos no usan el color todavía: lo hace el backend en la otra sesión.
- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/marca-backend`, rama `feat/marca-backend` sobre `main` cdd6c5f): **color de marca de la empresa (backend)**. Sin push.
  - Campo `Empresa.colorPrimario` (`color_primario`, `#RRGGBB` o null). `PUT /api/empresas/mi-empresa` lo acepta: 400 si no es hex; 403 `FEATURE_NOT_AVAILABLE` si el plan no tiene `hasCustomBranding` y el color es distinto del guardado (reenviar el mismo color no da 403; `null` siempre se permite); al crear la empresa se ignora. `src/planes/marca.js`: `colorDeMarca` (por defecto `#6B2C6E`), `colorParaTextoBlanco` (contraste 4.5:1 WCAG; oscurece mezclando con negro), `hexARgb01`, `tintar`.
  - Aplicado en el PDF del comprobante (`src/sunat/pdf/representacion.js`: borde y franja del RUC, tipo y número, línea de la tabla) y en los correos de `src/services/emailService.js` (factura, proforma, firma, creación de factura: títulos, bordes, botones, enlaces). El verde de «pagado» y «firmado» se queda (es estado de éxito).
  - Verificado: `npm test` 138/138; `npm run test:db` 112/112 (BD `invoiceapp_test_marca`). Mutación del chequeo de plan: 1 prueba en rojo; restaurado con `cp` + `cmp`.
  - NO verificado: el aspecto del PDF y de los correos en un visor real (Gmail, Outlook) y un envío real por Resend.
  - Pendiente, fuera de la lista permitida (no tocado): `routes/facturas.js` y `routes/proformas.js` pasan a `sendInvoiceEmail` / `sendProformaEmail` un objeto `empresa` reconstruido sin `colorPrimario`: esos dos correos salen en berenjena hasta que se agregue el campo. `routes/signaturesPublic.js` llama a `sendSignatureConfirmationEmail` sin `empresa` y con otra forma de parámetros (`to`, `companyName`): ese correo ya estaba roto (la llamada va en try/catch y el error se pierde en silencio). `sunat/notificador.js` no tiene color (correo solo de texto con adjuntos): sin cambios.
  - Gotchas: mezclar `#FFFF00` con negro da `#7A7A00` (oliva, no ocre); es el método que pide la brief. `emailService.js` sigue con un emoji (⚠️) en la proforma y los correos de firma están en inglés (sin tocar).
- 2026-11-02 (Claude Code con Opus 5.5): **guardar Configuración › Empresa ya no pisa datos**. `PUT /api/empresas/mi-empresa` solo escribe los campos enviados; los valores por defecto (de Perú: PEN, es, IGV 18 %, pais PE) son solo para crear. Antes un guardado parcial ponía `setupCompleted=false`, USD, `en`, IGV 0 y «Tax» (por eso el dashboard mandaba al asistente). Pruebas en `test/db/empresa.test.js`. Además: el logo del menú expande o colapsa el menú (se recuerda en `localStorage.menuExpandido`) y no lleva al landing; «Comprobantes» va antes que «Proformas»; el asistente redirige a `/{locale}/dashboard`.

- 2026-11-02 (Claude Code con Opus 5.5): **series y logo en producción**.
  - Las series no «cargaban» porque la empresa de producción no tenía ninguna (emisor sin configurar). Ahora `PUT /api/sunat/emisor` crea F001, B001, FC01, FD01 y BC01 si la empresa no tiene series (una sola vez; prueba en `test/db/rutas.test.js`), y «Nuevo comprobante» avisa con enlace a Configuración › SUNAT cuando no hay series del tipo.
  - El logo no se veía en producción: helmet manda `Cross-Origin-Resource-Policy: same-origin` y la web (facturo.…) y la API (api.facturo.…) son orígenes distintos. `/uploads` ahora responde `cross-origin` (solo esa ruta).
  - Verificado: backend 122/122 y BD 103/103, `tsc` del frontend en verde.

- 2026-11-02 (Claude Code con Haiku 5.5 y subagentes Haiku en el mismo worktree, `.claude/worktrees/estilo-uniforme`, rama `feat/estilo-uniforme` sobre `main` 02a40c7): **cabeceras y botones uniformes** (pedido de Miguel: «iguala el estilo de las cabeceras de todas las páginas y los botones»). Sin push.
  - Cabeceras: `components/common/PageHeader.tsx` (título, subtítulo, ícono, flecha de volver, acciones, insignia) en las 26 páginas del panel y en `DashboardGeneral`/`DashboardPeru`. Causa del título de distinto tamaño: las reglas `.text-*  h1–h3` de `globals.css` (quitadas); los `!text-*` de parche también.
  - Botones: `Button` acepta `href` (Link con estilo de botón). `primary` = acción principal (una por pantalla), `outline` = secundarias, `ghost` = ícono o tabla, `danger` = borrar o anular. Degradados quitados de botones, tarjetas y paneles, salvo login, registro, asistente (`components/setup`) y landing.
  - Apariencia: tamaño de texto `small` por defecto (`preferences.js`, `@default("small")` de `fontSize`, `PreferencesContext`). Tema sigue en `system`.
  - Commits: `8898262`, `15f88d1`, `560c656`, `8377eb0`, `6e5a177`, `550fca7`, `174eb37`, `477a260`, `ac58090`, `013f9bb`, `adc613f`, `e7a9b83`, `ba310bc`.
  - Verificado: `tsc` 0; backend `npm test` 122/122; frontend `npm test` 82/82; `next build` 0 sin avisos; `git grep "<h1"` en el dashboard vacío; degradados que quedan: solo los overlays negros de fotos (`JobPhotosGallery`), más landing y setup (excepciones).
  - NO verificado: el aspecto en el navegador (claro y oscuro, móvil de 375 px, las variantes de `Modal` y `ConfirmDialog`, plan popular y botón cancelar en Suscripción).
  - Próximos pasos: Opus revisa en el navegador. Pendiente de decisión: «Cancelar suscripción» quedó en `danger` sólido; las flechas del visor de fotos siguen crudas (cambio de 2 líneas a `ghost`).
  - Gotchas: (a) las filas de preferencias ya guardadas con `fontSize 'large'` no cambian (por pedido); el nuevo default solo aplica a quien no tiene fila. (b) `schema.prisma` deja `theme @default("light")` como estaba. (c) `en.json` no tiene las claves nuevas (`common.openMenu`, `common.toggleTheme`, `subscription.testCardLabel`/`testCardHint`, y las de cabeceras y botones); `/en` redirige a `/es`, así que no se ve, pero conviene agregarlas si vuelve el inglés. (d) `facturas/nueva` y `proformas/nueva` ahora vuelven al listado (antes `router.back()`); `clientes/[id]` y `productos/[id]` ya no muestran el nombre en la cabecera. (e) `comprobantes/[id]/editar` vuelve al detalle, no al listado. (f) `Button` con `href` ignora `disabled` y `loading`. (g) `subscription.testModeDesc` dice «Stripe», pero la facturación activa en Perú es Culqi.
- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sin-verde`, rama `feat/sin-verde` sobre `main` d4be830): **regla de color: berenjena para lo principal, verde solo para lo que significa «está bien»** (pedido de Miguel: «no me gusta el verde para proformas, revisa si hay más así y corrige»). Sin push.
  - Regla (decidida por Opus): acción principal de cada pantalla (botón principal, CTA, degradados de botón) = `primary` (`bg-primary-600 hover:bg-primary-700`, degradados `from-primary-600 to-primary-700`). Decorativo (ícono de encabezado, cuadritos de ícono en tarjetas, acentos, ilustraciones del landing) = `slate` (`bg-slate-100 text-slate-600`, oscuro `dark:bg-slate-800 dark:text-slate-300`), o berenjena suave en Facturas. Verde solo semántico: Aceptado/Pagado/Aceptada/Firmada/Activa, toasts y mensajes de éxito, checks de «incluido», deltas positivos y «cobrado».
  - Hecho: 82 reemplazos en 23 archivos de `app/` y `components/` (commit `5294cd2`). Proformas: «Nueva Proforma» y «Guardar» en berenjena; «Total cotizado» y el ícono de encabezado en slate. Pricing, «Reactivar», «-20 %» y «Ahorra X %» en berenjena; el plan gratis, las categorías de reportes y las features del landing que eran verdes pasan a slate.
  - Texto: `/proformas` mostraba «Descripción» como subtítulo (la clave `quotes.description` es la etiqueta de columna) y la tarjeta decía «PROPUESTAS». Ahora: `quotes.pageDescription` = «Cotiza a tus clientes y conviértelas en comprobantes» y `quotes.quotesCount` = «Proformas». Mismo fallo corregido en Productos (`products.subtitle`) y Nueva Proforma (`quotes.newQuoteDescription`).
  - Verde que se queda (semántico): `admin` (activo, conteo de activos), `configuracion` (mensaje de éxito), `facturas/[id]` (pagos, saldo 0, total pagado), `proformas` (Monto aceptado y filtro «aceptada»), `reportes` (cobrado, pagado), `register` (checks de beneficios y éxito), `sign`, `Badge` `green` (aceptada), `Card` `green` (Total cobrado), `Modal`/`Toast`/`SendEmailModal`/`ProformaSendEmailModal` (éxito), `ActivityTimeline` (paid y conector de pasos completados), `SubscriptionTab` (plan actual, «incluido»), `EmisorForm` (SUNAT configurada), `PricingSection` (checks), `HeroSection` (checks, pastilla de estado de la maqueta).
  - Verificado: `npm test` 82/82; `npx tsc --noEmit` exit 0; `npx next build` exit 0 sin avisos.
  - NO verificado: el aspecto en el navegador (modo claro y oscuro; Opus revisa). El `Button` `variant="success"` sigue en esmeralda, pero ninguna pantalla lo usa; el `green` de `HeroSection` (`stat.color`) es dato muerto.
  - Gotchas: (a) `t('description')` sirve para etiquetas de columna y de campo además de cabeceras: no cambiar la clave, cambiar la cabecera. (b) El verde de los planes en `SubscriptionTab` que marca el plan actual se dejó como «activa»; si Miguel lo quiere berenjena, es un cambio de una línea.

- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/quita-eeuu`, rama `feat/quita-eeuu` sobre `main` c0f6a77): **restos de EE. UU. en el frontend** (pedido de Miguel: «Sí, quítalos»). Sin push.
  - Tipos de documento: `components/common/SelectTipoDocumento.tsx` ofrece solo RUC, DNI, Carné de extranjería, Pasaporte y Sin documento, en clientes (nuevo y detalle), facturas nuevas y proformas nuevas (estas dos no tenían rama de Perú). `lib/tiposDocumento.ts`: un registro antiguo con SSN, EIN, ITIN, DRIVER_LICENSE, STATE_ID o PASSPORT sigue mostrando su etiqueta.
  - Asistente de configuración: sin selector de país. Se quitan los pasos de moneda e impuesto (quedan 5: bienvenida, cuenta, empresa, plan, listo). La empresa siempre es PE, con PEN e IGV 18 % activado (también al cargar una empresa existente). `getPlans` por defecto consulta `PE`.
  - Aviso de mejora: `lib/planSugerido.ts` (catálogo de Perú y `planMasBarato`). `UpgradeModal` recibe `funcion` en vez de `requiredPlan` y muestra el plan más barato que la incluye, sin precios. `PlanBadge` reemplaza a `ProBadge` (en proformas). `BusinessBadge` borrado (sin uso). `subscriptionFeatures.disponibleDesde`.
  - Plantillas de proforma y factura en español y neutras (alcance, plazo, forma de pago, validez, IGV y garantía simple). Sin cláusulas de EE. UU. (seguros del dueño, honorarios de abogados, sales tax). Los montos y días van entre corchetes: hay que completarlos antes de enviar. La garantía va dentro de las condiciones de la proforma.
  - Verificado: `npm test` 82/82; `npx tsc --noEmit` exit 0; `npx next build` exit 0 (35 páginas). Mutaciones en `lib/planSugerido.ts` (2 pruebas en rojo) y `lib/tiposDocumento.ts` (1 en rojo), restauradas con `cp` + `cmp`.
  - NO verificado: el aspecto en el navegador (modo claro y oscuro, asistente con 5 pasos, aviso del modal, plantillas con corchetes).
  - Pendiente de decisión de Miguel: `messages/es.json` `legal.terms` (ley de Delaware) y `legal.contactPage` (dirección de Wilmington y razón social LLC), todavía con datos de EE. UU. Ver también «Pendiente de decisión» de la sesión del 2026-11-02 de limpieza de marca.
  - Otros restos conocidos, sin tocar: `ContractorProposalPreview` mantiene «garantizado por un año» (texto fijo sin fuente); `messages/en.json` sin cambios (sin uso); `setup/page.tsx` conserva el tipo `'US'` de la respuesta del backend (empresas antiguas); las páginas de detalle de facturas y proformas muestran el código crudo (p. ej. «SSN: …») de registros antiguos; `lib/sunat/ruc.ts` menciona EIN en un comentario.

- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/limpia-marca`, rama `feat/limpia-marca` sobre `main` 69d2e54): **limpieza de restos de la marca anterior (EE. UU.)** en `apps/frontend`. Sin push.
  - Prueba social inventada quitada: testimonio y estrellas del login, «Únete a más de 10,000 profesionales» del registro, `TestimonialsSection` borrado (ya no se montaba en español), `aggregateRating` no existía. Claves `auth.testimonial*` borradas de `messages/es.json`.
  - **Correo de contacto por variable**: `lib/sitio.ts` exporta `CORREO_CONTACTO` = `NEXT_PUBLIC_CORREO_CONTACTO` (ver `.env.example`). Componente `components/common/CorreoContacto.tsx`: con correo → `mailto:`; sin correo → enlace a `/{locale}/contact` («Escríbenos desde la página de contacto»). Usado en legal (privacidad, términos, reembolso), ayuda, FAQ y precios. Página de contacto sin correo → «Pronto publicaremos nuestro correo de contacto». **Se incrusta al compilar**: en Coolify hay que ponerla como variable del build del frontend y recompilar.
  - Quitados: iconos de redes del pie (`LandingFooter`), `creator: '@invoiceapp'` de twitter, `lib/seo-schemas.ts` (sin importadores), horario «EST» y sección de departamentos de `/contact` (eran los cuatro correos).
  - `UpgradePrompt`: sin precios en dólares; el botón va a `/{locale}/configuracion?tab=suscripcion` (antes `/en/configuracion?tab=subscription`, ruta inexistente).
  - Plantillas de factura y proforma: quitada la cláusula de «seguro de compensación laboral» (EE. UU.); «Licensed & Insured» → «Con licencia»; «City, State and Zip Code» → «Ciudad / Distrito»; quitado el total entre paréntesis en dólares de la vista previa de la propuesta. Setup › Impuestos: solo el preset «IGV 18%» (antes VAT, Sales Tax, IVA, GST).
  - **Pendiente de decisión de Miguel (no tocado):** dirección «1234 Business Ave… Wilmington, DE» y razón social «Gargurevich Digital LLC» en `/contact` (`legal.contactPage`, son datos legales a confirmar); Delaware como ley aplicable en términos (`legal.terms`); opciones «SSN» y «Driver's License» en los selects de tipo de documento de clientes, facturas y proformas (datos existentes pueden usarlas); paso «Estados Unidos» en setup (`CompanyStep`); plantillas de proforma en inglés con texto de seguros (`ContractorProposalPreview`, «fire, tornado»); los planes del `UpgradePrompt` se llaman «Pro»/«Negocio» y el catálogo PE es Gratis/Emprendedor/Negocio/Empresa.
  - Verificado: `npx tsc --noEmit` exit 0; `npm test` 74/74; `npx next build` exit 0; `git grep` de correos `@invoiceapp`, «10,000», «María González», «compensación laboral» y `$29`/`$49` sin coincidencias.

- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/dashboard-peru`, rama `feat/dashboard-peru` sobre `main` 700dd41): **menú claro y dashboard nuevo para Perú** (pedido textual de Miguel: «la barra de menú de color claro como el header, el foco es hacer facturas, las proformas son secundarias»; sin emojis).
  - Menú (`components/global/Sidebar.tsx`): fondo blanco con borde `gray-200` (modo oscuro como antes); activo en `primary-50` con texto `primary-700` y acento berenjena a la izquierda; `title` y `aria-current`.
  - Dashboard: `app/[locale]/(dashboard)/dashboard/page.tsx` solo elige versión. Perú → `components/dashboard/DashboardPeru.tsx`: saludo y fecha en es-PE; acción principal berenjena «Emitir comprobante» (`/comprobantes/nuevo`) con «Factura» (`?tipo=01`) y «Boleta» (`?tipo=03`); «Nueva proforma» y «Nuevo cliente» en botones grises; indicadores (cupo del mes, ventas del mes en S/, requieren atención); aviso si falta el emisor SUNAT; `AlertasSunat`; últimos 6 comprobantes; 3 proformas en un bloque neutro. Resto de empresas → `DashboardGeneral.tsx` (facturas recientes, sin tarjetas).
  - `lib/dashboard.ts` (lógica pura: mes de Lima, cupo, ventas, atención) con `lib/dashboard.test.ts` (10 pruebas). `messages/es.json`: 33 claves nuevas en `dashboard`.
  - Decisiones: el cupo cuenta comprobantes emitidos (no borradores) del mes calendario de Lima, igual que `planes/cupo.js`; no usa `invoicesUsed` ni `/subscriptions/usage` (cuenta por periodo y con borradores), solo toma `limits.maxInvoices` (null o ausente = ilimitado). Ventas = facturas, boletas y notas de débito aceptadas menos notas de crédito, solo PEN, en céntimos. «Requieren atención» = todo el listado (rechazados, observados, error de envío).
  - Verificado: `npm test` 75/75; `npx tsc --noEmit` exit 0; `npx next build` exit 0 (63 páginas). Mutaciones en `lib/dashboard.ts`, restauradas con `cp` + `cmp`: contar borradores → 2 en rojo; mes en UTC en vez de Lima → 2 en rojo.
  - NO verificado: el render en el navegador (modo claro y oscuro, menú móvil, layout en 375 px); el cupo con más de 100 comprobantes en el mes (se marca «+», pero `GET /api/comprobantes` no pagina).
  - Gotchas: (a) las claves nuevas de `dashboard` están solo en `es.json` (como se pidió no tocar `en.json`): en `/en` saldrían sin traducir. (b) El menú usa el namespace `navigation`; no existe `sidebar`. (c) El selector de empresa no está en el menú (vive en el header): no se tocó.
- 2026-11-02 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/solo-espanol`, rama `feat/solo-espanol` sobre `main` 700dd41): **solo español, sin emojis** (pedido textual de Miguel: «te aseguras que no haya nada en inglés, lo desactivas, que todo sea en español [...] quitas los emojis y usar react icons, revisa»).
  - Hecho: `i18n.ts` con `locales = ['es']`; `middleware.ts` manda `/en` y `/en/...` a `/es/...` con 308 (la cookie `preferredLocale=en` ya no cambia nada). Sin selector de idioma en cabecera, landing, login, registro, asistente ni Configuración › Idioma. `lang="es"` fijo; metadatos, JSON-LD, `alternateLocale`, sitemap y manifest en español. Textos fijos en inglés traducidos (formularios, avisos, modales, propuesta PDF, página pública de firma). Emojis fuera de la app y de `es.json`; donde aportaban, íconos de `lucide-react` (no se instaló nada: react-icons no está en el proyecto).
  - `messages/en.json` sin cambios y sin uso. La sección `dashboard` de `es.json` no se tocó (la rehace la otra sesión). En `es.json` se quitaron las claves `settings.language/spanish/english` (sin uso).
  - Verificado: `npx tsc --noEmit` exit 0; `npm test` 64/64 (una prueba menos: la de la vista previa en inglés); `npx next build` exit 0; `next start` en 3300: `/en/landing` → 308 `/es/landing`, `/` → 307 `/es`, `/es/landing` con `lang="es"` y sin selector.
  - NO verificado: el aspecto en el navegador (Opus); el build se corrió antes de quitar las 3 claves de `settings` (no las usa ningún componente; tsc sigue en verde).
  - Gotchas: (a) «Dashboard» y «Email» se quedan: la app ya los usa en español en la navegación. (b) `lib/seo-schemas.ts` tiene JSON-LD en inglés pero ningún archivo lo importa: código muerto, candidato a borrar. (c) Login y registro siguen con «Únete a más de 10,000 profesionales» y un testimonio de «María González»: cifras y testimonios sin respaldo, heredados y no tocados. (d) El texto de consentimiento de la firma (`sign/[token]`) ahora es en español; las firmas nuevas lo guardan así. (e) La propuesta de contratista conserva el seguro de «Workers' Compensation» traducido como «seguro de compensación laboral»: conviene que Miguel lo revise, es un texto con efecto legal de EE. UU. (f) `UpgradePrompt` sigue con precios en dólares ($29/$49).

- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/fix-stripe-pais`, rama `feat/fix-stripe-pais` sobre `main` 2552ec5): **cancelar la suscripción de Stripe cuando una empresa cambia a Perú** (pedido de Miguel: «corrige lo que falta»; era el gotcha 4 de «seguridad de planes»).
  - Hecho: en `getOrCreateSubscription` (`middleware/subscription.js`), si el plan es de otro país y la fila trae `stripeSubscriptionId`, se cancela en Stripe (`subscriptions.cancel`, inmediato) ANTES de bajar a gratis. Si Stripe falla (red, id inexistente, `STRIPE_SECRET_KEY` apagada o ausente) se registra `console.error` solo con id de empresa y mensaje (claves `sk_…` tachadas) y la baja se hace igual. `pasarAGratis` acepta `limpiarStripe` (deja `stripeSubscriptionId` null; Culqi no lo usa). Cliente de Stripe nuevo en `src/planes/stripe.js` (`cancelarStripe`, `mensajeSeguro`; sin reintentos, tope de 8 s).
  - Inyectable: opción `cancelarStripe` de `getOrCreateSubscription(…, { ahora, cancelarStripe })`, o sustituir `require('src/planes/stripe').cancelarStripe` (las pruebas por ruta, p. ej. `seguridad-planes.test.js`, lo hacen).
  - Pruebas: `test/db/stripe-cambio-pais.test.js` (5). Suites: `npm test` 122/122, `test:db` 99/99.
  - Gotchas: (1) el id de Stripe se borra también si la cancelación falla (si no, los webhooks por `stripeSubscriptionId` pondrían la fila gratis en `CANCELED`); como el log no lleva el id, una cancelación fallida en producción con Stripe real habría que revisarla a mano en el panel de Stripe. En producción hoy `STRIPE_SECRET_KEY=sk_test_desactivado`, así que fallará y seguirá la baja. (2) La llamada a Stripe ocurre dentro de la lectura (y dentro de la transacción de `emitir` si el cambio de país se descubre ahí); el tope es de 8 s. (3) Con Stripe real no se probó nada: solo con cancelador falso.
- 2026-11-01 (Claude Code con Haiku 5.5, delegado en worktree `.claude/worktrees/fix-front-plan`, rama `feat/fix-front-plan` sobre `main` 2552ec5): **plan con cobro fallido y `lang` del HTML** (pedido de Miguel: «corrige lo que falta, delégalo»).
  - Cobro fallido: `lib/planCobro.ts` (`planMostrado`, sin dependencias) con `lib/planCobro.test.ts` (4 pruebas). Si la API devuelve `PAST_DUE` con `planContratado`, Configuración › Suscripción muestra el contratado (nombre y precio), aviso ámbar y, solo en Culqi, botón «Actualizar tarjeta» que abre el modal de tarjeta. Insignia «Actual» también en ese plan. Textos en `subscription.cobroFallido` y `cobroFallidoBoton` (es/en).
  - `lang`: `<html lang={locale}>` y `<body>` viven en `app/[locale]/layout.tsx`; `app/layout.tsx` devuelve solo `children`. `app/not-found.tsx` lleva su propio `<html lang="es">`: sin él, el 404 salía sin `<html>` (fuera de la lista de archivos del brief, pero necesario).
  - Verificado: `npm test` 65/65 (61 previas + 4); `npx tsc --noEmit` exit 0; `npx next build` exit 0 sin avisos; `next start` en 3200: `/es/landing` → `lang="es"`, `/en/landing` → `lang="en"`, 404 de `/es/…` con `<html lang="es">`, títulos y JSON-LD por idioma iguales. Mutación de `planMostrado` (quitar la condición `PAST_DUE`) → 2 pruebas en rojo; restaurado con `cp` + `cmp`.
  - NO verificado: el aviso en el navegador (solo lógica y build); un cobro fallido real con Culqi; que el backend acepte el cambio de tarjeta en `PAST_DUE`.
  - Gotchas: (a) un 404 bajo `/en/…` sale con `lang="es"` (igual que antes); lo corrige un `app/[locale]/not-found.tsx` sin `<html>`, no hecho. (b) `Subscription.planContratado` solo lo manda el backend para Culqi; con Stripe no aparece el aviso.
- 2026-11-01 (Claude Code con Haiku 5.5, delegado en worktree `.claude/worktrees/fix-firmas`, rama `feat/fix-firmas` sobre `main` 2552ec5): **firma digital de documentos** (pedido de Miguel: «corrige lo que falta, delégalo»). Crear una solicitud de firma respondía siempre 500.
  - Causa: `SignatureRequest.documentId` tenía dos relaciones (a `facturas` y a `proformas`) y Postgres exige que el id exista en ambas tablas; ningún INSERT pasaba.
  - Hecho: `facturaId` / `proformaId` propios, opcionales, con FK e índices; `documentId` y `documentType` se conservan sin relación. Migración `20261101020000_firmas_documento` (rellena desde `document_id`; se probó dentro de una transacción con `ROLLBACK`). `routes/signatures.js` llena la columna del tipo.
  - Pruebas: `test/db/firmas-documento.test.js` (3). Mutaciones en rojo: sin `facturaId`, sin `proformaId`, y la doble FK puesta de nuevo en la base (todas con el 500 del fallo original). `npm test` 122/122; `npm run test:db` 97/97.
  - Pendiente: la creación responde 200, no 201 (la prueba fija 200). Sin push: sube solo con OK de Miguel.

- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/seg-planes`, rama `feat/seg-planes` sobre `main` 8235ffb): **seguridad de planes** (pedido de Miguel: «Sí, corrígelas», las dos fallas de la revisión de seguridad: una empresa peruana obtenía funciones de pago sin pagar).
  - Hecho: `getOrCreateSubscription(empresaId, cliente = prisma, { ahora })` (`middleware/subscription.js`) devuelve SIEMPRE la suscripción vigente y corrige la base al leer: sin fila la crea (PE → `pe-gratis`); plan de otro país que la empresa → plan gratis del país (limpia Culqi/trial/período; si había `stripeSubscriptionId` solo hace `console.warn`); Culqi con `cancelAtPeriodEnd` y período vencido → `pe-gratis`; Culqi en `PAST_DUE` → no toca la base pero devuelve `{ ...sub, plan: pe-gratis, planContratado }`. `planes/gratis.js` (`pasarAGratis(cliente, sub, opciones)`) lo comparten esa función y `pagos/culqi/suscripciones.js`.
  - `planes/cupo.js` falla CERRADO: `verificarCupo` (dentro de la transacción de `emitir`) asegura la fila, la bloquea con `SELECT … FOR UPDATE` y vuelve a leer la suscripción ya bajo el candado; `verificarRegimenes` exige plan PE con `hasRegimenesSunat`. Sin plan válido → `ErrorPlan` 403 `NO_SUBSCRIPTION`/`FEATURE_NOT_AVAILABLE`. `limiteVigente` se eliminó.
  - Cambio de país: `PUT /api/sunat/emisor` y `PUT /api/empresas/mi-empresa` llaman a `getOrCreateSubscription` tras el cambio. `/subscriptions/usage` y `/current` usan la suscripción vigente (`/current` ya no responde 404 por falta de fila: la crea). `routes/signatures.js` exige además `ACTIVE`/`TRIALING`.
  - Pruebas: `test/db/seguridad-planes.test.js` (12). Se ajustaron 2 pruebas cuya premisa era la falla: `cupo.test.js` («empresa sin suscripción no tiene tope» → ahora solo plan ilimitado) y `borradores.test.js` (percepción: ahora siembra planes y un plan con regímenes, porque sin plan se niega antes).
  - Gotchas: (1) cualquier prueba o entorno que emita/guarde detracción necesita los planes de Perú sembrados (`seed_plans_pe.sql`); sin ellos todo falla cerrado. (2) En `PAST_DUE` de Culqi la API muestra `pe-gratis` en `plan` (el pagado va en `planContratado`): el frontend de Configuración › Suscripción puede querer mostrar `planContratado`. (3) `POST /api/signatures/request` para una factura choca con la doble FK de `documentId` (SignatureRequest → facturas y proformas): fallo previo a este cambio, no tocado. (4) Las suscripciones de Stripe de una empresa que cambia a PE no se cancelan en Stripe (solo advertencia en el log). (5) En `sunat.js` la sincronización va después de la transacción en array: si fallara, la siguiente lectura de la suscripción la corrige igual.
  - Siguiente: Miguel revisa; integrar con cherry-pick y desplegar (push a `main` despliega solo en Coolify).
- 2026-11-01 (Claude Code con Opus 5.5, orquestador): **Facturo publicado en Coolify** — https://facturo.gargurevich.dev (web) y https://api.facturo.gargurevich.dev (API).
  - Coolify: proyecto «Facturo» → recurso Docker Compose «facturo» desde `miguelgargurevich/invoiceapp`, rama `main`, archivo `docker-compose.coolify.yml`. Se despliega solo con cada push a `main`.
  - Verificado en producción: `/health` 200, `GET /api/subscriptions/plans?pais=PE` → 4 planes, `/` → `/es`, el landing pide los planes a `/api/...` (200), los 4 contenedores sanos y «[SUNAT] Módulo SUNAT iniciado» con almacén en `/data/sunat`.
  - Gotchas: (a) en la pantalla Domains, Coolify marca «No internal port» y el campo Port no se guarda; igual enruta bien porque el compose declara `SERVICE_FQDN_BACKEND_4001` y `SERVICE_FQDN_FRONTEND_3000`. (b) «Show deployable compose» muestra en claro las contraseñas generadas: no compartir capturas de esa pantalla. (c) La base de producción empieza vacía: hay que registrarse de nuevo. (d) Correos, Stripe y Culqi apagados: se encienden poniendo `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `CULQI_SECRET_KEY` y `NEXT_PUBLIC_CULQI_PUBLIC_KEY` (esta exige reconstruir) en Environment Variables del recurso.
  - Arreglo: `PricingSection` pedía `/subscriptions/plans` sin `/api` (404 y caía a los planes de respaldo); ahora usa `getPlans`.
  - Pendiente: prueba real con el sandbox de Culqi (faltan llaves de prueba), certificado `.pfx` real, respaldo del volumen `backend-data` y de Postgres en Coolify, cerrar el PR #1 (su código ya está en `main`), `lang` del HTML en las páginas en inglés.

- 2026-11-01 (Claude Code con Haiku 5.5, delegado por Opus en worktree `.claude/worktrees/prisma-un-cliente`, rama `fix/prisma-un-cliente` sobre `origin/main` 5d3ed92): **un solo `PrismaClient` en la app** (pedido textual de Miguel: «revisa si las demás aplicaciones tienen el mismo problema» de conexiones acumuladas; My Workspace llenó el límite de 100 del Postgres compartido y tumbó a Coolify).
  - `src/middleware/adminAuth.js`, `src/routes/admin.js`, `src/routes/signatures.js` y `src/routes/signaturesPublic.js` usan `require('../utils/prisma')` en vez de `new PrismaClient()`; se quitó el `require('@prisma/client')` que quedó sin uso (no había otros usos de `Prisma`). Consultas sin cambios; la única diferencia es el log del cliente compartido (solo errores, config de `utils/prisma.js`).
  - Prueba de guardia `test/unit/prisma-cliente-unico.test.js` (4 pruebas): lee el código de `src/**` y `app.js`, quita comentarios respetando cadenas, y falla si hay un `new PrismaClient(` fuera de `src/utils/prisma.js` o un `$disconnect(`. No instancia Prisma ni toca ninguna base.
  - Verificado: `npm test` 114/114 (110 previas + 4); `node --check` de los 4 archivos; los 4 módulos cargan con el cliente compartido (con `RESEND_API_KEY` falsa solo para cargar `emailService`). Mutaciones en rojo: `new PrismaClient()` devuelto a `routes/admin.js` y `$disconnect(` en `routes/signaturesPublic.js` (ambas fallan la prueba); `new PrismaClient()` solo dentro de un comentario sigue en verde (sin falso positivo). Archivos restaurados con `cp` + `cmp`.
  - NO verificado: `npm run test:db` (necesita Postgres de prueba con `TEST_DATABASE_URL`; no se corrió) y el efecto real en producción sobre las conexiones del Postgres del VPS.
  - Fuera de alcance a propósito: `prisma/seed.js`, `fix_enum.js`, `revert_enum_to_signed.js` (scripts de una corrida con su propio cliente, que terminan al acabar).
  - Próximos pasos: (1) Opus revisa el diff y sube la rama con OK de Miguel; (2) correr `test:db` contra una base de pruebas; (3) tras desplegar, mirar en el VPS `SELECT datname, count(*) FROM pg_stat_activity GROUP BY 1;` para confirmar que InvoiceApp baja sus conexiones.
  - Decisiones: `src/utils/prisma.js` es la única excepción que instancia `PrismaClient`, y la prueba de guardia lo deja escrito.
  - Gotchas: (a) el worktree no traía `node_modules` y tampoco el checkout principal de `apps/backend`: se instaló con `npm ci` dentro del worktree (sin enlazar nada al principal). `npm ci` avisó que los postinstall de Prisma no corrieron; `node_modules/.prisma/client` existe y el cliente se instancia, pero no investigué por qué. (b) `signatures.js` exige `RESEND_API_KEY` al cargar (vía `emailService`), igual que antes del cambio. (c) Ningún test unitario falsea `@prisma/client`, así que no hubo que ajustar pruebas existentes.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/landing-peru`, rama `feat/landing-peru` sobre `feat/oferta-peru`): **landing para Perú** (pedido textual de Miguel: «la landing debe estar en español por defecto y revisa porque esta enfocada a un flujo en USA»).
  - Español por defecto: `defaultLocale = 'es'` en `i18n.ts` y `app/page.tsx`. `middleware.ts` no cambió: `/` ya usa `defaultLocale`, y la cookie `preferredLocale` sigue mandando.
  - `messages/es.json`, sección `landing`: textos de SUNAT (comprobantes, CDR, IGV, detracción/percepción/retención, baja y resumen diario, RUC/DNI, clave SOL cifrada). `en.json` sin cambios.
  - Componentes: el hero en español usa datos de ejemplo de `lib/landing.ts` (S/ 18,450.00; F001-000123, B001-000045, FC01-000002). Funciones y «Cómo funciona» tienen sus propios ítems e íconos según el idioma. La FAQ saca el número de preguntas de los mensajes (7 en español, 8 en inglés). Plan anual: equivalente mensual con céntimos (S/ 47.42). Insignia «Ahorra 20%».
  - Prueba social: en `es` no hay «10,000+» ni sección de testimonios; tampoco su enlace en cabecera y pie. Se oculta con `t.has`, así que basta con que el idioma no traiga esas claves.
  - Metadatos: `app/layout.tsx` en español. `app/[locale]/layout.tsx` devuelve los metadatos en inglés solo para `en` (`title.absolute` para no añadir «| Facturo») y pone el JSON-LD de cada idioma. El de `es` va en `PEN` y sin `aggregateRating`.
  - `lib/landing.ts` (`datosVistaPrevia`, `porcentajeAhorro`, `equivalenteMensual`) con `lib/landing.test.ts` (4 pruebas). Mutaciones en rojo: sin céntimos en `equivalenteMensual`; `floor` en `porcentajeAhorro`. Restaurado con `cp` + `cmp`.
  - Verificado: `npm test` 61/61; `npx tsc --noEmit` exit 0; `npx next build` exit 0 (dos veces: la segunda tras corregir el título en inglés). `curl -sI http://localhost:3100/` → 307 a `/es` (con cookie `preferredLocale=en`, a `/en`). `curl -s http://localhost:3100/es/landing | grep -c SUNAT` → 1 línea (69 apariciones). En el HTML de `es`: sin «10,000+», «Testimonios» ni «contratistas». En `en`: igual que antes.
  - Gotchas: (a) **En inglés también son inventados** los testimonios, las cifras («10K+», «50K+», «99.9%», «4.9/5», «10,000+») y el `aggregateRating` 4.8/150 del JSON-LD. Siguen igual porque el pedido no pide tocar `en`. (b) `<html lang="es">` está en el layout raíz, así que las páginas en inglés también dicen `lang="es"`. Arreglarlo exige mover `<html>` a `[locale]`. (c) La cifra de comprobantes del mes en la vista previa (126) es mía: el pedido no la daba. (d) El badge «Ahorra X%» usa el porcentaje calculado, no el fijo del mensaje. En `en`, el equivalente mensual pasa a céntimos (US$ 39.17 en vez de 39). (e) next-intl detecta el idioma por `Accept-Language` en rutas sin prefijo (p. ej. `/landing`); `/` siempre va a `es`. (f) El precio mensual de los planes aparece solo tras pedir los planes en el navegador (el HTML inicial trae el esqueleto), así que `S/ 47.42` no se ve en el `curl`. (g) No revisado en navegador (lo hace Opus). Sin push.
- 2026-11-01 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/deploy-coolify`, rama `feat/deploy-coolify` sobre `main` 5d3ed92): **despliegue de Facturo en Coolify** (pedido de Miguel: publicar `https://facturo.gargurevich.dev` y `https://api.facturo.gargurevich.dev` como un recurso Docker Compose desde el repo; correos, Stripe y Culqi apagados, SUNAT en beta). Decisión de Opus: el compose usa las variables mágicas de Coolify (`SERVICE_PASSWORD_*`, `SERVICE_FQDN_*`) para que nadie escriba llaves a mano.
  - `docker-compose.coolify.yml` (raíz): `postgres:16`, `sunat-engine`, `backend` (4001) y `frontend` (3000), volúmenes `postgres-data` y `backend-data` (`/data`), healthchecks y `depends_on` con `service_healthy`. Servicios apagados con valores por defecto sobrescribibles (`RESEND_API_KEY=desactivado`, `STRIPE_SECRET_KEY=sk_test_desactivado`, `CULQI_SECRET_KEY` vacía).
  - `cifrado.js`: `obtenerLlave` acepta `SUNAT_MASTER_SECRET` (≥ 32 caracteres) si no hay `SUNAT_MASTER_KEY`; llave = `scryptSync(secreto, 'facturo-sunat-v1', 32)`, calculada una vez. Con `SUNAT_MASTER_KEY` todo igual que antes. 7 pruebas nuevas; mutación (quitar la prioridad de `SUNAT_MASTER_KEY`) → 2 en rojo.
  - `apps/backend/Dockerfile` (instala TODO con `npm ci`: `prisma` es devDependency, el `postinstall` corre `prisma generate` y el arranque usa `db push`/`db execute`), `scripts/arranque-produccion.sh` (`db push` SIN `--accept-data-loss`, siembra idempotente de planes US y PE, `exec node app.js`), `apps/frontend/Dockerfile` multi-etapa (`npm ci --legacy-peer-deps`, `NEXT_PUBLIC_*` como ARG de build) y los `.dockerignore`.
  - `docs/sunat/DESPLIEGUE.md`: sección «Coolify (Docker Compose)» (crear el recurso, dominios por servicio, llaves, volúmenes, cómo encender correos/Stripe/Culqi).
  - Verificado en local (proyecto `facturo-prueba`, ya borrado con `down -v`): `compose config` válido, `build` de backend y frontend, `GET /health` 200, `GET /api/subscriptions/plans?pais=PE` → 4 planes, módulo SUNAT iniciado con la llave derivada, reinicio del backend idempotente, CORS acepta `https://facturo.gargurevich.dev`, `/es/landing` 200. `npm test` backend 117/117.
  - NO verificado: el despliegue real en Coolify (cómo interpreta el archivo la v4.4.7, el enrutado de dominios y que los dominios se asignen a mano en la interfaz), el certificado TLS, `depends_on` en Coolify (su doc no lo describe), el motor SUNAT contra SUNAT beta desde el VPS.
  - Gotchas: (a) `SUNAT_MASTER_SECRET` (`SERVICE_PASSWORD_64_SUNATMASTER`) no se regenera nunca: se pierden los certificados cifrados. (b) `NEXT_PUBLIC_CULQI_PUBLIC_KEY` se incrusta al compilar: cambiarla exige reconstruir el frontend. (c) Los XML/CDR van al volumen `/data/sunat`: antes de emitir en PRODUCCION pasarlos a R2 o respaldar el volumen. (d) El repo remoto es `miguelgargurevich/invoiceapp`. (e) Sin push: la rama espera el OK de Miguel; Coolify construye desde `main`, hay que integrar antes de desplegar.

- 2026-11-01 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/oferta-t5`, rama `feat/oferta-t5` sobre `feat/oferta-peru`): **Tarea 5 de la oferta para Perú** (contratar y cambiar tarjeta con Culqi en Configuración › Suscripción; pedido textual de Miguel: «Aprobado, delega»).
  - `lib/culqi.ts`: carga de los scripts de Culqi desde su CDN, `pedirTokenTarjeta` (acepta un `AbortSignal`: Culqi no avisa cuando el usuario cierra su ventana) y `autenticar3DS`. Lo puro se sacó a funciones probadas en `lib/culqi.test.ts` (15 pruebas): `intervaloCulqi`, `montoCentimos`, `validarFacturacion` (letras/espacios y los largos del esquema del backend), `interpretarMensaje3DS`, `leerContratarDeUrl`, `configCheckout`, `opciones3DS`. Botón 3DS en berenjena `#6B2C6E` (no el verde del plan).
  - `components/settings/ContratarCulqiModal.tsx`: datos de facturación + términos + checkout + 3DS. Doble clic: un `useRef` se marca al instante (el estado llega tarde) y el botón queda deshabilitado en todas las etapas; no se puede cerrar mientras el backend o el banco trabajan (el cobro podría completarse igual). El token nunca se registra en consola. El error del backend (400 «Ya hay un pago en curso…», 402 de tarjeta) se muestra tal cual en el modal.
  - `SubscriptionTab.tsx`: `esPeru = empresa.pais === 'PE'`; planes por país (se espera a que cargue la sesión antes de pedirlos); plan de pago de Perú → modal Culqi, gratis → `switchToFreePlan`; «Cambiar tarjeta» en vez de «Gestionar facturación» si `proveedorPago === 'culqi'` (oculto si es Perú sin Culqi); sin «Reactivar» en Culqi (texto `noReactivable` y botón «Volver a contratar» en el plan actual); IGV bajo los precios en PEN; `?contratar=<slug>&intervalo=` del asistente abre el modal y limpia la URL. EE. UU. queda igual (Stripe).
  - `lib/subscriptions.ts`: solo se agregó `Subscription.billingInterval`; `Facturacion`, `Autenticacion3DS`, `RespuestaCulqi`, `suscribirCulqi` y `cambiarTarjetaCulqi` ya estaban (los dejó la Tarea 4).
  - Textos bajo `subscription.culqi.*` (es/en). Además de los pedidos: FAQ 1, 3 y 4 de Perú hablan de Culqi y de que no hay prorrateo; el texto de cancelar avisa que no se deshace; se oculta la ayuda de «modo de prueba» de Stripe a empresas de Perú; iconos/colores reconocen los nombres Gratis/Emprendedor/Negocio/Empresa.
  - Verificado: `npm test` 57/57, `npx tsc --noEmit` y `npx next build` en verde; 14 mutaciones de `lib/culqi.ts`, todas en rojo. NO verificado: el checkout y el 3DS reales (dependen de los scripts de Culqi y sus llaves) ni el modal en el navegador: es la Tarea 6 (Opus, sandbox).
  - Gotchas: (a) Culqi no avisa si el usuario cierra su ventana de tarjeta: por eso el modal ofrece «Ya la cerré, volver a intentar». (b) `interval_count: 0` sigue pendiente de confirmar en el sandbox (Tarea 6). (c) La FAQ 5 (garantía de 14 días) sigue igual para Perú: confirmar si aplica. (d) Falta `NEXT_PUBLIC_CULQI_PUBLIC_KEY` en el entorno (está en `.env.example`).

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/color-berenjena`, rama `feat/color-berenjena` sobre `feat/oferta-peru`): **color primario berenjena** (pedido textual de Miguel: «Usa berenjena como color primario de Facturo»). Reemplazo exacto de hex, sin rediseño: escala `primary` de `tailwind.config.ts`, variables `--primary-*` de `app/globals.css`, `themeColor` de `layout.tsx`, `theme_color` de `manifest.ts`, colores de `components/marca/LogoFacturo.tsx`, los SVG de `public/marca/` y los colores de los gráficos de `reportes/clientes|ventas|pagos`. PNG y `favicon.ico` regenerados con `scripts/marca/exportar.mjs`. Tabla verde → berenjena (50…900):
  `E1F5EE→F5E9F5`, `C3EBDC→EBD3EC`, `9FE1CB→DDB8DE`, `7AD5B8→C48FC6`, `5DCAA5→A866AB`, `1D9E75→8A3D8D`, `0F6E56→6B2C6E`, `0C5E49→5A2560`, `085041→461C48`, `04342C→2E1230`.
  Verificado: `git grep` de los diez hex verdes en `apps/frontend` sin coincidencias; `npm test` 39/39; `npx tsc --noEmit` exit 0; `npx next build` exit 0. El icono `icon-512.png` se ve como ticket berenjena oscuro con «F» blanca y círculo lila.
  Gotchas: (a) el wordmark oscuro usa `#A866AB` (paso 400, la tabla) en la «o»: sobre `#111827` da 4.35:1, por encima de 3:1 para texto grande; no se subió a `#C48FC6`. No se revisó en Chrome. (b) `reportes/pagos` mantiene `#22c55e` en su paleta de gráfico (verde de Tailwind, no es hex de marca y no está en la tabla). (c) `manifest.ts` `theme_color` y `layout.tsx` `themeColor` ahora van en `#6B2C6E`. Sin push.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/oferta-t3`, rama `feat/oferta-t3` sobre `feat/oferta-peru`): **Tarea 3 de la oferta para Perú** (cupo de comprobantes al emitir y regímenes por plan; plan `docs/superpowers/plans/2026-11-01-oferta-peru.md`). Hecho:
  - `src/planes/cupo.js`: `verificarCupo(tx, empresaId, fecha)` dentro de la transacción de `emitir`, con `SELECT … FOR UPDATE OF s` sobre la suscripción; cuenta facturas, boletas, NC y ND con `estadoSunat` no nulo y distinto de `BORRADOR` en el mes calendario de Lima (`inicioMesLima`). `verificarRegimenes(prisma, empresaId, datos)` bloquea detracción y percepción en planes sin `hasRegimenesSunat` (403). La retención no se bloquea.
  - Suscripción Culqi cancelada con `currentPeriodEnd` vencido → límite de `pe-gratis`. Sin suscripción o plan de EE. UU. → sin tope.
  - `ErrorPlan` (`sunat/errores.js`) → 402 `LIMIT_REACHED` (o 403 `FEATURE_NOT_AVAILABLE`) con `upgradeRequired: true` en `sunat/http.js`.
  - `routes/comprobantes.js`: crear el borrador ya no cobra cupo (`limites` por defecto es no-op). `test/db/rutas.test.js` no cambió: ya inyecta su propio `limites`.
  - Verificado: `npm test` 104/104; `TEST_DATABASE_URL=…invoiceapp_test_ofe3 npm run test:db` 66/66 (58 de la Tarea 1 + 8 de `cupo.test.js`).
  - Mutaciones (todas en rojo): (A) quitar `FOR UPDATE OF s` → «emisiones simultáneas» falla 3 de 3 veces; (B) contar también `BORRADOR` → «los borradores no gastan cupo» y «simultáneas» fallan; (C) `OFFSET_LIMA_MS = 0` → «inicioMesLima» falla. Archivo restaurado con `cp` + `cmp`.
  - Gotchas: la detracción exige `tipoOperacion: '1001'` y monto mayor a S/ 700 (la prueba de regímenes lo usa así). Los comprobantes ya no pasan por `checkLimit('invoice')`, así que el contador `invoicesUsed` ya no lo mueve `/api/comprobantes` (sí siguen usándolo las rutas heredadas `facturas.js` y `proformas.js`). Sin push.
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/oferta-t2`, rama `feat/oferta-t2` sobre `feat/oferta-peru`): **Tarea 2 de la oferta para Perú** (cobro con Culqi, backend):
  - `src/pagos/culqi/cliente.js` (cliente HTTP con `fetch` nativo, `ErrorCulqi`, `aCentimos`), `suscripciones.js` (`crearServicioCulqi`: `suscribir`, `cambiarTarjeta`, `cancelar`, `procesarEvento`, `pasarAGratis`) e `index.js` (`obtenerServicioCulqi()` perezoso: sin `CULQI_SECRET_KEY` la app arranca igual y solo fallan las rutas de pago).
  - API: `POST /api/subscriptions/culqi/suscribir` y `/tarjeta` (`routes/subscriptionsCulqi.js`, solo empresas `PE`, montado en `app.js` antes de `/api/subscriptions`), `POST /api/webhooks/culqi` (valida `evt_(test|live)_…`, reconsulta el evento y la suscripción con la sk, idempotente con `EventoCulqi`; 500 si falla para que Culqi reintente). `/cancel`, `/reactivate` y `/switch-to-free` ya tratan `proveedorPago === 'culqi'`. `scripts/culqi-crear-planes.js` (idempotente) y `CULQI_SECRET_KEY` en `.env.example`.
  - Suites: `npm test` 110/110 (104 + 5 del cliente + 1 de montos); `TEST_DATABASE_URL=…invoiceapp_test_ofe2 npm run test:db` 73/73 (58 + 15 de `culqi.test.js`). `require('./app')` carga sin `CULQI_SECRET_KEY`. El script de planes se corrió contra la base de pruebas con un `fetch` falso (montos 2900/27900/11900/114900, segunda corrida sin crear nada).
  - Mutaciones en rojo (restauradas con `cp` + `cmp`): saltar `consultarEvento`, quitar el manejo de P2002, cancelar la anterior antes de crear la nueva, webhook sin validar el id, `/cancel` sin la rama Culqi, router sin guarda de país, sk dentro del mensaje de `ErrorCulqi`.
  - Gotchas: (1) Tarea 6 (sandbox): confirmar `interval_count: 0` (cobro indefinido) mirando el plan creado; si lo rechaza, cambiar a `1` en el script. (2) Nada probado contra el Culqi real: todo con Culqi falso. (3) Desvío del plan: `/cancel` responde 400 si `proveedorPago === 'culqi'` pero ya no hay `culqiSubscriptionId` (p. ej. tras pasar a gratis); sin eso salía 500. (4) `culqi.test.js` reinicia `culqiPlanId*` de los planes PE antes y después de cada prueba (el script de planes los llena en la misma base). (5) En un cambio de plan la nueva suscripción se crea antes de cancelar la anterior; si esa cancelación falla solo se registra (hay dos suscripciones vivas hasta limpiarlo a mano en CulqiPanel).
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/oferta-t4`, rama `feat/oferta-t4` sobre `feat/oferta-peru`): **Tarea 4 de la oferta para Perú** (planes de Perú en el landing y en el asistente; plan `docs/superpowers/plans/2026-11-01-oferta-peru.md`):
  - `lib/precios.ts` (nuevo, sin imports): `formatPrice` (PEN con `es-PE`: «S/ 1,149.00») y `esPlanGratis`; `lib/subscriptions.ts` los re-exporta. Ahí también: `Plan.currency/pais/isPopular`, `Subscription.proveedorPago`, `getPlans(pais)`, y `suscribirCulqi` / `cambiarTarjetaCulqi` para la Tarea 5 (llaman a `/subscriptions/culqi/*`, que son de la Tarea 2 y no están en esta rama).
  - Landing: `GET /subscriptions/plans?pais=` según el idioma (`es` → PE); si la API no responde, `es` muestra 4 planes de Perú por defecto; precios con `formatPrice` y la moneda del plan; «Precio incluye IGV» en PEN.
  - Asistente: selector «País» en el paso de empresa (Perú pone PEN, IGV 18 %); el PUT manda `pais`; el paso de planes pide los planes de ese país. Con plan de pago en Perú no va a Stripe: llama `/initialize` y redirige a `/<locale>/configuracion?tab=suscripcion&contratar=<slug>&intervalo=MONTH|YEAR`.
  - `SubscriptionTab.tsx`: solo pasa `plan.currency` a `formatPrice`.
  - Suites: frontend `npm test` 42/42; `npx tsc --noEmit` exit 0; `npx next build` exit 0 (solo avisos de caché de next-intl y de browserslist).
  - Mutaciones (rojo, restauradas con `cp` + `cmp`): `formatPrice` con `en-US` para PEN → 1 fallo (`actual: 'PEN 59.00'`); `esPlanGratis` siempre `false` → 1 fallo.
  - Gotchas: (1) `lib/subscriptions.ts` no se puede importar desde `node --test`: `import api from './api'` sin extensión falla (`ERR_MODULE_NOT_FOUND`); por eso los helpers viven en `precios.ts`. (2) Intl pone U+00A0 en `S/ 59.00`: se normaliza a espacio normal. (3) **Cambio visible en EE. UU.**: `formatPrice` siempre con dos decimales → «$15.00» en vez de «$15» en landing y asistente (lo exigen las pruebas). (4) Si se elige Perú y luego EE. UU., solo cambia `pais` (como pide el plan): la moneda PEN y el IGV quedan hasta el paso de moneda/impuestos. (5) El RUC se muestra para ambos países: `validarIdentificacionFiscal` acepta identificaciones no numéricas (EIN, NIF). (6) Sin prueba en navegador ni contra Culqi (Tarea 6).

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/oferta-t1`, rama `feat/oferta-t1` sobre `feat/oferta-peru`): **Tarea 1 de la oferta para Perú** (esquema, planes de Perú y visibilidad por país; plan `docs/superpowers/plans/2026-11-01-oferta-peru.md`):
  - Esquema: `Plan.pais` (default `US`), `culqiPlanIdMensual/Anual`, `hasRegimenesSunat`; `Subscription.proveedorPago` (default `stripe`), `culqiCustomerId/CardId/SubscriptionId` (único); modelo `EventoCulqi`. Migración `20261101010000_oferta_peru` (con `git add -f`) y semilla `prisma/seed_plans_pe.sql` (4 planes en PEN: pe-gratis, pe-emprendedor, pe-negocio, pe-empresa).
  - `src/planes/catalogo.js`: `planGratisDe(prisma, pais)`, `planPublico(plan)`. `GET /api/subscriptions/plans?pais=PE|US` filtra por país.
  - `getOrCreateSubscription`: empresa PE arranca en `pe-gratis` ACTIVE (sin prueba); EE. UU. sin cambios salvo el filtro `pais: 'US'`.
  - `/initialize` acepta id o slug; si el plan no es del país de la empresa usa el gratis. En PE con plan de pago responde `pagoPendiente: <slug>`. `/switch-to-free` usa el gratis del país y tiene el hueco `// La Tarea 2 cancela en Culqi aquí`.
  - `PUT /mi-empresa` acepta `pais` (si ya hay emisor SUNAT, no cambia).
  - Suites: `npm test` 104/104; `TEST_DATABASE_URL=…invoiceapp_test_ofe1 npm run test:db` 58/58 (54 previas + 4 de `planes-pais.test.js`). Mutaciones en rojo: `planGratisDe` fijo a `free` (2 fallos) y quitar «Detracción y percepción» de `planPublico` (1 fallo); restauradas con `cp` + `cmp`.
  - Gotchas: (1) la base de pruebas no tiene `_prisma_migrations`: se aplica con `prisma db push --accept-data-loss` (el aviso es solo por el índice único nuevo sobre una columna en NULL). El SQL de `migration.sql` coincide con `prisma migrate diff` en columnas, tabla e índice (orden distinto). (2) **Cambio en EE. UU.**: el `isFree` de `/initialize` ahora compara con `Number(...)`; antes un plan gratis salía TRIALING y ahora sale ACTIVE. Lo pidió el plan, pero contradice «nada cambia EE. UU.»: revisar antes de integrar. (3) Sin prueba automática: el filtro `pais` del endpoint público (`app.js` no se monta en pruebas) y `/initialize` / `/switch-to-free`; cubiertos solo por revisión y la prueba de `planPublico`.
- 2026-11-01 (OpenCode con cadena gratis del gateway `chain:delegar-construccion`, worktree `.claude/worktrees/oc-recibos-aislamiento`, rama `fix/oc-recibos-aislamiento`, sobre `feat/marca-facturo`):
  Refuerzo de seguridad (defensa en profundidad) en `POST /api/job-receipts`:
  - Cambio en `apps/backend/src/routes/jobReceipts.js`: el `findFirst` que valida permiso ahora selecciona `empresaId` y se guarda en variable `documento`; se usan sus datos para la ruta de almacenamiento y se eliminan los dos `findUnique` sin filtro de usuario.
  - Test nuevo `apps/backend/test/db/recibos-aislamiento.test.js` (4 pruebas): empresa A no puede crear recibo en factura de B (404), empresa B sí (201); con archivo PNG, A falla (404) y B sube (201, `fileUrl` contiene su `empresaId`).
  - Suites: `npm test` 104/104 ✅, `TEST_DATABASE_URL=postgresql://postgres:test@localhost:5436/invoiceapp_test_oc npm run test:db` 51/51 ✅.
  - Mutación: quitando el filtro `empresa.userId` del `findFirst` del POST, las dos pruebas de 404 fallan (rojo); restaurado con `cp` + `cmp` → verde.
  - Commits por archivo, sin push. Firma con co-autor modelo gratis.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/marca-t3-nombre`, rama `feat/marca-t3-nombre`, sobre `feat/marca-facturo`):
  Tarea 3 del plan de la marca Facturo (nombre y logo nuevo en la app). Hecho, en `apps/frontend`: el ticket `IconoFacturo` reemplaza
  el PNG viejo en el menú (`Sidebar.tsx`, fallback), en login y en registro (escritorio: 40 px; móvil: 48 px); se borra
  `public/invoiceapp-logo.png` (sin referencias). Metadatos de `app/layout.tsx` a «Facturo» con `icons` (favicon.ico, favicon.svg,
  apple-touch-icon) y `applicationName`; `export const viewport` nuevo con `themeColor` `#0F6E56` (no existía). `description` del
  manifest con el nombre. Textos «InvoiceApp» / «Invoice App» → «Facturo» en `messages/es.json` y `en.json`, login, registro,
  legales (pie), landing (cabecera y pie), `lib/seo-schemas.ts`, `public/ai.txt`, `README.md` (raíz y frontend), `FEATURES.md`,
  y `emailService.js` (remitente por defecto y textos de plantillas). `RESEND_FROM_NAME` en `.env.example`.
  Pruebas (antes de commitear): `npx tsc --noEmit` exit 0; frontend `npm test` 35/35, 0 fallos; backend `npm test` 104/104, 0 fallos;
  `npx next build` exit 0, sin avisos en el log. Sin pruebas nuevas (textos y logo): mutación no aplica; en su lugar, `git grep`
  de `invoice ?app` en `apps` y raíz (ver lista de conservados abajo).
  Conservados a propósito (no son texto visible del nombre): correos `@invoiceapp.com` / `@invoiceapp.io` (contacto, ayuda, FAQ,
  precios, `seo-schemas`, `ai.txt`); dominios `app.invoiceapp.io` (texto de la portada) y `invoiceapp.gargurevich.com` (`FRONTEND_URL`);
  handles `@invoiceapp` (Twitter, GitHub, LinkedIn, `creator`); base `invoiceapp` y `invoiceapp_test`; `invoiceapp/sunat-engine`; `README.md:427`
  (nombre de la carpeta del repo en el árbol). Fuera de «Permitidos» y sin tocar: comentario en `apps/backend/src/sunat/index.js:25`.
  Gotchas: (a) el `description` del manifest no decía «InvoiceApp» literalmente; se le puso el nombre igual. (b) En registro, el
  contenedor móvil del logo era `emerald→teal`, no `primary-*`; se cambió al mismo fondo blanco que en login porque el ticket verde
  no se veía. (c) El ticket `#0F6E56` sobre el menú `bg-gray-900` tiene contraste ~2.9:1 (calculado): revisar en Chrome (Tarea 4).
  (d) El logo de la landing no se cambió: el plan no lo pide, la cabecera solo tiene texto.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/marca-t1-piezas`, rama `feat/marca-t1-piezas`): Tarea 1 del plan de la marca Facturo (piezas gráficas). Hecho: SVG en `apps/frontend/public/marca/` (`facturo-icono.svg`, `favicon.svg`, `facturo-logotipo.svg`, `facturo-logotipo-oscuro.svg`) copiados tal cual del plan; componente `components/marca/LogoFacturo.tsx` (`IconoFacturo`, `LogoFacturo`, con `'use client'`); `scripts/marca/exportar.mjs` genera `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` y `app/favicon.ico` (16, 32 y 48 px); `app/manifest.ts` con nombre Facturo, `theme_color` `#0F6E56` e íconos nuevos. Verificado: `file` da 192×192, 512×512, 180×180 y «MS Windows icon resource - 3 icons»; `npx tsc --noEmit` exit 0; `npm test` 35/35. Gotchas: `@resvg/resvg-js` se instala solo en `mktemp -d` y se pasa con `RESVG_DIR`; sin esa variable el script ahora termina con un mensaje claro (antes salía un stack trace de Node); el logotipo SVG usa texto y no trazos (fuente Geist/Inter del sistema); no se añadió test de componente porque `npm test` solo corre `lib/**` y el archivo no estaba en «Permitidos»; la `description` del manifest sigue diciendo InvoiceApp. Commit en la rama; sin push.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/marca-t2-color`, rama `feat/marca-t2-color`, sobre `feat/marca-facturo`):
  Tarea 2 del plan de marca Facturo («la interfaz pasa al verde»). Hecho, en `apps/frontend`:
  la rampa `primary` de `tailwind.config.ts` pasa a verde (`#E1F5EE`…`#04342C`, exacta al plan); las variables `--primary-*` de
  `app/globals.css` (foco y selección) siguen la misma rampa; reemplazo automático de `blue|indigo|sky-N` → `primary-N` en `app/**/*.tsx`
  y `components/**/*.tsx` (387 ocurrencias por script; el «unos 188» del plan eran líneas, no ocurrencias; el diff final toca 48 archivos); degradados de login y registro;
  hex de los gráficos de `reportes/clientes|ventas|pagos` (`#3b82f6` → `#1D9E75`).
  Se devolvió azul/índigo solo donde es información o estado (30 líneas): aviso «Info Message» de proforma; caja de información del
  proveedor Google en configuración; caja de datos del documento en firma (`sign/[token]`); tarjeta «en proceso» de comprobantes;
  saldo pendiente y estado «emitida» de facturas; estado «pendiente» de proformas; banner «Estado actual» y puntos de la línea de tiempo
  (`ActivityTimeline`); variante `info` de `Toast`, `Modal` y `ConfirmDialog`; caja de cliente/factura de la galería de trabajos;
  plan actual, precio y medidor de uso (`SubscriptionTab`). Quedan en verde, por categoría o decoración: etiquetas de tipo
  (producto/servicio, orden de trabajo, plantillas), totales, métricas (`Card` variante `blue`), nombre de empresa en el menú.
  Pruebas: `npx tsc --noEmit` exit 0; `npm test` 35/35, 0 fallos; `npx next build` exit 0 (compila; 63 páginas). Sin pruebas nuevas
  (cambio de estilos). Mutación: no aplica; en su lugar, `git grep` de `(blue|indigo|sky)-[0-9]+` en `app` y `components` deja solo
  `Badge.tsx` (2 líneas) y las 30 líneas de información.
  Gotchas: (a) `reportes/pagos` usa una paleta de gráfico donde `#1D9E75` queda cerca de `#22c55e`: revisar en Chrome (Tarea 4).
  (b) `manifest.ts` mantiene `theme_color: '#3b82f6'`: es de la Tarea 1, no se tocó. (c) `next build` imprime avisos de caché de webpack
  sobre `next-intl/dist/.../extractor/format/index.js`: no los revisé contra la base anterior; no impiden el build.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunatf-t7-paginas`, rama `feat/sunatf-t7-paginas`):
  Tarea 7 del plan del frontend SUNAT (páginas de comprobantes). Hecho, en `apps/frontend/app/[locale]/(dashboard)/comprobantes/`:
  `page.tsx` (lista con filtros por tipo y estado), `nuevo/page.tsx` (alta; nota de crédito o débito desde `?tipo=&afecta=&motivo=`),
  `[id]/page.tsx` (detalle: líneas, totales, historial y refresco automático mientras está en proceso) y `[id]/editar/page.tsx`
  (manda al detalle si el comprobante ya no es borrador). Código copiado del plan: props, imports y claves i18n coincidieron con las
  firmas reales; no hubo que corregir nada.
  Pruebas: `npx tsc --noEmit` sin errores (exit 0); `npm test` 35/35 (sin pruebas nuevas: las páginas no tienen pruebas propias);
  `npx next build` termina con 0 y lista `/[locale]/comprobantes`, `/nuevo`, `/[id]` y `/[id]/editar` (en es y en).
  Mutaciones de tipo (un prop inventado en cada una de las cuatro páginas → TS2322; restaurada con cp + cmp; `tsc` vuelve a 0): 4 de 4 en rojo.
  Gotchas: (a) `next lint` roto (ver gotcha c de la Tarea 4): se usó `tsc` y `next build`, que en este repo no hace lint. Los avisos de
  caché de webpack que salen al build vienen de next-intl, no son errores. (b) El refresco del detalle (cada 5 s) se detiene al llegar a un
  estado que no está en proceso (`PENDIENTE_ENVIO`, `ERROR_TEMPORAL` y `ANULACION_PENDIENTE` son los que sí lo están), al cumplir
  24 refrescos (2 min: queda «Actualizar») o al salir de la página. `onCambio` lo reinicia. (c) En `nuevo` y `[id]/editar`, si la carga
  inicial falla, sale el toast pero la pantalla se queda en el esqueleto (`inicial` sigue en `null`): mejorar con un estado de error.
  (d) La pantalla no se probó en el navegador (Tarea 10).
  Pendiente: push y OK de Miguel (sesión principal).
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunatf-t9-integracion`, rama `feat/sunatf-t9-integracion`):
  Tarea 9 del plan del frontend SUNAT (integración: menú, redirección, dashboard y clientes peruanos). Hecho:
  `components/global/Sidebar.tsx` cambia «Facturas» por «Comprobantes» (`/comprobantes`) cuando `empresa.pais === 'PE'`;
  `facturas/page.tsx` redirige con `router.replace` a `/comprobantes` si el emisor es peruano; `dashboard/page.tsx` muestra
  `<AlertasSunat locale={locale} />` solo para PE; `clientes/nuevo` y `clientes/[id]` usan los tipos de documento SUNAT
  (RUC, DNI, CE, PASAPORTE, OTHER) para PE, con la casilla «Agente de retención» (`esAgenteRetencion`); las opciones de EE. UU.
  quedan igual. `configuracion/page.tsx`: `?tab=sunat` se acepta en la lista de pestañas permitidas (único cambio).
  Pruebas: `npx tsc --noEmit` sin errores y `npm test` 35/35. Mutaciones (un archivo cada una, restaurado con `cp` + `cmp`,
  `tsc` 0 tras restaurar): prop inventado en `AlertasSunat`, en el `<input>` de la casilla (nuevo y detalle), propiedad
  inventada `paisInventado` en Sidebar y facturas, y `TabInventada` en configuración: 6 de 6 en rojo.
  Gotchas: `next lint` no se usó (roto en el repo, ver Tarea 4). No hay pruebas de UI para esta tarea: lo verificado es
  tipado y las mutaciones, no el render en el navegador (eso es la Tarea 10). El `tipoDocumento` inicial de «nuevo» depende
  de que `empresa` esté cargada al montar; el layout del dashboard espera a `loading` del AuthContext, que pasa a `false`
  después de `loadEmpresa()`. Commit en la rama; sin push.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunatf-t5-componentes`, rama `feat/sunatf-t5-componentes`):
  Tarea 5 del plan del frontend SUNAT (componentes de estado, acciones, anulación, historial y alertas). Hecho, en
  `apps/frontend/components/sunat/`: `EstadoSunatBadge.tsx`, `HistorialEnvios.tsx`, `AlertasSunat.tsx`, `AnularModal.tsx` y
  `AccionesComprobante.tsx`. El código del plan se copió tal cual: ninguna prop ni ícono hubo que corregirlo (cada prop se
  comprobó contra `components/common/*` y cada ícono contra lucide-react 0.562.0; las claves i18n existen en `es.json` y `en.json`).
  Pruebas: `npm test` 35/35 (sin pruebas nuevas: el plan no las pide para estos componentes); `npx tsc --noEmit` sin errores.
  `next lint` no se corrió (roto en el repo, ver gotcha c de la Tarea 4). Mutaciones (un archivo, restaurado con cp + cmp, `tsc` 0 tras restaurar):
  3 de 3 en rojo con TS2322: `variant="inexistente"` en Badge, `variant="success"` en ConfirmDialog y `iconColor="rojo"` en Modal.
  Gotchas: (1) `AnularModal` navega a `/comprobantes/nuevo?tipo=07&afecta=…&motivo=01` y `AccionesComprobante` a `/comprobantes/:id/editar`
  y `/comprobantes/nuevo?tipo=0x&afecta=…`: esas rutas las crea la Tarea 7. (2) `AccionesComprobante` exige la prop `ruc`
  (la página de la Tarea 7 la pasa como `empresa?.ruc`, plan línea 3013) y `onCambio` para refrescar el comprobante tras emitir o anular.
  (3) `AlertasSunat` se queda en `null` si la llamada falla: un error de red no se muestra.
  Pendiente: push y OK de Miguel (sesión principal); `next build` no se corrió.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunatf-t6-form`, rama `feat/sunatf-t6-form`):
  Tarea 6 del plan del frontend SUNAT (formulario del comprobante). Hecho: `components/sunat/PanelTotales.tsx`, `LineasEditor.tsx`,
  `CuotasEditor.tsx` y `ComprobanteForm.tsx`, copiados del plan. Ajuste obligatorio: con forma de pago Crédito, «Guardar y emitir»
  queda deshabilitado si no hay cuotas, si no hay vista previa o si `diferenciaCuotas(f.cuotas, vista.netoPendiente) !== '0.00'`
  (se importa `diferenciaCuotas` de `@/lib/sunat/formulario`). «Guardar borrador» sigue habilitado.
  Pruebas: `npx tsc --noEmit` sin errores (exit 0); `npm test` 35/35 (sin pruebas nuevas: estos componentes no tienen pruebas propias).
  Claves `t('…')` literales de los cuatro archivos (58) comprobadas en `messages/es.json` y `en.json`: todas presentes.
  Mutaciones (un archivo cada una, copia en scratchpad, restaurado con `cp` + `cmp`, `tsc` vuelve a 0): prop inventado en
  `<PanelTotales>` dentro de `ComprobanteForm` → TS2322; prop inventado en `<Button>` de `CuotasEditor` → TS2322.
  Gotchas: (a) `npx next lint` sigue roto (ver gotcha c de la sesión de la Tarea 4), se usó `tsc`. (b) «Guardar borrador» con
  crédito y sin cuotas da 400: el esquema de borradores (`apps/backend/src/sunat/emision/borradores.js`) tiene `cuotas.min(1)`.
  Con el botón habilitado, el error sale en la lista del formulario. Decidir si también se deshabilita. (c) `next build` no se corrió;
  la pantalla no se probó en el navegador.
  Pendiente: push y OK de Miguel (sesión principal).
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunatf-t8-emisor`, rama `feat/sunatf-t8-emisor`):
  Tarea 8 del plan del frontend SUNAT (configuración del emisor y series). Hecho: `components/sunat/EmisorForm.tsx` (datos fiscales,
  ambiente BETA/PRODUCCIÓN con RUC exacto para pasar a producción, clave SOL y certificado `.pfx`), `SeriesManager.tsx` (lista y alta de series
  con `validarSerie`) y `SunatTab.tsx` (invitación a activar si la empresa no es de Perú), más los tres cambios en `configuracion/page.tsx`
  (+9/−1 líneas): import de `SunatTab` y de `Landmark`, `'sunat'` en `Tab`, `tSunat`, el botón de la pestaña y su panel.
  Código copiado del plan sin desvíos: tipos y props coincidieron con las firmas reales.
  Seguridad: `solClave` y `claveCertificado` solo aparecen en su `useState`, en el payload y en su `<Input type="password" autoComplete="new-password">`;
  ni `console`, ni `localStorage`/`sessionStorage`, ni URL. Se limpian (junto con archivo y confirmación) tras guardar bien; el `.pfx` se lee con FileReader solo dentro de `guardar`.
  Pruebas: `npx tsc --noEmit` sin errores; `npm test` 35/35. Estos componentes no tienen pruebas propias: 4 mutaciones de tipo
  (prop inventado en `SeriesManager` y en `Button`, `onGuardado` obligatorio omitido, tipo `'99'` fuera de `TipoComprobante`) rompen `tsc`; al restaurar con cp + cmp vuelve a compilar.
  Gotchas: (a) `next lint` roto en el repo (se usó `tsc`); (b) `configuracion/page.tsx` (línea ~61) valida `?tab=` contra una lista fija sin `'sunat'`:
  un enlace `?tab=sunat` NO abre la pestaña (se respetó «solo tres cambios»; la Tarea 9 o una corrección aparte debe añadirlo si hace falta);
  (c) si el guardado falla, la clave queda en el formulario para reintentar (solo en memoria); (d) no se verificó en navegador ni con `next build`.
  Pendiente: push y OK de Miguel (sesión principal); verificación real en navegador (Tarea 10).
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunatf-t4-formulario`, rama `feat/sunatf-t4-formulario`):
  Tarea 4 del plan del frontend SUNAT (formulario, cliente de API y hooks). Hecho: `apps/frontend/lib/sunat/formulario.ts`
  (estado del formulario, `aPayload`, cuotas en céntimos enteros, visibilidad, series y clientes permitidos; solo `import type`),
  `api.ts` (`sunatApi` y `guardarArchivo`) y `hooks.ts` (`useCatalogosSunat`, `useEmisorSunat`), más `formulario.test.ts` (21 pruebas).
  Pruebas: `npm test` 35/35 (14 previas + 21); `npx tsc --noEmit` sin errores. Mutaciones (un archivo, restaurado con cp + cmp): 12 de 12 en rojo
  (diferenciaCuotas con flotantes, repartirCuotas con flotantes, residuo en la primera cuota, detracción/percepción/cuotas en una nota,
  detracción sin operación 1001, nota con operación 1001, exportación sin forzar 40, `sumarMeses` desbordado, serie sin normalizar,
  `sumarMeses` sin guarda). Además se pasó la salida de `aPayload` de 8 casos por el `comprobanteSchema` y `calcularComprobante` reales del backend: todos válidos.
  Desvíos del plan (2, ambos con prueba): (1) `aPayload` manda `serie` en `trim().toUpperCase()`: `validarSerie` acepta minúsculas
  pero el backend exige `^[FB][A-Z0-9]{3}$`, así que `b001` habría dado 400; (2) `sumarMeses` devuelve `''` si la fecha no es AAAA-MM-DD
  (antes `toISOString()` lanzaba `RangeError` al borrar el input de fecha de una cuota).
  Gotchas: (a) `aPayload` con `Credito` y `cuotas: []` manda `cuotas: []` y el backend lo rechaza (`min(1)`): la Tarea 6 debe exigir cuotas antes de guardar;
  (b) `aCentimos` trunca (no redondea) a 2 decimales, y `diferenciaCuotas` con un `neto` inválido devuelve `NaN.NaN`: el neto siempre debe venir del backend;
  (c) `npx next lint --file …` falla en este repo por la config de ESLint (`Converting circular structure to JSON` en `.eslintrc.json`), no se pudo correr el lint.
  Pendiente: push y OK de Miguel (sesión principal); `next build` no se corrió.
- 2026-11-01 (Claude Code con Haiku 5.5, delegado en worktree `.claude/worktrees/sunatf-t1-catalogos`, rama `feat/sunatf-t1-catalogos`):
  Tarea 1 del plan del frontend (`docs/superpowers/plans/2026-11-01-sunat-frontend.md`): clientes con `esAgenteRetencion`
  (POST y PUT de `/api/clientes`, sin tocar el esquema de Prisma: la columna ya existía en la migración `sunat_nucleo`) y
  `GET /api/sunat/catalogos` (solo Perú) con afectaciones, tipos de operación, unidades, motivos de NC/ND, detracciones y
  percepciones, servidos desde `src/sunat/catalogos` para que el frontend no tenga copia. Pruebas nuevas:
  `test/db/sunat-catalogos-clientes.test.js` (3). Suites: `npm test` 92/92; `npm run test:db` 47/47 (44 previas + 3).
  Mutaciones (una por cambio, todas en rojo y restauradas con `cp` + `cmp`): quitar `esAgenteRetencion` del esquema;
  PUT sin el campo guarda `false`; quitar `soloPeru` de `/catalogos`; detracción 037 al 10 %.
  Gotchas: el `apps/backend/node_modules` del worktree es propio; el catálogo de detracciones y percepciones sigue
  pendiente de verificar contra la norma (ver `src/sunat/catalogos/index.js`).
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunatf-t3-base`, rama `feat/sunatf-t3-base`):
  Tarea 3 del plan del frontend SUNAT (base: cliente de API, tipos, estados, formato, errores e i18n). Hecho:
  `apps/frontend/lib/api.ts` con `ApiError` (extiende `Error`, conserva `message`, lleva `status` y `body`), `getBlob` y 204 → `undefined`;
  `lib/sunat/{tipos,estados,formato,errores}.ts` con sus pruebas `*.test.ts`; `Empresa.pais?` en `AuthContext`;
  namespace `sunat` y `navigation.vouchers` en `messages/es.json` y `en.json` (182 claves cada uno, mismas claves).
  Scripts `test` (`node --test "lib/**/*.test.ts"`) y `allowImportingTsExtensions` en tsconfig. Pruebas: `npm test` 14/14;
  `npx tsc --noEmit` sin errores. Mutaciones (un archivo a la vez, restauradas con cp + cmp): 7 de 7 en rojo.
  Gotchas: (1) la prueba de `fechaCorta` fija `process.env.TZ = 'UTC'`, porque en una Mac en Lima quitar `timeZone` pasaba en verde;
  (2) Node 26 avisa `MODULE_TYPELESS_PACKAGE_JSON` al correr los `.test.ts` (funciona; quitarlo exigiría `"type"` en el package.json del frontend, no se tocó);
  (3) el `.test.ts` del plan tenía un `total` que `filasDesdeVista` no declara: `tsc` lo marcó y se quitó del literal de prueba.
  Pendiente: push y OK de Miguel (sesión principal); `next build` no se corrió.
- 2026-11-01 (claude-code): revisión de InvoiceApp como base para SUNAT, diseño del núcleo de emisión
  (`docs/superpowers/specs/2026-11-01-sunat-nucleo-emision-design.md`) y plan de implementación
  (`docs/superpowers/plans/2026-11-01-sunat-nucleo-emision.md`).
- 2026-11-01 (Claude Code con Haiku 5.5, delegado en worktree `.claude/worktrees/sunat-t1-base`, rama `feat/sunat-t1-base`):
  Tarea 1 del plan (base de pruebas, errores, fechas, números y catálogos). Hecho: `decimal.js@^10.6.0`,
  scripts `test` y `test:db`, `src/sunat/{errores,fechas,numeros}.js`, `src/sunat/catalogos/{index,parametros}.js`,
  pruebas `node:test` en `test/unit/sunat/`. Suite `npm test`: 10 pruebas en verde (8 del plan + 2 de `errores.js`,
  que el plan no cubría). Mutaciones: una por archivo de `src`, todas en rojo y restauradas.
  Gotchas: `npm install` reordenó dos dependencias en `package.json` (revertido a mano) y quitó `"dev": true` de
  `fsevents` en el lock; `npm audit` reporta 17 vulnerabilidades preexistentes, sin tocarlas aquí.
  Pendiente: revisar los porcentajes de `DETRACCION_CODIGOS`, `PERCEPCION_REGIMENES` y `parametros.js` contra la norma vigente.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t2-letras`, rama `feat/sunat-t2-letras`):
  Tarea 2 del plan (monto en letras). Hecho: `src/sunat/calculo/montoEnLetras.js` (`montoEnLetras(monto, moneda = 'PEN')`)
  y `test/unit/sunat/montoEnLetras.test.js` (17 pruebas). Código y pruebas copiados tal cual del plan; no hubo que corregir nada.
  Suite `npm test`: 27 pruebas en verde (10 de la Tarea 1 + 17). Mutaciones (5, todas en rojo y restauradas con `cp` + `cmp`):
  quitar apócope, CIEN→CIENTO, nombre USD, nombre PEN, límite `>=` → `>` en mil millones.
  Gotchas: NO valida negativos: `montoEnLetras('-1')` devuelve `SON:  MILLONES  MIL  CON 00/100 SOLES` (basura, sin error).
  Hoy no hace falta (los totales de comprobante no son negativos), pero si entra una nota con monto negativo, validar antes.
  Redondeo: `toFixed(2)` de decimal.js es half-up (`0.125` → `0.13`). Monedas fuera de `PEN|USD|EUR` salen con el código
  como nombre (`SON: CINCO CON 00/100 GBP`).
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t4-cifrado`, rama `feat/sunat-t4-cifrado`):
  Tarea 4 del plan (cifrado de secretos). Hecho: `src/sunat/seguridad/cifrado.js` (`cifrar`, `descifrar`, `obtenerLlave`,
  AES-256-GCM, formato `v1:iv:tag:datos`), `SUNAT_MASTER_KEY=` en `apps/backend/.env.example` y 11 pruebas
  `node:test` (4 del plan + 7 de seguridad). Suite `npm test`: 21 en verde. Mutaciones: 8 de 9 en rojo.
  Gotchas: el código del plan se endureció en dos puntos: (1) `descifrar` valida IV de 12 bytes y tag de 16 (Node
  acepta tags GCM truncados si no se fija la longitud) y exige exactamente 4 partes; (2) el `!datos` del plan
  rechazaba `cifrar('')`, ahora un texto vacío hace ida y vuelta. Mutante equivalente: `authTagLength` en `cifrar`
  es redundante (GCM ya usa 16 por defecto al cifrar); se deja explícito. La llave real (`SUNAT_MASTER_KEY`) aún no
  está definida en ningún entorno: hay que generarla con `openssl rand -base64 32` y cargarla en Coolify antes de la Tarea 5+.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t6-almacen`, rama `feat/sunat-t6-almacen`):
  Tarea 6 del plan (almacén privado en R2). Hecho: `src/sunat/almacen.js` (`crearAlmacenPrivado`: `guardar`, `leer`,
  `urlFirmada`), `@aws-sdk/s3-request-presigner@^3.922.0` en `package.json`, `getR2Client` exportado desde
  `src/utils/storage.js` (único cambio ahí), `R2_PRIVATE_BUCKET=` en `.env.example`, pruebas en
  `test/unit/sunat/almacen.test.js`. Suite `npm test`: 13 pruebas en verde (10 previas + 3). Mutaciones (bucket
  equivocado en `guardar`, sin `expiresIn`, sin chequeo de `R2_PRIVATE_BUCKET`): las tres en rojo y restauradas.
  Gotchas: el caret `^3.922.0` resuelve al 3.x más nuevo (presigner 3.1161.0); el lock sube transitivas de
  `@aws-sdk` (`core` 3.974.8→3.979.1, `signature-v4-multi-region`, `types`, `xml-builder`, `smithy/core`,
  `smithy/signature-v4`) y quita `fast-xml-parser` y compañía. `npm install` reordenó `bcryptjs` y `@supabase` en
  `package.json`: revertido a mano. Las pruebas no tocan R2 real.
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t8-engine`, rama `feat/sunat-t8-engine`):
  Tarea 8 del plan, microservicio `apps/sunat-engine` (PHP 8.3 + Greenter `greenter/lite` v5.3.0): `composer.json` y
  `composer.lock`, `Dockerfile`, `docker/openssl-legacy.cnf`, `public/{index.php,.htaccess}`,
  `src/{ErrorDatos,Certificado,Emisor,Mapper,Respuesta,Rutas}.php`, fixtures y `tests/smoke.sh`. Código del plan sin
  cambios en `src/`: los setters de Greenter del plan existían todos (no hubo «Call to undefined method»).
  Verificado: `./tests/smoke.sh` en verde (inspeccionar, token, firmar factura, crédito+detracción y nota de crédito);
  `BETA=1 ./tests/smoke.sh` en verde: SUNAT beta (MODDATOS, RUC 20000000001) aceptó la factura F001-1 (código 0) con el
  certificado autofirmado, sin necesitar el certificado de pruebas de Greenter, y devolvió ticket de baja. Rutas no
  cubiertas por `smoke.sh` (descuento, ICBPER, percepción, retención, resumen, `Respuesta::deTicket/deEnvio`) se
  comprobaron aparte con un script desechable dentro del contenedor: construyen y firman sin errores.
  Mutaciones de `smoke.sh` (token esperado, RUC del certificado, `emisor.solClave` ausente): las tres en rojo.
  Gotchas: (1) el plan no fijaba la plataforma de Composer; `composer:2` corre PHP 8.5 y resolvió `symfony/finder v8`
  (exige PHP ≥ 8.4.1), que habría roto `composer install` en la imagen `php:8.3-apache`. Se agregó
  `config.platform.php = "8.3.0"` a `composer.json` y el lock se regeneró (queda `symfony/finder v7.4.22`). Si se sube
  la imagen base de PHP, subir también ese valor y regenerar el lock. (2) `vendor/` no se commitea
  (`apps/sunat-engine/vendor/` en el `.gitignore` raíz); `composer.lock` sí. (3) `smoke.sh` usa el puerto 8089 y borra
  su contenedor con `trap`. (4) Sin probar: `/comprobantes/cdr` en producción, `/tickets/consultar`, `/resumenes/enviar`
  contra beta y firma con un `.pfx` real (RC2/3DES, proveedor legacy de OpenSSL).
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t3-calculo`, rama `feat/sunat-t3-calculo`):
  Tarea 3 del plan (`calcularComprobante`). Hecho: `src/sunat/calculo/calcular.js` (`calcularComprobante`, `ErrorCalculo`) y
  `test/unit/sunat/calcular.test.js`: las 13 pruebas del plan + 7 añadidas (retención excluida con detracción, detracción en
  USD, umbral exacto de S/ 700, tipo de cambio y percepción en USD, forma de pago inválida, crédito con detracción,
  invariantes de totales). Código del plan copiado sin cambios (no hubo que corregir nada). Suite `npm test`: 61 en verde.
  Mutaciones: 18 de 18 en rojo (las 5 pedidas + 13 más); con solo las 13 del plan sobrevivían 9 (entre ellas retención
  junto con detracción), por eso las pruebas añadidas. Revisión de dinero: todo con `decimal.js`; el único `Number` es el
  conteo de bolsas ICBPER (no es un monto); redondeo half-up a 2 por línea; totales = suma de líneas ya redondeadas.
  Gotchas (el plan calcula así; NO se cambió, decidir antes de la Tarea 7):
  (1) Sin validar entradas: `descuento: -10` sube el valor (precio 100 → valorVenta `110.00`, total `129.80`);
  `bolsasIcbper: -2` da ICBPER `-1.00` y total `-0.76`; `bolsasIcbper: 1.5` se acepta (`0.75`); `tasaIgv: -18` da IGV
  `-18.00`; un `precio: 'abc'` lanza `DecimalError` en vez de `ErrorCalculo` (hay que validar en el esquema Zod de la Tarea 7).
  (2) Con `precioIncluyeIgv` el total puede diferir de céntimos de lo que paga el cliente porque se redondea por línea:
  precio 0.10 con IGV → total `0.09`; tres líneas de 33.33 con IGV → total `100.02` (el cliente esperaba 99.99).
  (3) Una sola regla de umbral (S/ 700) para todas las detracciones; el catálogo actual solo trae códigos con ese umbral,
  pero al agregar códigos con otro umbral (p. ej. transporte) habrá que moverlo a `DETRACCION_CODIGOS`.
  (4) Percepción con crédito: `netoPendiente` no incluye la percepción (118.00 aunque el cliente paga 120.36), así que las
  cuotas suman sin percepción. (5) Con detracción y `retencion: true` la retención se omite en silencio (null), no error.
  (6) No hay afectaciones gratuitas (11 a 17) ni IVAP.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t5-esquema`, rama `feat/sunat-t5-esquema`):
  Tarea 5 del plan (esquema Prisma, migración y base de pruebas). Hecho: `prisma/schema.prisma` con `Empresa.pais`
  (default `US`), `Cliente.esAgenteRetencion`, `Factura.numero` ahora `Int?` y los campos SUNAT de `Factura` y
  `DetalleFactura`; modelos nuevos `EmisorSunat`, `CuotaFactura`, `ProcesoSunat`, `ProcesoSunatItem` y `EnvioSunat`.
  Migración `prisma/migrations/20261101000000_sunat_nucleo/migration.sql` (generada con `migrate diff` desde el esquema
  de `HEAD`; 181 líneas, sin `DROP TABLE` ni `DROP COLUMN`; único `ALTER` es `numero DROP NOT NULL`). Base de pruebas:
  `test/db/ayuda.js` y `test/db/esquema.test.js` (2 pruebas). Contenedor nuevo `invoiceapp-pg-test` en el puerto 5436.
  Pruebas: `npm run test:db` 2/2 en verde; `npm test` 41/41 en verde. Mutaciones (esquema restaurado con `cp` + `cmp`
  después de cada una, base reseteada): `numero` a `Int` obligatorio → la prueba de borradores sin número falla
  (`PrismaClientValidationError`, lo rechaza el cliente generado); quitar `@default("US")` de `pais` → la prueba de
  empresas existentes falla (mismo error). Ambas en rojo.
  Gotchas: (1) `npx prisma validate` exige `DATABASE_URL` en el entorno aunque el esquema no conecte; se pasó la URL de
  la base de pruebas solo para ese comando. (2) `ayuda.js` sobrescribe `DATABASE_URL` con la base de pruebas y hace
  `TRUNCATE`; solo `TEST_DATABASE_URL` lo cambia, así que no apuntarla a nada que no sea de pruebas. (3) El repo mezcla
  migraciones: `migrations/20260506_add_local_auth_user_profiles.sql` es un `.sql` suelto, no una carpeta de Prisma.
  Antes de desplegar (Opus, con OK de Miguel): `prisma migrate status` contra producción; no se hizo aquí.
  (4) `migrate diff` compara contra el esquema de `HEAD`, no contra la base de producción real.
  (5) El `.gitignore` raíz ignora `prisma/migrations/` (desde el commit inicial) y `*.sql`. La migración de esta tarea se
  añadió con `git add -f`, porque sin ella en git `migrate deploy` no la aplica. Decidir si se excepciona en `.gitignore`
  (`!prisma/migrations/`); no se tocó aquí porque ese archivo no estaba en «Permitidos».
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t7-borradores`, rama `feat/sunat-t7-borradores`):
  Tarea 7 del plan (borradores). Hecho: `src/sunat/emision/borradores.js` (`comprobanteSchema`, `INCLUDE_COMPROBANTE`,
  `INCLUDE_RESPUESTA`, `entradaCalculo`, `datosDesdeFactura`, `previsualizar`, `guardarBorrador`) y
  `test/db/borradores.test.js`: las 8 pruebas del plan + 7 añadidas (barrera Zod: `descuento: -10`, `bolsasIcbper: 1.5` y `-2`,
  `precio: "abc"`, `cantidad` 0 o negativa; entrada inválida no guarda nada; sin `empresa` en la respuesta al guardar ni al
  editar; cuotas reemplazadas al editar; separación entre empresas en cliente, serie, documento afectado y comprobante a
  editar; nota solo sobre documento aceptado; serie inactiva). Código del plan copiado sin cambios (no hubo que corregir nada).
  `npm run test:db`: 17 en verde (2 de esquema + 15); `npm test`: 61 en verde. Mutaciones: 18 de 18 en rojo (cliente,
  serie, afectado y comprobante a editar sin `empresaId`; `empresa` en `INCLUDE_RESPUESTA`; editar un no borrador; sin chequeo
  de percepción; no borrar cuotas ni detalles al editar; serie sin `activa`; sin chequeo de estado del afectado;
  `ACEPTADO_CON_OBS` no aceptado; nota sin afectado; y 5 del esquema). Con solo las 8 del plan no se detectaban la separación
  entre empresas, el estado del afectado, las cuotas ni el esquema, por eso las añadidas.
  Gotchas (el plan lo hace así; NO se cambió, decidir antes de la Tarea 11):
  (1) Carrera al editar: el estado `BORRADOR` se lee FUERA de la transacción y el `update` va por `id` sin condición de
  estado; si una emisión (Tarea 11) pasa el comprobante a `PENDIENTE` entre ambos, la edición pisaría líneas y totales de
  algo ya en camino a SUNAT. Arreglo posible: `updateMany` con `estadoSunat: 'BORRADOR'` dentro de la transacción y fallar
  si afecta 0 filas. (2) `datosDesdeFactura` no reconstruye `fechaVencimiento` de la factura: si la Tarea 9 o la 11 re-guardan
  desde ahí, se pierde. (3) Editar no cambia `userId` ni `fechaEmision` (solo se fijan al crear); la fecha real de emisión
  la debe poner la Tarea 11. (4) `esAgentePercepcion` es `false` por defecto: probado el rechazo, NO el camino con emisor
  agente de percepción. (5) Las pruebas de BD comparten `limpiar()` (TRUNCATE) y corren con `--test-concurrency=1`; no
  lanzarlas en paralelo contra la misma base.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t9-mapper`, rama `feat/sunat-t9-mapper`):
  Tarea 9 del plan (cliente del engine y mapper). Hecho: `src/sunat/engine/cliente.js` (`crearClienteEngine`, siete
  llamadas, cabecera `x-engine-token`; 422 → `ErrorConstruccion`; red, 5xx y 401 → `ErrorEngineNoDisponible`),
  `src/sunat/engine/mapper.js` (`armarEmisor`, `armarComprobante`, `armarBaja`, `armarResumen`, `nombreBase`),
  pruebas `test/unit/sunat/engineCliente.test.js` (2) y `engineMapper.test.js` (5; una de ellas añadida al plan para la
  línea exonerada) y `SUNAT_ENGINE_URL` / `SUNAT_ENGINE_TOKEN` en `.env.example`. Código del plan copiado sin cambios.
  Suite `npm test`: 68 en verde (61 previas + 7). Contrato con el motor: las claves del JSON coinciden exactamente con
  los cuatro fixtures de `apps/sunat-engine/tests/fixtures/` y con lo que leen `Mapper.php` y `Emisor.php`; no hizo falta
  cambiar el mapper. Mutaciones: 5 de 5 en rojo (sin `x-engine-token`; 422 como `ErrorEngineNoDisponible`;
  `porcentajeIgv` distinto de 0 en exonerada; sin leyenda 2006; fecha sin `-05:00`), cada una en su prueba.
  Gotchas (para la validación de las tareas 10 y 11, el mapper NO valida): (1) `Factura.numero` es `Int?`: sin número
  sale `"null"` como correlativo. (2) `DetalleFactura.valorUnitario` y `precioUnitarioIgv` son `Decimal?`; `aDecimal(null)`
  devuelve `0` sin avisar, y un `netoPendiente` nulo da `0.00` en crédito. Rechazar esos casos antes de mapear.
  (3) El motor responde 500 con `Error interno del motor: <mensaje>`; ese texto llega a `ErrorEngineNoDisponible` y no
  debe mostrarse tal cual al usuario. (4) Sin probar contra el motor vivo: solo contrato estático y `fetchImpl` simulado.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t10-estados`, rama `feat/sunat-t10-estados`):
  Tarea 10 del plan (estados, plazos y validación previa). Hecho: `src/sunat/emision/estados.js` (`ESTADO`,
  `clasificarRespuesta`, `siguienteReintento`), `src/sunat/emision/plazos.js` (`dentroDePlazoEnvio`,
  `dentroDePlazoBaja`, `diasDesdeEmision`), `src/sunat/emision/validacion.js` (`validarParaEmision`), y pruebas
  `test/unit/sunat/estados.test.js` (3) y `test/unit/sunat/validacion.test.js` (6). Código del plan copiado tal cual.
  Se añadieron a `estados.test.js` los bordes 1999, 2000 y 4000: sin ellos, la mutación «2000 como aceptado»
  sobrevivía con las pruebas del plan. `npm test` 70/70 en verde. Mutaciones (archivo copiado al scratchpad,
  restaurado con `cp` + `cmp`): 1033 como error temporal, plazo de baja de 8 días, factura sin exigir RUC y boleta
  sin umbral → rojo; 2000 como aceptado → rojo solo con los bordes nuevos.
  Gotchas: (1) `clasificarRespuesta` devuelve el string `'CONSULTAR_CDR'` para 1033, que no está en `ESTADO`: el
  llamador debe consultar el CDR y no guardar ese valor como estado. (2) `siguienteReintento(0)` devuelve `undefined`
  (el plan no lo prueba): el primer intento es el 1. (3) `validarParaEmision` hace `f.serie[0]` sin guarda: con
  `serie: null` lanza `TypeError` en vez de devolver un mensaje; la serie debe venir validada de `ConfiguracionSeries`.
  (4) Los plazos (3 y 7 días) y el umbral de boleta (700) están en `catalogos/parametros.js` y siguen pendientes de
  verificar contra la norma vigente, como el resto de parámetros.
- 2026-11-01 (Claude Code con Sonnet 5.5, delegado en worktree `.claude/worktrees/sunat-t11-emision`, rama `feat/sunat-t11-emision`):
  Tarea 11 del plan (servicio de emisión) más tres correcciones de la revisión de la Tarea 7. Hecho:
  `src/sunat/emision/servicio.js` (`crearServicioEmision` → `emitir` y `procesarEnvio`; `claveArchivo`),
  `test/db/falsos.js` (`engineFalso`, `almacenFalso`, `colaFalsa`) y `test/db/servicio.test.js`. Código del plan copiado
  tal cual, salvo lo siguiente. (1) `emitir` bloquea la fila de la factura (`SELECT … FOR UPDATE` filtrado por
  `empresa_id`) antes de leerla y chequear `BORRADOR`: dos emisiones simultáneas del mismo borrador ya no sacan dos
  números (una cumple, la otra falla con `ErrorEstado`; `ultimoNumero` queda en 1). (2) `guardarBorrador` lee el estado
  dentro de la transacción con el mismo bloqueo, así que editar mientras se emite espera y luego rechaza con
  `ErrorBorrador`. (3) `datosDesdeFactura` conserva `fechaVencimiento` (ISO string, solo si existe).
  Pruebas añadidas a las del plan: doble emisión del mismo borrador, emitir con otra empresa, fallo del motor sin XML
  guardado, 1033 que consulta y guarda el CDR, edición bloqueada por una emisión en curso y edición desde otra empresa.
  `npm test` 77/77 y `npm run test:db` 30/30 en verde. Mutaciones (archivo copiado al scratchpad, restaurado con `cp` +
  `cmp`), todas en rojo: sin `FOR UPDATE` de la factura, sin `FOR UPDATE` de la serie, no revertir si falla la firma
  (número consumido), 1033 sin consultar CDR, no guardar el CDR, emitir sin filtrar por empresa, `guardarBorrador` sin
  chequeo de estado en la transacción, sin su `FOR UPDATE` y `datosDesdeFactura` sin `fechaVencimiento`.
  Gotchas: (1) `emitir` firma y guarda el XML dentro de la transacción (hasta 30 s): mientras tanto la serie y la fila
  quedan bloqueadas, y una edición del mismo borrador espera con la transacción por defecto de Prisma (5 s), así que
  con un motor lento podría fallar por tiempo agotado en vez de por `ErrorBorrador` (sin probar). (2) Si la
  transacción se revierte después de `almacen.guardar`, el XML queda huérfano en el almacén; la clave es determinista
  (el número no se consume) y el siguiente intento la sobrescribe. (3) La prueba de doble emisión usa una firma con
  150 ms de retardo para que ambas lleguen al chequeo antes de que una confirme. (4) `procesarEnvio` no bloquea la fila:
  dos ejecuciones simultáneas del mismo comprobante enviarían dos veces a SUNAT (la cola de la Tarea 13 debe evitarlo
  o el servicio debe bloquear).
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t13-cola`, rama `feat/sunat-t13-cola`):
  Tarea 13 del plan (cola pg-boss y manejadores). Hecho: `src/sunat/cola/manejadores.js` (`crearManejadores`),
  `src/sunat/cola/index.js` (`crearCola`, `COLAS`) y `test/unit/sunat/manejadores.test.js` (4 pruebas).
  `pg-boss` fijado en `10.4.2` exacto (`npm install pg-boss@10.4.2 --save-exact`, sin `^`). Código del plan copiado
  tal cual; no hubo que corregir nada. Verificado sin base de datos: `require('./src/sunat/cola')` carga y `crearCola`
  construye sin conectar; en 10.4.2 existen `start`, `stop`, `getQueue`, `createQueue`, `send` (con `startAfter` en
  segundos) y `work` (el handler recibe un arreglo de jobs). `npm test` 81/81 en verde. Mutaciones (archivo copiado al
  scratchpad, restaurado con `cp` + `cmp`): reintentar fuera de plazo, no notificar al aceptar, error del correo que
  rompe el trabajo, reconsultar el ticket a 30 s → 4 de 4 en rojo.
  Gotchas: (1) `npm install` reordenó `bcryptjs` y `@supabase/supabase-js` en `package.json`: revertido a mano. El lock
  solo añade 5 paquetes (pg-boss, cron-parser, luxon, serialize-error, type-fest). `npm audit` sigue con 17
  vulnerabilidades preexistentes, sin tocar. (2) `startAfter` numérico > 0 se pasa como texto; 0 equivale a inmediato.
  (3) `crearCola` no tiene pruebas unitarias: su comportamiento real contra Postgres (schema `pgboss`, `work`, `stop`)
  queda sin probar hasta la base de datos de pruebas. Usar conexión directa, no el pooler en modo transacción.
- 2026-11-01 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/sunat-t12-anulacion`, rama `feat/sunat-t12-anulacion`):
  Tarea 12 del plan (anulación por baja RA y resumen diario RC). Hecho: `src/sunat/emision/anulacion.js`
  (`crearServicioAnulacion` → `solicitarAnulacion`, `procesarTicket`) y `test/db/anulacion.test.js` (6 pruebas: las 4 del
  plan + separación entre empresas + concurrencia). Código del plan copiado tal cual, salvo un añadido: `solicitarAnulacion`
  abre la transacción con `SELECT id FROM facturas WHERE id AND empresa_id FOR UPDATE` (igual que `emitir`) antes de leer y
  chequear el estado; sin eso, dos solicitudes simultáneas pasaban ambas el chequeo de «aceptado» y creaban dos procesos
  (RA 1 y RA 2) para el mismo comprobante. Prueba de concurrencia: engine falso con 200 ms de espera en `enviarBaja` y
  `Promise.allSettled` → una cumple, otra falla con `ErrorEstado`, un solo `ProcesoSunat` y una sola llamada al engine.
  Mutaciones (archivo copiado al scratchpad, restaurado con `cp` + `cmp`): serie B por RA, aceptar fuera de plazo,
  no restaurar el estado previo al rechazar, quitar el filtro `empresaId`, no marcar `estado: 'anulada'`, aceptar
  comprobantes no aceptados, quitar el `FOR UPDATE` (3 corridas) → todas en rojo.
  Gotchas: (1) `solicitarAnulacion` llama al engine dentro de la transacción (timeout 60 s): si SUNAT recibe la baja y
  luego falla la BD, el ticket queda huérfano en SUNAT y la factura sigue «aceptada» (se puede reintentar; SUNAT
  rechazaría el duplicado). (2) `procesarTicket` no bloquea el proceso: dos ejecuciones simultáneas duplicarían la fila
  de `EnvioSunat`, pero el resultado final sobre la factura es idempotente. (3) Un RC con varias boletas por proceso no
  está soportado: cada anulación es su propio proceso (decisión del plan).
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-t14-pdf`, rama `feat/sunat-t14-pdf`):
  Tarea 14 del plan (PDF con QR, correo y arranque del módulo). Hecho: `src/sunat/pdf/representacion.js` (`textoQr`,
  `generarPdf`, `NOMBRES_COMPROBANTE`), `src/sunat/notificador.js` (`crearNotificador`: PDF y XML al correo del cliente;
  sin correo no envía), `src/sunat/index.js` (`iniciarSunat`; sin `SUNAT_ENGINE_URL` queda desactivado) y `qrcode@^1.5.4`.
  Cola: `encolarEnvio` y `encolarTicket` con `singletonKey`; `crearCola` acepta `schema` (por defecto `pgboss`) y la
  prueba `test/db/cola.test.js` corre contra el Postgres de pruebas en el esquema `pgboss_prueba` (se borra al empezar).
  `npm test` 86/86 en verde; `test/db/cola.test.js` 1/1. Código del plan copiado tal cual salvo: la fecha del QR
  tiene una prueba extra con 02:30 UTC (en Lima es el día anterior), porque la fixture del plan no distingue Lima de UTC.
  Mutaciones (archivo copiado al scratchpad, restaurado con `cp` + `cmp`), todas en rojo: QR sin hash; fecha en UTC;
  adjuntar solo el PDF; enviar sin correo de cliente; cola sin `singletonKey`; cola sin `policy: 'short'`.
  Gotchas: (1) `singletonKey` NO deduplica con la política estándar de pg-boss: la cola se crea con `policy: 'short'`
  (índice `job_i1`, deduplica por `COALESCE(singleton_key, '')`). `iniciar` solo crea colas que faltan: una cola ya
  creada con la política estándar no se corrige sola (hay que borrarla o cambiarla con `updateQueue`). (2)
  `src/sunat/index.js` requiere `./emision/anulacion` (Tarea 12), que no existe en este worktree: su carga completa se
  verifica al integrar. `node --check` sí pasa. (3) `npm install qrcode` reordenó `bcryptjs` y
  `@supabase/supabase-js` en `package.json`: revertido a mano. (4) La prueba «varias páginas» del PDF no cuenta las
  páginas: solo comprueba cabecera `%PDF` y tamaño mayor a 2000 bytes.
- 2026-11-01 (Claude Code con Sonnet 5.5, worktree `.claude/worktrees/sunat-t15-api`, rama `feat/sunat-t15-api`):
  Tarea 15 del plan (API). Hecho: `src/sunat/http.js` (`responderError`, `soloPeru`, `bloquearElectronicos`),
  `src/routes/comprobantes.js` (`/api/comprobantes`), `src/routes/sunat.js` (`/api/sunat`: emisor, series, alertas),
  montaje en `app.js`, y en `src/routes/facturas.js` solo el paso 6 (`bloquearSiSunat` en 7 rutas, 409 en POST para
  empresas PE, 400 de pagos en borrador). `npm test` 91/91 y `npm run test:db` 44/44 en verde. Código del plan copiado
  tal cual salvo: (1) `router.param('id')` en `comprobantes.js` verifica que el comprobante sea electrónico y de la
  empresa (404 si no); sin eso, PUT y emitir de un comprobante AJENO respondían 400/409 con «no encontrado» (los
  servicios lanzan `ErrorBorrador`/`ErrorEstado`), no 404. (2) Pruebas extra: secretos en detalle y lista, segunda
  empresa PE (404 en GET, PUT, DELETE, emitir, anular, corregir, xml, cdr, pdf y lista vacía), certificado vencido,
  mensajes crudos del motor/500 y una prueba que monta el router REAL de `/api/facturas` con JWT real.
  `editado.json.total === '236'` coincide con la serialización real de Prisma: sin ajuste.
  Mutaciones (archivo copiado al scratchpad, restaurado con `cp` + `cmp`), todas en rojo: GET /:id y lista con
  `INCLUDE_COMPROBANTE`; `router.param` sin `empresaId`; quitar `soloPeru`; `bloquearElectronicos` sin `empresaId`;
  503 y 500 con mensaje crudo; PRODUCCION sin `confirmarProduccion`; no comparar RUC del certificado; no validar
  vencimiento (sobrevivía: se añadió la aserción); `vistaEmisor` con `solClaveCifrada`; quitar `bloquearSiSunat` de
  PUT /:id y de payment-summary; quitar el 409 PE y el 400 de pagos en borrador. Única que sobrevive: quitar el
  filtro `empresaId` solo de `buscar()` (lo cubre `router.param`: doble barrera deliberada).
  Gotchas: (1) arrancar `app.js` exige también `STRIPE_SECRET_KEY` (`webhooks.js` crea el cliente de Stripe al
  cargarse), además de `RESEND_API_KEY`, `JWT_SECRET` y `DATABASE_URL`. (2) La prueba de `/api/facturas` crea un
  plan `prueba-rutas` en la BD de pruebas (la tabla `plans` no se trunca en `limpiar()`). (3) `PUT /api/sunat/emisor`
  no lleva `soloPeru` a propósito: configurar el emisor convierte la empresa en PE. (4) El 500 genérico sigue
  registrando el error completo en el log (`console.error('[SUNAT]', error)`): revisar que no imprima secretos si
  algún servicio mete datos sensibles en un mensaje de error.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunat-fix-fechas-rc`, rama `fix/sunat-fix-fechas-rc`):
  Corrección del E2E contra SUNAT beta (fechas corridas un día y resumen RC rechazado con 2992). Hecho:
  `apps/sunat-engine/src/Mapper.php` con `fecha()`: una fecha sin hora («2026-11-01») se toma al mediodía de
  `America/Lima`; se usa en emisión, cuotas, resumen y baja. `Mapper::resumen` pone `setPorcentajeIgv` en cada
  `SummaryDetail`. `mapper.js` (`armarResumen`) manda `porcentajeIgv` por detalle (`taxRate` de la empresa, si no 18;
  `0` si la boleta no tiene IGV). `tests/smoke.sh`: `PUERTO` (8089 por defecto), verificación de la cuota en el XML
  firmado (`PaymentDueDate>2030-12-31<`, sin `2030-12-30`), y con `BETA=1` envío del RC (`fixtures/resumen.json`, anula
  B001-1) con sondeo de `/tickets/consultar` hasta `codigo 0`. Sin BETA solo comprueba que `/resumenes/enviar` responde 422.
  Verificado: `npm test` 92/92; `./tests/smoke.sh` verde; `BETA=1 ./tests/smoke.sh` verde (factura, baja, RC aceptado).
  Mutaciones (todas en rojo): sin mediodía de Lima (falla la cuota); sin `setPorcentajeIgv` (SUNAT 2992 en el envío);
  sin `porcentajeIgv` en `armarResumen` (falla la prueba de Node).
  Gotchas: (1) quitar solo la zona y dejar el mediodía NO falla: con mediodía el día es el mismo en cualquier zona
  razonable; la mutación útil es quitar el mediodía y la zona. (2) El 2992 de un RC llega YA en la respuesta de
  `/resumenes/enviar` (`ticket: null`), no al consultar el ticket. (3) Cada corrida BETA envía un RC nuevo con correlativo
  `date +%s % 99999 + 1`: SUNAT beta acumula RC de prueba. (4) `vendor/` se instaló con `composer:2` en Docker (no hay PHP
  local). (5) El cliente de la boleta de la fixture es DNI 12345678 (dato de prueba).
- 2026-11-01 (claude-code, Opus 5.5, orquestador): ejecución del plan delegando por riesgo (Sonnet: 3, 4, 7, 8, 11, 12, 15;
  Haiku: 1, 2, 5, 6, 9, 10, 13, 14 y el arreglo de fechas/RC). Cada tarea revisada (diff), suites corridas sobre la rama
  integrada e integrada con cherry-pick. Correcciones fuera del plan: bloqueo de fila en emitir, editar y anular
  (doble emisión/anulación simultánea); `router.param` 404 para comprobantes ajenos; `singletonKey` + `policy: 'short'`
  en pg-boss; fechas sin hora al mediodía de Lima en el motor (Greenter escribe en hora de Lima: salían un día antes,
  también las cuotas) y `porcentajeIgv` en el resumen (SUNAT rechazaba el RC con 2992). E2E `scripts/sunat-beta-e2e.js`
  8/8 en beta; guía `docs/sunat/DESPLIEGUE.md`.
- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sin-vercel-supabase`, rama `chore/sin-vercel-supabase`):
  quitar Vercel y Supabase, y dejar el proyecto corriendo en local. Hecho: (1) almacenamiento en `utils/storage.js` con
  dos proveedores, `r2` y `local` (por defecto). `local` escribe en `LOCAL_UPLOADS_DIR` (por defecto `apps/backend/uploads/`)
  y devuelve `PUBLIC_BACKEND_URL/uploads/<key>`, que sirve `app.js`; rechaza claves con `../`; se borró
  `@supabase/supabase-js` del backend; pruebas en `test/unit/storage.test.js` (9). (2) Frontend sin Google ni Supabase:
  sale `signInWithGoogle` de `AuthContext`, el botón de Google del registro y `lib/supabase.ts`; se desinstalan
  `@supabase/ssr` y `@supabase/supabase-js` (`--legacy-peer-deps`). (3) Sin Vercel: se borra `vercel.json`; la URL del sitio
  sale de `NEXT_PUBLIC_SITE_URL` (`apps/frontend/lib/sitio.ts`); CORS sin `*.vercel.app`. (4) `docker-compose.yml`
  (Postgres 16 en 5435, motor SUNAT en 8089) y README con «Desarrollo local».
  Verificado: `npm test` 101/101 (92 previas + 9), `npm run test:db` 44/44, `tsc --noEmit` sin errores, `next build` exit 0,
  `docker compose config` OK, CORS probado contra el backend en marcha (5 orígenes permitidos, 2 `*.vercel.app` bloqueados).
  Mutaciones del proveedor local (quitar el chequeo `../`, default `supabase`, `extractStorageKeyFromUrl` local roto): 3 de 3 en rojo.
  Commits: `fdbc23f` (almacenamiento), `d97c959` (login sin Google y frontend sin Supabase), `5cc4893` (Vercel, local, docs).
  Gotchas: (a) con `STORAGE_PROVIDER=supabase` (o cualquier valor distinto de `r2`/`local`) el backend ahora FALLA al subir,
  en vez de caer al disco: en Coolify cambiar a `r2` antes de desplegar. (b) En producción sin `r2` los archivos van al disco
  del contenedor y se pierden al redesplegar. (c) `NEXT_PUBLIC_SITE_URL` debe estar definida antes de `next build`; si no,
  metadatos y sitemap apuntan a `localhost:3000`. (d) `robots.txt` ya no tiene la línea `Sitemap:` (el formato exige URL
  absoluta): añadirla en producción. (e) Si el frontend de producción estaba en Vercel, su dominio ya no está en CORS: añadirlo
  a `FRONTEND_URL` o `CORS_ORIGINS`. `ALLOWED_ORIGINS` sigue aceptado como alias. (f) Fuera de «Permitidos» siguen menciones a
  Supabase/Vercel en `docs/PROMPT_SISTEMA_FACTURACION.md`, `docs/DIGITAL_SIGNATURE_IMPLEMENTATION.md` y
  `docs/RESEND_EMAIL_SETUP.md`: pendiente de limpiar. (g) `configuracion/page.tsx` conserva `signedInWithGoogle` y
  `googleAccountManaged`; ya no tienen efecto (el provider de Supabase no existe). (h) `docker compose` fija `name: invoiceapp`,
  así el volumen es `invoiceapp_invoiceapp-pg` en cualquier carpeta. (i) `@types/node` y `undici-types` pasaron a `dev` en el
  lock del frontend (npm lo recalcula al quitar Supabase). (j) Al cargar `app.js` para la prueba de CORS, dotenv leyó el
  `.env` local (sin imprimirlo): los datos de prueba se pasaron por variables de entorno.

- 2026-11-01 (Claude Code con Haiku 5.5, worktree `.claude/worktrees/sunatf-t2-archivos`, rama `feat/sunatf-t2-archivos`): Tarea 2 del plan del frontend SUNAT (XML y CDR servidos por el backend, almacén local para desarrollo). Hecho: `src/sunat/almacenLocal.js` (`crearAlmacenLocal(dir)`: rechaza claves que salen de la carpeta con «Clave de archivo inválida»); `src/sunat/index.js` exporta `crearAlmacen(env)` (con `SUNAT_ALMACEN_DIR` usa disco; con `NODE_ENV=production` lanza error; sin él, R2 privado) y `iniciarSunat` lo usa; `src/routes/comprobantes.js` ya NO redirige (302) el XML/CDR: los lee del almacén y los envía con `Content-Disposition: attachment; filename="<RUC>-<TT>-<SERIE>-<NUM>.xml|.cdr.zip"`; `.env.example` con `SUNAT_ALMACEN_DIR=`. Pruebas: `test/unit/sunat/almacenLocal.test.js` (3) y `test/db/rutas.test.js` ajustado al nuevo XML (200, nombre, CDR 404 antes de emitir). Verificado: `npm test` 95/95 y `npm run test:db` 44/44 contra `invoiceapp_test_t2`. Mutaciones (todas en rojo y restauradas con `cmp`): quitar el chequeo de `../`; permitir `SUNAT_ALMACEN_DIR` en producción; volver al 302; Content-Disposition sin el nombre SUNAT. Gotchas: el CDR con `cdrKey` real (200) no tiene prueba en esta suite (la de rutas solo cubre el 404 previo a emitir); `almacenLocal.js` se escribió antes de correr la prueba roja, así que en rojo solo falló `crearAlmacen`. El `prisma:error` del log de la prueba «series y alertas» es esperado (prueba de serie duplicada). Commit en la rama; sin push.

- 2026-11-01 (claude-code, Opus 5.5): integrada la limpieza «sin Vercel ni Supabase» (Haiku, rama chore/sin-vercel-supabase)
  en feat/sunat-frontend + fix de next.config (imágenes de /uploads con host/puerto de NEXT_PUBLIC_API_URL). Verificado:
  backend 104/104, BD 47/47, frontend 35/35, tsc ok. App levantada en local: `docker compose up -d` (Postgres 5435 +
  motor SUNAT 8089), backend en :4001 (el :4000 lo usa el proyecto house) con STORAGE_PROVIDER=local, frontend en :3000.
  Probado en navegador: registro, login, empresa, subida de logo a disco (/uploads, 200 image/png vía next/image) y dashboard.
  Gotchas: el frontend instala solo con `npm ci --legacy-peer-deps`; `prisma/seed_plans.sql` no está en git (.gitignore
  ignora *.sql): sin él el registro no crea suscripción; el `.env` local de backend aún dice STORAGE_PROVIDER=r2
  (cámbialo a local para no subir a R2 en desarrollo); quedan menciones a Supabase en dos docs históricos
  (DIGITAL_SIGNATURE_IMPLEMENTATION.md y PROMPT_SISTEMA_FACTURACION.md).
- 2026-11-01 (claude-code, Opus 5.5, orquestador, sesión aparte): ejecución del plan del frontend delegando por riesgo
  (Haiku: 1, 2, 3, 5, 6, 7, 9; Sonnet: 4 y 8), cada tarea revisada e integrada con cherry-pick en `feat/sunat-frontend`.
  Ajustes fuera del plan: «Guardar y emitir» bloqueado si el crédito no tiene cuotas que sumen el neto; serie en mayúsculas en
  el payload; `?tab=sunat` abre la pestaña. Tarea 10 (verificación real, local): backend en :4002 contra la BD de pruebas
  `invoiceapp_e2e` (5436) con `SUNAT_ALMACEN_DIR`, motor del docker-compose (8089, token `dev`) apuntando a SUNAT beta, frontend
  `next dev` en :3001. En el navegador: activar SUNAT (MODDATOS + `.pfx` autofirmado) → menú «Comprobantes»; series F001/B001/FC01;
  clientes RUC 20131312955 y DNI 12345678; factura F001-1 con vista previa (100 grav. + 50 exon. + IGV 18 = 168) → Aceptado sin
  recargar → PDF/XML/CDR → anulada (RA) → Anulado; boleta B001-1 aceptada; factura a crédito F001-2 con «Repartir en 2 cuotas»
  (50.00 + 50.01) aceptada; nota de crédito FC01-1 sobre F001-2 aceptada; regresión de empresa US: «Facturas» y formulario
  de clientes sin cambios.

- 2026-11-01 (claude-code, Opus 5.5): revisión visual de la marca Facturo en Chrome (Tarea 4 del plan de marca) sobre la
  app local, en modo claro y oscuro: login, registro, dashboard, configuración/suscripción, comprobantes, landing,
  favicon y manifest. Corregido en `feat/marca-facturo` (commits a8e0a8b y 0820d82): el ícono del menú oscuro pasa a
  ficha blanca (el ticket #0F6E56 sobre gray-900 casi no se veía), la pestaña Suscripción pasa de azul a verde, el
  landing usa `LogoFacturo` en header y footer (antes un ícono genérico), la maqueta del hero ya no dice
  invoiceapp.io, y `LogoFacturo` pone el ticket sobre ficha clara en modo oscuro. Verificado: frontend 35/35,
  tsc ok y `next build` ok. Capturas en `docs/marca/revision-2026-11-01/`.
  Gotcha: no correr `next build` en el mismo `apps/frontend` mientras corre `next dev` (comparten `.next` y se rompen
  los estilos del dev server).
  Pendiente: los correos y dominios `@invoiceapp.com`/`invoiceapp.io` (contacto, ayuda, redes del footer) esperan el
  dominio nuevo de Facturo; nadie verificó la disponibilidad de la marca en INDECOPI ni del dominio. Sin push.

- 2026-11-01 (claude-code, Opus 5.5): onboarding (/setup) en colores Facturo y flujo corregido, en `feat/marca-facturo`.
  Colores (32d5a87): fondo y degradados morados/arcoíris pasan a primary; el rojo queda solo para errores y borrar.
  Flujo (7e581a0), probado en Chrome con una cuenta nueva registro → asistente → dashboard: con sesión iniciada ya no
  pide crear la cuenta otra vez; el asistente ahora SÍ crea/actualiza la empresa (PUT /empresas/mi-empresa con
  setupCompleted: true; antes nunca la creaba y logo/suscripción fallaban); el layout del dashboard redirige a
  /{locale}/setup cuando no hay empresa (el chequeo de 404 nunca coincidía); la vuelta de Stripe iba a un paso 7
  inexistente; el idioma parte del de la página. Verificado: frontend 35/35, tsc y next build ok; en BD quedan
  empresa, setup_completed=true y suscripción TRIALING free. Capturas 09–12 en `docs/marca/revision-2026-11-01/`.
  Resuelto después (7c5c8ac, 4da80c5): la vista previa de impuestos usa la moneda elegida, y `prisma/seed_plans.sql`
  ya está en git (excepción en .gitignore; el README dice cómo cargarlo). Y (8cd7c58) el paso de empresa pide
  «RUC o identificación fiscal» (opcional): solo dígitos se valida como RUC (módulo 11, `lib/sunat/ruc.ts`); con
  letras se acepta como ID de otro país; PUT /empresas/mi-empresa da 409 si el RUC es de otra empresa. Probado en
  Chrome (RUC inválido bloqueado; RUC válido guardado). Si se deja vacío sigue quedando TEMP-…
  Gotcha: `next dev` no recarga los `messages/*.json` cambiados por un checkout; reiniciar y borrar `.next`.

## Próximos pasos

- [x] Spec aprobado.
- [x] Plan de implementación: `docs/superpowers/plans/2026-11-01-sunat-nucleo-emision.md` (16 tareas, backend + motor; el frontend va en un plan aparte).
- [x] Ejecutar el plan del núcleo de emisión (16 tareas + arreglo de fechas/RC; E2E beta 8/8).
- [ ] Decidir: cuando el precio incluye IGV, redondear por línea deja céntimos de diferencia (3 × 33.33 → 100.02); ¿IGV de línea = precio − valor?
- [ ] Decidir `.gitignore`: ignora `prisma/migrations/` y `*.sql` desde el commit inicial (la migración SUNAT entró con `git add -f`).
- [ ] Verificar contra la norma vigente: porcentajes de detracción/percepción, umbrales (700) y plazos (3 y 7 días) de `catalogos/parametros.js`.
- [ ] Probar la firma con un `.pfx` real de una entidad certificadora peruana (solo se probó con autofirmados).
- [x] Diseño y plan del frontend para empresas `PE`: `docs/superpowers/specs/2026-11-01-sunat-frontend-design.md` y
  `docs/superpowers/plans/2026-11-01-sunat-frontend.md` (rama `feat/sunat-frontend`, 10 tareas).
- [x] Ejecutar el plan del frontend (10 tareas; verificado en navegador contra SUNAT beta).
- [x] Frontend: la tarjeta «Create Invoice» del dashboard lleva a `/facturas/nueva` también para empresas `PE` (debería ir a `/comprobantes/nuevo`).
- [x] Frontend: una nota de crédito o débito ofrece a su vez «Nota de crédito/débito» (las acciones no distinguen notas).
- [x] Frontend: en `nuevo?afecta=` y `[id]/editar`, si la carga falla, la pantalla queda en el esqueleto (falta estado de error).
- [ ] Decidir: «Guardar borrador» con crédito y sin cuotas da 400 (el backend exige ≥ 1 cuota); hoy se muestra el error.
- [ ] El redondeo con IGV incluido se vio en vivo: precio 100 con IGV → total 100.01 (ver la decisión pendiente de céntimos).
- [x] `next lint` está roto en el repo (`.eslintrc.json`: estructura circular). Arreglado 2026-11-07 (`eslint-config-next` ^14); quedan 223 errores y 25 avisos de código previos por limpiar.
- [ ] Despliegue según `docs/sunat/DESPLIEGUE.md` (con OK de Miguel; `prisma migrate status` contra producción primero).
- [ ] Diseñar subproyectos 3 (guía de remisión), 4 (retención/percepción) y 5 (SaaS/PSE).

## Decisiones recientes

- 2026-11-01: motor propio con Greenter (PHP) como microservicio sin estado en Coolify; InvoiceApp es dueño de cálculos, correlativos y estados. Por qué: Greenter ya cubre todos los comprobantes y validaciones de SUNAT; escribir UBL+firma en Node era el mayor riesgo.
- 2026-11-01: cola con pg-boss sobre el Postgres existente (sin Redis).
- 2026-11-01: se reutiliza `ConfiguracionSeries` (tipos 01/03/07/08) y `Cliente.tipoDocumento` no se migra (se lee con `codigoDocIdentidad`).
- 2026-11-01: se extiende `Factura` con `Empresa.pais` (`US` | `PE`) en vez de una tabla paralela; `estadoSunat` separado de `estado` (cobranza).
- 2026-11-01: almacenamiento por defecto `local` (disco del backend); `r2` en producción. Un `STORAGE_PROVIDER` desconocido falla en vez de caer al disco. CORS sin patrones: solo localhost, `FRONTEND_URL` y `CORS_ORIGINS`.

## Gotchas

- `signature_requests`: no uses `documentId` como FK (no la tiene). Para ligar el documento usa `facturaId` / `proformaId`. Producción aplica el esquema con `prisma db push`, que NO ejecuta el SQL de la migración: el relleno de `factura_id` / `proforma_id` no corre allí; revisa las filas existentes antes de desplegar.
- `Factura` hoy se puede editar estando «emitida» y «anular» solo cambia el estado: con SUNAT eso deja de valer para empresas `PE`.
- Los montos se calculan con flotantes (`subtotal * taxRate`): pasar a `decimal.js` antes de emitir a SUNAT.
- `STORAGE_PROVIDER` en Coolify: si sigue en `supabase`, el backend falla al subir archivos. Debe ser `r2` (producción) o `local` (desarrollo).
- Quedan menciones de Supabase/Vercel fuera de «Permitidos» (`docs/PROMPT_SISTEMA_FACTURACION.md`, `docs/DIGITAL_SIGNATURE_IMPLEMENTATION.md`, `docs/RESEND_EMAIL_SETUP.md`).
