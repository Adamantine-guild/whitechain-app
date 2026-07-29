/**
 * Tests for lib/store/userSettingsStore.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UserSettingsStore,
  getUserSettingsStore,
  _resetUserSettingsStoreSingleton,
  type CustomToken,
} from '../userSettingsStore';
import { MemoryPersistenceStore } from './idb';

function makeStore() {
  return new UserSettingsStore(new MemoryPersistenceStore());
}

describe('UserSettingsStore — theme', () => {
  it('returns undefined when no theme is set', async () => {
    const store = makeStore();
    expect(await store.getTheme()).toBeUndefined();
  });

  it('persists and retrieves a theme', async () => {
    const store = makeStore();
    await store.setTheme('dark');
    expect(await store.getTheme()).toBe('dark');
  });

  it('overwrites the theme on subsequent sets', async () => {
    const store = makeStore();
    await store.setTheme('dark');
    await store.setTheme('light');
    expect(await store.getTheme()).toBe('light');
  });

  it('clearTheme removes the stored theme', async () => {
    const store = makeStore();
    await store.setTheme('dark');
    await store.clearTheme();
    expect(await store.getTheme()).toBeUndefined();
  });
});

describe('UserSettingsStore — customTokens', () => {
  const token: CustomToken = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 1,
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  };

  it('returns an empty array when no tokens are stored', async () => {
    const store = makeStore();
    expect(await store.getCustomTokens()).toEqual([]);
  });

  it('persists and retrieves a token list', async () => {
    const store = makeStore();
    await store.setCustomTokens([token]);
    expect(await store.getCustomTokens()).toEqual([token]);
  });

  it('addCustomToken appends a new token', async () => {
    const store = makeStore();
    await store.addCustomToken(token);
    const tokens = await store.getCustomTokens();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].symbol).toBe('USDC');
  });

  it('addCustomToken deduplicates by address + chainId (case-insensitive)', async () => {
    const store = makeStore();
    await store.addCustomToken(token);
    // Add the same address in different case.
    await store.addCustomToken({
      ...token,
      address: token.address.toLowerCase(),
      name: 'Updated Name',
    });
    const tokens = await store.getCustomTokens();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('Updated Name');
  });

  it('removeCustomToken removes by address + chainId', async () => {
    const store = makeStore();
    await store.addCustomToken(token);
    await store.removeCustomToken(token.address, token.chainId);
    expect(await store.getCustomTokens()).toEqual([]);
  });

  it('removeCustomToken is case-insensitive', async () => {
    const store = makeStore();
    await store.addCustomToken(token);
    await store.removeCustomToken(token.address.toLowerCase(), token.chainId);
    expect(await store.getCustomTokens()).toEqual([]);
  });
});

describe('UserSettingsStore — preferences', () => {
  it('returns empty object when no preferences are set', async () => {
    const store = makeStore();
    expect(await store.getPreferences()).toEqual({});
  });

  it('sets and retrieves a preference', async () => {
    const store = makeStore();
    await store.setPreference('showTestnets', true);
    const prefs = await store.getPreferences();
    expect(prefs.showTestnets).toBe(true);
  });

  it('merges preferences on multiple set calls', async () => {
    const store = makeStore();
    await store.setPreference('showTestnets', true);
    await store.setPreference('defaultSlippage', 0.5);
    const prefs = await store.getPreferences();
    expect(prefs.showTestnets).toBe(true);
    expect(prefs.defaultSlippage).toBe(0.5);
  });

  it('deletePreference removes a single key', async () => {
    const store = makeStore();
    await store.setPreference('a', 1);
    await store.setPreference('b', 2);
    await store.deletePreference('a');
    const prefs = await store.getPreferences();
    expect(prefs.a).toBeUndefined();
    expect(prefs.b).toBe(2);
  });
});

describe('UserSettingsStore — getAll', () => {
  it('returns all settings in a single call', async () => {
    const store = makeStore();
    await store.setTheme('dark');
    await store.addCustomToken({
      address: '0x123',
      chainId: 1,
      symbol: 'TKN',
      decimals: 18,
    });
    await store.setPreference('showTestnets', false);

    const all = await store.getAll();
    expect(all.theme).toBe('dark');
    expect(all.customTokens).toHaveLength(1);
    expect(all.preferences?.showTestnets).toBe(false);
  });
});

describe('UserSettingsStore — clear', () => {
  it('removes all stored settings', async () => {
    const store = makeStore();
    await store.setTheme('dark');
    await store.addCustomToken({ address: '0x1', chainId: 1, symbol: 'X', decimals: 18 });
    await store.clear();
    expect(await store.getTheme()).toBeUndefined();
    expect(await store.getCustomTokens()).toEqual([]);
  });
});

describe('getUserSettingsStore singleton', () => {
  beforeEach(() => {
    _resetUserSettingsStoreSingleton();
  });

  it('returns the same instance on repeated calls', () => {
    const idb = new MemoryPersistenceStore();
    const a = getUserSettingsStore(idb);
    // Without override the singleton is used.
    const b = getUserSettingsStore(idb);
    // With override a fresh instance is returned each time.
    expect(a).not.toBe(b);
  });

  it('returns a fresh instance when an override is provided', () => {
    const idb = new MemoryPersistenceStore();
    const a = getUserSettingsStore(idb);
    const b = getUserSettingsStore(idb);
    expect(a).not.toBe(b);
  });
});
