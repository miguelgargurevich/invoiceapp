'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { hexAHsv, hsvAHex, normalizarHex, type Hsv } from '@/lib/paleta';

interface Props {
  /** Color actual en #RRGGBB. */
  valor: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  /** Etiquetas accesibles del cuadro y de la barra de matiz. */
  etiquetaArea: string;
  etiquetaMatiz: string;
}

const PASO_TECLADO = 0.02;
const PASO_MATIZ = 3;

const limitar = (n: number) => Math.min(1, Math.max(0, n));

/** Selector visual: cuadro de saturación y brillo más una barra de matiz. Sin dependencias. */
export function SelectorColor({ valor, onChange, disabled, etiquetaArea, etiquetaMatiz }: Props) {
  // El HSV se guarda aparte para no perder el matiz cuando el color pasa por gris, negro o blanco.
  const [hsv, setHsv] = useState<Hsv>(() => hexAHsv(normalizarHex(valor)));
  const ultimoEmitido = useRef(normalizarHex(valor));
  const area = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);

  // Si el color cambia desde fuera (sugeridos, campo hex, restablecer), el selector lo sigue.
  useEffect(() => {
    const hex = normalizarHex(valor);
    if (hex !== ultimoEmitido.current) {
      ultimoEmitido.current = hex;
      setHsv(hexAHsv(hex));
    }
  }, [valor]);

  const emitir = (nuevo: Hsv) => {
    setHsv(nuevo);
    const hex = hsvAHex(nuevo);
    if (hex !== ultimoEmitido.current) {
      ultimoEmitido.current = hex;
      onChange(hex);
    }
  };

  const moverArea = (e: PointerEvent<HTMLDivElement>) => {
    const r = area.current?.getBoundingClientRect();
    if (!r) return;
    emitir({ h: hsv.h, s: limitar((e.clientX - r.left) / r.width), v: limitar(1 - (e.clientY - r.top) / r.height) });
  };

  const moverMatiz = (e: PointerEvent<HTMLDivElement>) => {
    const r = barra.current?.getBoundingClientRect();
    if (!r) return;
    emitir({ ...hsv, h: limitar((e.clientX - r.left) / r.width) * 359.99 });
  };

  const arrastrar = (mover: (e: PointerEvent<HTMLDivElement>) => void) => ({
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      mover(e);
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      if (!disabled && e.currentTarget.hasPointerCapture(e.pointerId)) mover(e);
    },
  });

  const teclasArea = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-PASO_TECLADO, 0],
      ArrowRight: [PASO_TECLADO, 0],
      ArrowUp: [0, PASO_TECLADO],
      ArrowDown: [0, -PASO_TECLADO],
    };
    const d = delta[e.key];
    if (!d || disabled) return;
    e.preventDefault();
    emitir({ h: hsv.h, s: limitar(hsv.s + d[0]), v: limitar(hsv.v + d[1]) });
  };

  const teclasMatiz = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -PASO_MATIZ : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? PASO_MATIZ : 0;
    if (!d || disabled) return;
    e.preventDefault();
    emitir({ ...hsv, h: (hsv.h + d + 360) % 360 });
  };

  const colorMatiz = hsvAHex({ h: hsv.h, s: 1, v: 1 });
  const colorActual = hsvAHex(hsv);
  const foco = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

  return (
    <div className={cn('w-full max-w-xs space-y-3 select-none', disabled ? 'cursor-not-allowed' : 'touch-none')}>
      <div
        ref={area}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={etiquetaArea}
        aria-valuetext={colorActual}
        aria-disabled={disabled}
        onKeyDown={teclasArea}
        {...arrastrar(moverArea)}
        style={{ backgroundColor: colorMatiz }}
        className={cn('relative h-40 w-full rounded-lg border border-gray-200 dark:border-gray-700', !disabled && 'cursor-crosshair', foco)}
      >
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black to-transparent" />
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: colorActual }}
        />
      </div>

      <div
        ref={barra}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={etiquetaMatiz}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        aria-disabled={disabled}
        onKeyDown={teclasMatiz}
        {...arrastrar(moverMatiz)}
        className={cn('relative h-3 w-full rounded-full', !disabled && 'cursor-pointer', foco)}
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: colorMatiz }}
        />
      </div>
    </div>
  );
}
