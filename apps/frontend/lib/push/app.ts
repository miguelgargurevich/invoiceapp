// Los avisos push dentro de la app (Capacitor, carpeta mobile/). Receta del Portal de Dealers (core/push-app.service.ts).
//
// La app carga ESTA web remota, así que el registro del teléfono vive aquí y llega al plugin nativo `PushNotifications` por el
// puente de Capacitor (`window.Capacitor.nativePromise` / `addListener`, que inyecta la app: ver native-bridge.js). Esta web NO
// empaqueta `@capacitor/core`. Fuera de la app (el navegador) no hace nada.
//
// Qué hace, en orden:
//  1. Con la sesión iniciada (`iniciar()`): pide el permiso y, si lo dan, `register()`. Cuando el sistema entrega el token de FCM,
//     se manda al backend (POST /push/dispositivos) y se guarda en memoria para poder borrarlo.
//  2. Antes de cerrar la sesión (`darDeBaja()`): POST /push/dispositivos/baja. Sin bloquear el cierre: un error, o más de unos
//     segundos, y el cierre sigue.
//  3. Al tocar un aviso: abre `data.ruta` SOLO si es una ruta interna. Cualquier otra cosa se ignora.
//  4. Con la app abierta el sistema no dibuja el aviso: se muestra con `avisar` (un toast).
// Nada de esto escribe el token en un log.

import { elegirCamino, type Entorno } from '../descargas.ts';
import { esRutaInterna } from './ruta.ts';

/** Lo mínimo del plugin que usamos (igual que `@capacitor/push-notifications`). */
export interface PuertoPush {
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  addListener(evento: string, fn: (datos: any) => void): unknown;
}

export interface ApiPush {
  post(endpoint: string, datos?: unknown): Promise<unknown>;
}

const PLUGIN = 'PushNotifications';

function entornoDe(win: Window | undefined): Entorno {
  if (!win) return { nativo: false, userAgent: '' };
  return { nativo: Boolean(win.Capacitor?.isNativePlatform?.()), userAgent: win.navigator?.userAgent ?? '' };
}

/** El plugin por el puente nativo. `null` si no está (fuera de la app, o una app sin el plugin: un APK anterior a esto). */
export function resolverPuerto(win: Window | undefined): PuertoPush | null {
  if (!win || elegirCamino(entornoDe(win)) !== 'aplicacion') return null;
  const cap = win.Capacitor;
  if (!cap) return null;

  const proxy = cap.Plugins?.[PLUGIN] as PuertoPush | undefined;
  if (proxy && typeof proxy.register === 'function') return proxy;

  const nativePromise = cap.nativePromise?.bind(cap);
  const addListener = cap.addListener?.bind(cap);
  if (!nativePromise || !addListener) return null;
  // Si el puente dice qué plugins trae y este no está, no hay nada que hacer.
  if (Array.isArray(cap.PluginHeaders) && !cap.PluginHeaders.some((h) => h.name === PLUGIN)) return null;

  return {
    checkPermissions: () => nativePromise(PLUGIN, 'checkPermissions') as Promise<{ receive: string }>,
    requestPermissions: () => nativePromise(PLUGIN, 'requestPermissions') as Promise<{ receive: string }>,
    register: () => nativePromise(PLUGIN, 'register') as Promise<void>,
    addListener: (evento, fn) => addListener(PLUGIN, evento, fn),
  };
}

export interface DependenciasPushApp {
  api: ApiPush;
  /** Abre una ruta interna (router.push). */
  navegar: (ruta: string) => void;
  /** Muestra un aviso recibido con la app abierta. */
  avisar: (texto: string) => void;
  win?: Window;
  /** Cuánto se espera a la baja antes de seguir con el cierre de sesión. */
  esperaDeLaBajaMs?: number;
}

export const ESPERA_DE_LA_BAJA_MS = 3000;

