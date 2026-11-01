import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/contexts/AuthContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { URL_SITIO } from '@/lib/sitio';

const locales = ['es', 'en'];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Metadatos en inglés: solo para /en. En español valen los de app/layout.tsx.
export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  if (locale !== 'en') return {};

  return {
    // `absolute`: sin el sufijo «| Facturo», igual que antes de este cambio (la plantilla sigue en app/layout.tsx).
    title: {
      absolute: 'Facturo - Professional Invoice & Proposal Management System'
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
    openGraph: {
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['es_PE'],
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
  };
}

// Datos estructurados (JSON-LD) por idioma.
const JSONLD_ES = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Facturo',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'PEN'
  },
  operatingSystem: 'Web',
  description: 'Sistema de facturación electrónica para emprendedores y pymes del Perú. Emite facturas, boletas, notas de crédito y débito válidas ante SUNAT, con el IGV calculado y el CDR guardado.',
  features: [
    'Facturas y boletas electrónicas',
    'Notas de crédito y débito',
    'Envío a SUNAT con firma digital',
    'Cálculo de IGV, detracción y percepción',
    'Clientes con RUC o DNI',
    'Anulación por comunicación de baja y resumen diario',
    'Proformas',
    'Reportes de ventas',
    'Avisos de rechazo de SUNAT',
    'Certificado y clave SOL cifrados'
  ],
  screenshot: `${URL_SITIO}/screenshot.png`,
};

const JSONLD_EN = {
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
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const jsonLd = locale === 'en' ? JSONLD_EN : JSONLD_ES;

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AuthProvider>
        <PreferencesProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
