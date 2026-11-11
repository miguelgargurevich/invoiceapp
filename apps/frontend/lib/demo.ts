// Modo demo de Facturo (contrato: docs/superpowers/specs/2026-11-11-demo-facturo-design.md, anexo).
//
// Lógica pura: sin React ni navegador, salvo el almacenamiento que se pasa por parámetro.
// Se prueba con node --test (demo.test.ts). El hook que la usa está en lib/hooks/useModoDemo.ts.

export type PerfilEntrar = 'emprendedor' | 'servicios';
export type PerfilDemo = PerfilEntrar | 'cliente';

export const CODIGO_BLOQUEADO = 'DEMO_BLOQUEADO';
export const CODIGO_LIMITE = 'DEMO_LIMITE';
/** Evento de la ventana que lanza el cliente de API cuando el candado de la demo responde. */
export const EVENTO_BLOQUEO_DEMO = 'facturo:demo-bloqueo';

export const ENLACE_CREAR_CUENTA = 'https://facturo.gargurevich.dev/es/register';
export const TEXTO_NO_DISPONIBLE_DEMO = 'No disponible en la demo';
export const TEXTO_MARCA_DEMO = 'DEMOSTRACIÓN';
export const TEXTO_FRANJA_DEMO = 'Estás en la demo de Facturo. Los datos son de ejemplo y se borran cada noche.';
export const AVISO_PANEL_DEMO = 'Otras personas pueden estar probando con estos mismos datos.';

export interface PerfilEstado {
  id: PerfilDemo;
  nombre: string;
  descripcion: string;
  enlaceFirma?: string | null;
}

export interface EstadoDemo {
  activa: true;
  whatsapp: string | null;
  limiteDiario: number;
  perfiles: PerfilEstado[];
}

export interface BloqueoDemo {
  codigo: typeof CODIGO_BLOQUEADO | typeof CODIGO_LIMITE;
  mensaje: string;
}

export interface PasoDemo {
  id: string;
  texto: string;
  /** Ruta sin idioma (`/dashboard`) o ya con él (`/es/sign/<token>`). Usar hrefDemo para el enlace. */
  ruta: string;
}

export interface AlmacenLocal {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

/** Valida la respuesta de GET /api/demo/estado. Devuelve null si no es el estado de la demo. */
export function interpretarEstado(cuerpo: unknown): EstadoDemo | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const c = cuerpo as Record<string, unknown>;
  if (c.activa !== true || !Array.isArray(c.perfiles)) return null;
  return {
    activa: true,
    whatsapp: typeof c.whatsapp === 'string' && c.whatsapp.trim() ? c.whatsapp : null,
    limiteDiario: typeof c.limiteDiario === 'number' ? c.limiteDiario : 30,
    perfiles: c.perfiles as PerfilEstado[],
  };
}

/**
 * Envuelve la petición de GET /api/demo/estado para que se haga UNA sola vez por carga de página.
 * Un fallo (404 o red) cuenta como «no es demo» y se guarda como null.
 */
export function crearCargaEstado(pedir: () => Promise<unknown>): () => Promise<EstadoDemo | null> {
  let enCurso: Promise<EstadoDemo | null> | null = null;
  return () => {
    if (!enCurso) {
      enCurso = Promise.resolve()
        .then(pedir)
        .then(interpretarEstado)
        .catch(() => null);
    }
    return enCurso;
  };
}

export function esDemo(estado: EstadoDemo | null): boolean {
  return estado !== null && estado.activa === true;
}

/** Lee el cuerpo de un error de la API y devuelve el bloqueo de la demo, si lo es. */
export function detectarBloqueoDemo(cuerpo: unknown): BloqueoDemo | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const c = cuerpo as Record<string, unknown>;
  if (c.codigo !== CODIGO_BLOQUEADO && c.codigo !== CODIGO_LIMITE) return null;
  const mensajeDelServidor = typeof c.error === 'string' && c.error.trim() ? c.error : null;
  if (c.codigo === CODIGO_LIMITE) {
    return { codigo: CODIGO_LIMITE, mensaje: mensajeDelServidor ?? 'Llegaste al límite de comprobantes de la demo por hoy.' };
  }
  return { codigo: CODIGO_BLOQUEADO, mensaje: mensajeDelServidor ?? 'Esta función no está disponible en la demo.' };
}

/** Mensaje de la pantalla /demo cuando no se puede entrar. */
export function mensajeEntrarDemo(estado: number): string {
  if (estado === 503) return 'La demo no está disponible en este momento. Vuelve a intentarlo en unos minutos.';
  if (estado === 429) return 'Hiciste demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  return 'No pudimos abrir la demo. Inténtalo de nuevo.';
}

