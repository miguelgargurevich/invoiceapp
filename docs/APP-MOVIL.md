# App móvil de Facturo (iOS y Android)

> Estado: fase 1. La app existe y se prueba en emulador. **No está publicada** ni en App Store ni en Google Play.
> Creada el 2026-11-10 (Claude Code con Haiku 5.5), en la rama `feat/app-movil`.

## Qué es

Una app nativa de Capacitor que muestra la web de producción dentro de un WebView:
`https://facturo.gargurevich.dev`. Es el mismo enfoque que usa Torre.

- La sesión, los despliegues de la web y el CORS de la API (`https://api.facturo.gargurevich.dev`) funcionan igual que en el navegador. No hay cambios en el backend.
- La app se distingue en el user agent: termina en `FacturoApp/1.0.0`. El frontend lo usa para decidir cómo descargar archivos.
- Carpeta: `mobile/`. Tiene su propio `package.json` y `node_modules`. No comparte nada con `apps/frontend`.

## Estructura

| Ruta | Qué es |
|---|---|
| `mobile/capacitor.config.ts` | Configuración: appId `pe.facturo.app`, nombre Facturo, URL, navegación, errorPath, splash y barra de estado. |
| `mobile/scripts/destino.mjs` | Regla única de la URL (producción por defecto; `FACTURO_URL` solo para pruebas). |
| `mobile/scripts/preparar-www.mjs` | Escribe la URL en la pantalla «Sin conexión». Corre antes de `cap sync`. |
| `mobile/scripts/verificar-produccion.mjs` | Falla si el build generado no es de producción (ver abajo). |
| `mobile/www/sin-conexion.html` | Pantalla «Sin conexión» con «Reintentar». Capacitor la carga si no hay red. |
| `mobile/resources/` | Fuentes de ícono y splash (SVG y PNG). `npm run assets` genera los recursos nativos. |
| `mobile/android/` | Proyecto Android generado (con cambios en `MainActivity.java` y el manifiesto). |
| `mobile/ios/` | Proyecto iOS generado (con `Info.plist` ajustado). Compila en el simulador con Xcode 26.6 (ver «Probar sin conexión en el simulador»). |
| `mobile/capturas/` | Capturas de la app (landing, login y Términos). |
| `apps/frontend/lib/descargas.ts` | Helper de descargas: navegador (igual que antes) o app (Filesystem + Share). |

## Cómo construir y probar

Requisitos: Node 22 o superior, JDK 21 o 22, Android SDK con platform 34 o 36 y `ANDROID_HOME` (en esta Mac, `~/Library/Android/sdk`). Para iOS hace falta Xcode completo (no solo Command Line Tools).

```bash
cd mobile
npm install

# APK de depuración con la web de producción (verifica que sea build de producción)
npm run apk
# -> android/app/build/outputs/apk/debug/app-debug.apk

# Pruebas contra un servidor local (no es build de producción; no se publica)
FACTURO_URL=http://localhost:3000 npm run apk:prueba
adb reverse tcp:3000 tcp:3000   # para que el emulador vea localhost del Mac
```

Instalar y abrir en el emulador:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n pe.facturo.app/.MainActivity
```

**Regla:** `npm run sync` (o `cap sync`) rehace `android/app/src/main/assets/` y `ios/App/App/public/` a partir de `www/`. Antes de publicar, corre `npm run verificar` y debe decir «OK». Si `FACTURO_URL` está definido, falla a propósito.

**Emulador compartido:** en esta Mac puede haber otro emulador en uso por otra sesión (Torre). No se cierra ni se reinicia. Se reusa el que esté en línea (`adb devices`). Nunca dos emuladores a la vez.

### Cambiar la versión

- Android: `android/app/build.gradle`, `versionCode` (entero, sube siempre) y `versionName`.
- iOS: en Xcode, `MARKETING_VERSION` (la visible) y `CURRENT_PROJECT_VERSION` (el build).
- Capacitor: `npm install @capacitor/core@^8 @capacitor/android@^8 @capacitor/ios@^8` (y los plugins), luego `npx cap update` y revisar los cambios en `android/` e `ios/`.

### Íconos y splash

Las fuentes están en `mobile/resources/`: `icon-only.png` (1024, fondo blanco), `icon-foreground.png` y `icon-background.png` (ícono adaptativo de Android), `splash.png` (2732, fondo berenjena `#6B2C6E`). Para regenerarlos: `npm run assets`. Los SVG son la fuente; los PNG se generaron con `sharp` a 1:1.

## Comportamiento

