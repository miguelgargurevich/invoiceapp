'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
    success: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    warning: 'bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
    danger: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
    info: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    neutral: 'bg-gray-200 text-gray-600 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size]
      )}
    >
      {children}
    </span>
  );
}

// Mapeo de estados de factura a variantes de badge
export function getInvoiceStatusBadge(status: string) {
  const t = useTranslations('invoices');
  const statusMap: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    emitida: { variant: 'info', label: t('statusEmitted') },
    EMITIDA: { variant: 'info', label: t('statusEmitted') },
    pagada: { variant: 'success', label: t('statusPaid') },
    PAGADA: { variant: 'success', label: t('statusPaid') },
    anulada: { variant: 'danger', label: t('statusCancelled') },
    ANULADA: { variant: 'danger', label: t('statusCancelled') },
    vencida: { variant: 'warning', label: t('statusOverdue') },
    VENCIDA: { variant: 'warning', label: t('statusOverdue') },
    pendiente: { variant: 'info', label: t('statusPending') },
    PENDIENTE: { variant: 'info', label: t('statusPending') },
  };

  return statusMap[status] || { variant: 'neutral', label: status };
}

// Mapeo de estados de proforma a variantes de badge
export function getQuoteStatusBadge(status: string) {
  const t = useTranslations('invoices');
  const statusMap: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    pendiente: { variant: 'info', label: t('statusPending') },
    aceptada: { variant: 'success', label: t('statusAccepted') },
    rechazada: { variant: 'danger', label: t('statusRejected') },
    vencida: { variant: 'warning', label: t('statusExpired') },
    facturada: { variant: 'neutral', label: t('statusInvoiced') },
  };

  return statusMap[status] || { variant: 'neutral', label: status };
}
