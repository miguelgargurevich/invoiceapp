'use client';

import { useTranslations } from 'next-intl';
import { Mail, MapPin, Building2 } from 'lucide-react';

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
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <div className="space-y-1">
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">{t('email.general')}:</span>{' '}
                  <a href="mailto:hello@invoiceapp.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    hello@invoiceapp.com
                  </a>
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">{t('email.support')}:</span>{' '}
                  <a href="mailto:support@invoiceapp.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    support@invoiceapp.com
                  </a>
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">{t('email.billing')}:</span>{' '}
                  <a href="mailto:billing@invoiceapp.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                    billing@invoiceapp.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Hours */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('supportHours.title')}
        </h2>
        <div className="not-prose bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('supportHours.weekdays')}</p>
              <p className="font-medium text-gray-900 dark:text-white">9:00 AM - 6:00 PM EST</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('supportHours.weekends')}</p>
              <p className="font-medium text-gray-900 dark:text-white">{t('supportHours.closed')}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t('supportHours.responseTime')}
          </p>
        </div>
      </section>

      {/* Departments */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('departments.title')}
        </h2>
        <div className="not-prose grid md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('departments.support.title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('departments.support.description')}</p>
            <a href="mailto:support@invoiceapp.com" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              support@invoiceapp.com
            </a>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('departments.billing.title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('departments.billing.description')}</p>
            <a href="mailto:billing@invoiceapp.com" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              billing@invoiceapp.com
            </a>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('departments.sales.title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('departments.sales.description')}</p>
            <a href="mailto:sales@invoiceapp.com" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              sales@invoiceapp.com
            </a>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">{t('departments.legal.title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('departments.legal.description')}</p>
            <a href="mailto:legal@invoiceapp.com" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              legal@invoiceapp.com
            </a>
          </div>
        </div>
      </section>
    </article>
  );
}
