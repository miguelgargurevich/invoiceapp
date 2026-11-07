'use client';

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

// Error de carga de una pantalla: mismo esqueleto que EmptyState, con ícono de alerta.
export function ErrorState({ title, description, action, size = 'md' }: ErrorStateProps) {
  return (
    <EmptyState
      icon={<AlertTriangle className="w-full h-full text-amber-500" />}
      title={title}
      description={description}
      action={action}
      size={size}
    />
  );
}
