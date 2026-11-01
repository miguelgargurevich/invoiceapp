export interface ErrorNormalizado {
  mensaje: string;
  errores: string[];
  accion: string | null;
  status: number | null;
}

// Lee un ApiError (lib/api.ts) sin importarlo: basta con que tenga status y body.
export function normalizarError(error: unknown, mensajeNoDisponible: string): ErrorNormalizado {
  const e = error as { message?: string; status?: number; body?: { error?: string; errores?: unknown; accion?: string } } | null;
  const status = typeof e?.status === 'number' ? e.status : null;
  if (status === 503) return { mensaje: mensajeNoDisponible, errores: [], accion: null, status };
  const lista = e?.body?.errores;
  const errores = Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [];
  return {
    mensaje: e?.body?.error || e?.message || 'Error',
    errores,
    accion: typeof e?.body?.accion === 'string' ? e.body.accion : null,
    status,
  };
}
