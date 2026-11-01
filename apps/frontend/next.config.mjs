import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

// El almacenamiento local del backend sirve /uploads en la misma URL que la API.
const api = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during production builds
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Archivos del backend (STORAGE_PROVIDER=local): mismo host y puerto que NEXT_PUBLIC_API_URL
      {
        protocol: api.protocol.replace(':', ''),
        hostname: api.hostname,
        port: api.port,
        pathname: '/uploads/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
