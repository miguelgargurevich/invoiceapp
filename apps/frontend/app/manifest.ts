import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Facturo',
    short_name: 'Facturo',
    description: 'Facturo: facturación electrónica SUNAT para emprendedores y pymes del Perú',
    // Quien instala ya tiene cuenta: el dashboard lo deja entrar, y sin sesión lo manda a login.
    // Así la app abre directo en el panel, sin pasar por la portada de marketing.
    start_url: '/es/dashboard',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#6B2C6E',
    icons: [
      { src: '/marca/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/marca/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Versión con margen de seguridad para máscaras de Android (círculo, cuadrado redondeado).
      { src: '/marca/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/marca/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    categories: ['business', 'finance', 'productivity'],
    lang: 'es',
    dir: 'ltr',
  };
}
