'use client';

import { useModoDemo } from '@/lib/hooks/useModoDemo';
import { TEXTO_MARCA_DEMO } from '@/lib/demo';

/**
 * Marca de agua «DEMOSTRACIÓN» para las vistas previas que se imprimen o descargan (PDF del navegador).
 * Va como hijo del documento: se ve en la impresión y en la captura. Sin demo no renderiza nada.
 * El color es fijo (no depende del tema) para que salga igual en la captura.
 */
export function MarcaAguaDemo() {
  const { esDemo } = useModoDemo();
  if (!esDemo) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
      <span
        className="select-none whitespace-nowrap text-[72px] font-bold tracking-[0.2em]"
        style={{ color: 'rgba(107, 44, 110, 0.10)', transform: 'rotate(-30deg)' }}
      >
        {TEXTO_MARCA_DEMO}
      </span>
    </div>
  );
}
