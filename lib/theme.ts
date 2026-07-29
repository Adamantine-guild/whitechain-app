/**
 * Theme utilities
 *
 * The canonical source of truth for the user's theme preference is now the
 * IndexedDB-backed UserSettingsStore (lib/store/userSettingsStore.ts).
 *
 * The synchronous helpers below are kept for two purposes only:
 *   1. The `NO_FLASH_THEME_SCRIPT` inline script that runs before hydration.
 *      It still reads localStorage as a bootstrap fallback because IndexedDB
 *      is asynchronous and unavailable at that point.
 *   2. The `getPreferredTheme()` synchronous helper consumed by the
 *      ThemeToggle on mount for the same first-paint reason.
 *
 * All writes now go through `getUserSettingsStore().setTheme()` and the IDB
 * persistence layer — never to localStorage directly.
 */

export const THEME_STORAGE_KEY = 'whitechain-theme';

export type Theme = 'light' | 'dark';

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Synchronous read of the theme, used only for the initial paint before async
 * IDB data is available. Reads the localStorage bootstrap value if present,
 * otherwise falls back to the OS preference.
 *
 * After hydration the ThemeToggle subscribes to the UserSettingsStore for
 * authoritative async state.
 */
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
 * Inline script inlined into `<head>` before hydration to prevent a flash of
 * the wrong theme on reload.
 *
 * Reads from localStorage as a bootstrap fallback only. Once the app fully
 * loads the ThemeToggle reads from IDB via UserSettingsStore and writes back
 * to IDB — the localStorage bootstrap value is removed after that first
 * migration, so subsequent page loads fall through to the OS preference until
 * the async IDB read completes.
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
