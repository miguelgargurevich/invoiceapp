'use client';

import { useEffect, useState } from 'react';
import { cargarDatosLegales, type DatosLegales } from '@/lib/legal';

// Una sola petición por carga de página: el pie, los Términos y el enlace de contacto comparten el resultado.
// Si la API falla no se guarda el fallo, así la siguiente página vuelve a intentarlo.
let enCurso: Promise<DatosLegales | null> | null = null;
let ultimo: DatosLegales | null = null;

function leer(): Promise<DatosLegales | null> {
  if (ultimo) return Promise.resolve(ultimo);
  if (!enCurso) {
    enCurso = cargarDatosLegales().then((datos) => {
      ultimo = datos;
      enCurso = null;
      return datos;
    });
  }
  return enCurso;
}

/** Datos legales del servicio. `datos` es null mientras carga o si la API falla; `cargando` distingue ambos casos. */
export function useDatosLegales(): { datos: DatosLegales | null; cargando: boolean } {
  const [datos, setDatos] = useState<DatosLegales | null>(ultimo);
  const [cargando, setCargando] = useState(ultimo === null);

  useEffect(() => {
    let vivo = true;
    leer().then((d) => {
      if (!vivo) return;
      setDatos(d);
      setCargando(false);
    });
    return () => { vivo = false; };
  }, []);

  return { datos, cargando };
}
