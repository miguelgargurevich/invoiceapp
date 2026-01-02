'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'indigo' | 'green' | 'amber' | 'violet';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  // Colors synchronized with ActivityTimeline component:
  // - created: blue (info)
  // - sent: indigo
  // - signed: violet
  // - invoiced: amber
  // - paid: emerald (success)
  // - overdue: red (danger)
  // - cancelled: gray (neutral)
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
    success: 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    warning: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    danger: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
    info: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
    neutral: 'bg-gray-200 text-gray-600 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
    indigo: 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700',
    green: 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
    amber: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    violet: 'bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
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
    emitida: { variant: 'indigo', label: t('statusEmitted') },
    EMITIDA: { variant: 'indigo', label: t('statusEmitted') },
    pagada: { variant: 'success', label: t('statusPaid') },
    PAGADA: { variant: 'success', label: t('statusPaid') },
    anulada: { variant: 'neutral', label: t('statusCancelled') },
    ANULADA: { variant: 'neutral', label: t('statusCancelled') },
    vencida: { variant: 'danger', label: t('statusOverdue') },
    VENCIDA: { variant: 'danger', label: t('statusOverdue') },
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
    aceptada: { variant: 'green', label: t('statusAccepted') },
    rechazada: { variant: 'danger', label: t('statusRejected') },
    vencida: { variant: 'danger', label: t('statusExpired') },
    facturada: { variant: 'warning', label: t('statusInvoiced') },
  };

  return statusMap[status] || { variant: 'neutral', label: status };
}