export function crearPushApp(deps: DependenciasPushApp) {
  const win = deps.win ?? (typeof window === 'undefined' ? undefined : window);
  const espera = deps.esperaDeLaBajaMs ?? ESPERA_DE_LA_BAJA_MS;

  /** El último token que entregó el teléfono: solo en memoria, sirve para borrarlo al cerrar la sesión. */
  let token: string | null = null;
  /** ¿Hay una sesión que registrar? La baja la apaga: un `registration` tardío no manda nada con la sesión cerrada. */
  let sesionActiva = false;
  let escuchando = false;
  let enCurso = false;

  function escuchar(puerto: PuertoPush) {
    if (escuchando) return;
    escuchando = true;

    puerto.addListener('registration', (e: { value?: string }) => {
      const nuevo = typeof e?.value === 'string' ? e.value.trim() : '';
      if (!nuevo || !sesionActiva) return;
      token = nuevo;
      const plataforma = win?.Capacitor?.getPlatform?.();
      if (plataforma !== 'android' && plataforma !== 'ios') return;
      // El siguiente inicio de sesión lo reintenta si esto falla.
      deps.api.post('/push/dispositivos', { tipo: 'fcm', plataforma, token: nuevo }).catch(() => {});
    });

    // Sin Google Play Services, sin google-services.json en el APK…: no hay nada que el usuario pueda hacer.
    puerto.addListener('registrationError', () => {});

    puerto.addListener('pushNotificationActionPerformed', (e: { notification?: { data?: { ruta?: unknown } } }) => {
      const ruta = e?.notification?.data?.ruta;
      if (esRutaInterna(ruta)) deps.navegar(ruta);
    });

    puerto.addListener('pushNotificationReceived', (e: { title?: string; body?: string }) => {
      const texto = [e?.title, e?.body].filter((t): t is string => typeof t === 'string' && t.length > 0).join(' · ');
      if (texto) deps.avisar(texto);
    });
  }

  return {
    /** El token que se tiene ahora (para las pruebas; nunca se loguea). */
    tokenActual: () => token,

    /** Con la sesión iniciada: pide el permiso y registra el teléfono. Fuera de la app, o sin el plugin, no hace nada. Nunca lanza. */
    async iniciar(): Promise<void> {
      if (enCurso) return;
      const puerto = resolverPuerto(win);
      if (!puerto) return;
      enCurso = true;
      try {
        sesionActiva = true;
        escuchar(puerto);
        let estado = (await puerto.checkPermissions()).receive;
        if (estado === 'prompt' || estado === 'prompt-with-rationale') estado = (await puerto.requestPermissions()).receive;
        // Denegado: se respeta y no se vuelve a insistir en esta sesión.
        if (estado !== 'granted') return;
        await puerto.register();
      } catch {
        // Sin permiso, sin plugin o sin red: la app sigue igual. No se loguea el error (puede traer datos del teléfono).
      } finally {
        enCurso = false;
      }
    },

    /**
     * Antes de cerrar la sesión: borra el teléfono del servidor. SIEMPRE termina (un error, o pasados unos segundos, también), para que el
     * cierre de sesión no dependa de esto. Sin token (navegador, o permiso denegado) termina al instante y no manda nada.
     * El token se suelta ANTES de mandar: si la baja da 401 y algo vuelve a llamar aquí, la segunda vez no encuentra nada que borrar.
     */
    async darDeBaja(): Promise<void> {
      sesionActiva = false;
      const actual = token;
      token = null;
      if (!actual) return;
      let temporizador: ReturnType<typeof setTimeout> | undefined;
      const limite = new Promise<void>((resolver) => { temporizador = setTimeout(resolver, espera); });
      try {
        await Promise.race([deps.api.post('/push/dispositivos/baja', { token: actual }).then(() => undefined, () => undefined), limite]);
      } finally {
        if (temporizador) clearTimeout(temporizador);
      }
    },
  };
}
