/**
 * ThemeToggle.test.tsx
 *
 * Tests for components/ThemeToggle.tsx and lib/theme.ts. Verifies issue #2
 * acceptance criteria:
 *  - toggling flips the `dark` class on <html> and persists the choice
 *  - the persisted choice (not the OS preference) wins on next mount
 *
 * Run: `npm run test`
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import { THEME_STORAGE_KEY } from '@/lib/theme';

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

  it('toggling adds the dark class and persists the choice', async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('toggling back removes the dark class', async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
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
