import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/contexts/AuthContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { URL_SITIO } from '@/lib/sitio';
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Metadatos por defecto (título, descripción, Open Graph) en español: viven en app/layout.tsx.

// Datos estructurados (JSON-LD) en español.
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

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  // lang fijo en español: la app solo existe en ese idioma.
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="canonical" href={URL_SITIO} />
      </head>
      <body className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD_ES) }}
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
      </body>
    </html>
  );
}
