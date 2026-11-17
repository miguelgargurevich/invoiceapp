// Reglas puras del push en la web (sin React ni alias «@/»: se prueban con node --test).

/**
 * ¿Es una ruta de ESTA web? Empieza con «/», no con «//» (el navegador la toma por otro sitio), sin «\» (algunos navegadores lo leen
 * como «/») ni caracteres de control. Lo que empieza con «/» no puede tener esquema («https:»).
 * La misma regla vive en public/sw.js (el service worker) y en el backend (src/push/validacion.js).
 */
export function esRutaInterna(ruta: unknown): ruta is string {
  if (typeof ruta !== 'string' || ruta.length === 0 || ruta.length > 2000) return false;
  if (!ruta.startsWith('/') || ruta.startsWith('//')) return false;
  return !/[\\\u0000-\u001f\u007f]/.test(ruta);
}

/** La clave pública VAPID (base64url) como pide `pushManager.subscribe`. */
export function claveVapidABytes(base64Url: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}
