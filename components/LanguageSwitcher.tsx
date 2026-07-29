'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Español'
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

  const currentLang = i18n.language?.split('-')[0] ?? 'en';

  function handleChange(lng: string) {
    i18n.changeLanguage(lng);
    setOpen(false);
  }

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
          className="absolute right-0 z-50 mt-2 w-36 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {Object.entries(LANGUAGES).map(([lng, label]) => (
            <li key={lng}>
              <button
                type="button"
                role="option"
                aria-selected={currentLang === lng}
                onClick={() => handleChange(lng)}
                className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  currentLang === lng
                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {label}
                {currentLang === lng && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LanguageSwitcher;
