'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('emptyState');
  return (
    <EmptyState
      icon={<FileText className="w-full h-full" />}
      title={t('noInvoices')}
      description={t('noInvoicesDesc')}
      action={action}
    />
  );
}

export function EmptyClients({ action }: { action?: ReactNode }) {
  const t = useTranslations('emptyState');
  return (
    <EmptyState
      icon={<Users className="w-full h-full" />}
      title={t('noClients')}
      description={t('noClientsDesc')}
      action={action}
    />
  );
}

export function EmptyProducts({ action }: { action?: ReactNode }) {
  const t = useTranslations('emptyState');
  return (
    <EmptyState
      icon={<Package className="w-full h-full" />}
      title={t('noProducts')}
      description={t('noProductsDesc')}
      action={action}
    />
  );
}

export function EmptySearch() {
  const t = useTranslations('emptyState');
  return (
    <EmptyState
      icon={<Search className="w-full h-full" />}
      title={t('noSearchResults')}
      description={t('noSearchResultsDesc')}
    />
  );
}
