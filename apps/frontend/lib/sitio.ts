// URL pública del sitio: metadatos, sitemap y datos estructurados (SEO).
// En producción define NEXT_PUBLIC_SITE_URL con el dominio final (sin barra al final).
export const URL_SITIO = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
