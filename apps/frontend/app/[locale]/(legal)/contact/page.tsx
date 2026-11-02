'use client';

import { useTranslations } from 'next-intl';
import { Mail, MapPin, Building2 } from 'lucide-react';
import { CORREO_CONTACTO } from '@/lib/sitio';

export default function ContactPage() {
  const t = useTranslations('legal.contactPage');

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('title')}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        {t('subtitle')}
      </p>

      {/* Company Information Card */}
      <div className="not-prose bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('companyName')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('companyType')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t('address.label')}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                {t('address.line1')}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                {t('address.line2')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t('email.label')}
              </p>
              {CORREO_CONTACTO ? (
                <a href={`mailto:${CORREO_CONTACTO}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                  {CORREO_CONTACTO}
                </a>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  Pronto publicaremos nuestro correo de contacto.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
