import {getRequestConfig} from 'next-intl/server';

// Idioma único: español (Facturo es para Perú: SUNAT, soles, IGV).
// `en` quedó desactivado: /en/... redirige a /es/... en middleware.ts. messages/en.json queda sin uso.
export const locales = ['es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export default getRequestConfig(async ({requestLocale}) => {
  // Get the locale from the request
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
