/**
 * Fiat Currency Store
 *
 * A lightweight Zustand store (mirroring `useUserSettingsStore`) that tracks
 * the user's preferred fiat display currency.  The preference is persisted to
 * localStorage so it survives reloads and route changes within the app.
 *
 * Usage:
 * ```ts
 * import { useFiatCurrencyStore } from '@/lib/store/fiatCurrencyStore';
 * const currency = useFiatCurrencyStore((s) => s.currency);
 * const setCurrency = useFiatCurrencyStore((s) => s.setCurrency);
 * ```
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  DEFAULT_FIAT_CURRENCY,
  type FiatCurrency,
} from '@/src/utils/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FiatCurrencyState {
  /** The user's preferred display currency. Defaults to USD. */
  currency: FiatCurrency;
  /** Update the preferred display currency. */
  setCurrency: (currency: FiatCurrency) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Global fiat currency store, persisted to localStorage under
 * `whitechain-fiat-currency`.
 *
 * Currency is a non-sensitive UI preference that must be synchronously
 * available to React components, so Zustand + persist middleware is the right
 * tool here (same pattern as slippage in `userSettingsStore`).
 */
export const useFiatCurrencyStore = create<FiatCurrencyState>()(
  persist(
    (set) => ({
      currency: DEFAULT_FIAT_CURRENCY,
      setCurrency: (currency: FiatCurrency) => set({ currency }),
    }),
    {
      name: 'whitechain-fiat-currency',
    },
  ),
);