import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

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
      // Archivos del backend en local (STORAGE_PROVIDER=local, sirve /uploads en el puerto 4000)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
