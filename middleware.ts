import { NextRequest, NextResponse } from 'next/server';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isSupportedLocale,
  isRtlLocale,
} from '@/lib/i18n';

/**
 * Cookie key where the user's preferred locale is persisted.
 * We read this cookie to decide whether to redirect first-time visitors
 * to a locale matching their Accept-Language header.
 */
const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * Parse the `Accept-Language` header and return the first supported locale,
 * or the default locale if nothing matches.
 */
function negotiateLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // Accept-Language values look like: en-US,en;q=0.9,ja;q=0.8
  const segments = acceptLanguage.split(',').map((s) => {
    const [tag, qStr] = s.trim().split(';q=');
    return { tag: tag.trim().split('-')[0].toLowerCase(), q: qStr ? parseFloat(qStr) : 1 };
  });

  // Sort descending by quality factor.
  segments.sort((a, b) => b.q - a.q);

  for (const { tag } of segments) {
    if (isSupportedLocale(tag)) return tag;
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals, static assets, and API routes.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files (favicon, images, etc.)
  ) {
    return NextResponse.next();
  }

  // Check for an explicitly stored locale preference.
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = cookieLocale && isSupportedLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale(request.headers.get('accept-language'));

  // Persist the resolved locale so subsequent navigations are consistent.
  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });

  // Set a custom header the root layout can read to apply `dir` and `lang`.
  response.headers.set('x-locale', locale);
  response.headers.set('x-dir', isRtlLocale(locale) ? 'rtl' : 'ltr');

  return response;
}

export const config = {
  matcher: ['/((?!_next|api|favicon\\.ico|.*\\..*).*)'],
};