- **Navegación:** solo `facturo.gargurevich.dev` (la lista `allowNavigation`). Lo demás (SUNAT, WhatsApp, mailto, tel, otros dominios) lo abre el sistema fuera de la app.
- **Botón Atrás (Android):** vuelve en el historial de la web. En la primera pantalla cierra la app (`MainActivity.java`).
- **Sin conexión:** si la carga principal falla, Capacitor muestra `sin-conexion.html` (`server.errorPath`), en Android y en iOS. «Reintentar» vuelve a la web. Limitación: si la red se cae con la app ya abierta, no hay pantalla propia; la web muestra sus propios errores. En iOS no hace falta código nativo: `CAPBridgeViewController` y `WebViewDelegationHandler` ya usan `errorPath` en `didFail` y `didFailProvisionalNavigation`. Cómo probarlo: ver «Probar sin conexión en el simulador».
- **Zona segura y barra de estado:** `SystemBars` con `insetsHandling: css` reserva el espacio del notch y de la barra. El estilo `DEFAULT` deja que el sistema elija el color de los íconos (claro u oscuro).
- **Orientación:** vertical. En Android, `screenOrientation="portrait"`. En iOS, iPhone solo vertical; iPad vertical con pantalla completa.
- **Descargas:** PDF, CSV, XML y CDR se guardan en la caché de la app (Filesystem) y se entregan a la hoja de compartir (Share). En el navegador no cambia nada. Lógica en `apps/frontend/lib/descargas.ts`, con pruebas en `lib/descargas.test.ts` (`npm test` en `apps/frontend`).
- **Subida de archivos:** logo de la empresa, certificado `.pfx` y fotos usan `<input type="file">`. En Android abren el selector del sistema; no piden cámara porque no tienen el atributo `capture`.

## Permisos

- **Android:** ninguno extra. Solo `INTERNET`, que Capacitor agrega solo.
- **iOS, en `Info.plist`, en español:**
  - `NSCameraUsageDescription`: «Facturo usa la cámara solo si eliges «Tomar foto» al subir el logo de tu empresa.»
  - `NSPhotoLibraryUsageDescription`: «Facturo necesita acceder a tus fotos para elegir el logo de tu empresa.»
  - La cámara se declara solo porque el selector de iOS ofrece «Tomar foto» en los campos de imagen. Sin esa clave, elegir la cámara puede cerrar la app. **Decisión pendiente de Miguel:** si prefiere no pedir cámara, hay que quitar esa opción del selector (no lo pude probar sin Xcode).

## Publicar (cuando Miguel decida)

### Costos (fuentes de terceros, confirmar en la web oficial antes de pagar)

