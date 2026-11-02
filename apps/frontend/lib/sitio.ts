// URL pública del sitio: metadatos, sitemap y datos estructurados (SEO).
// En producción define NEXT_PUBLIC_SITE_URL con el dominio final (sin barra al final).
export const URL_SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

// Correo público de contacto. Vacío = todavía no hay correo: la UI enlaza a la página de contacto.
// Se incrusta al compilar (NEXT_PUBLIC_*): en Coolify va como variable del build del frontend.
export const CORREO_CONTACTO = process.env.NEXT_PUBLIC_CORREO_CONTACTO || '';
