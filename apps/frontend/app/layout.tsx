import { ReactNode } from 'react';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://invoiceapp.vercel.app'),
  title: {
    default: 'InvoiceApp - Professional Invoice & Proposal Management System',
    template: '%s | InvoiceApp'
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
  authors: [{ name: 'InvoiceApp Team' }],
  creator: 'InvoiceApp',
  publisher: 'InvoiceApp',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['es_ES'],
    url: 'https://invoiceapp.vercel.app',
    title: 'InvoiceApp - Professional Invoice & Proposal Management System',
    description: 'Comprehensive invoice and proposal management system for contractors and businesses. Create professional invoices, track payments, manage clients, and streamline your billing process.',
    siteName: 'InvoiceApp',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'InvoiceApp - Professional Invoicing Solution',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InvoiceApp - Professional Invoice & Proposal Management',
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
        <link rel="canonical" href="https://invoiceapp.vercel.app" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'InvoiceApp',
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
              screenshot: 'https://invoiceapp.vercel.app/screenshot.png',
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
