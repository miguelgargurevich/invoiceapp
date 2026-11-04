// Datos legales del servicio (quién presta el servicio). Lógica pura, sin React ni next-intl (se prueba con node --test).
// Los datos viven en la BD (GET /api/sitio/legal, pública) y se editan en Admin › Datos legales.

export interface DatosLegales {
  legalMarca: string | null;
  legalRazonSocial: string | null;
  legalRuc: string | null;
  legalDomicilio: string | null;
  legalCorreo: string | null;
}

// Lo que se muestra cuando un dato todavía no está cargado. No se inventa nada.
export const POR_CONFIRMAR = 'por confirmar';

// Texto de un dato legal: el valor recortado, o «por confirmar» si está vacío.
export function valorOPorConfirmar(valor: string | null | undefined): string {
  const limpio = typeof valor === 'string' ? valor.trim() : '';
  return limpio === '' ? POR_CONFIRMAR : limpio;
}

export function hayValor(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && valor.trim() !== '';
}

// Línea del pie: «Facturo · por Ing. Miguel F. Gargurevich · RUC 10409241862».
// Devuelve null si no hay datos (la API falló o aún no cargó) o no hay ni marca ni RUC: entonces no se muestra la línea.
export function lineaPie(datos: DatosLegales | null | undefined): string | null {
  if (!datos) return null;
  const partes = ['Facturo'];
  if (hayValor(datos.legalMarca)) partes.push(`por ${datos.legalMarca.trim()}`);
  if (hayValor(datos.legalRuc)) partes.push(`RUC ${datos.legalRuc.trim()}`);
  return partes.length > 1 ? partes.join(' · ') : null;
}

// Un cuerpo válido de la API trae los cinco campos (texto o null). Cualquier otra cosa se descarta.
export function datosLegalesDesdeRespuesta(cuerpo: unknown): DatosLegales | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const c = cuerpo as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    legalMarca: texto(c.legalMarca),
    legalRazonSocial: texto(c.legalRazonSocial),
    legalRuc: texto(c.legalRuc),
    legalDomicilio: texto(c.legalDomicilio),
    legalCorreo: texto(c.legalCorreo),
  };
}

// Lee los datos de la API pública con fetch directo (como los planes del landing, sin sesión).
// Nunca lanza: si falla devuelve null y la página sigue funcionando.
export async function cargarDatosLegales(): Promise<DatosLegales | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    const respuesta = await fetch(`${apiUrl}/sitio/legal`);
    if (!respuesta.ok) return null;
    return datosLegalesDesdeRespuesta(await respuesta.json());
  } catch {
    return null;
  }
}
