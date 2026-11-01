import { ReactNode } from 'react';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { URL_SITIO } from '@/lib/sitio';

export const viewport: Viewport = {
  themeColor: '#6B2C6E',
};

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: {
    default: 'Facturo - Professional Invoice & Proposal Management System',
    template: '%s | Facturo'
  },
  description: 'Comprehensive invoice and proposal management system for contractors and businesses. Create professional invoices, track payments, manage clients, and streamline your billing process.',
  keywords: [
    'invoice software',
    'proposal management',
    'billing system',
    'contractor invoicing',
    'payment tracking',
    'client management',
    'business invoicing',
    'electronic billing',
    'invoice generator',
    'proposal creator',
    'work order management',
    'payment terms',
    'job tracking',
    'construction invoicing',
    'professional billing'
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
    locale: 'en_US',
    alternateLocale: ['es_ES'],
    url: URL_SITIO,
    title: 'Facturo - Professional Invoice & Proposal Management System',
    description: 'Comprehensive invoice and proposal management system for contractors and businesses. Create professional invoices, track payments, manage clients, and streamline your billing process.',
    siteName: 'Facturo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Facturo - Professional Invoicing Solution',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Facturo - Professional Invoice & Proposal Management',
    description: 'Create professional invoices, track payments, and manage your business billing efficiently.',
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

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="canonical" href={URL_SITIO} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Facturo',
              applicationCategory: 'BusinessApplication',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
              },
              operatingSystem: 'Web',
              description: 'Professional invoice and proposal management system for contractors and businesses. Features include invoice creation, payment tracking, client management, work order tracking, and comprehensive reporting.',
              features: [
                'Invoice Creation and Management',
                'Proposal Generation',
                'Payment Tracking',
                'Client Management',
                'Work Order Management',
                'Job Photo Documentation',
                'Digital Signatures',
                'Multi-language Support',
                'Customizable Templates',
                'Financial Reporting'
              ],
              screenshot: `${URL_SITIO}/screenshot.png`,
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '150'
              }
            })
          }}
        />
      </head>
      <body className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
