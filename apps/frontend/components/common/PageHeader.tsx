import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Título de la página (h1). */
  title: string;
  /** Subtítulo en una línea, en español. */
  subtitle?: ReactNode;
  /** Ícono de lucide que identifica la sección. */
  icon?: LucideIcon;
  /** Si se pasa, muestra una flecha de volver a esta ruta a la izquierda. */
  backHref?: string;
  /** Acciones a la derecha (botones). En móvil bajan debajo del título. */
  actions?: ReactNode;
  /** Insignia opcional junto al título (p. ej. estado). */
  badge?: ReactNode;
  className?: string;
}

/**
 * Cabecera única de las páginas del panel. Todas las páginas usan este componente
 * para que el título, el subtítulo, el ícono y las acciones tengan el mismo estilo.
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  backHref,
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <Button
            href={backHref}
            variant="ghost"
            size="sm"
            aria-label="Volver"
            className="h-9 w-9 shrink-0 p-0"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
        )}
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
