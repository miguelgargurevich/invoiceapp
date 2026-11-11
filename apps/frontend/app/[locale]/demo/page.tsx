'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Briefcase, PenLine, ArrowRight, type LucideIcon } from 'lucide-react';
import { IconoFacturo } from '@/components/marca/LogoFacturo';
import { LoadingSpinner } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useModoDemo } from '@/lib/hooks/useModoDemo';
import { ApiError } from '@/lib/api';
import { mensajeEntrarDemo, type PerfilEntrar } from '@/lib/demo';
import { cn } from '@/lib/utils';

interface TarjetaPerfil {
  id: 'emprendedor' | 'servicios' | 'cliente';
  titulo: string;
  linea: string;
  icono: LucideIcon;
}

// Textos del diseño (sección 3). El nombre y la línea son de la demo; el enlace de firma viene del estado.
const TARJETAS: TarjetaPerfil[] = [
  { id: 'emprendedor', titulo: 'Emprendedor con boletas', linea: 'Emite boletas en segundos y mira tus ventas del día.', icono: Store },
  { id: 'servicios', titulo: 'Empresa de servicios', linea: 'Facturas con detracción, proformas que tu cliente firma y tu marca en el PDF.', icono: Briefcase },
  { id: 'cliente', titulo: 'Tu cliente', linea: 'Así recibe y firma tu cliente una proforma, sin crear cuenta.', icono: PenLine },
];

export default function DemoPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  const { entrarDemo } = useAuth();
  const { estado, esDemo, cargando } = useModoDemo();
  const [ocupado, setOcupado] = useState<PerfilEntrar | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fuera de la demo no hay nada que probar: va a la portada.
  useEffect(() => {
    if (!cargando && !esDemo) router.replace(`/${locale}/landing`);
  }, [cargando, esDemo, locale, router]);

  if (cargando || !esDemo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  const enlaceFirma = estado?.perfiles.find((p) => p.id === 'cliente')?.enlaceFirma ?? null;

  const entrar = async (perfil: PerfilEntrar) => {
    setError(null);
    setOcupado(perfil);
    try {
      await entrarDemo(perfil);
      router.push(`/${locale}/dashboard`);
    } catch (err) {
      setError(mensajeEntrarDemo(err instanceof ApiError ? err.status : 0));
      setOcupado(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <IconoFacturo tamano={32} />
          <span className="font-semibold text-[#6B2C6E] dark:text-[#D7B3D9]">Facturo</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Prueba Facturo sin registrarte</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Los datos son de ejemplo y se borran cada noche.
        </p>

        {error && (
          <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TARJETAS.map((tarjeta) => {
            const Icono = tarjeta.icono;
            const esCliente = tarjeta.id === 'cliente';
            const deshabilitada = esCliente ? !enlaceFirma : ocupado !== null;
            const alPulsar = () => {
              if (esCliente) {
                if (enlaceFirma) router.push(enlaceFirma);
                return;
              }
              if (tarjeta.id !== 'cliente') entrar(tarjeta.id);
            };

            return (
              <button
                key={tarjeta.id}
                type="button"
                onClick={alPulsar}
                disabled={deshabilitada}
                className={cn(
                  'flex flex-col rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-shadow dark:border-gray-800 dark:bg-gray-900',
                  'hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm',
                )}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <Icono className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="mt-4 text-sm text-gray-500 dark:text-gray-400">Entrar como</span>
                <span className="text-lg font-semibold">{tarjeta.titulo}</span>
                <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">{tarjeta.linea}</span>
                <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 dark:text-primary-300">
                  {esCliente && !enlaceFirma
                    ? 'Disponible pronto'
                    : ocupado === tarjeta.id
                      ? 'Abriendo la demo...'
                      : (
                        <>
                          {esCliente ? 'Ver su proforma' : 'Entrar'}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </>
                      )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
