import { ReactNode } from 'react';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { URL_SITIO } from '@/lib/sitio';

// Metadatos por defecto en español (Facturo es para Perú). El inglés se define en app/[locale]/layout.tsx.
export const viewport: Viewport = {
  themeColor: '#6B2C6E',
};

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: {
    default: 'Facturo — Facturación electrónica SUNAT para emprendedores y pymes del Perú',
    template: '%s | Facturo'
  },
  description: 'Emite facturas y boletas electrónicas válidas ante SUNAT, con el IGV calculado y el CDR guardado. Plan gratis para empezar.',
  keywords: [
    'facturación electrónica',
    'facturación electrónica Perú',
    'factura electrónica SUNAT',
    'boleta electrónica',
    'nota de crédito electrónica',
    'comprobantes electrónicos',
    'emisor electrónico SUNAT',
    'IGV',
    'detracción',
    'emprendedores Perú',
    'pymes Perú',
    'facturador electrónico'
  ],
  applicationName: 'Facturo',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/marca/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/marca/apple-touch-icon.png',
  },
  authors: [{ name: 'Facturo Team' }],
  creator: 'Facturo',
  publisher: 'Facturo',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: URL_SITIO,
    title: 'Facturo — Facturación electrónica SUNAT para emprendedores y pymes del Perú',
    description: 'Emite facturas y boletas electrónicas válidas ante SUNAT, con el IGV calculado y el CDR guardado. Plan gratis para empezar.',
    siteName: 'Facturo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Facturo — Facturación electrónica SUNAT',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facturo — Facturación electrónica SUNAT',
    description: 'Emite comprobantes electrónicos válidos ante SUNAT y guarda el CDR. Plan gratis para empezar.',
    images: ['/og-image.png'],
    creator: '@invoiceapp',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  category: 'Business Software',
};

// <html> y <body> viven en app/[locale]/layout.tsx (lang="es").
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
