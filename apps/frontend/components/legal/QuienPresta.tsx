'use client';

import { useTranslations } from 'next-intl';
import { useDatosLegales } from '@/lib/hooks/useDatosLegales';
import { hayValor, valorOPorConfirmar } from '@/lib/legal';

// Bloque «Quién presta el servicio» de Términos y Privacidad. Datos desde la BD; lo vacío dice «por confirmar».
export function QuienPresta() {
  const t = useTranslations('legal.quienPresta');
  const { datos, cargando } = useDatosLegales();

  const filas: { etiqueta: string; valor: string | null | undefined }[] = [
    { etiqueta: t('marca'), valor: datos?.legalMarca },
    { etiqueta: t('razonSocial'), valor: datos?.legalRazonSocial },
    { etiqueta: t('ruc'), valor: datos?.legalRuc },
    { etiqueta: t('domicilio'), valor: datos?.legalDomicilio },
    { etiqueta: t('correo'), valor: datos?.legalCorreo },
  ];

  return (
    <section className="mb-8 not-prose rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{t('title')}</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{t('intro')}</p>
      {cargando ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" role="status">{t('cargando')}</p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
          {filas.map(({ etiqueta, valor }) => (
            <div key={etiqueta} className="contents">
              <dt className="font-medium text-gray-900 dark:text-white">{etiqueta}</dt>
              <dd className={hayValor(valor) ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400 italic'}>
                {valorOPorConfirmar(valor)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
