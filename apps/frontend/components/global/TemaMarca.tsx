'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PASOS, esHexValido, escalaParaMarca, type Escala } from '@/lib/paleta';

// En el navegador, useLayoutEffect aplica el color antes de pintar (sin parpadeo del berenjena).
const useEfectoSincrono = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Variables --primary-50…900 de una escala, para un style={} (vista previa). */
export function variablesDeEscala(escala: Escala): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const paso of PASOS) {
    variables[`--primary-${paso}`] = escala[paso];
  }
  return variables;
}

/**
 * Pone el color de la empresa en las variables --primary-* de la raíz mientras el panel está montado.
 * Sin color propio no hace nada: quedan las de globals.css (berenjena de Facturo).
 * Al desmontar (salir del panel) quita las variables.
 */
export function TemaMarca() {
  const { empresa } = useAuth();
  const color = empresa?.colorPrimario ?? null;

  useEfectoSincrono(() => {
    if (!color || !esHexValido(color)) return;
    const raiz = document.documentElement;
    const variables = variablesDeEscala(escalaParaMarca(color));
    for (const [nombre, valor] of Object.entries(variables)) {
      raiz.style.setProperty(nombre, valor);
    }
    return () => {
      for (const nombre of Object.keys(variables)) {
        raiz.style.removeProperty(nombre);
      }
    };
  }, [color]);

  return null;
}
