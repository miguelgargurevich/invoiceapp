// Las instancias únicas del push (app y navegador) con las dependencias reales. La lógica vive en app.ts y web.ts (con pruebas);
// aquí solo se conectan con el cliente de la API. El router y el toast los pone el componente PushIniciador al montarse.

import apiClient from '@/lib/api';
import { crearPushApp } from './app.ts';
import { crearPushWeb } from './web.ts';

const api = {
  get: <T>(endpoint: string) => apiClient.get<T>(endpoint),
  post: (endpoint: string, datos?: unknown) => apiClient.post(endpoint, datos),
};

/** Lo que el componente del iniciador cambia al montarse (el router y el toast son del árbol de React). */
export const gestoresDeAviso = {
  navegar: (ruta: string): void => { if (typeof window !== 'undefined') window.location.assign(ruta); },
  avisar: (_texto: string): void => {},
};

export const pushApp = crearPushApp({ api, navegar: (ruta) => gestoresDeAviso.navegar(ruta), avisar: (texto) => gestoresDeAviso.avisar(texto) });
export const pushWeb = crearPushWeb({ api });

/**
 * Antes de cerrar la sesión (AuthContext.signOut): da de baja el teléfono y el navegador mientras el token de la sesión sigue puesto.
 * Nunca lanza ni se queda esperando (cada una tiene su tope de tiempo).
 */
export async function bajaDePush(): Promise<void> {
  await Promise.all([pushApp.darDeBaja().catch(() => undefined), pushWeb.darDeBaja().catch(() => undefined)]);
}
