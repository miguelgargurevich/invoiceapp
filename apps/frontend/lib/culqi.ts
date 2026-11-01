// Culqi en el navegador: Custom Checkout (token de tarjeta) y Culqi 3DS. Solo usa la llave PÚBLICA.
// Las funciones puras (mapeos, validaciones, configuración) no tocan el navegador: se prueban en culqi.test.ts.
import type { Autenticacion3DS, Facturacion } from './subscriptions';

const CHECKOUT_SRC = 'https://js.culqi.com/checkout-js';
const TRES_DS_SRC = 'https://3ds.culqi.com';

// Color primario de Facturo (berenjena, primary-600).
const COLOR_PRIMARIO = '#6B2C6E';

// Monto con el que se autentica 3DS al cambiar la tarjeta (S/ 3.00): no es un cobro.
export const MONTO_CAMBIO_TARJETA_CENTIMOS = 300;

// Solo letras y espacios (Culqi rechaza otra cosa en nombre y apellido del cliente).
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;

declare global {
  interface Window {
    CulqiCheckout?: new (publicKey: string, config: unknown) => CulqiInstancia;
    Culqi3DS?: {
      publicKey: string;
      settings: unknown;
      options?: unknown;
      generateDevice: () => Promise<string>;
      initAuthentication: (tokenId: string) => void;
      reset: () => void;
    };
  }
}

interface CulqiInstancia {
  open: () => void;
  close: () => void;
  culqi: () => void;
  token?: { id: string; email?: string };
  error?: { user_message?: string; merchant_message?: string };
}

// ---------- Funciones puras ----------

export type IntervaloCulqi = 'MONTH' | 'YEAR';

export function intervaloCulqi(intervalo: 'monthly' | 'yearly'): IntervaloCulqi {
  return intervalo === 'yearly' ? 'YEAR' : 'MONTH';
}

// Soles → céntimos (S/ 59.00 → 5900), redondeando para evitar errores de punto flotante.
export function montoCentimos(precio: number): number {
  return Math.round(precio * 100);
}

export type ErrorFacturacion = 'requerido' | 'soloLetras' | 'largo';

// Largos que acepta el backend (mismo esquema que /api/subscriptions/culqi/suscribir).
const LARGOS: Record<keyof Facturacion, [number, number]> = {
  nombre: [1, 50],
  apellido: [1, 50],
  telefono: [6, 20],
  direccion: [3, 100],
  ciudad: [2, 30],
};

export function validarFacturacion(f: Facturacion): Partial<Record<keyof Facturacion, ErrorFacturacion>> {
  const errores: Partial<Record<keyof Facturacion, ErrorFacturacion>> = {};
  (Object.keys(f) as (keyof Facturacion)[]).forEach((campo) => {
    const valor = (f[campo] ?? '').trim();
    if (!valor) errores[campo] = 'requerido';
    else if ((campo === 'nombre' || campo === 'apellido') && !SOLO_LETRAS.test(valor)) errores[campo] = 'soloLetras';
    else if (valor.length < LARGOS[campo][0] || valor.length > LARGOS[campo][1]) errores[campo] = 'largo';
  });
  return errores;
}

export type ResultadoMensaje3DS = { tipo: 'ok'; parametros: Autenticacion3DS } | { tipo: 'error'; mensaje: string } | null;

// Interpreta un mensaje `message` del navegador durante 3DS. Ignora lo que no viene de nuestro origen o no es de Culqi.
export function interpretarMensaje3DS(data: unknown, origen: string, origenEsperado: string): ResultadoMensaje3DS {
  if (origen !== origenEsperado) return null;
  const r = (data && typeof data === 'object' ? data : {}) as { parameters3DS?: Autenticacion3DS; error?: unknown };
  if (r.parameters3DS) return { tipo: 'ok', parametros: r.parameters3DS };
  if (r.error) return { tipo: 'error', mensaje: typeof r.error === 'string' ? r.error : 'No se pudo autenticar la tarjeta' };
  return null;
}

