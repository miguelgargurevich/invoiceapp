// Los avisos push en el NAVEGADOR (Web Push con VAPID): «Recibir avisos en este navegador».
//
// Dentro de la app de Facturo (Capacitor) esto NO se ofrece: el WebView no hace Web Push, ahí usa lib/push/app.ts.
//
// Una suscripción es de UN navegador y de la última sesión que la registró (el servidor la reasigna). Por eso:
//  - Al cerrar sesión se borra del servidor Y se cancela en el navegador (`darDeBaja`): quien entre después en ese navegador no
//    recibe los avisos de la persona anterior.
//  - Que una persona quiere los avisos se recuerda POR USUARIO en este navegador (localStorage, `facturo.push.web.<id>`): al volver a
//    entrar, si el permiso sigue concedido, se vuelve a suscribir sin preguntar (`reanudar`). Si el permiso está en «preguntar», nunca
//    se pide solo: el permiso solo se pide al tocar «Activar».

import { elegirCamino, type Entorno } from '../descargas.ts';
import { claveVapidABytes } from './ruta.ts';

export type EstadoWebPush =
  | 'no-soportado' // el navegador no sabe, o se está dentro de la app
  | 'no-disponible' // el servidor no tiene Web Push configurado (o es la demo)
  | 'bloqueado' // la persona bloqueó los avisos en este navegador
  | 'inactivo'
  | 'activo';

export interface ApiWeb {
  get<T>(endpoint: string): Promise<T>;
  post(endpoint: string, datos?: unknown): Promise<unknown>;
}

interface ConfigPush { web?: { disponible?: boolean; publicKey?: string | null } }

export interface DependenciasPushWeb {
  api: ApiWeb;
  win?: Window & typeof globalThis;
  /** Cuánto se espera a la baja antes de seguir con el cierre de sesión. */
  esperaDeLaBajaMs?: number;
}

export const ESPERA_DE_LA_BAJA_WEB_MS = 3000;
export const RUTA_SERVICE_WORKER = '/sw.js';
const PREFIJO_RECUERDO = 'facturo.push.web.';

function entornoDe(win: Window): Entorno {
  return { nativo: Boolean(win.Capacitor?.isNativePlatform?.()), userAgent: win.navigator?.userAgent ?? '' };
}

/** ¿Puede este navegador recibir Web Push (y no es la app)? */
export function webPushSoportado(win: (Window & typeof globalThis) | undefined): win is Window & typeof globalThis {
  if (!win || !win.navigator) return false;
  if (elegirCamino(entornoDe(win)) === 'aplicacion') return false;
  return 'serviceWorker' in win.navigator && 'PushManager' in win && 'Notification' in win;
}

function recuerdo(win: Window, userId: string, valor?: '1' | null): boolean {
  try {
    const clave = PREFIJO_RECUERDO + userId;
    if (valor === undefined) return win.localStorage.getItem(clave) === '1';
    if (valor === null) win.localStorage.removeItem(clave); else win.localStorage.setItem(clave, valor);
    return true;
  } catch {
    return false; // sin almacenamiento (ventana privada…): se pierde el recuerdo, nada más
  }
}

