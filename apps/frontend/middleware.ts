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
  // Check for preferred locale cookie (set when user changes language)
  const preferredLocale = request.cookies.get('preferredLocale')?.value;
  
  // If user has a preferred locale and is accessing root path, redirect to preferred locale
  const pathname = request.nextUrl.pathname;
  
  if (preferredLocale && locales.includes(preferredLocale as any)) {
    // Check if already on a locale path
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );
    
    // If accessing root, redirect to preferred locale
    if (pathname === '/') {
      return NextResponse.redirect(new URL(`/${preferredLocale}`, request.url));
    }
  }
  
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ]
};
