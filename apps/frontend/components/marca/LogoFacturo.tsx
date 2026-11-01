'use client';

import { cn } from '@/lib/utils';

interface IconoProps {
  tamano?: number;
  className?: string;
}

export function IconoFacturo({ tamano = 32, className }: IconoProps) {
  return (
    <svg viewBox="0 0 128 128" width={tamano} height={tamano} className={className} role="img" aria-label="Facturo">
      <path d="M19 11a8 8 0 0 1 8-8H101a8 8 0 0 1 8 8V115L100 124L91 115L82 124L73 115L64 124L55 115L46 124L37 115L28 124L19 115Z" fill="#0F6E56" />
      <rect x="40" y="25" width="12" height="58" rx="3" fill="#FFFFFF" />
      <rect x="40" y="25" width="44" height="12" rx="3" fill="#FFFFFF" />
      <rect x="40" y="49" width="31" height="12" rx="3" fill="#FFFFFF" />
      <circle cx="84" cy="86" r="11" fill="#5DCAA5" />
      <rect x="82" y="80" width="4" height="12" rx="2" fill="#0F6E56" />
    </svg>
  );
}

interface LogoProps extends IconoProps {
  variante?: 'icono' | 'completo';
  oscuro?: boolean;
}

// «factur» + «o» en verde, en la fuente de la app (Geist). `oscuro` fuerza los colores para fondos oscuros.
export function LogoFacturo({ variante = 'completo', tamano = 32, oscuro = false, className }: LogoProps) {
  if (variante === 'icono') return <IconoFacturo tamano={tamano} className={className} />;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <IconoFacturo tamano={tamano} />
      <span
        className={cn('font-medium tracking-tight leading-none', oscuro ? 'text-[#F1EFE8]' : 'text-[#2C2C2A] dark:text-[#F1EFE8]')}
        style={{ fontSize: Math.round(tamano * 0.75) }}
      >
        factur<span className={oscuro ? 'text-[#5DCAA5]' : 'text-[#1D9E75] dark:text-[#5DCAA5]'}>o</span>
      </span>
    </span>
  );
}
