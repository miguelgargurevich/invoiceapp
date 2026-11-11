'use client';

import { useCallback, useEffect, useState } from 'react';
import { decidirInstalacion, type Instalacion } from '@/lib/instalar';
import { esAplicacionFacturo } from '@/lib/descargas';

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// El evento beforeinstallprompt llega una sola vez por carga de página. Se guarda a nivel de
// módulo para que el botón del landing y el ítem del menú compartan el mismo evento.
let evento: EventoInstalar | null = null;
const suscriptores = new Set<() => void>();
let escuchando = false;

function avisar() {
  suscriptores.forEach((avisarSuscriptor) => avisarSuscriptor());
}

function escucharEventos() {
  if (escuchando) return;
  escuchando = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // se muestra desde nuestro botón, no como banner del navegador
    evento = e as EventoInstalar;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    avisar();
  });
}

/** Lo que debe mostrar el landing para instalar la app. En el servidor y en el primer render es 'nada'. */
export function useInstalacion(): { instalacion: Instalacion; instalar: () => Promise<void> } {
  const [instalacion, setInstalacion] = useState<Instalacion>({ tipo: 'nada' });

  useEffect(() => {
    const actualizar = () => {
      setInstalacion(
        decidirInstalacion({
          userAgent: navigator.userAgent,
          instalada:
            window.matchMedia('(display-mode: standalone)').matches ||
            (navigator as Navigator & { standalone?: boolean }).standalone === true,
          aplicacionNativa: esAplicacionFacturo(),
          eventoInstalar: evento !== null,
          puntosTactiles: navigator.maxTouchPoints,
        }),
      );
    };
    escucharEventos();
    suscriptores.add(actualizar);
    actualizar();
    return () => {
      suscriptores.delete(actualizar);
    };
  }, []);

  const instalar = useCallback(async () => {
    const pendiente = evento;
    if (!pendiente) return;
    evento = null; // un evento solo se usa una vez
    avisar();
    await pendiente.prompt();
    await pendiente.userChoice.catch(() => undefined);
  }, []);

  return { instalacion, instalar };
}

/** Registra el service worker mínimo (public/sw.js). Necesario para que Chrome ofrezca instalar. */
export function registrarServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
}
