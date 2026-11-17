'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { gestoresDeAviso, pushApp, pushWeb } from '@/lib/push/instancias';

/**
 * No dibuja nada. Con la sesión iniciada: registra el teléfono (en la app) o reanuda los avisos del navegador (si esta persona
 * ya los había activado y el permiso sigue concedido). Al tocar un aviso abre su ruta con el router; con la app abierta lo muestra como toast.
 */
export default function PushIniciador() {
  const { user } = useAuth();
  const router = useRouter();
  const { showInfo } = useToast();

  useEffect(() => {
    gestoresDeAviso.navegar = (ruta) => router.push(ruta);
    gestoresDeAviso.avisar = (texto) => showInfo(texto);
  }, [router, showInfo]);

  useEffect(() => {
    if (!user?.id) return;
    void pushApp.iniciar();
    void pushWeb.reanudar(user.id);
  }, [user?.id]);

  return null;
}
