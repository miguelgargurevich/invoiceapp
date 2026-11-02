import { Metadata } from 'next';

// Metadatos de la página de acceso (en español). Esta ruta es un componente cliente: el archivo se conserva como referencia.
export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Inicia sesión en Facturo para gestionar tus comprobantes, proformas, clientes y pagos. Acceso seguro a tu sistema de facturación.',
  openGraph: {
    title: 'Iniciar sesión en Facturo',
    description: 'Accede a tu sistema de facturación electrónica y proformas.',
  },
  robots: {
    index: false,
    follow: true,
  },
};
