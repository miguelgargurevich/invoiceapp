'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Landmark } from 'lucide-react';
import { Button, Card } from '@/components/common';
import { EmisorForm } from './EmisorForm';
import { SeriesManager } from './SeriesManager';

interface Props {
  ruc: string;
  esPeru: boolean;
  onGuardado: () => void | Promise<void>;
}

export function SunatTab({ ruc, esPeru, onGuardado }: Props) {
  const t = useTranslations('sunat.emisor');
  const [activando, setActivando] = useState(false);

  if (!esPeru && !activando) {
    return (
      <Card>
        <div className="flex items-start gap-4">
          <Landmark className="w-8 h-8 text-primary-600 dark:text-primary-400 shrink-0" />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('activarTitulo')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t('activarDescripcion')}</p>
            <Button onClick={() => setActivando(true)}>{t('activar')}</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('titulo')}</h2>
      <EmisorForm ruc={ruc} onGuardado={onGuardado} />
      {esPeru && <SeriesManager />}
    </div>
  );
}
