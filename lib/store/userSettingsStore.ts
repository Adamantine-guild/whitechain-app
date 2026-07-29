/**
 * User Settings Store
 *
 * Async persistent store for user preferences (theme, custom token lists,
 * UI preferences). Data is persisted to IndexedDB via the encryption layer.
 *
 * On first load a one-time migration moves legacy localStorage entries
 * (e.g. 'whitechain-theme') into IndexedDB and removes them from
 * localStorage so the app never reads from localStorage again.
 *
 * Usage:
 * ```ts
 * const store = getUserSettingsStore();
 * const theme = await store.getTheme();   // 'light' | 'dark' | undefined
 * await store.setTheme('dark');
 * ```
 */

import {
  getPersistenceStore,
  migrateFromLocalStorage,
  type IdbPersistenceStore,
} from './persistence/idb';

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
 * Returns the application-wide user settings store.
 * Pass an override to inject a test double (uses a fresh instance when override
 * is provided, so tests remain isolated).
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
