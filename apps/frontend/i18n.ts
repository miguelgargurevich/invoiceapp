import {getRequestConfig} from 'next-intl/server';

// Idiomas soportados. Español es el predeterminado: Facturo es para Perú (SUNAT, soles, IGV).
// Quien elige inglés queda guardado en la cookie `preferredLocale`, que manda sobre este valor.
export const locales = ['en', 'es'] as const;
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
