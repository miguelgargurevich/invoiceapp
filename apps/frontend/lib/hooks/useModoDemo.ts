'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { crearCargaEstado, esDemo as esEstadoDemo, type EstadoDemo } from '@/lib/demo';

// Una sola petición a GET /api/demo/estado por carga de página: todos los componentes comparten el resultado.
// Un 404 (no es demo) o un error de red cuentan como «no es demo»; no se hace nada en el servidor.
const cargarEstado = crearCargaEstado(() => apiClient.get<unknown>('/demo/estado'));

export function useModoDemo(): { estado: EstadoDemo | null; esDemo: boolean; cargando: boolean } {
  const [estado, setEstado] = useState<EstadoDemo | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    cargarEstado().then((e) => {
      if (!vivo) return;
      setEstado(e);
      setCargando(false);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return { estado, esDemo: esEstadoDemo(estado), cargando };
}
