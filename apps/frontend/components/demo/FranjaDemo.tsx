'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown, LogOut, MessageCircle, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useModoDemo } from '@/lib/hooks/useModoDemo';
import { ENLACE_CREAR_CUENTA, enlaceWhatsapp, TEXTO_FRANJA_DEMO } from '@/lib/demo';
import { cn } from '@/lib/utils';

// Altura fija de la franja (h-10). El encabezado del panel la compensa con top-10.
export const ALTO_FRANJA_DEMO = 'h-10';

const estiloBoton =
  'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ' +
  'bg-white/80 text-primary-900 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ' +
  'dark:bg-primary-950/60 dark:text-primary-100 dark:hover:bg-primary-950';

/**
 * Franja fija de la demo. Solo aparece con MODO_DEMO (sin demo no renderiza nada).
 * En escritorio tiene sus tres botones; en el celular se compacta en una línea con un menú.
 */
export function FranjaDemo() {
  const { esDemo, estado } = useModoDemo();
  const { signOut } = useAuth();
  const locale = useLocale();
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (!esDemo || !estado) return null;

  const enlaceWa = enlaceWhatsapp(estado.whatsapp);

  // Cerrar sesión y recargar: evita que el panel de la app mande a login antes de llegar a /demo.
  const cambiarPerfil = async () => {
    await signOut();
    window.location.assign(`/${locale}/demo`);
  };

  const botones = (
    <>
      <button type="button" onClick={cambiarPerfil} className={estiloBoton}>
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        Cambiar de perfil
      </button>
      <a href={ENLACE_CREAR_CUENTA} target="_blank" rel="noopener noreferrer" className={estiloBoton}>
        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Crear mi cuenta
      </a>
      {enlaceWa && (
        <a href={enlaceWa} target="_blank" rel="noopener noreferrer" className={estiloBoton}>
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          WhatsApp
        </a>
      )}
    </>
  );

  return (
    <div
      role="region"
      aria-label="Demostración de Facturo"
      className={cn(
        'sticky top-0 z-40 border-b border-primary-200 bg-primary-100 text-primary-900',
        'dark:border-primary-800 dark:bg-primary-900/60 dark:text-primary-100',
        ALTO_FRANJA_DEMO,
      )}
    >
      <div className="flex h-full items-center gap-3 px-4 text-xs sm:text-sm">
        <p className="min-w-0 flex-1 truncate" title={TEXTO_FRANJA_DEMO}>
          {TEXTO_FRANJA_DEMO}
        </p>

        <div className="hidden items-center gap-2 md:flex">{botones}</div>

        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-expanded={menuAbierto}
            className={estiloBoton}
          >
            Menú
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', menuAbierto && 'rotate-180')} aria-hidden="true" />
          </button>
          {menuAbierto && (
            <div className="absolute right-0 top-full z-50 mt-1 flex w-56 flex-col gap-2 rounded-lg border border-primary-200 bg-white p-2 shadow-lg dark:border-primary-800 dark:bg-gray-900">
              {botones}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
