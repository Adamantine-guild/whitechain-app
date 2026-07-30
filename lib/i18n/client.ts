'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/i18n';

// ── Static locale imports ───────────────────────────────────────────────
import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';
import zhCommon from '@/locales/zh/common.json';
import jaCommon from '@/locales/ja/common.json';
import arCommon from '@/locales/ar/common.json';

const isServer = typeof window === 'undefined';

if (!isServer && !i18next.isInitialized) {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: enCommon },
        es: { common: esCommon },
        zh: { common: zhCommon },
        ja: { common: jaCommon },
        ar: { common: arCommon },
      },
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...SUPPORTED_LOCALES],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
      returnNull: false,
    });
}

export default i18next;
