'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Globe,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn, getInitials } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface HeaderProps {
  onMenuClick: () => void;
  onCommandPaletteOpen: () => void;
}

interface Notification {
  id: string;
  type: 'overdue' | 'due_soon' | 'proposal_pending' | 'pending_payment';
  title: string;
  message: string;
  detail: string;
  amount: number;
  date: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
}

export function Header({ onMenuClick, onCommandPaletteOpen }: HeaderProps) {
  const { user, empresa, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { formatCurrency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tSettings = useTranslations('settings');
  const tNotifications = useTranslations('notifications');

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const currentLocale = pathname.split('/')[1] || 'es';

  // Cargar notificaciones
  useEffect(() => {
    if (empresa?.id) {
      loadNotifications();
      // Recargar cada 5 minutos
      const interval = setInterval(loadNotifications, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [empresa?.id]);

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await api.get<{ notificaciones: Notification[]; unread: number }>('/notificaciones');
      setNotifications(response.notificaciones || []);
      setUnreadCount(response.unread || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'due_soon':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'proposal_pending':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'pending_payment':
        return <DollarSign className="w-4 h-4 text-green-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const locale = pathname.split('/')[1] || 'es';
    router.push(`/${locale}${notification.link}`);
    setShowNotifications(false);
  };

  const handleLanguageChange = (locale: string) => {
    const segments = pathname.split('/');
    segments[1] = locale;
    router.push(segments.join('/'));
    setShowLangMenu(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-full px-4">
        {/* Izquierda: Menu hamburguesa y búsqueda */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

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
          <button
            onClick={onCommandPaletteOpen}
            className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notificaciones */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-[600px] flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {tNotifications('title')}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="overflow-y-auto flex-1">
                    {loadingNotifications ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {t('loading')}...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{tNotifications('noNotifications')}</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left border-b border-gray-100 dark:border-gray-700/50 last:border-0 transition-colors"
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-0.5">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-500">
                                    {notification.detail}
                                  </span>
                                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                    {formatCurrency(notification.amount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          router.push(`/${currentLocale}/facturas`);
                          setShowNotifications(false);
                        }}
                        className="w-full text-center text-sm text-blue-500 hover:text-blue-600 py-1"
                      >
                        {tNotifications('viewAll')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Globe className="w-5 h-5" />
              <span className="hidden md:inline text-sm uppercase">
                {currentLocale}
              </span>
            </button>

            {showLangMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    onClick={() => handleLanguageChange('es')}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                      currentLocale === 'es' && 'bg-gray-100 dark:bg-gray-700'
                    )}
                  >
                    🇪🇸 {tSettings('spanish')}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                      currentLocale === 'en' && 'bg-gray-100 dark:bg-gray-700'
                    )}
                  >
                    🇺🇸 {tSettings('english')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
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
                      <p className="text-xs text-blue-500 mt-1 truncate">
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