export function crearPushWeb(deps: DependenciasPushWeb) {
  const win = deps.win ?? (typeof window === 'undefined' ? undefined : window);
  const espera = deps.esperaDeLaBajaMs ?? ESPERA_DE_LA_BAJA_WEB_MS;

  async function configuracion(): Promise<{ disponible: boolean; publicKey: string | null }> {
    try {
      const c = await deps.api.get<ConfigPush>('/push/config');
      const disponible = Boolean(c?.web?.disponible && c.web.publicKey);
      return { disponible, publicKey: disponible ? (c.web!.publicKey as string) : null };
    } catch {
      return { disponible: false, publicKey: null };
    }
  }

  async function suscripcionActual(): Promise<PushSubscription | null> {
    if (!webPushSoportado(win)) return null;
    const registro = await win.navigator.serviceWorker.getRegistration();
    return registro ? registro.pushManager.getSubscription() : null;
  }

  async function suscribir(publicKey: string): Promise<PushSubscription> {
    const w = win as Window;
    await w.navigator.serviceWorker.register(RUTA_SERVICE_WORKER);
    const registro = await w.navigator.serviceWorker.ready;
    const existente = await registro.pushManager.getSubscription();
    return existente ?? registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveVapidABytes(publicKey) as BufferSource });
  }

  async function registrarEnElServidor(sub: PushSubscription): Promise<void> {
    const j = sub.toJSON();
    await deps.api.post('/push/dispositivos', { tipo: 'webpush', suscripcion: { endpoint: j.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth } } });
  }

  return {
    /** En qué está este navegador, para pintar el interruptor. Nunca lanza. */
    async estado(): Promise<EstadoWebPush> {
      if (!webPushSoportado(win)) return 'no-soportado';
      try {
        if (!(await configuracion()).disponible) return 'no-disponible';
        if (win.Notification.permission === 'denied') return 'bloqueado';
        const sub = await suscripcionActual();
        return sub && win.Notification.permission === 'granted' ? 'activo' : 'inactivo';
      } catch {
        return 'inactivo';
      }
    },

    /** «Activar»: pide el permiso (solo aquí), se suscribe y lo registra. Devuelve el estado en que quedó. Lanza solo si el servidor falla. */
    async activar(userId: string): Promise<EstadoWebPush> {
      if (!webPushSoportado(win)) return 'no-soportado';
      const { disponible, publicKey } = await configuracion();
      if (!disponible || !publicKey) return 'no-disponible';
      const permiso = win.Notification.permission === 'granted' ? 'granted' : await win.Notification.requestPermission();
      if (permiso === 'denied') return 'bloqueado';
      if (permiso !== 'granted') return 'inactivo'; // cerró el cuadro sin decidir
      const sub = await suscribir(publicKey);
      try {
        await registrarEnElServidor(sub);
      } catch (error) {
        // Que el navegador y el servidor no queden a medias: sin registro en el servidor, no hay suscripción.
        await sub.unsubscribe().catch(() => false);
        throw error;
      }
      recuerdo(win, userId, '1');
      return 'activo';
    },

    /** «Desactivar»: borra la suscripción del servidor y la cancela en el navegador, y olvida que la quería. */
    async desactivar(userId: string): Promise<EstadoWebPush> {
      if (!webPushSoportado(win)) return 'no-soportado';
      recuerdo(win, userId, null);
      const sub = await suscripcionActual();
      if (sub) {
        await deps.api.post('/push/dispositivos/baja', { token: sub.endpoint }).catch(() => undefined);
        await sub.unsubscribe().catch(() => false);
      }
      return 'inactivo';
    },

    /**
     * Al iniciar sesión: si ESTA persona dijo que quería los avisos y el permiso sigue concedido, se vuelve a suscribir sin preguntar
     * (el cierre de sesión anterior canceló la suscripción). Con el permiso en «preguntar» o bloqueado no hace nada. Nunca lanza.
     */
    async reanudar(userId: string): Promise<void> {
      try {
        if (!webPushSoportado(win) || !recuerdo(win, userId) || win.Notification.permission !== 'granted') return;
        const { disponible, publicKey } = await configuracion();
        if (!disponible || !publicKey) return;
        await registrarEnElServidor(await suscribir(publicKey));
      } catch {
        // Sin red o sin servidor: la próxima sesión lo reintenta.
      }
    },

    /**
     * Antes de cerrar la sesión: borra la suscripción del servidor y la cancela en el navegador. SIEMPRE termina (un error, o pasados unos
     * segundos, también). El recuerdo de «quiere avisos» se conserva para que esa persona se reanude al volver.
     */
    async darDeBaja(): Promise<void> {
      if (!webPushSoportado(win)) return;
      let temporizador: ReturnType<typeof setTimeout> | undefined;
      const limite = new Promise<void>((resolver) => { temporizador = setTimeout(resolver, espera); });
      const baja = (async () => {
        const sub = await suscripcionActual();
        if (!sub) return;
        await deps.api.post('/push/dispositivos/baja', { token: sub.endpoint }).catch(() => undefined);
        await sub.unsubscribe().catch(() => false);
      })().catch(() => undefined);
      try { await Promise.race([baja, limite]); } finally { if (temporizador) clearTimeout(temporizador); }
    },
  };
}
