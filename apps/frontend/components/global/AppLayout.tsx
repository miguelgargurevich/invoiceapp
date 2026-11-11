'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { cn } from '@/lib/utils';
import { useModoDemo } from '@/lib/hooks/useModoDemo';
import { perfilDeCuenta } from '@/lib/demo';
import { FranjaDemo } from '@/components/demo/FranjaDemo';
import { PanelQueProbar } from '@/components/demo/PanelQueProbar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Menú colapsado por defecto; el logo lo alterna y la elección se recuerda en este navegador.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  useEffect(() => {
    try { if (localStorage.getItem('menuExpandido') === '1') setSidebarCollapsed(false); } catch { /* sin almacenamiento */ }
  }, []);
  const alternarMenu = () => setSidebarCollapsed((colapsado) => {
    try { localStorage.setItem('menuExpandido', colapsado ? '1' : '0'); } catch { /* sin almacenamiento */ }
    return !colapsado;
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Demo (MODO_DEMO): franja arriba y panel «Qué probar». Sin demo, ni se pinta ni cambia el diseño.
  const { esDemo } = useModoDemo();
  const perfilDemo = esDemo ? perfilDeCuenta(user?.email) : null;
  // Abierto por defecto en escritorio; en el celular empieza cerrado para no tapar la pantalla.
  const [panelAbierto, setPanelAbierto] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) setPanelAbierto(true);
  }, []);
  const panelVisible = perfilDemo !== null && panelAbierto;

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!loading && !user) {
      const locale = pathname.split('/')[1] || 'es';
      router.push(`/${locale}/login`);
    }
  }, [user, loading, router, pathname]);

  // Atajo de teclado para Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, no renderizar el layout (se redirigirá)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={alternarMenu}
      />

      {/* Contenido principal */}
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64',
          panelVisible && 'md:mr-80'
        )}
      >
        {/* Franja de la demo (solo con MODO_DEMO) */}
        {esDemo && <FranjaDemo />}

        {/* Header */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
          enDemo={esDemo}
        />

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Panel «Qué probar» (solo en las cuentas de demo) */}
      {perfilDemo && (
        <PanelQueProbar
          perfil={perfilDemo}
          abierto={panelAbierto}
          onAbrir={() => setPanelAbierto(true)}
          onCerrar={() => setPanelAbierto(false)}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
