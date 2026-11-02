'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, LayoutDashboard, RotateCcw } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { variablesDeEscala } from '@/components/global/TemaMarca';
import { cn } from '@/lib/utils';
import {
  PASOS,
  ajustarParaTextoBlanco,
  escalaParaMarca,
  esHexValido,
  necesitaAjuste,
  normalizarHex,
} from '@/lib/paleta';

/** Berenjena de Facturo: es el color por defecto cuando la empresa no elige otro (colorPrimario null). */
export const COLOR_PREDETERMINADO = '#6B2C6E';

// Las claves van en messages/es.json (settings.marca.colores). «predeterminado» guarda null.
const SUGERIDOS = [
  { clave: 'predeterminado', hex: COLOR_PREDETERMINADO },
  { clave: 'azul', hex: '#1E40AF' },
  { clave: 'rojo', hex: '#B91C1C' },
  { clave: 'verde', hex: '#15803D' },
  { clave: 'naranja', hex: '#C2410C' },
  { clave: 'turquesa', hex: '#0F766E' },
  { clave: 'grafito', hex: '#374151' },
  { clave: 'dorado', hex: '#A16207' },
] as const;

interface Props {
  /** Color elegido: '#RRGGBB' o null (predeterminado). */
  valor: string | null;
  onChange: (valor: string | null) => void;
  /** true si el plan incluye colores de marca (hasCustomBranding). */
  puedeCambiar: boolean;
  /** true mientras se carga la suscripción: no se muestra el aviso de plan todavía. */
  cargando: boolean;
  locale: string;
  /** Mensaje de error del último guardado (p. ej. el 403 del backend). */
  error?: string | null;
}

/** Bloque «Color de tu marca» de Configuración › Empresa. Solo elige; guardar lo hace la página. */
export function ColorMarca({ valor, onChange, puedeCambiar, cargando, locale, error }: Props) {
  const t = useTranslations('settings.marca');
  const efectivo = normalizarHex(valor ?? COLOR_PREDETERMINADO);
  const [texto, setTexto] = useState(efectivo);
  const [textoInvalido, setTextoInvalido] = useState(false);

  // Si el color cambia desde fuera (guardado, restablecer, selector), el campo de texto lo sigue.
  useEffect(() => {
    setTexto(efectivo);
    setTextoInvalido(false);
  }, [efectivo]);

  const bloqueado = !puedeCambiar;
  const escala = escalaParaMarca(efectivo);
  const ajustado = necesitaAjuste(efectivo);

  const alEscribirHex = (entrada: string) => {
    setTexto(entrada);
    if (esHexValido(entrada)) {
      setTextoInvalido(false);
      onChange(normalizarHex(entrada));
    } else {
      setTextoInvalido(true);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
          <div className="w-1 h-5 bg-primary-500 rounded-full"></div>
          {t('titulo')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('descripcion')}</p>
      </div>

      {!cargando && bloqueado && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">{t('bloqueadoTitulo')}</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">{t('bloqueadoDescripcion')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" href={`/${locale}/configuracion?tab=suscripcion`}>
            {t('verPlanes')}
          </Button>
        </div>
      )}

      <fieldset disabled={bloqueado || cargando} className="min-w-0 space-y-4 disabled:opacity-60">
        <legend className="sr-only">{t('titulo')}</legend>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sugeridos')}</p>
          <div className="flex flex-wrap gap-3">
            {SUGERIDOS.map(({ clave, hex }) => {
              const nombre = t(`colores.${clave}`);
              const seleccionado = efectivo === hex;
              return (
                <button
                  key={clave}
                  type="button"
                  title={nombre}
                  aria-label={nombre}
                  aria-pressed={seleccionado}
                  onClick={() => onChange(clave === 'predeterminado' ? null : hex)}
                  style={{ backgroundColor: hex }}
                  className={cn(
                    'h-9 w-9 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-gray-900',
                    seleccionado && 'ring-2 ring-gray-900 ring-offset-2 ring-offset-white dark:ring-gray-100 dark:ring-offset-gray-900'
                  )}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="color-marca-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('otroColor')}
            </label>
            <input
              id="color-marca-selector"
              type="color"
              value={efectivo.toLowerCase()}
              onChange={(e) => onChange(normalizarHex(e.target.value))}
              className="h-10 w-16 cursor-pointer rounded-md border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
          <div className="w-full max-w-xs">
            <Input
              label={t('codigoHex')}
              value={texto}
              onChange={(e) => alEscribirHex(e.target.value)}
              error={textoInvalido ? t('codigoInvalido') : undefined}
              maxLength={7}
              autoComplete="off"
              spellCheck={false}
              className="focus:ring-primary-500"
            />
          </div>
        </div>

        <div
          style={variablesDeEscala(escala) as CSSProperties}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('vistaPrevia')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              tabIndex={-1}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              {t('botonEjemplo')}
            </button>
            <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <LayoutDashboard className="h-4 w-4" />
              {t('menuEjemplo')}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">{t('escala')}</p>
            <div className="flex h-6 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
              {PASOS.map((paso) => (
                <div key={paso} className="flex-1" style={{ backgroundColor: `rgb(${escala[paso]})` }} title={String(paso)} />
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {ajustado && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t('ajustado')} ({ajustarParaTextoBlanco(efectivo)})
        </p>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
          disabled={valor === null || cargando}
          icon={<RotateCcw className="h-4 w-4" />}
        >
          {t('restablecer')}
        </Button>
      </div>
    </div>
  );
}
