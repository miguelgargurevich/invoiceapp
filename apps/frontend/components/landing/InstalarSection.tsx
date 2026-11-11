'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useInstalacion, registrarServiceWorker } from '@/lib/hooks/useInstalacion';
import { esAplicacionFacturo } from '@/lib/descargas';

export function InstalarSection() {
  const t = useTranslations('landing.instalar');
  const { instalacion, instalar } = useInstalacion();
  const [verPasos, setVerPasos] = useState(false);

  // Solo en el navegador y fuera de la app nativa. Chrome necesita el service worker para ofrecer instalar.
  useEffect(() => {
    if (!esAplicacionFacturo()) registrarServiceWorker();
  }, []);

  // En el servidor y en el primer render no hay nada: la decisión se toma ya montado.
  if (instalacion.tipo === 'nada') return null;

  return (
    <section id="instalar" className="py-20 md:py-28 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-center gap-8 md:gap-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 md:p-12 shadow-sm"
        >
          <Image
            src="/marca/icon-192.png"
            alt=""
            width={96}
            height={96}
            className="w-24 h-24 rounded-2xl shadow-lg shrink-0"
          />

          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
              <Smartphone className="w-4 h-4" />
              {t('badge')}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              {t('title')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{t('subtitle')}</p>

            {instalacion.tipo === 'boton' && (
              <Button size="lg" icon={<Smartphone className="w-5 h-5" />} onClick={() => void instalar()}>
                {t('boton')}
              </Button>
            )}

            {instalacion.tipo === 'instrucciones-ios' && (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  icon={<Share className="w-5 h-5" />}
                  aria-expanded={verPasos}
                  onClick={() => setVerPasos((abierto) => !abierto)}
                >
                  {verPasos ? t('ios.ocultar') : t('ios.ver')}
                </Button>
                {verPasos && (
                  <ol className="mt-6 space-y-3 text-left text-slate-700 dark:text-slate-300">
                    <li className="flex gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary-600 text-white text-sm font-semibold flex items-center justify-center">1</span>
                      <span className="flex items-center gap-2">
                        <Share className="w-4 h-4 shrink-0 text-primary-600 dark:text-primary-400" />
                        {t('ios.paso1')}
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary-600 text-white text-sm font-semibold flex items-center justify-center">2</span>
                      <span>{t('ios.paso2')}</span>
                    </li>
                  </ol>
                )}
              </>
            )}

            {instalacion.tipo === 'abrir-en-safari' && (
              <p className="text-slate-700 dark:text-slate-300 font-medium">{t('abrirEnSafari')}</p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
