'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-[96vw]',
};

const iconColorClasses = {
  primary: 'bg-gray-800 dark:bg-gray-700 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-600 text-white',
  danger: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = 'primary',
  children,
  size = 'lg',
  showCloseButton = true,
  footer,
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50" style={{ margin: 0, padding: 0 }}>
          {/* Backdrop overlay with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container - Centered */}
          <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className={cn(
                'relative w-full',
                'bg-white dark:bg-gray-900',
                'rounded-2xl shadow-2xl',
                'ring-1 ring-gray-200 dark:ring-gray-800',
                'flex flex-col',
                'max-h-[92vh] my-auto',
                sizeClasses[size]
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Modern design with icon support */}
              {title && (
                <div className="relative flex items-start gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                  {/* Icon */}
                  {Icon && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                      className={cn(
                        'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg',
                        iconColorClasses[iconColor]
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                  )}
                  
                  {/* Title & Subtitle */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  
                  {/* Close button */}
                  {showCloseButton && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="flex-shrink-0 p-2 -mr-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                      aria-label="Cerrar ventana"
                    >
                      <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content - Scrollable */}
              <div className="overflow-y-auto px-6 py-5 flex-1 custom-scrollbar">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>

          {/* Custom scrollbar styles */}
          <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(156, 163, 175, 0.3);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(156, 163, 175, 0.5);
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(75, 85, 99, 0.3);
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(75, 85, 99, 0.5);
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
