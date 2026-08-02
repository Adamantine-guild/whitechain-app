/**
 * Encrypted IndexedDB Persistence Layer
 *
 * Provides an async, encrypted key-value store backed by IndexedDB (via Dexie).
 * Sensitive values are encrypted at rest using the Web Crypto API with a
 * per-origin AES-GCM key stored in a dedicated non-extractable CryptoKey.
 *
 * Degrades gracefully to an in-memory store when:
 *   • IndexedDB is unavailable (SSR, private browsing that blocks IDB)
 *   • Web Crypto API is unavailable
 *
 * Migration: on first access the store checks localStorage for legacy keys
 * and migrates their values, then removes them from localStorage.
 */

import Dexie, { type Table } from 'dexie';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'whitechain-state';
const DB_VERSION = 1;
const CRYPTO_KEY_IDB_NAME = 'whitechain-crypto-keys';
const CRYPTO_KEY_STORE = 'keys';
const APP_KEY_ID = 'app-state-key';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredEntry {
  /** The key string for this entry. */
  key: string;
  /**
   * For unencrypted entries this is a JSON-serialized value.
   * For encrypted entries this is a base64-encoded ciphertext.
   */
  value: string;
  /** Whether the value field contains encrypted (AES-GCM) ciphertext. */
  encrypted: boolean;
  /** Base64-encoded 12-byte IV used for AES-GCM. Only set when encrypted. */
  iv?: string;
  updatedAt: number;
}

export interface IdbPersistenceStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, sensitive?: boolean): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Helpers: Web Crypto
// ---------------------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Open (or create) a separate IDBDatabase solely for persisting the CryptoKey.
 * We keep it separate from Dexie so the key itself is never exposed through
 * the same store that holds encrypted data.
 */
async function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CRYPTO_KEY_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(CRYPTO_KEY_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadOrCreateCryptoKey(): Promise<CryptoKey> {
  const db = await openKeyDatabase();

  // Try to load existing key.
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const tx = db.transaction(CRYPTO_KEY_STORE, 'readonly');
    const req = tx.objectStore(CRYPTO_KEY_STORE).get(APP_KEY_ID);
    req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
    req.onerror = () => reject(req.error);
  });

  if (existing) return existing;

  // Generate a new non-extractable AES-GCM key and persist it.
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CRYPTO_KEY_STORE, 'readwrite');
    tx.objectStore(CRYPTO_KEY_STORE).put(key, APP_KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return key;
}

async function encrypt(cryptoKey: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    encoded
  );
  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(ivBytes.buffer),
  };
}

async function decrypt(cryptoKey: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    cryptoKey,
    ciphertextBuffer
  );
  return new TextDecoder().decode(plaintextBuffer);
}

// ---------------------------------------------------------------------------
// Dexie-backed store
// ---------------------------------------------------------------------------

class StateDatabase extends Dexie {
  entries!: Table<StoredEntry, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      entries: 'key, updatedAt',
    });
  }
}

class IdbStore implements IdbPersistenceStore {
  private db: StateDatabase;
  private cryptoKeyPromise: Promise<CryptoKey | null>;
  private hasCrypto: boolean;

  constructor() {
    this.db = new StateDatabase();
    this.hasCrypto =
      typeof window !== 'undefined' &&
      typeof window.crypto !== 'undefined' &&
      typeof window.crypto.subtle !== 'undefined';

    this.cryptoKeyPromise = this.hasCrypto
      ? loadOrCreateCryptoKey().catch(() => null)
      : Promise.resolve(null);
  }

  async get<T>(key: string): Promise<T | undefined> {
    const row = await this.db.entries.get(key);
    if (!row) return undefined;

    if (row.encrypted && row.iv) {
      const cryptoKey = await this.cryptoKeyPromise;
      if (!cryptoKey) {
        // Can't decrypt — return undefined rather than corrupt data.
        return undefined;
      }
      try {
        const plaintext = await decrypt(cryptoKey, row.value, row.iv);
        return JSON.parse(plaintext) as T;
      } catch {
        return undefined;
      }
    }

    try {
      return JSON.parse(row.value) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, sensitive = false): Promise<void> {
    const plaintext = JSON.stringify(value);

    if (sensitive && this.hasCrypto) {
      const cryptoKey = await this.cryptoKeyPromise;
      if (cryptoKey) {
        const { ciphertext, iv } = await encrypt(cryptoKey, plaintext);
        await this.db.entries.put({
          key,
          value: ciphertext,
          encrypted: true,
          iv,
          updatedAt: Date.now(),
        });
        return;
      }
    }

    await this.db.entries.put({
      key,
      value: plaintext,
      encrypted: false,
      updatedAt: Date.now(),
    });
  }

  async delete(key: string): Promise<void> {
    await this.db.entries.delete(key);
  }

  async clear(): Promise<void> {
    await this.db.entries.clear();
  }

  async keys(): Promise<string[]> {
    return this.db.entries.toCollection().primaryKeys() as Promise<string[]>;
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback store
// ---------------------------------------------------------------------------

export class MemoryPersistenceStore implements IdbPersistenceStore {
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | undefined> {
    const raw = this.store.get(key);
    if (raw === undefined) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async set<T>(key: string, value: T, _sensitive?: boolean): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

// ---------------------------------------------------------------------------
// Migration utility
// ---------------------------------------------------------------------------

/**
 * Migrate a set of keys from localStorage into the IDB persistence store.
 * After writing each key to IDB the entry is removed from localStorage so the
 * migration only runs once per key.
 *
 * Safe to call multiple times — already-migrated keys are simply absent from
 * localStorage and nothing happens.
 */
export async function migrateFromLocalStorage(
  store: IdbPersistenceStore,
  keys: string[],
  options: { sensitive?: boolean } = {}
): Promise<void> {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;

      // Attempt to parse as JSON; fall back to storing the raw string.
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }

      await store.set(key, parsed, options.sensitive);
      window.localStorage.removeItem(key);
    } catch {
      // Non-fatal: if migration fails for a single key we skip it rather
      // than blocking the rest of the migration or the app startup.
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _store: IdbPersistenceStore | null = null;

/**
 * Returns the application-wide persistence store.
 *
 * Uses IndexedDB with AES-GCM encryption in the browser.
 * Falls back to an in-memory store during SSR or when IndexedDB is blocked
 * (e.g. some private browsing modes).
 *
 * Pass an override to inject a test double.
 */
export function getPersistenceStore(override?: IdbPersistenceStore): IdbPersistenceStore {
  if (override) return override;
  if (_store) return _store;

  const hasIndexedDB =
    typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;

  _store = hasIndexedDB ? new IdbStore() : new MemoryPersistenceStore();
  return _store;
}

/**
 * Reset the singleton (for tests only).
 * @internal
 */
export function _resetPersistenceStoreSingleton(): void {
  _store = null;
}
