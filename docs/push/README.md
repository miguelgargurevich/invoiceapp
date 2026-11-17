# Avisos push de Facturo (app de Android/iPhone y navegador)

> Construido el 2026-11-17 (Claude Code, Sonnet 5.5), rama `feat/push-notificaciones`. Es la misma receta del Portal de Dealers
> (`portal-dealers-vendedores`: `EnviadorPushFcm.cs`, `push-app.service.ts`), adaptada a Node. **Nada está encendido todavía:** sin las
> variables de abajo el envío se apaga solo y la API funciona igual.

## Qué hace

- **App Android (Capacitor, `mobile/`):** el teléfono recibe el aviso aunque la app esté cerrada. Usa Firebase Cloud Messaging (FCM).
- **Navegador (Chrome, Edge, Firefox, Safari de escritorio):** Configuración › Notificaciones › «Recibir avisos en este navegador». Usa Web Push con claves VAPID.
- **iPhone:** preparado y documentado, **no activado** (hace falta la cuenta de Apple de pago; ver «iPhone»).

## Qué se avisa y por qué

Se revisó lo que Facturo ya tiene (la campana de `/api/notificaciones`, el dashboard, el módulo SUNAT, las firmas) y se eligieron **cuatro** avisos: los que
pasaron mientras el dueño no estaba mirando y piden una acción suya.

| Aviso | Cuándo sale | Texto de ejemplo | Abre |
|---|---|---|---|
| **Proforma aceptada / Factura firmada** | El cliente firma desde el enlace público (`/api/signatures/public/submit`). Solo a quien pidió la firma. | «Tu cliente firmó la proforma P001-3.» | la proforma o el comprobante |
| **SUNAT rechazó un comprobante** | El envío termina `RECHAZADO` (cola SUNAT). Un rechazo no se arregla solo: hay que corregirlo. | «F001-12 fue rechazado. Revísalo y corrígelo.» | el comprobante |
| **Comprobante sin enviar a SUNAT** | El envío falla y se pasó el plazo de reintentos (`dentroDePlazoEnvio`). | «F001-12 no se pudo enviar a tiempo. Reinténtalo desde la app.» | el comprobante |
| **Facturas vencidas** (resumen diario) | Una vez al día por empresa, entre las 9 y las 20 h de Lima, si hay facturas `emitida` con fecha de vencimiento pasada y saldo pendiente (la misma definición del dashboard). | «Tienes 2 facturas vencidas por cobrar.» | `/es/facturas` |

Lo que **no** se avisa, a propósito: que SUNAT aceptó (es lo normal; ya sale el correo con el PDF), «próxima a vencer» y «proforma sin respuesta» (son ruido
diario; se pueden sumar después), y el pago de la suscripción que falla (`invoice.payment_failed` en `routes/webhooks.js` tiene un `TODO`, pero toca
cobros y no se mezcló en esta rama).

**Qué lleva cada aviso:** solo título, cuerpo corto y una ruta interna (`/es/...`). Nunca montos, nombres de clientes, RUC ni correos: la pantalla bloqueada
los muestra a cualquiera. Una prueba fija que el aviso tiene exactamente esas tres claves.

## Cómo está armado (por si hay que tocarlo)

- **Tablas** (`prisma/schema.prisma`, migración `20261117000000_push_avisos`; en producción las crea `prisma db push` al arrancar):
  `dispositivos_push` (un token o suscripción web por fila, con `user_id` y `empresa_id`) y `avisos_push_enviados` (clave única `(user_id, clave)` para no repetir).
  Los dos con `ON DELETE CASCADE`.
- **Tenant:** toda consulta filtra por usuario **y** empresa. El usuario y la empresa salen de la sesión (JWT), nunca del cuerpo de la petición.
- **Rutas** (`/api/push`, con sesión): `GET /config` (qué canales hay y la clave VAPID pública), `POST /dispositivos` (alta; si el token era de otro usuario pasa al actual),
  `POST /dispositivos/baja` (el token va en el cuerpo, no en la URL: las URL quedan en los logs). Con la demo pública no se registra nada.
- **Sin repetir:** antes de enviar se reserva `(usuario, clave)` con `INSERT … ON CONFLICT DO NOTHING`. Si nadie lo recibió por un fallo, la reserva se suelta y un reintento puede enviarlo.
- **Envío** (`src/push/`): `fcm.js` (FCM HTTP v1; la cuenta de servicio firma un JWT RS256 y lo cambia por un token de acceso, sin librerías nuevas) y `webpush.js` (librería `web-push`).
  Todo recibe `fetch` y reloj por inyección: **las pruebas no llaman a Google ni a ningún servicio de push**.
- **Cuándo se borra un token** (regla importante): solo si el proveedor dice con todas las letras que ya no existe.
  FCM: `UNREGISTERED` (viene dentro de un 404) o un 400 que se queja del token de registro. Web Push: 404 o 410.
  **Un 404 a secas de FCM NO borra nada**: también lo da un `PUSH_FCM_PROJECT_ID` mal escrito, y borraría los teléfonos de todos. 401/403/429/5xx tampoco borran.
