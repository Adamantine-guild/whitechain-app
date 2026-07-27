'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY, applyTheme, getPreferredTheme, type Theme } from '@/lib/theme';

/**
 * System-aware dark mode toggle (#2). The initial class is already applied
 * by the inline `NO_FLASH_THEME_SCRIPT` in `app/layout.tsx` before React
 * hydrates; this component reconciles its own state to match on mount so it
 * never has to guess (and never flashes) on the client.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    // Reconciles the DOM class with our reported state even if the inline
    // no-flash script (app/layout.tsx) didn't run for some reason.
    applyTheme(initial);
    setMounted(true);
  }, []);

  // Follow the OS preference live, but only while the user hasn't made an
  // explicit choice of their own.
  useEffect(() => {
    if (!mounted) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;
      const next: Theme = e.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [mounted]);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
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
