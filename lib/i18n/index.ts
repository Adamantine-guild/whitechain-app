/**
 * Core i18n configuration & utility helpers.
 *
 * This module is the single source of truth for supported locales, the default
 * locale, and RTL detection.  It is intentionally kept framework-agnostic so
 * that both the client runtime (i18next) and the Next.js middleware can import
 * from the same place without pulling in React or DOM dependencies.
 */

/** All locales the app ships with. */
export const SUPPORTED_LOCALES = ['en', 'es', 'zh', 'ja', 'ar'] as const;

/** Inferred union type of valid locale codes. */
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Fallback locale when detection fails or the stored value is invalid. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Locales written right-to-left. */
export const RTL_LOCALES: ReadonlySet<string> = new Set<string>(['ar']);

/** Check whether a given locale code is RTL. */
export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}

/** Type-guard: returns `true` if the value is one of our supported locales. */
export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Normalise a raw locale string (e.g. `"en-US"`) to one of our supported
 * short codes.  Returns `DEFAULT_LOCALE` when no match is found.
 */
export function resolveLocale(raw: string | undefined | null): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const short = raw.split('-')[0].toLowerCase();
  return isSupportedLocale(short) ? short : DEFAULT_LOCALE;
}
