'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Slippage tolerance expressed as a percentage (e.g. 0.5 = 0.5 %). */
export type SlippageValue = number;

export interface UserSettingsState {
  /** Current slippage tolerance in percent. Default 0.5 %. */
  slippage: SlippageValue;
  /** Update the slippage tolerance. Passed value is clamped to [0, 50]. */
  setSlippage: (value: SlippageValue) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_SLIPPAGE: SlippageValue = 0.5;

export const PRESET_SLIPPAGE_VALUES: SlippageValue[] = [0.1, 0.5, 1.0];

/** Anything above this is considered risky (sandwich-attack territory). */
export const SLIPPAGE_WARNING_THRESHOLD = 5;

/** Hard upper bound — values above this are rejected by validation. */
export const SLIPPAGE_MAX = 50;

/** Hard lower bound — negative values are rejected. */
export const SLIPPAGE_MIN = 0;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Global user settings store, persisted to localStorage under
 * `whitechain-user-settings`.
 *
 * Usage:
 * ```ts
 * import { useUserSettingsStore } from '@/lib/store/userSettingsStore';
 *
 * const slippage = useUserSettingsStore((s) => s.slippage);
 * const setSlippage = useUserSettingsStore((s) => s.setSlippage);
 * ```
 */
export const useUserSettingsStore = create<UserSettingsState>()(
  persist(
    (set) => ({
      slippage: DEFAULT_SLIPPAGE,
      setSlippage: (value: SlippageValue) =>
        set({
          slippage: Math.max(SLIPPAGE_MIN, Math.min(SLIPPAGE_MAX, value))
        })
    }),
    {
      name: 'whitechain-user-settings'
    }
  )
);

// ---------------------------------------------------------------------------
// Validation helpers (framework-agnostic, easy to test)
// ---------------------------------------------------------------------------

export type SlippageValidationResult =
  | { valid: true }
  | { valid: false; message: string };

/**
 * Validates a raw slippage input string.
 *
 * Returns `{ valid: true }` if the value is a non-negative number ≤ 50.
 * Otherwise returns `{ valid: false, message }` with a human-readable error.
 */
export function validateSlippageInput(raw: string): SlippageValidationResult {
  if (raw === '') {
    return { valid: false, message: 'Slippage cannot be empty.' };
  }

  const trimmed = raw.trim();

  // Allow trailing decimal point during editing (e.g. "5.") but not bare ".".
  if (trimmed === '.' || trimmed === '') {
    return { valid: false, message: 'Enter a valid number.' };
  }

  // Reject multiple dots, leading zeros that aren't "0.x", etc.
  if (!/^-?\d+(\.\d*)?$/.test(trimmed)) {
    return { valid: false, message: 'Enter a valid number.' };
  }

  const num = Number(trimmed);

  if (Number.isNaN(num)) {
    return { valid: false, message: 'Enter a valid number.' };
  }

  if (num < SLIPPAGE_MIN) {
    return { valid: false, message: 'Slippage cannot be negative.' };
  }

  if (num > SLIPPAGE_MAX) {
    return {
      valid: false,
      message: `Slippage cannot exceed ${SLIPPAGE_MAX} %.`
    };
  }

  return { valid: true };
}

/**
 * Returns `true` if the given slippage value is high enough to warrant a
 * sandwich-attack warning.
 */
export function isSlippageRisky(value: SlippageValue): boolean {
  return value > SLIPPAGE_WARNING_THRESHOLD && value <= SLIPPAGE_MAX;
}
