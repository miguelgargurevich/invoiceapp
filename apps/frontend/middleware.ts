import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Always use prefix for all locales
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Facturo solo está en español. Cualquier ruta /en o /en/... (también la cookie preferredLocale=en)
  // pasa a la misma ruta en /es con 308: /en/landing → /es/landing.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname.slice('/en'.length)}`;
    return NextResponse.redirect(url, 308);
  }

  // La raíz va al idioma por defecto (el middleware ya no lee la cookie: solo hay español).
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${defaultLocale}${search}`, request.url));
  }

  // Let next-intl middleware handle the rest
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|.*\\..*).*)',
  ]
};
