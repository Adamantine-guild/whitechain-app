/**
 * ThemeToggle.test.tsx
 *
 * Tests for components/ThemeToggle.tsx and lib/theme.ts. Verifies issue #2
 * acceptance criteria:
 *  - toggling flips the `dark` class on <html> and persists the choice
 *  - the persisted choice (not the OS preference) wins on next mount
 *
 * Since issue #75 the theme preference is persisted to IndexedDB via
 * UserSettingsStore, not to localStorage. Tests that previously checked
 * localStorage.getItem now verify the async IDB store instead.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import {
  getUserSettingsStore,
  _resetUserSettingsStoreSingleton,
} from '@/lib/store/userSettingsStore';
import { MemoryPersistenceStore, _resetPersistenceStoreSingleton } from '@/lib/store/persistence/idb';

function mockMatchMedia(matchesDark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('dark') && matchesDark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia;
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
    // Reset singletons so each test gets a clean in-memory IDB store.
    _resetPersistenceStoreSingleton();
    _resetUserSettingsStoreSingleton();
    // Inject a MemoryPersistenceStore so tests don't touch real IndexedDB.
    getUserSettingsStore(new MemoryPersistenceStore());
  });
  afterEach(() => cleanup());

  it('defaults to the OS preference when nothing is stored', async () => {
    mockMatchMedia(true);
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Switch to light mode');
  });

  it('toggling adds the dark class and persists the choice to IDB', async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    // Theme is persisted to IDB, NOT localStorage.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    const stored = await getUserSettingsStore().getTheme();
    expect(stored).toBe('dark');
  });

  it('toggling back removes the dark class and updates IDB', async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    // localStorage is not touched.
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    const stored = await getUserSettingsStore().getTheme();
    expect(stored).toBe('light');
  });

  it('honors a previously persisted choice over the OS preference', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    mockMatchMedia(false);
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Switch to light mode');
  });
});
