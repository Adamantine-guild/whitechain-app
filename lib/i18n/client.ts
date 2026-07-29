'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';

const isServer = typeof window === 'undefined';

if (!isServer && !i18next.isInitialized) {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: enCommon },
        es: { common: esCommon }
      },
      fallbackLng: 'en',
      supportedLngs: ['en', 'es'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage']
      },
      returnNull: false
    });
}

export default i18next;
