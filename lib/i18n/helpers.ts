/**
 * Lightweight t() helper for files that cannot use the useTranslation() hook
 * (e.g. plain utility functions that are called outside of React's component
 * tree, such as toast notifications).
 *
 * Falls back to the provided fallback string when i18next is not yet
 * initialised or the key is missing.
 */
// Side-effect import ensures the singleton is initialised before use.
import '@/lib/i18n/client';
import i18next from 'i18next';

export function t(key: string, fallback: string): string {
  return (i18next.isInitialized ? i18next.t(key) : null) ?? fallback;
}

/**
 * Returns the current language code (e.g. 'en', 'ar').
 * Useful outside of React components.
 */
export function getCurrentLocale(): string {
  return i18next.isInitialized ? (i18next.language?.split('-')[0] ?? 'en') : 'en';
}
