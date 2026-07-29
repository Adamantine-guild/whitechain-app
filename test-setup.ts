// Initialize i18next for the test environment so components that use
// useTranslation() don't fail with "NO_I18NEXT_INSTANCE".
import '@testing-library/jest-dom/vitest';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: {
      en: { common: enCommon }
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });
}

export default i18next;
