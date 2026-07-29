/**
 * Tests for lib/store/transactionHistoryStore.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TransactionHistoryStore,
  getTransactionHistoryStore,
  _resetTransactionHistoryStoreSingleton,
  type TransactionRecord,
} from '../transactionHistoryStore';
import { MemoryPersistenceStore } from './idb';

function makeStore(maxEntries?: number) {
  return new TransactionHistoryStore(new MemoryPersistenceStore(), maxEntries);
}

const baseTx: TransactionRecord = {
  hash: '0xabc123',
  chainId: 1,
  timestamp: 1_700_000_000_000,
  from: '0xsender',
  to: '0xrecipient',
  value: '0.1 ETH',
  status: 'pending',
};

describe('TransactionHistoryStore — getTransactions', () => {
  it('returns an empty array when no history is stored', async () => {
    const store = makeStore();
    expect(await store.getTransactions()).toEqual([]);
  });
});

describe('TransactionHistoryStore — addTransaction', () => {
  it('stores and retrieves a transaction', async () => {
    const store = makeStore();
    await store.addTransaction(baseTx);
    const txs = await store.getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].hash).toBe('0xabc123');
  });

  it('prepends new transactions (most recent first)', async () => {
    const store = makeStore();
    await store.addTransaction({ ...baseTx, hash: '0xfirst', timestamp: 1000 });
    await store.addTransaction({ ...baseTx, hash: '0xsecond', timestamp: 2000 });
    const txs = await store.getTransactions();
    expect(txs[0].hash).toBe('0xsecond');
    expect(txs[1].hash).toBe('0xfirst');
  });

  it('upserts when the same hash is added again', async () => {
    const store = makeStore();
    await store.addTransaction({ ...baseTx, status: 'pending' });
    await store.addTransaction({ ...baseTx, status: 'confirmed', blockNumber: 100 });
    const txs = await store.getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].status).toBe('confirmed');
    expect(txs[0].blockNumber).toBe(100);
  });

  it('upsert is case-insensitive for the hash', async () => {
    const store = makeStore();
    await store.addTransaction({ ...baseTx, hash: '0xABC123' });
    await store.addTransaction({ ...baseTx, hash: '0xabc123', status: 'failed' });
    const txs = await store.getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].status).toBe('failed');
  });

  it('trims to maxEntries', async () => {
    const store = makeStore(3);
    await store.addTransaction({ ...baseTx, hash: '0x01', timestamp: 1 });
    await store.addTransaction({ ...baseTx, hash: '0x02', timestamp: 2 });
    await store.addTransaction({ ...baseTx, hash: '0x03', timestamp: 3 });
    await store.addTransaction({ ...baseTx, hash: '0x04', timestamp: 4 });
    const txs = await store.getTransactions();
    expect(txs).toHaveLength(3);
    // Oldest entry (0x01) should have been dropped.
    expect(txs.map((t) => t.hash)).not.toContain('0x01');
  });
});

describe('TransactionHistoryStore — getTransactionsByChain', () => {
  it('filters by chainId', async () => {
    const store = makeStore();
    await store.addTransaction({ ...baseTx, hash: '0x1', chainId: 1 });
    await store.addTransaction({ ...baseTx, hash: '0x2', chainId: 137 });
    const mainnet = await store.getTransactionsByChain(1);
    expect(mainnet).toHaveLength(1);
    expect(mainnet[0].hash).toBe('0x1');
  });
});

describe('TransactionHistoryStore — getTransaction', () => {
  it('finds a transaction by hash', async () => {
    const store = makeStore();
    await store.addTransaction(baseTx);
    const tx = await store.getTransaction('0xabc123');
    expect(tx?.status).toBe('pending');
  });

  it('returns undefined for an unknown hash', async () => {
    const store = makeStore();
    expect(await store.getTransaction('0xdeadbeef')).toBeUndefined();
  });

  it('is case-insensitive', async () => {
    const store = makeStore();
    await store.addTransaction({ ...baseTx, hash: '0xABC' });
    expect(await store.getTransaction('0xabc')).toBeDefined();
  });
});

describe('TransactionHistoryStore — updateTransactionStatus', () => {
  it('updates the status of an existing transaction', async () => {
    const store = makeStore();
    await store.addTransaction(baseTx);
    await store.updateTransactionStatus('0xabc123', 'confirmed', 500);
    const tx = await store.getTransaction('0xabc123');
    expect(tx?.status).toBe('confirmed');
    expect(tx?.blockNumber).toBe(500);
  });

  it('is a no-op for an unknown hash', async () => {
    const store = makeStore();
    await store.addTransaction(baseTx);
    await store.updateTransactionStatus('0xunknown', 'failed');
    const txs = await store.getTransactions();
    expect(txs).toHaveLength(1);
    expect(txs[0].status).toBe('pending');
  });

  it('preserves blockNumber when not provided', async () => {
    const store = makeStore();
    await store.addTransaction({ ...baseTx, blockNumber: 42 });
    await store.updateTransactionStatus('0xabc123', 'confirmed');
    const tx = await store.getTransaction('0xabc123');
    expect(tx?.blockNumber).toBe(42);
  });
});

describe('TransactionHistoryStore — removeTransaction', () => {
  it('removes a transaction by hash', async () => {
    const store = makeStore();
    await store.addTransaction(baseTx);
    await store.removeTransaction('0xabc123');
    expect(await store.getTransactions()).toEqual([]);
  });

  it('is a no-op for an unknown hash', async () => {
    const store = makeStore();
    await store.addTransaction(baseTx);
    await store.removeTransaction('0xunknown');
    expect(await store.getTransactions()).toHaveLength(1);
  });
});

describe('TransactionHistoryStore — clear', () => {
  it('removes all transactions', async () => {
    const store = makeStore();
    await store.addTransaction(baseTx);
    await store.clear();
    expect(await store.getTransactions()).toEqual([]);
  });
});

describe('getTransactionHistoryStore singleton', () => {
  beforeEach(() => {
    _resetTransactionHistoryStoreSingleton();
  });

  it('returns a fresh instance when an override is provided', () => {
    const idb = new MemoryPersistenceStore();
    const a = getTransactionHistoryStore(idb);
    const b = getTransactionHistoryStore(idb);
    expect(a).not.toBe(b);
  });
});
