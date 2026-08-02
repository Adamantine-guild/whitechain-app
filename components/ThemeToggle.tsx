'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, getPreferredTheme, type Theme } from '@/lib/theme';
import { getUserSettingsStore } from '@/lib/store/userSettingsStore';

/**
 * System-aware dark mode toggle.
 *
 * Initial class is applied by the inline `NO_FLASH_THEME_SCRIPT` in
 * `app/layout.tsx` before React hydrates. On mount we reconcile state with
 * the authoritative UserSettingsStore (IndexedDB) and fall back to the
 * synchronous localStorage bootstrap value if IDB hasn't loaded yet.
 *
 * All writes go to the UserSettingsStore (IDB), never directly to
 * localStorage. The localStorage key is migrated and removed on first access.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Apply the synchronous bootstrap value immediately to avoid a flash,
    // then asynchronously load from IDB and reconcile.
    const syncTheme = getPreferredTheme();
    setTheme(syncTheme);
    applyTheme(syncTheme);
    setMounted(true);

    // Async reconcile: IDB is the authoritative source after migration.
    getUserSettingsStore()
      .getTheme()
      .then((stored) => {
        if (stored) {
          setTheme(stored);
          applyTheme(stored);
        }
      })
      .catch(() => {
        // Non-fatal: keep the sync bootstrap value.
      });
  }, []);

  // Follow the OS preference live while the user hasn't made an explicit
  // choice (i.e. IDB has no stored theme).
  useEffect(() => {
    if (!mounted) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = async (e: MediaQueryListEvent) => {
      // Only follow OS if the user hasn't saved a preference in IDB.
      const stored = await getUserSettingsStore().getTheme().catch(() => undefined);
      if (stored) return;
      const next: Theme = e.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [mounted]);

  async function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    // Persist to IDB (migration runs inside setTheme if not done yet).
    await getUserSettingsStore().setTheme(next);
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle dark mode"
        className="btn-outline"
        disabled
      >
        <Sun size={16} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="btn-outline"
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}

export default ThemeToggle;
