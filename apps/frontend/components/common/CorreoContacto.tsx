'use client';

import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { CORREO_CONTACTO } from '@/lib/sitio';

interface CorreoContactoProps {
  className?: string;
  children?: ReactNode;
}

// Enlace de contacto: el correo si ya está configurado (NEXT_PUBLIC_CORREO_CONTACTO);
// si no, un enlace a la página de contacto para no mostrar un correo inventado.
export function CorreoContacto({ className, children }: CorreoContactoProps) {
  const locale = useLocale();

  if (CORREO_CONTACTO) {
    return (
      <a href={`mailto:${CORREO_CONTACTO}`} className={className}>
        {children ?? CORREO_CONTACTO}
      </a>
    );
  }

  return (
    <a href={`/${locale}/contact`} className={className}>
      {children ?? 'Escríbenos desde la página de contacto'}
    </a>
  );
}
