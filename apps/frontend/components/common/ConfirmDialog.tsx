'use client';

import { useTranslations } from 'next-intl';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const t = useTranslations('common');

  const variantStyles = {
    danger: {
      icon: AlertCircle,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      buttonVariant: 'warning' as const,
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonVariant: 'primary' as const,
    },
  };

  const { icon: Icon, iconBg, iconColor, buttonVariant } = variantStyles[variant];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size="sm"
      showCloseButton={!loading}
    >
      <div className="flex flex-col items-center text-center py-4">
        {/* Icon with pulse animation */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${iconBg} animate-pulse-slow`}
        >
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>

        {/* Message */}
        <p className="text-base text-gray-700 dark:text-gray-300 mb-8 leading-relaxed max-w-sm">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            disabled={loading}
          >
            {cancelLabel || t('cancel')}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            {confirmLabel || t('confirm')}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </Modal>
  );
}
