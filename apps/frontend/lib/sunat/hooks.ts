'use client';

import { useCallback, useEffect, useState } from 'react';
import { sunatApi } from './api';
import type { CatalogosSunat, EmisorVista } from './tipos';

let catalogosEnMemoria: CatalogosSunat | null = null;

export function useCatalogosSunat(): CatalogosSunat | null {
  const [catalogos, setCatalogos] = useState<CatalogosSunat | null>(catalogosEnMemoria);
  useEffect(() => {
    if (catalogosEnMemoria) return undefined;
    let vigente = true;
    sunatApi.catalogos()
      .then((r) => { catalogosEnMemoria = r; if (vigente) setCatalogos(r); })
      .catch(() => {});
    return () => { vigente = false; };
  }, []);
  return catalogos;
}

export function useEmisorSunat(): { emisor: EmisorVista | null; recargar: () => Promise<void> } {
  const [emisor, setEmisor] = useState<EmisorVista | null>(null);
  const recargar = useCallback(async () => {
    try {
      setEmisor(await sunatApi.emisor());
    } catch {
      setEmisor(null);
    }
  }, []);
  useEffect(() => { recargar(); }, [recargar]);
  return { emisor, recargar };
}
