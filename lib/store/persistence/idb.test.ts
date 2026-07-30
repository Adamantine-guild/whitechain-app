/**
 * Tests for lib/store/persistence/idb.ts
 *
 * All tests run against the MemoryPersistenceStore (no real IndexedDB needed)
 * so they work in jsdom/vitest without extra setup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MemoryPersistenceStore,
  migrateFromLocalStorage,
  getPersistenceStore,
  _resetPersistenceStoreSingleton,
} from './idb';

// ---------------------------------------------------------------------------
// MemoryPersistenceStore
// ---------------------------------------------------------------------------

describe('MemoryPersistenceStore', () => {
  let store: MemoryPersistenceStore;

  beforeEach(() => {
    store = new MemoryPersistenceStore();
  });

  it('returns undefined for a missing key', async () => {
    expect(await store.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a primitive value', async () => {
    await store.set('count', 42);
    expect(await store.get<number>('count')).toBe(42);
  });

  it('stores and retrieves an object', async () => {
    const obj = { theme: 'dark', tokens: ['ETH'] };
    await store.set('settings', obj);
    expect(await store.get('settings')).toEqual(obj);
  });

  it('overwrites an existing key', async () => {
    await store.set('key', 'first');
    await store.set('key', 'second');
    expect(await store.get('key')).toBe('second');
  });

  it('deletes a key', async () => {
    await store.set('key', 'value');
    await store.delete('key');
    expect(await store.get('key')).toBeUndefined();
  });

  it('delete is a no-op for a missing key', async () => {
    await expect(store.delete('nonexistent')).resolves.toBeUndefined();
  });

  it('clears all keys', async () => {
    await store.set('a', 1);
    await store.set('b', 2);
    await store.clear();
    expect(await store.get('a')).toBeUndefined();
    expect(await store.get('b')).toBeUndefined();
  });

  it('returns all keys', async () => {
    await store.set('x', 1);
    await store.set('y', 2);
    const keys = await store.keys();
    expect(keys.sort()).toEqual(['x', 'y']);
  });

  it('keys() returns empty array when store is empty', async () => {
    expect(await store.keys()).toEqual([]);
  });

  it('treats sensitive flag as a no-op (memory store has no encryption)', async () => {
    await store.set('secret', { token: 'abc' }, true);
    expect(await store.get('secret')).toEqual({ token: 'abc' });
  });
});

// ---------------------------------------------------------------------------
// migrateFromLocalStorage
// ---------------------------------------------------------------------------

describe('migrateFromLocalStorage', () => {
  let store: MemoryPersistenceStore;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    store = new MemoryPersistenceStore();
    localStorageMock = {};

    // Stub window.localStorage
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => localStorageMock[key] ?? null,
        removeItem: (key: string) => { delete localStorageMock[key]; },
        setItem: (key: string, value: string) => { localStorageMock[key] = value; },
      },
    });
  });

  it('migrates a JSON string from localStorage into the store', async () => {
    localStorageMock['whitechain-theme'] = '"dark"';
    await migrateFromLocalStorage(store, ['whitechain-theme']);
    expect(await store.get('whitechain-theme')).toBe('dark');
  });

  it('removes the key from localStorage after migration', async () => {
    localStorageMock['whitechain-theme'] = '"light"';
    await migrateFromLocalStorage(store, ['whitechain-theme']);
    expect(localStorageMock['whitechain-theme']).toBeUndefined();
  });

  it('migrates a non-JSON string as a raw string', async () => {
    localStorageMock['raw-key'] = 'not-json';
    await migrateFromLocalStorage(store, ['raw-key']);
    expect(await store.get('raw-key')).toBe('not-json');
  });

  it('skips keys absent from localStorage', async () => {
    await migrateFromLocalStorage(store, ['missing-key']);
    expect(await store.keys()).toEqual([]);
  });

  it('migrates multiple keys in a single call', async () => {
    localStorageMock['k1'] = '"v1"';
    localStorageMock['k2'] = '"v2"';
    await migrateFromLocalStorage(store, ['k1', 'k2']);
    expect(await store.get('k1')).toBe('v1');
    expect(await store.get('k2')).toBe('v2');
    expect(localStorageMock['k1']).toBeUndefined();
    expect(localStorageMock['k2']).toBeUndefined();
  });

  it('is idempotent — second call is a no-op because key was removed', async () => {
    localStorageMock['whitechain-theme'] = '"dark"';
    await migrateFromLocalStorage(store, ['whitechain-theme']);
    // Overwrite IDB value manually.
    await store.set('whitechain-theme', 'light');
    // Second migration: localStorage key is gone, so IDB stays as 'light'.
    await migrateFromLocalStorage(store, ['whitechain-theme']);
    expect(await store.get('whitechain-theme')).toBe('light');
  });
});

// ---------------------------------------------------------------------------
// getPersistenceStore singleton
// ---------------------------------------------------------------------------

describe('getPersistenceStore', () => {
  beforeEach(() => {
    _resetPersistenceStoreSingleton();
  });

  it('returns a MemoryPersistenceStore when IndexedDB is unavailable (SSR)', () => {
    // Simulate SSR: no window.
    vi.stubGlobal('window', undefined);
    const store = getPersistenceStore();
    expect(store).toBeInstanceOf(MemoryPersistenceStore);
  });

  it('returns the same instance on repeated calls (singleton)', () => {
    vi.stubGlobal('window', undefined);
    const a = getPersistenceStore();
    const b = getPersistenceStore();
    expect(a).toBe(b);
  });

  it('returns the override if provided without caching it', () => {
    const override = new MemoryPersistenceStore();
    const store = getPersistenceStore(override);
    expect(store).toBe(override);
  });
});
