'use client';

import Link from 'next/link';
import Image from 'next/image';
import { IconoFacturo } from '@/components/marca/LogoFacturo';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  FileBarChart,
  Users,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  X,
  Building2,
  Shield,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/proformas', icon: FileBarChart, labelKey: 'quotes' },
  { href: '/facturas', icon: Receipt, labelKey: 'invoices' },
  { href: '/clientes', icon: Users, labelKey: 'clients' },
  { href: '/productos', icon: Package, labelKey: 'products' },
  { href: '/reportes', icon: BarChart3, labelKey: 'reports' },
  { href: '/configuracion', icon: Settings, labelKey: 'settings' },
];

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const { empresa, user } = useAuth();
  
  // Check if user is admin based on role
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Empresas de Perú: «Comprobantes» (SUNAT) reemplaza a «Facturas».
  const items = empresa?.pais === 'PE'
    ? menuItems.map((item) => (item.href === '/facturas' ? { href: '/comprobantes', icon: Receipt, labelKey: 'vouchers' } : item))
    : menuItems;

  // Extraer la parte de la ruta sin el locale
  const currentPath = '/' + pathname.split('/').slice(2).join('/');

  // Componente Logo de la empresa con fallback
  // Estado para manejar error de imagen
  const [imageError, setImageError] = useState(false);

  const CompanyLogo = () => {
    if (empresa?.logoUrl && !imageError) {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-0">
          <Image
            src={empresa.logoUrl}
            alt={empresa.nombre || 'Logo'}
            width={32}
            height={32}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    // Fallback: logo de Facturo (el ticket lleva su propio color, no necesita fondo)
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center">
        <IconoFacturo tamano={28} />
      </div>
    );
  };

  return (
    <>
      {/* Overlay para móvil */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
          'text-gray-600 dark:text-gray-400',
          'transform transition-all duration-300 ease-in-out',
          // Mobile
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop - SIEMPRE COLAPSADO
          'md:translate-x-0',
          'md:w-16', // Siempre 16 (colapsado) en desktop
          'w-64' // Ancho completo en móvil cuando está abierto
        )}
      >
        {/* Header del Sidebar */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 relative">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* SIEMPRE COLAPSADO - Solo mostrar logo */}
            <Link href="/" className="flex items-left justify-left w-full">
              <CompanyLogo />
            </Link>
          </div>

          {/* Botón cerrar en móvil */}
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botón colapsar en desktop - DESHABILITADO: Sidebar siempre colapsado */}
        {/* <button
          onClick={(e) => {
            e.preventDefault();
            onToggleCollapse();
          }}
          className={cn(
            'hidden md:flex absolute top-5 -right-3 z-50',
            'w-6 h-6 items-center justify-center',
            'bg-gray-800 hover:bg-gray-700 border border-gray-700',
            'rounded-full shadow-lg transition-all duration-300'
          )}
        >
          <ChevronLeft
            className={cn(
              'w-4 h-4 transition-transform duration-300',
              isCollapsed && 'rotate-180'
            )}
          />
        </button> */}

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {items.map((item) => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    title={t(item.labelKey)}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                      isActive && 'bg-primary-50 text-primary-700 hover:bg-primary-50 hover:text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/30 dark:hover:text-primary-300',
                      'md:justify-center md:px-2' // SIEMPRE centrado en desktop
                    )}
                  >
                    {/* Acento berenjena a la izquierda del ítem activo */}
                    {isActive && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-primary-600" />}
                    <item.icon className="w-5 h-5 shrink-0" />
                    {/* Texto solo visible en móvil */}
                    <span className="md:hidden truncate">{t(item.labelKey)}</span>
                  </Link>
                </li>
              );
            })}

            {/* Admin link - only for admins */}
            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  onClick={onClose}
                  title={t('admin')}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                    currentPath === '/admin' && 'bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/30',
                    'md:justify-center md:px-2'
                  )}
                >
                  <Shield className="w-5 h-5 shrink-0" />
                  <span className="md:hidden truncate">{t('admin')}</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/ayuda"
            title={t('help')}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100 text-gray-500 dark:text-gray-400',
              'md:justify-center md:px-2' // SIEMPRE centrado en desktop
            )}
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            {/* Texto solo visible en móvil */}
            <span className="md:hidden">{t('help')}</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
