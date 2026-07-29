/**
 * User Settings Store
 *
 * This file exports two complementary stores:
 *
 * 1. `useUserSettingsStore` — Zustand store for UI settings that need to be
 *    synchronously available to React components (e.g. slippage tolerance).
 *    Persisted via Zustand's `persist` middleware.
 *
 * 2. `UserSettingsStore` / `getUserSettingsStore` — Async IDB-backed store
 *    for sensitive or large preferences (theme, custom token lists, arbitrary
 *    flags). Data is persisted to IndexedDB via the encryption layer in
 *    `lib/store/persistence/idb.ts`. On first load a one-time migration moves
 *    legacy localStorage entries into IndexedDB.
 *
 * Usage — slippage (Zustand, synchronous):
 * ```ts
 * import { useUserSettingsStore } from '@/lib/store/userSettingsStore';
 * const slippage = useUserSettingsStore((s) => s.slippage);
 * const setSlippage = useUserSettingsStore((s) => s.setSlippage);
 * ```
 *
 * Usage — theme / tokens (IDB, async):
 * ```ts
 * import { getUserSettingsStore } from '@/lib/store/userSettingsStore';
 * const theme = await getUserSettingsStore().getTheme();
 * await getUserSettingsStore().setTheme('dark');
 * ```
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getPersistenceStore,
  migrateFromLocalStorage,
  type IdbPersistenceStore,
} from './persistence/idb';

// ===========================================================================
// Part 1 — Zustand slippage store (synchronous, for UI components)
// ===========================================================================

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
// Zustand store
// ---------------------------------------------------------------------------

/**
 * Global user settings store, persisted to localStorage under
 * `whitechain-user-settings`.
 *
 * Slippage is a non-sensitive numeric preference that must be synchronously
 * available to React components, so Zustand + persist middleware is the right
 * tool here. For sensitive or large data (theme, token lists) use
 * `getUserSettingsStore()` instead.
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

// ===========================================================================
// Part 2 — IDB-backed async store (theme, custom tokens, preferences)
// ===========================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark';

export interface CustomToken {
  /** ERC-20 contract address (checksummed). */
  address: string;
  /** Chain ID the token lives on. */
  chainId: number;
  symbol: string;
  decimals: number;
  /** Optional display name. */
  name?: string;
}

export interface UserSettings {
  theme?: Theme;
  customTokens?: CustomToken[];
  /** Any other arbitrary preference flags. */
  preferences?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEY_THEME = 'whitechain-theme';
const KEY_CUSTOM_TOKENS = 'whitechain-custom-tokens';
const KEY_PREFERENCES = 'whitechain-preferences';

/** Legacy localStorage keys that are migrated on first run. */
const LEGACY_LOCALSTORAGE_KEYS = [KEY_THEME, KEY_CUSTOM_TOKENS, KEY_PREFERENCES];

// ---------------------------------------------------------------------------
// UserSettingsStore class
// ---------------------------------------------------------------------------

export class UserSettingsStore {
  private readonly store: IdbPersistenceStore;
  private migrationPromise: Promise<void> | null = null;

  constructor(store?: IdbPersistenceStore) {
    this.store = store ?? getPersistenceStore();
  }

  // -------------------------------------------------------------------------
  // Migration (runs once per session; idempotent across sessions)
  // -------------------------------------------------------------------------

  /**
   * Migrate any legacy localStorage values into the IDB store.
   * Called lazily on the first read/write so the app doesn't block startup.
   * Safe to call multiple times — the second call returns the cached promise.
   */
  ensureMigrated(): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = migrateFromLocalStorage(
        this.store,
        LEGACY_LOCALSTORAGE_KEYS,
        { sensitive: false }
      );
    }
    return this.migrationPromise;
  }

  // -------------------------------------------------------------------------
  // Theme
  // -------------------------------------------------------------------------

  async getTheme(): Promise<Theme | undefined> {
    await this.ensureMigrated();
    return this.store.get<Theme>(KEY_THEME);
  }

  async setTheme(theme: Theme): Promise<void> {
    await this.ensureMigrated();
    await this.store.set(KEY_THEME, theme, false);
  }

  async clearTheme(): Promise<void> {
    await this.store.delete(KEY_THEME);
  }

  // -------------------------------------------------------------------------
  // Custom tokens
  // -------------------------------------------------------------------------

  async getCustomTokens(): Promise<CustomToken[]> {
    await this.ensureMigrated();
    return (await this.store.get<CustomToken[]>(KEY_CUSTOM_TOKENS)) ?? [];
  }

  async setCustomTokens(tokens: CustomToken[]): Promise<void> {
    await this.ensureMigrated();
    await this.store.set(KEY_CUSTOM_TOKENS, tokens, false);
  }

  async addCustomToken(token: CustomToken): Promise<void> {
    const existing = await this.getCustomTokens();
    const deduped = existing.filter(
      (t) =>
        !(
          t.address.toLowerCase() === token.address.toLowerCase() &&
          t.chainId === token.chainId
        )
    );
    await this.setCustomTokens([...deduped, token]);
  }

  async removeCustomToken(address: string, chainId: number): Promise<void> {
    const existing = await this.getCustomTokens();
    await this.setCustomTokens(
      existing.filter(
        (t) =>
          !(t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId)
      )
    );
  }

  // -------------------------------------------------------------------------
  // Arbitrary preferences
  // -------------------------------------------------------------------------

  async getPreferences(): Promise<Record<string, unknown>> {
    await this.ensureMigrated();
    return (await this.store.get<Record<string, unknown>>(KEY_PREFERENCES)) ?? {};
  }

  async setPreference(key: string, value: unknown): Promise<void> {
    const prefs = await this.getPreferences();
    await this.store.set(KEY_PREFERENCES, { ...prefs, [key]: value }, false);
  }

  async deletePreference(key: string): Promise<void> {
    const prefs = await this.getPreferences();
    const { [key]: _removed, ...rest } = prefs;
    await this.store.set(KEY_PREFERENCES, rest, false);
  }

  // -------------------------------------------------------------------------
  // Bulk operations
  // -------------------------------------------------------------------------

  async getAll(): Promise<UserSettings> {
    const [theme, customTokens, preferences] = await Promise.all([
      this.getTheme(),
      this.getCustomTokens(),
      this.getPreferences(),
    ]);
    return { theme, customTokens, preferences };
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.store.delete(KEY_THEME),
      this.store.delete(KEY_CUSTOM_TOKENS),
      this.store.delete(KEY_PREFERENCES),
    ]);
    // Allow migration to run again after a full clear.
    this.migrationPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance: UserSettingsStore | null = null;

/**
 * Returns the application-wide IDB-backed user settings store.
 * Pass an override to inject a test double (uses a fresh instance when
 * override is provided, so tests remain isolated).
 */
export function getUserSettingsStore(override?: IdbPersistenceStore): UserSettingsStore {
  if (override) return new UserSettingsStore(override);
  if (!_instance) _instance = new UserSettingsStore();
  return _instance;
}

/**
 * Reset the singleton (for tests only).
 * @internal
 */
export function _resetUserSettingsStoreSingleton(): void {
  _instance = null;
}
