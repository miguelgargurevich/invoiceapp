'use client';

import type { ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { useDatosLegales } from '@/lib/hooks/useDatosLegales';
import { hayValor } from '@/lib/legal';

interface CorreoContactoProps {
  className?: string;
  children?: ReactNode;
}

// Enlace de contacto: el correo de contacto de la BD (Admin › Datos legales) si ya está cargado;
// si no, un enlace a la página de contacto para no mostrar un correo inventado.
export function CorreoContacto({ className, children }: CorreoContactoProps) {
  const locale = useLocale();
  const { datos } = useDatosLegales();
  const correo = hayValor(datos?.legalCorreo) ? datos.legalCorreo.trim() : '';

  if (correo) {
    return (
      <a href={`mailto:${correo}`} className={className}>
        {children ?? correo}
      </a>
    );
  }

  return (
    <a href={`/${locale}/contact`} className={className}>
      {children ?? 'Escríbenos desde la página de contacto'}
    </a>
  );
}
