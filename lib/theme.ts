export const THEME_STORAGE_KEY = 'whitechain-theme';

export type Theme = 'light' | 'dark';

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Reads the user's explicit choice if set, otherwise the OS preference. */
export function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark() ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Inline script source, inlined into `<head>` before hydration so the
 * correct theme class is present on first paint — avoids a flash of the
 * wrong theme on reload (#2).
 */
export const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