// Lee `contratar=<slug>&intervalo=MONTH|YEAR` (redirección del asistente de configuración inicial).
export function leerContratarDeUrl(params: URLSearchParams): { planSlug: string; intervalo: IntervaloCulqi } | null {
  const planSlug = params.get('contratar');
  if (!planSlug) return null;
  return { planSlug, intervalo: params.get('intervalo') === 'YEAR' ? 'YEAR' : 'MONTH' };
}

export function configCheckout(opciones: { titulo: string; email: string; nombre: string; apellido: string }) {
  return {
    settings: { title: opciones.titulo, currency: 'PEN' },
    client: { email: opciones.email, firstName: opciones.nombre, lastName: opciones.apellido },
    options: {
      lang: 'auto',
      installments: false,
      modal: true,
      paymentMethods: { tarjeta: true },
      paymentMethodsSort: ['tarjeta'],
    },
    appearance: { theme: 'default', menuType: 'sidebar', buttonCardPayText: 'Guardar tarjeta' },
  };
}

export function opciones3DS() {
  return {
    showModal: true,
    showLoading: true,
    showIcon: true,
    style: { btnColor: COLOR_PRIMARIO, btnTextColor: '#FFFFFF' },
  };
}

// ---------- Navegador ----------

export function llavePublica(): string {
  const llave = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
  if (!llave) throw new Error('Falta NEXT_PUBLIC_CULQI_PUBLIC_KEY');
  return llave;
}

function cargarScript(src: string): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolver();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolver();
    s.onerror = () => rechazar(new Error(`No se pudo cargar ${src}`));
    document.body.appendChild(s);
  });
}

// Abre el checkout y resuelve con el id del token (tkn_…). Rechaza si falla la tarjeta o si se cancela con `signal`
// (Culqi no avisa cuando el usuario cierra su ventana: por eso la pantalla puede abortar la espera).
export async function pedirTokenTarjeta(opciones: {
  titulo: string;
  email: string;
  nombre: string;
  apellido: string;
  signal?: AbortSignal;
}): Promise<string> {
  await cargarScript(CHECKOUT_SRC);
  if (!window.CulqiCheckout) throw new Error('Culqi no está disponible');
  const culqi = new window.CulqiCheckout(llavePublica(), configCheckout(opciones));
  return new Promise((resolver, rechazar) => {
    const { signal } = opciones;
    const alAbortar = () => {
      try {
        culqi.close();
      } catch {
        // la ventana ya estaba cerrada
      }
      rechazar(new DOMException('Cancelado', 'AbortError'));
    };
    if (signal?.aborted) return alAbortar();
    signal?.addEventListener('abort', alAbortar, { once: true });
    culqi.culqi = () => {
      signal?.removeEventListener('abort', alAbortar);
      if (culqi.token?.id) {
        const id = culqi.token.id;
        culqi.close();
        resolver(id);
      } else {
        rechazar(new Error(culqi.error?.user_message || 'No se pudo validar la tarjeta'));
      }
    };
    culqi.open();
  });
}

// Corre la autenticación 3DS para un token ya creado y resuelve con los parámetros para el backend.
export async function autenticar3DS(tokenId: string, opciones: { email: string; montoCentimos: number }): Promise<Autenticacion3DS> {
  await cargarScript(TRES_DS_SRC);
  const tds = window.Culqi3DS;
  if (!tds) throw new Error('Culqi 3DS no está disponible');
  tds.reset();
  tds.publicKey = llavePublica();
  tds.settings = {
    charge: { totalAmount: opciones.montoCentimos, returnUrl: window.location.href, currency: 'PEN' },
    card: { email: opciones.email },
  };
  tds.options = opciones3DS();
  await tds.generateDevice();
  return new Promise((resolver, rechazar) => {
    const escuchar = (event: MessageEvent) => {
      const r = interpretarMensaje3DS(event.data, event.origin, window.location.origin);
      if (!r) return;
      window.removeEventListener('message', escuchar);
      if (r.tipo === 'ok') resolver(r.parametros);
      else rechazar(new Error(r.mensaje));
    };
    window.addEventListener('message', escuchar, false);
    tds.initAuthentication(tokenId);
  });
}
