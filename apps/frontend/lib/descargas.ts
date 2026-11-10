// Descargas de archivos generados en el cliente (PDF, CSV, XML, CDR).
//
// En el navegador se hace como siempre: un enlace con un blob y el atributo download.
// Dentro de la app Facturo (Capacitor, ver mobile/) un WebView no descarga nada, así que
// el archivo se guarda en la caché de la app con el plugin Filesystem y se entrega a Share
// (abrir con otra app o compartir).
//
// No se importan paquetes de Capacitor: el puente global window.Capacitor.Plugins lo expone
// la app nativa. Las funciones puras reciben sus dependencias para poder probarse con node:test.

/** Texto que la app añade al user agent (appendUserAgent en mobile/capacitor.config.ts). */
export const MARCA_USER_AGENT = 'FacturoApp';

export type Camino = 'navegador' | 'aplicacion';

export interface Entorno {
  /** Resultado de window.Capacitor.isNativePlatform() (false si no hay puente). */
  nativo: boolean;
  userAgent: string;
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: Record<string, unknown>;
    };
  }
}

/** Decide cómo entregar el archivo. Dentro de la app siempre es 'aplicacion'. */
export function elegirCamino(entorno: Entorno): Camino {
  return entorno.nativo || entorno.userAgent.includes(MARCA_USER_AGENT) ? 'aplicacion' : 'navegador';
}

const CARACTERES_NO_PERMITIDOS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/**
 * Nombre que se puede usar como archivo en cualquier sistema: sin separadores de ruta,
 * sin caracteres de control, sin puntos, guiones bajos ni espacios iniciales (así no hay
 * archivos ocultos ni «..») y como máximo `maximo` caracteres, conservando la extensión.
 */
export function nombreSeguro(nombre: string, maximo = 120): string {
  const limpio = nombre
    .replace(CARACTERES_NO_PERMITIDOS, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s_]+/, '')
    .trim();
  const base = limpio || 'documento';
  if (base.length <= maximo) return base;

  const punto = base.lastIndexOf('.');
  const extension = punto > 0 && base.length - punto <= 10 ? base.slice(punto) : '';
  return base.slice(0, maximo - extension.length) + extension;
}

/** Contenido de un blob en base64 (sin el prefijo data:). Trabaja por trozos para no desbordar la pila. */
export async function blobABase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const TROZO = 0x8000;
  let binario = '';
  for (let i = 0; i < bytes.length; i += TROZO) {
    const trozo = Array.from(bytes.subarray(i, i + TROZO));
    binario += String.fromCharCode.apply(null, trozo);
  }
  return btoa(binario);
}

export interface Dependencias {
  entorno: () => Entorno;
  descargarEnNavegador: (blob: Blob, nombre: string) => void;
  /** Guarda el contenido en base64 en la caché de la app y devuelve su URI de archivo. */
  guardarEnCache: (nombre: string, base64: string) => Promise<string>;
  /** Abre la hoja de compartir del sistema con ese archivo. */
  compartir: (opciones: { titulo: string; archivo: string }) => Promise<void>;
}

/** Entrega un archivo al usuario según el entorno. */
export async function descargarArchivo(
  blob: Blob,
  nombre: string,
  deps: Dependencias = dependenciasReales(),
): Promise<void> {
  const archivo = nombreSeguro(nombre);
  if (elegirCamino(deps.entorno()) === 'navegador') {
    deps.descargarEnNavegador(blob, archivo);
    return;
  }
  const uri = await deps.guardarEnCache(archivo, await blobABase64(blob));
  await deps.compartir({ titulo: archivo, archivo: uri });
}

/** ¿Se está mostrando dentro de la app Facturo? Para no usar Web Share dentro de la app. */
export function esAplicacionFacturo(): boolean {
  return elegirCamino(entornoActual()) === 'aplicacion';
}

function entornoActual(): Entorno {
  if (typeof window === 'undefined') return { nativo: false, userAgent: '' };
  return {
    nativo: Boolean(window.Capacitor?.isNativePlatform?.()),
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  };
}

function plugin<T>(nombre: string): T {
  const plugins = typeof window === 'undefined' ? undefined : window.Capacitor?.Plugins;
  const encontrado = plugins?.[nombre] as T | undefined;
  if (!encontrado) {
    throw new Error(`La app no expone el plugin ${nombre}.`);
  }
  return encontrado;
}

function dependenciasReales(): Dependencias {
  return {
    entorno: entornoActual,
    descargarEnNavegador(blob, nombre) {
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async guardarEnCache(nombre, base64) {
      const filesystem = plugin<{
        writeFile: (op: { path: string; data: string; directory: string; recursive?: boolean }) => Promise<{ uri: string }>;
      }>('Filesystem');
      const { uri } = await filesystem.writeFile({
        path: nombre,
        data: base64,
        directory: 'CACHE',
        recursive: true,
      });
      return uri;
    },
    async compartir({ titulo, archivo }) {
      const share = plugin<{
        share: (op: { title: string; dialogTitle: string; files: string[] }) => Promise<void>;
      }>('Share');
      await share.share({ title: titulo, dialogTitle: titulo, files: [archivo] });
    },
  };
}
