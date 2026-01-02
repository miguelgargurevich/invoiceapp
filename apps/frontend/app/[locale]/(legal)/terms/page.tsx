'use client';

import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('legal.terms');

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
          {t('acceptance.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('acceptance.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('description.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('description.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('accounts.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('accounts.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('payment.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('payment.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('intellectualProperty.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('intellectualProperty.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('userContent.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('userContent.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('prohibited.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('prohibited.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('termination.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('termination.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('disclaimer.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('disclaimer.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('limitation.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('limitation.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('governing.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('governing.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('changes.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('changes.content')}
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
          <strong>Email:</strong> legal@invoiceapp.com
        </p>
      </section>
    </article>
  );
}