- **Apple Developer Program:** US$ 99 al año. Ver [developer.apple.com/programs](https://developer.apple.com/programs/).
- **Google Play Console:** US$ 25, pago único. Ver [play.google.com/console](https://play.google.com/console/about/).
- Ojo con la regla de Google para cuentas personales creadas después del 13 de noviembre de 2023: hay que tener 12 testers activos durante 14 días seguidos antes de pedir producción. Verificar en la documentación oficial de Google Play, porque las fuentes consultadas no son oficiales.

### Firma de Android

- **Keystore de subida (upload key):** se genera una vez, FUERA del repo.
  ```bash
  keytool -genkeypair -v -keystore ~/Llaves/facturo-subida.jks -alias facturo \
          -keyalg RSA -keysize 2048 -validity 10000
  ```
- Guardar el `.jks` y sus contraseñas en un gestor de contraseñas y en una copia de seguridad. Si se pierde, Google Play permite restablecer la clave de subida, pero es un trámite.
- Nunca al repo: `.gitignore` ya excluye `*.jks`, `*.keystore`, `keystore.properties` y `*.pfx`.
- Google Play App Signing (recomendado): la clave de firma final la custodia Google; la keystore de arriba es solo la clave de subida. Si se pierde la clave de subida, se pide restablecerla a Google Play.
- Build de publicación: `./gradlew bundleRelease` (AAB). La configuración de firma (`signingConfigs`) todavía no está en `app/build.gradle`; se agrega cuando haya keystore, leyendo las contraseñas de variables de entorno o de `keystore.properties` fuera del repo.

### iOS

- Compilar en Xcode (`npx cap open ios`), con el equipo de Apple Developer configurado.
- El ícono ya va sin canal alfa (RGB), como exige App Store.
- «Sin conexión» en iOS: funciona con la configuración actual (`errorPath`). Probado en el simulador con una copia de la app que apunta a un host inexistente (captura `mobile/capturas/ios-sin-conexion.png`). Pendiente: tocar «Reintentar» en el simulador (no hubo forma de tocar la pantalla sin mover el puntero de la Mac).

### Probar sin conexión en el simulador

No apagar el Wi-Fi de la Mac (la Mac es el puente de otros servicios). En su lugar, una copia de la app con un host que no existe:

```bash
cd mobile
npm run sync && npm run verificar                 # build de producción, para dejarla al final
# Compilar (ver abajo) y copiar App.app a una carpeta temporal fuera del repo.
# En la copia, cambiar server.url de capacitor.config.json:
#   "url": "https://facturo-sin-red.invalid"
xcrun simctl install <udid> <copia>/App.app
xcrun simctl launch <udid> pe.facturo.app         # debe mostrar «Sin conexión»
# Al terminar, reinstalar la build de producción (la original de ios/App/build/...)
```

- Compilación: `xcodebuild` con `-clonedSourcePackagesDirPath build/SourcePackages -disableAutomaticPackageResolution`, o normal. Si Xcode falla con «fatal: cannot use bare repository» (`safe.bareRepository=explicit` en el git global), se resolvió reutilizando los paquetes ya resueltos en DerivedData; NO se cambió la configuración global de git.
- La primera carga de la web tarda 10–20 s en blanco. No es un fallo.
- Lo que NO prueba esto: perder la red con la app ya abierta (no hay pantalla propia para ese caso).

### Fichas de tienda

- **Política de privacidad:** `https://facturo.gargurevich.dev/es/privacy` (URL pública).
- **Términos:** `https://facturo.gargurevich.dev/es/terms`.
- **Nombre:** Facturo. **Categoría sugerida:** Finanzas o Productividad.
- **Descripción corta sugerida:** «Facturación electrónica SUNAT para emprendedores y pymes del Perú.»
- **Descripción larga sugerida:** «Emite facturas, boletas y notas electrónicas válidas ante SUNAT desde tu celular. Calcula el IGV, guarda el CDR y consulta tus comprobantes en cualquier momento. Plan gratis para empezar.»
- **Capturas necesarias:** Google Play pide al menos 2 capturas de teléfono (mínimo 320 px de lado, máximo 3840 px). App Store pide capturas para el tamaño de iPhone más grande (6,9 pulgadas o el que exija la versión vigente). Las de `mobile/capturas/` sirven como base, pero hay que tomar capturas dentro de la sesión (landing, panel, emisión de comprobante).
- **Ícono de tienda:** 512 × 512 para Google Play (`mobile/resources/icon-only.png` redimensionado). App Store usa el 1024 ya incluido en el proyecto.

### Riesgo de rechazo en Apple (guía 4.2, funcionalidad mínima)

Apple rechaza las apps que son solo una web envuelta. Lo que ayuda:

- Funciones nativas reales: splash y ícono propios, pantalla «Sin conexión», botón Atrás, descargas con hoja de compartir, zona segura.
- Contenido propio y utilidad clara (facturación electrónica con cuenta y datos reales), no un sitio informativo.
- Cuenta de demostración para revisión (crear una en producción para Apple, no usar la cuenta de Miguel).
- Notificaciones push en la fase 2 (ver abajo): reforzaría mucho el caso.

Riesgo: medio. No hay forma de garantizar la aprobación sin probar con Apple.

## Qué le toca a Miguel

1. Decidir si la app se publica en iOS y Android, y cuándo.
2. Abrir la cuenta de Apple Developer (US$ 99 al año) y la de Google Play (US$ 25 una vez). Verificar los montos en las páginas oficiales.
3. Decidir sobre la cámara en iOS (ver «Permisos»).
4. Crear y guardar la keystore de subida fuera del repo.
5. Preparar 12 testers si la cuenta de Google Play es personal (14 días).
6. Confirmar los textos de la ficha y tomar las capturas dentro de la sesión.
7. Crear una cuenta de demostración para la revisión de Apple.

## Fase 2: notificaciones push (no construida)

Plan, sin código todavía:

1. Plugin `@capacitor/push-notifications` en `mobile/`, con los permisos de notificación (Android 13+ pide `POST_NOTIFICATIONS`; iOS pide autorización en tiempo de ejecución).
2. Backend: guardar el token del dispositivo por usuario (tabla nueva), y enviar con FCM (Android) y APNs (iOS). Requiere variables de entorno nuevas en el servidor: decidir cuándo.
3. Cuentas: Firebase (proyecto con `google-services.json`, fuera del repo o en secretos) y Apple Push (clave APNs en la cuenta de Apple Developer).
4. Frontend: pedir permiso y registrar el token desde la web solo dentro de la app (`window.Capacitor` ya está disponible, como en el helper de descargas).

## Estado de verificación (2026-11-10)

Lo que se comprobó de verdad:

- `npm test` en `apps/frontend`: 121/121. `npx tsc --noEmit`: exit 0.
- Mutación de `elegirCamino` (quitar el puente nativo): 4 pruebas en rojo; restaurado con `cp` + `cmp`.
- `npm run sync` y `npm run verificar`: OK (URL de producción, sin cleartext, sin localhost).
- `./gradlew assembleDebug`: BUILD SUCCESSFUL. APK en `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- Instalación en el emulador `emulator-5556` (reusado; no lo cerré): `pm` lo ve con `versionName 1.0`, `minSdk 24`, `targetSdk 36`. El proceso de la app arrancó (pid visible).

Lo que **no** se comprobó todavía:

- Pantallas reales (landing, login, Términos), capturas, botón Atrás, pantalla «Sin conexión», zona segura en claro y oscuro: el emulador estaba ocupado con otra app (Torre) en primer plano. Pendiente de repetir cuando el emulador esté libre.
- Selector de archivos en Android y el puente `window.Capacitor.Plugins` (Filesystem y Share) desde la web.
- Todo lo de iOS (no hay Xcode aquí).
- La sesión y las descargas reales con cuenta: no se inició sesión ni se crearon cuentas en producción, a propósito.
- Posible problema conocido: en las proformas, el botón del enlace de firma usa `window.open(..., '_blank')`. En la WebView probablemente no abre nada. No se cambió (fuera de los puntos 3 y 4); queda para revisar.
