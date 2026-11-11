'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Menu,
  Search,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn, getInitials } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  onCommandPaletteOpen: () => void;
  /** Con la franja de la demo encima, el encabezado se pega debajo de ella (top-10). */
  enDemo?: boolean;
}

export function Header({ onMenuClick, onCommandPaletteOpen, enDemo = false }: HeaderProps) {
  const { user, empresa, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { subscription } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tSettings = useTranslations('settings');

  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentLocale = pathname.split('/')[1] || 'es';

  const getPlanBadgeStyle = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case 'pro':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      case 'business':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      case 'starter':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      case 'free':
      case 'trial':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className={cn('sticky z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800', enDemo ? 'top-10' : 'top-0')}>
      <div className="flex items-center justify-between h-full px-4">
        {/* Izquierda: Menu hamburguesa y búsqueda */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onMenuClick}
            aria-label={t('openMenu')}
            className="p-2 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Búsqueda / Command Palette trigger */}
          <button
            onClick={onCommandPaletteOpen}
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">{t('search')}...</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Derecha: Acciones */}
        <div className="flex items-center gap-2">
          {/* Botón búsqueda móvil */}
          <Button
            variant="ghost"
            onClick={onCommandPaletteOpen}
            aria-label={t('search')}
            className="sm:hidden p-2"
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Notificaciones - Reemplazado por Plan Badge */}
          {subscription && (
            <button
              onClick={() => router.push(`/${currentLocale}/configuracion?tab=suscripcion`)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                getPlanBadgeStyle(subscription.plan?.name || 'free')
              )}
            >
              {subscription.plan?.name || 'Gratis'}
            </button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={t('toggleTheme')}
            className="p-2"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.user_metadata?.name
                  ? getInitials(user.user_metadata.name)
                  : user?.email?.charAt(0).toUpperCase()}
              </div>
              <ChevronDown className="w-4 h-4 hidden md:block" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  {/* Info usuario */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium">
                      {user?.user_metadata?.name || user?.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                    {empresa && (
                      <p className="text-xs text-primary-500 mt-1 truncate">
                        {empresa.nombre}
                      </p>
                    )}
                  </div>

                  {/* Opciones */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        router.push('/configuracion');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings className="w-4 h-4" />
                      {tSettings('title')}
                    </button>
                    <button
                      onClick={() => {
                        router.push('/configuracion');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <User className="w-4 h-4" />
                      Mi Perfil
                    </button>
                  </div>

                  {/* Cerrar sesión */}
                  <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4" />
                      {tAuth('logout')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
