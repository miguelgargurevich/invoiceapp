// Decide qué ofrecer para instalar Facturo como app web (PWA) desde el navegador.
//
// Sin imports de React ni del navegador: recibe los datos ya leídos (user agent, si corre
// instalada, si está dentro de la app nativa, si llegó beforeinstallprompt) y devuelve qué mostrar.
// Se prueba con node --test (instalar.test.ts).

export type Plataforma = 'ios' | 'android' | 'otra';

export interface EntornoInstalacion {
  userAgent: string;
  /** Ya corre instalada: display-mode standalone o navigator.standalone (iOS). */
  instalada: boolean;
  /** Dentro de la app nativa (Capacitor, ver lib/descargas.ts): no se ofrece instalar. */
  aplicacionNativa: boolean;
  /** Llegó el evento beforeinstallprompt (Chrome y Edge cuando cumplen los criterios). */
  eventoInstalar: boolean;
  /** navigator.maxTouchPoints: iPadOS se anuncia como Mac, pero tiene pantalla táctil. */
  puntosTactiles?: number;
}

export type Instalacion =
  | { tipo: 'nada' }
  /** Hay evento: el botón llama a prompt(). */
  | { tipo: 'boton' }
  /** iPhone o iPad con Safari: no hay evento; se muestran los pasos para Agregar a pantalla de inicio. */
  | { tipo: 'instrucciones-ios' }
  /** iPhone con otro navegador: iOS solo deja agregar desde Safari (según la documentación de Apple). */
  | { tipo: 'abrir-en-safari' };

/** Plataforma a partir del user agent. */
export function plataformaDe(userAgent: string, puntosTactiles = 0): Plataforma {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
  // iPadOS 13 y posteriores piden la web como Mac; con pantalla táctil es un iPad.
  if (/Macintosh/.test(userAgent) && puntosTactiles > 1) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'otra';
}

/**
 * ¿Es Safari y no otro navegador de iOS? Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS) y
 * Opera (OPiOS, OPT/) también llevan «Safari/» en el user agent, así que se descartan por su marca.
 */
export function esSafariIOS(userAgent: string): boolean {
  if (!/Safari\//.test(userAgent)) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(userAgent);
}

/** Qué mostrar. Orden: instalada o app nativa no muestran nada; con evento, el botón; luego iOS. */
export function decidirInstalacion(entorno: EntornoInstalacion): Instalacion {
  if (entorno.instalada || entorno.aplicacionNativa) return { tipo: 'nada' };
  if (entorno.eventoInstalar) return { tipo: 'boton' };
  if (plataformaDe(entorno.userAgent, entorno.puntosTactiles) !== 'ios') return { tipo: 'nada' };
  return esSafariIOS(entorno.userAgent) ? { tipo: 'instrucciones-ios' } : { tipo: 'abrir-en-safari' };
}
