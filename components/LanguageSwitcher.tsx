'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';

/**
 * Human-readable labels for every supported locale.
 * Keys match the locale codes in SUPPORTED_LOCALES.
 */
const LANGUAGES: Record<Locale, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇺🇸' },
  es: { label: 'Español', flag: '🇪🇸' },
  zh: { label: '中文', flag: '🇨🇳' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ar: { label: 'العربية', flag: '🇸🇦' },
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const currentLang = (i18n.language?.split('-')[0] ?? 'en') as Locale;

  const handleChange = useCallback(
    (lng: Locale) => {
      i18n.changeLanguage(lng);
      // Persist to cookie so the middleware picks it up on next navigation.
      document.cookie = `NEXT_LOCALE=${lng};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      setOpen(false);
    },
    [i18n],
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.selector')}
        className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs transition-all duration-150"
      >
        <Globe size={14} aria-hidden="true" className="shrink-0" />
        <span className="font-medium uppercase">{currentLang}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('language.selector')}
          className="absolute end-0 z-50 mt-2 w-44 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900 animate-in fade-in slide-in-from-top-1"
        >
          {SUPPORTED_LOCALES.map((lng) => {
            const { label, flag } = LANGUAGES[lng];
            const isActive = currentLang === lng;

            return (
              <li key={lng}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleChange(lng)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    isActive
                      ? 'font-semibold text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-base" aria-hidden="true">
                    {flag}
                  </span>
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <Check
                      size={14}
                      className="shrink-0 text-green-600 dark:text-green-400"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LanguageSwitcher;
