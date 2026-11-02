'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  /** Si se pasa, se muestra como enlace (Link de Next) con el mismo estilo de botón. */
  href?: string;
}

const variants = {
  primary:
    'bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-700 dark:hover:bg-primary-600 focus:ring-primary-500',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
  ghost:
    'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  warning:
    'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
  success:
    'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:ring-emerald-500',
  outline:
    'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
};

const sizes = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      children,
      disabled,
      href,
      ...props
    },
    ref
  ) => {
    const estilo = cn(
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg',
      'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      className
    );

    const contenido = (
      <>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </>
    );

    if (href) {
      // Enlace con aspecto de botón. Sin disabled/loading: un enlace no se deshabilita.
      return (
        <Link href={href} className={estilo} aria-label={props['aria-label']}>
          {contenido}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        className={estilo}
        disabled={disabled || loading}
        {...props}
      >
        {contenido}
      </button>
    );
  }
);

Button.displayName = 'Button';