/** Idioma delante de la ruta, una sola vez. */
export function hrefDemo(locale: string, ruta: string): string {
  if (ruta === `/${locale}` || ruta.startsWith(`/${locale}/`)) return ruta;
  return `/${locale}${ruta}`;
}

const PASOS: Record<PerfilEntrar, PasoDemo[]> = {
  emprendedor: [
    { id: 'ventas', texto: 'Mira tus ventas del mes en el dashboard.', ruta: '/dashboard' },
    { id: 'boleta', texto: 'Emite una boleta a un cliente con DNI.', ruta: '/comprobantes/nuevo' },
    { id: 'pdf-boleta', texto: 'Abre la boleta y descarga su PDF.', ruta: '/comprobantes' },
    { id: 'anular', texto: 'Anula una boleta con una nota de crédito.', ruta: '/comprobantes' },
    { id: 'producto', texto: 'Agrega un producto nuevo.', ruta: '/productos/nuevo' },
    { id: 'celular', texto: 'Instala Facturo en tu celular.', ruta: '/landing#instalar' },
  ],
  servicios: [
    { id: 'rechazada', texto: 'Revisa la factura rechazada y su motivo.', ruta: '/comprobantes' },
    { id: 'detraccion', texto: 'Emite una factura con detracción.', ruta: '/comprobantes/nuevo' },
    { id: 'proforma', texto: 'Crea una proforma y envíale el enlace de firma a tu cliente.', ruta: '/proformas/nueva' },
    { id: 'convertir', texto: 'Convierte una proforma aceptada en factura.', ruta: '/proformas' },
    { id: 'marca', texto: 'Cambia el color de tu marca y mira el PDF.', ruta: '/configuracion?tab=apariencia' },
    { id: 'xml-cdr', texto: 'Descarga el XML y el CDR de SUNAT.', ruta: '/comprobantes' },
  ],
};

/** Pasos de «Qué probar». El perfil cliente usa el enlace de firma que da el estado (null = sin pasos con enlace). */
export function pasosDemo(perfil: PerfilDemo, enlaceFirma?: string | null): PasoDemo[] {
  if (perfil !== 'cliente') return PASOS[perfil];
  const destino = enlaceFirma ?? '/demo';
  return [
    { id: 'revisar', texto: 'Revisa la proforma.', ruta: destino },
    { id: 'firmar', texto: 'Fírmala con el dedo o el mouse.', ruta: destino },
    { id: 'aceptada', texto: 'Mira cómo queda «Aceptada» del lado de la empresa.', ruta: '/demo' },
  ];
}

/** Perfil de la cuenta de demo según su correo; null si no es una cuenta de demo. */
export function perfilDeCuenta(email: string | null | undefined): PerfilEntrar | null {
  if (!email) return null;
  const correo = email.trim().toLowerCase();
  if (correo === 'emprendedor@demo.facturo.example') return 'emprendedor';
  if (correo === 'servicios@demo.facturo.example') return 'servicios';
  return null;
}

// Pasos hechos: se guardan por perfil en el navegador. Si el almacenamiento falla, no hay pasos hechos.
function claveDePasos(perfil: PerfilDemo): string {
  return `facturo-demo-pasos:${perfil}`;
}

export function leerPasosHechos(almacen: AlmacenLocal | null | undefined, perfil: PerfilDemo): string[] {
  if (!almacen) return [];
  try {
    const crudo = almacen.getItem(claveDePasos(perfil));
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Marca o desmarca un paso y devuelve la lista nueva. */
export function alternarPasoHecho(almacen: AlmacenLocal | null | undefined, perfil: PerfilDemo, id: string): string[] {
  const actuales = leerPasosHechos(almacen, perfil);
  const nuevos = actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id];
  try {
    almacen?.setItem(claveDePasos(perfil), JSON.stringify(nuevos));
  } catch {
    // Sin almacenamiento: los pasos se marcan solo mientras dure la vista.
  }
  return nuevos;
}

/** Celular para WhatsApp: se acepta con o sin +51; solo sale si hay número. */
export function enlaceWhatsapp(numero: string | null | undefined): string | null {
  const digitos = (numero ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  const internacional = digitos.length === 9 && digitos.startsWith('9') ? `51${digitos}` : digitos;
  return `https://wa.me/${internacional}`;
}

/** Valida el WhatsApp de la demo (admin). Vacío es válido: no se muestra. Devuelve el error o null. */
export function validarWhatsappDemo(valor: string): string | null {
  const limpio = valor.replace(/[\s-]/g, '');
  if (!limpio) return null;
  if (/^(\+?51)?9\d{8}$/.test(limpio)) return null;
  return 'Escribe un celular peruano de 9 dígitos que empiece con 9, o déjalo vacío.';
}
