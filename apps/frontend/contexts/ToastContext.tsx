'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import Toast, { ToastType } from '@/components/common/Toast';
import { EVENTO_BLOQUEO_DEMO, type BloqueoDemo } from '@/lib/demo';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    duration: number;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
    setToast({ message, type, duration });
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error', 5000);
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast(message, 'warning', 4000);
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  // Bloqueos de la demo (DEMO_BLOQUEADO / DEMO_LIMITE): el cliente de API los avisa aquí, con su mensaje.
  useEffect(() => {
    const alBloquear = (e: Event) => {
      const bloqueo = (e as CustomEvent<BloqueoDemo>).detail;
      if (bloqueo?.mensaje) showWarning(bloqueo.mensaje);
    };
    window.addEventListener(EVENTO_BLOQUEO_DEMO, alBloquear);
    return () => window.removeEventListener(EVENTO_BLOQUEO_DEMO, alBloquear);
  }, [showWarning]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
