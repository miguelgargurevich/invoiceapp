'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRight, Check, Circle, ListChecks, X } from 'lucide-react';
import {
  AVISO_PANEL_DEMO,
  alternarPasoHecho,
  hrefDemo,
  leerPasosHechos,
  pasosDemo,
  type PerfilEntrar,
} from '@/lib/demo';
import { cn } from '@/lib/utils';

interface PanelQueProbarProps {
  perfil: PerfilEntrar;
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
}

function almacenNavegador() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // sin almacenamiento (navegador privado o bloqueado): los pasos viven solo en la vista
  }
}

/**
 * Panel «Qué probar»: lateral derecho en escritorio, hoja de abajo en el celular.
 * Los pasos se tachan al tocarlos (se recuerdan en este navegador) y cada uno lleva a su pantalla.
 */
export function PanelQueProbar({ perfil, abierto, onAbrir, onCerrar }: PanelQueProbarProps) {
  const locale = useLocale();
  const pasos = pasosDemo(perfil);
  const [hechos, setHechos] = useState<string[]>([]);

  // Se lee después de montar: en el servidor no hay localStorage.
  useEffect(() => {
    setHechos(leerPasosHechos(almacenNavegador(), perfil));
  }, [perfil]);

  const alternar = (id: string) => {
    setHechos(alternarPasoHecho(almacenNavegador(), perfil, id));
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={onAbrir}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:bottom-6 md:right-6"
      >
        <ListChecks className="h-4 w-4" aria-hidden="true" />
        Qué probar
        <span className="tabular-nums text-primary-200">{hechos.length}/{pasos.length}</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Qué probar"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl',
        'dark:border-gray-800 dark:bg-gray-900',
        'md:inset-x-auto md:right-0 md:top-10 md:bottom-0 md:max-h-none md:w-80 md:rounded-none md:border-l md:border-t-0 md:shadow-none',
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Qué probar</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {hechos.length} de {pasos.length} hechos
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar Qué probar"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <ol className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {pasos.map((paso, indice) => {
          const hecho = hechos.includes(paso.id);
          return (
            <li key={paso.id} className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <button
                type="button"
                onClick={() => alternar(paso.id)}
                aria-pressed={hecho}
                className="flex min-w-0 flex-1 items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    hecho
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-300 text-transparent dark:border-gray-600',
                  )}
                  aria-hidden="true"
                >
                  {hecho ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                </span>
                <span className={cn('text-sm', hecho ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-200')}>
                  <span className="text-gray-400 tabular-nums">{indice + 1}. </span>
                  {paso.texto}
                </span>
              </button>
              <Link
                href={hrefDemo(locale, paso.ruta)}
                aria-label={`Ir a: ${paso.texto}`}
                className="mt-0.5 shrink-0 rounded p-1 text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        {AVISO_PANEL_DEMO}
      </p>
    </aside>
  );
}
