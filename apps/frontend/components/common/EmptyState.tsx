'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Users, Package, Search } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
  };

  const iconSizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses[size]
      )}
    >
      {icon && (
        <div className="text-gray-400 dark:text-gray-600 mb-4">
          <div className={iconSizes[size]}>{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Variantes pre-configuradas comunes
export function EmptyInvoices({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={<FileText className="w-full h-full" />}
      title="No hay facturas"
      description="Crea tu primera factura para comenzar a facturar a tus clientes."
      action={action}
    />
  );
}

export function EmptyClients({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={<Users className="w-full h-full" />}
      title="No hay clientes"
      description="Agrega tu primer cliente para poder crear facturas y proformas."
      action={action}
    />
  );
}

export function EmptyProducts({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={<Package className="w-full h-full" />}
      title="No hay productos"
      description="Agrega tus productos o servicios para agilizar la creación de facturas."
      action={action}
    />
  );
}

export function EmptySearch() {
  return (
    <EmptyState
      icon={<Search className="w-full h-full" />}
      title="Sin resultados"
      description="No se encontraron resultados para tu búsqueda. Intenta con otros términos."
    />
  );
}
