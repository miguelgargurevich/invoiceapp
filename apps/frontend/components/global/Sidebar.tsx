'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import { useState, useEffect } from 'react';

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
  const { empresa } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const api = (await import('@/lib/api')).default;
        const response: any = await api.get('/admin/stats');
        setIsAdmin(true);
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdminRole();
  }, []);

  // Extraer la parte de la ruta sin el locale
  const currentPath = '/' + pathname.split('/').slice(2).join('/');

  // Componente Logo de la empresa con fallback
  // Estado para manejar error de imagen
  const [imageError, setImageError] = useState(false);

  const CompanyLogo = () => {
    if (empresa?.logoUrl && !imageError) {
      return (
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-700">
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

    // Fallback: Logo de la app
    return (
      <div className="w-8 h-8 bg-white rounded-lg overflow-hidden flex items-center justify-center p-0.5">
        <Image
          src="/invoiceapp-logo.png"
          alt="InvoiceApp Logo"
          width={32}
          height={32}
          className="w-full h-full object-contain"
        />
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
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white',
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
        <div className="flex items-center h-16 px-4 border-b border-gray-800 relative">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* SIEMPRE COLAPSADO - Solo mostrar logo */}
            <Link href="/dashboard" className="flex items-center justify-center w-full">
              <CompanyLogo />
            </Link>
          </div>
          
          {/* Botón cerrar en móvil */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 md:hidden shrink-0 ml-2"
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
            {menuItems.map((item) => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      'hover:bg-gray-800',
                      isActive && 'bg-blue-600 hover:bg-blue-700',
                      'md:justify-center md:px-2' // SIEMPRE centrado en desktop
                    )}
                  >
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
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-gray-800',
                    currentPath === '/admin' && 'bg-red-600 hover:bg-red-700',
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
        <div className="p-4 border-t border-gray-800">
          <Link
            href="/ayuda"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              'hover:bg-gray-800 text-gray-400',
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
