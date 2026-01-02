'use client';

import { useTranslations } from 'next-intl';

export default function RefundPage() {
  const t = useTranslations('legal.refund');

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('title')}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        {t('lastUpdated')}: January 1, 2026
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('overview.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('overview.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('eligibility.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('eligibility.content')}
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
          <li>{t('eligibility.item1')}</li>
          <li>{t('eligibility.item2')}</li>
          <li>{t('eligibility.item3')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('nonRefundable.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('nonRefundable.content')}
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
          <li>{t('nonRefundable.item1')}</li>
          <li>{t('nonRefundable.item2')}</li>
          <li>{t('nonRefundable.item3')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('process.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('process.content')}
        </p>
        <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-300 space-y-2">
          <li>{t('process.step1')}</li>
          <li>{t('process.step2')}</li>
          <li>{t('process.step3')}</li>
          <li>{t('process.step4')}</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('timing.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('timing.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('cancellation.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('cancellation.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('contact.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {t('contact.content')}
        </p>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          <strong>Email:</strong> billing@invoiceapp.com
        </p>
      </section>
    </article>
  );
}
