/**
 * Test utilities that provide the i18next React context to components under
 * test. Use this custom `render` instead of @testing-library/react's `render`
 * when the component tree uses `useTranslation()`.
 */
import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

// Ensure i18next is initialised (test-setup.ts runs first).
import './test-setup';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
