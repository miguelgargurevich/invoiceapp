'use client';

import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('legal.privacy');

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
          {t('introduction.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('introduction.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('informationCollected.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('informationCollected.content')}
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
          <li>{t('informationCollected.item1')}</li>
          <li>{t('informationCollected.item2')}</li>
          <li>{t('informationCollected.item3')}</li>
          <li>{t('informationCollected.item4')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('howWeUse.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('howWeUse.content')}
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
          <li>{t('howWeUse.item1')}</li>
          <li>{t('howWeUse.item2')}</li>
          <li>{t('howWeUse.item3')}</li>
          <li>{t('howWeUse.item4')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('dataStorage.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('dataStorage.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('dataSecurity.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('dataSecurity.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('thirdParty.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('thirdParty.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('cookies.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('cookies.content')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('yourRights.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('yourRights.content')}
        </p>
        <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
          <li>{t('yourRights.item1')}</li>
          <li>{t('yourRights.item2')}</li>
          <li>{t('yourRights.item3')}</li>
          <li>{t('yourRights.item4')}</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {t('children.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('children.content')}
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
          <strong>Email:</strong> privacy@invoiceapp.com
        </p>
      </section>
    </article>
  );
}
