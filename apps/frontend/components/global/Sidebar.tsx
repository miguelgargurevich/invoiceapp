'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Users,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  X,
  Building2,
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
  { href: '/facturas', icon: FileText, labelKey: 'invoices' },
  { href: '/proformas', icon: FileCheck, labelKey: 'quotes' },
  { href: '/clientes', icon: Users, labelKey: 'clients' },
  { href: '/productos', icon: Package, labelKey: 'products' },
  { href: '/reportes', icon: BarChart3, labelKey: 'reports' },
  { href: '/configuracion', icon: Settings, labelKey: 'settings' },
];

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const { empresa } = useAuth();

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

    // Fallback: iniciales de la empresa o ícono genérico
    if (empresa?.nombre) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
          {getInitials(empresa.nombre)}
        </div>
      );
    }

    // Fallback por defecto
    return (
      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
        <Building2 className="w-5 h-5 text-white" />
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
          // Desktop
          'md:translate-x-0',
          isCollapsed ? 'md:w-16' : 'md:w-64',
          'w-64'
        )}
      >
        {/* Header del Sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          {!isCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <CompanyLogo />
              <span className="font-bold text-lg truncate max-w-[140px]">
                {empresa?.nombre || 'Factura'}
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/dashboard" className="mx-auto">
              <CompanyLogo />
            </Link>
          )}
          
          {/* Botón cerrar en móvil */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Botón colapsar en desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-2 rounded-lg hover:bg-gray-800"
          >
            <ChevronLeft
              className={cn(
                'w-5 h-5 transition-transform duration-300',
                isCollapsed && 'rotate-180'
              )}
            />
          </button>
        </div>

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
                      isCollapsed && 'md:justify-center md:px-2'
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate">{t(item.labelKey)}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-gray-800">
          <Link
            href="/ayuda"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              'hover:bg-gray-800 text-gray-400',
              isCollapsed && 'md:justify-center md:px-2'
            )}
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>{t('help')}</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
