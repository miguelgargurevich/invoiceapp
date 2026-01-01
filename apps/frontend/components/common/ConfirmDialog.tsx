'use client';

import { useTranslations } from 'next-intl';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, Info, Trash2, CheckCircle } from 'lucide-react';

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
      iconBg: 'bg-gradient-to-br from-red-500 to-rose-600',
      iconColor: 'text-white',
      buttonClass: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white',
      iconModalColor: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      iconColor: 'text-white',
      buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white',
      iconModalColor: 'warning' as const,
    },
    info: {
      icon: Info,
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      iconColor: 'text-white',
      buttonClass: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white',
      iconModalColor: 'info' as const,
    },
  };

  const { icon: Icon, buttonClass, iconModalColor } = variantStyles[variant];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      icon={Icon}
      iconColor={iconModalColor}
      size="sm"
      showCloseButton={!loading}
    >
      <div className="py-2">
        {/* Message */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1 h-11"
            disabled={loading}
          >
            {cancelLabel || t('cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-11 ${buttonClass}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('loading')}
              </>
            ) : (
              confirmLabel || t('confirm')
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
