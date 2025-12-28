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
  const pathname = request.nextUrl.pathname;
  
  // Check for preferred locale cookie
  const preferredLocale = request.cookies.get('preferredLocale')?.value;
  
  // If accessing root, redirect to preferred locale or default
  if (pathname === '/') {
    const targetLocale = preferredLocale && locales.includes(preferredLocale as any) ? preferredLocale : defaultLocale;
    return NextResponse.redirect(new URL(`/${targetLocale}`, request.url));
  }
  
  // Let next-intl middleware handle the rest
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
