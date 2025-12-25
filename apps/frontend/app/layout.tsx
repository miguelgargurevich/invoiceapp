import { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'InvoiceApp - Sistema de Facturación',
  description: 'Sistema de facturación electrónica',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
