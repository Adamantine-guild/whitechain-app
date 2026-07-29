'use client';

import { useEffect, type ReactNode } from 'react';
import { useTranslation, I18nextProvider } from 'react-i18next';

// Ensures the client-side i18next singleton is initialized before children
// attempt to call useTranslation().
// Must be a child of <Providers> (which is itself a client component).
import i18n from '@/lib/i18n/client';

/**
 * HtmlLangSync — syncs the <html lang> attribute with the currently selected
 * language so screen readers and search engines always see the correct value.
 */
function HtmlLangSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language?.split('-')[0] ?? 'en';
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <HtmlLangSync />
      {children}
    </I18nextProvider>
  );
}

export default I18nProvider;