- **SSRF:** el servidor le hace POST a la dirección de la suscripción web, así que solo acepta `https` y los servicios de push conocidos
  (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.push.apple.com`, `*.notify.windows.com`), sin puerto raro ni usuario:clave.
- **Cerrar sesión:** da de baja el teléfono y cancela la suscripción del navegador **antes** de quitar el token. Si no, quien entre después en ese dispositivo recibiría los avisos de la persona anterior.
  Lo mismo si la sesión **vence** sin pasar por «Cerrar sesión» (al recargar la web se cancela la suscripción), y el interruptor solo aparece «activado» para la persona que lo activó en ese navegador.
- **Resumen diario:** un temporizador dentro del backend (`unref`, cada hora) en `src/push/avisos.js`. No usa pg-boss porque ese solo arranca con `SUNAT_ENGINE_URL`. Si hay dos instancias, la clave única evita el doble envío.

## Pasos para Miguel

### 1. Navegador (Web Push) — 5 minutos, no necesita Firebase

1. En tu Mac: `npx web-push generate-vapid-keys` (imprime una clave pública y una privada). Guárdalas en tu gestor de secretos.
2. Coolify › proyecto Facturo › recurso de producción (`facturo`) › Environment Variables, y agrega:
   - `PUSH_VAPID_PUBLIC_KEY` = la clave pública
   - `PUSH_VAPID_PRIVATE_KEY` = la clave privada
   - `PUSH_VAPID_SUBJECT` = `mailto:facturo@gargurevich.dev` (o `https://facturo.gargurevich.dev`)
3. Redeploy del backend. En el log debe desaparecer «Web Push apagado».
4. Entra a `https://facturo.gargurevich.dev/es/configuracion?tab=notificaciones`: aparece «Recibir avisos en este navegador». Actívalo y acepta el permiso.
5. Prueba: Coolify › backend › Terminal: `node scripts/push-prueba.js tu@correo.com` debe imprimir `Resultado: enviado (1 enviado(s))` y el navegador muestra «Aviso de prueba».

No pongas las claves en el repo. **No regeneres las claves VAPID** una vez en uso: todas las suscripciones web existentes dejarían de servir y cada persona tendría que volver a activar.

### 2. Android (FCM)

1. https://console.firebase.google.com › **Agregar proyecto** (p. ej. «Facturo»). Sin Google Analytics está bien.
2. En el proyecto: **Agregar app › Android**. El nombre del paquete (**`applicationId`**) es exactamente **`pe.facturo.app`** (está en `mobile/android/app/build.gradle`).
   No hace falta el SHA-1 para los avisos.
3. Descarga **`google-services.json`** y cópialo a **`mobile/android/app/google-services.json`**. Ese archivo ya está en `.gitignore`: no se sube. Sin él, el APK compila y funciona igual, pero **sin avisos**.
4. Cuenta de servicio (para que el backend envíe): Firebase › ⚙ Configuración del proyecto › **Cuentas de servicio** › **Generar nueva clave privada** (baja un `.json`).
   Confirma que la **API de Firebase Cloud Messaging (V1)** esté habilitada (en proyectos nuevos viene activa).
5. Pasa ese `.json` a base64 en una sola línea: `base64 -i cuenta.json | tr -d '\n'` (no pegues el JSON suelto en Coolify; los saltos de línea de la llave se rompen).
6. Coolify › Environment Variables del backend:
   - `PUSH_FCM_PROJECT_ID` = el **ID del proyecto** de Firebase (Configuración del proyecto › General; no es el número)
   - `PUSH_FCM_CUENTA_BASE64` = el base64 del paso 5
7. Redeploy del backend. En el log debe desaparecer «FCM apagado». Borra `cuenta.json` de tu Mac cuando ya esté en Coolify.
8. Recompila el APK: `cd mobile && npm run apk` (sube `versionCode` en `android/app/build.gradle` si lo vas a publicar). La app carga la web de producción, así que **la web con estos cambios tiene que estar desplegada antes**.
9. Instala el APK en un Android real, entra con tu cuenta y acepta el permiso de notificaciones. Luego `node scripts/push-prueba.js tu@correo.com` en el backend.
   **Es lo primero que hay que probar en un teléfono de verdad: nada de FCM se probó contra Google** (ver «Lo que NO se verificó»).

### 3. iPhone (preparado, no activado)

Hace falta la **cuenta de Apple Developer de pago**. Cuando la tengas:

1. developer.apple.com › Certificates, Identifiers & Profiles › **Keys** › crea una clave con **Apple Push Notifications service (APNs)** y baja el `.p8` (se baja una sola vez). Anota el Key ID y el Team ID.
2. Firebase › ⚙ › **Cloud Messaging** › «Configuración de apps de Apple» › sube el `.p8` con el Key ID y el Team ID.
3. Firebase › **Agregar app › iOS** con el Bundle ID **`pe.facturo.app`** → descarga `GoogleService-Info.plist` y ponlo en `mobile/ios/App/App/` (ya está en `.gitignore`).
4. Xcode (no se tocó la firma): Signing & Capabilities › **+ Capability › Push Notifications** y **Background Modes › Remote notifications**.
5. **Paso que NO es opcional:** el plugin `@capacitor/push-notifications` entrega en iOS el token **de APNs**, no el de FCM (lo dice su README: «On iOS it contains the APNS token. On Android it contains the FCM token»).
   El backend usa FCM v1, que **rechaza** un token de APNs con un 400 (y la fila se borra). Hay que agregar `FirebaseMessaging` (Swift Package o CocoaPods) y en `AppDelegate.swift`:
   `FirebaseApp.configure()`, pasar el token de APNs a `Messaging.messaging().apnsToken` y publicar el `fcmToken` en `.capacitorDidRegisterForRemoteNotifications` (la guía de Capacitor «Push Notifications › iOS › Using Firebase» lo trae completa).
   Sin esto, en el iPhone no llega nada aunque lo demás esté bien.
6. `cd mobile && npx cap sync ios` y compila desde Xcode.

El código web ya manda `plataforma: "ios"` cuando corresponde; no hay que cambiar nada en el backend ni en la web.

> Web Push en iPhone/iPad (Safari) solo funciona con la web **instalada en la pantalla de inicio** (iOS 16.4 o superior). El interruptor aparece igual; en un Safari sin instalar el navegador no ofrece suscripción y la opción no se muestra.

## Probar en local

```bash
# Base de pruebas propia (no uses la de producción)
cd apps/backend && DATABASE_URL=postgresql://postgres:postgres@localhost:5435/invoiceapp_test_push npx prisma db push
npm test                                   # unitarias (incluye src/push)
TEST_DATABASE_URL=... npm run test:db      # con base de datos (test/db/push.test.js)
cd ../frontend && npm test && npx tsc --noEmit
```

Para ver el navegador de punta a punta: genera claves VAPID, arranca el backend con `PUSH_VAPID_*` y el frontend compilado con **`NEXT_PUBLIC_API_URL=http://localhost:4000`**
(si no, `.env.production` lo apunta a `https://api.example.com`), activa el interruptor y corre `node scripts/push-prueba.js <correo>`.

## Gotchas

- `NEXT_PUBLIC_*` se fija al **compilar**: por eso la clave VAPID pública no va como variable del frontend, el frontend la pide a `GET /api/push/config` y basta redesplegar el backend.
- Hay **un solo service worker** por origen (`public/sw.js`): lleva el `fetch` de siempre (para poder instalar la app) más `push` y `notificationclick`, y `install`/`activate` con `skipWaiting` + `clients.claim` para que los navegadores que ya tenían el viejo pasen al nuevo de inmediato (si no, los push llegarían al viejo, que no sabe dibujarlos). Si lo cambias, no registres otro y no le agregues caché sin revisar eso.
- `GET /api/notificaciones` (la campana) filtra por `estado` en **MAYÚSCULAS** (`EMITIDA`, `PENDIENTE`), pero las facturas se guardan en minúsculas (`emitida`). El resumen diario usa la definición del dashboard (minúsculas). Esa ruta no se tocó.
- En la demo pública (`MODO_DEMO=si`) no se registra ningún dispositivo y no hay temporizador: las cuentas se comparten entre visitantes.
- Android 13+ exige declarar `POST_NOTIFICATIONS` en el manifiesto (ya está) y pedir el permiso en ejecución (lo pide la web al entrar con la sesión iniciada; si lo niegan no se insiste en esa sesión).
- Para que la notificación de Android use un ícono propio en la barra de estado (hoy sale el del launcher, que algunos Android pintan como cuadro blanco), hay que agregar un ícono monocromo y declararlo con `com.google.firebase.messaging.default_notification_icon`. No se hizo.

## Lo que NO se verificó

- **FCM contra Firebase de verdad** (Android/iPhone): no hay proyecto de Firebase todavía. El emisor se probó con un `fetch` falso que contesta lo que documenta Google. Lo primero con la cuenta lista: `push-prueba.js` hacia un teléfono real.
- **El plugin en un teléfono o emulador:** el APK compila (`assembleDebug`, con el plugin y sin `google-services.json`), pero no se instaló ni se ejecutó (no había emulador en línea). **Sin verificar** qué hace `register()` en un APK sin `google-services.json` (el plugin de Google no se aplica; podría fallar al registrar). Por eso: no distribuyas un APK con push sin ese archivo.
- **El puente de Capacitor** (`nativePromise` / `addListener` desde la web remota): se leyó en `native-bridge.js` de Capacitor 8 y se probó con un puente falso, no en un dispositivo.
- **iPhone:** nada, ni código nativo (ver arriba).
- **Un navegador que ya tenía el `sw.js` viejo con una pestaña abierta:** la actualización (`skipWaiting` + `claim`) se probó con el código, no con un navegador real (la prueba en Chrome usó un perfil nuevo).
- **Safari y Firefox** (Web Push): solo se probó en Chrome. El servicio de Mozilla y el de Apple están en la lista permitida pero no se llamaron.
- **Los cuatro avisos en producción:** probados con la base de pruebas y emisores falsos, y la firma por la ruta HTTP real; SUNAT contra la cola con dobles. Falta verlos con un comprobante real rechazado por SUNAT beta.
