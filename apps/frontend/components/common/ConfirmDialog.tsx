'use client';

import { useTranslations } from 'next-intl';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

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

  const iconColors = {
    danger: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    warning: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
    info: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  };

  const confirmVariants = {
    danger: 'danger' as const,
    warning: 'warning' as const,
    info: 'primary' as const,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${iconColors[variant]}`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {cancelLabel || t('cancel')}
          </Button>
          <Button
            variant={confirmVariants[variant]}
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            {confirmLabel || t('confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
