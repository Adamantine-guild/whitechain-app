'use client';

import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="card">
      <h1 className="text-xl font-semibold text-gray-900">{t('home.welcome')}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {t('home.connectPrompt')}
      </p>
    </div>
  );
}
