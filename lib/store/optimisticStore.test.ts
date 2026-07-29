/**
 * optimisticStore.test.ts
 *
 * Tests for lib/store/optimisticStore.ts. Verifies that:
 *  - deductions are added, confirmed, and reverted correctly
 *  - getPendingDeduction returns the correct sum
 *  - getPendingDeductions returns only pending entries
 *  - prune removes old entries
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOptimisticStore } from './optimisticStore';
import type { Address, Hash } from 'viem';

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const TX_HASH_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hash;
const TX_HASH_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hash;

describe('optimisticStore', () => {
  beforeEach(() => {
    // Reset the store before each test.
    useOptimisticStore.setState({ deductions: {} });
  });

  it('adds a deduction and returns the pending total', () => {
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_A, 1000n);
    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(1000n);
  });

  it('accumulates multiple deductions', () => {
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_A, 1000n);
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_B, 500n);
    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(1500n);
  });

  it('reduces the pending total when a deduction is confirmed', () => {
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_A, 1000n);
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_B, 500n);
    useOptimisticStore.getState().confirmDeduction(ADDRESS, TX_HASH_A);
    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(500n);
  });

  it('reduces the pending total when a deduction is reverted', () => {
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_A, 1000n);
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_B, 500n);
    useOptimisticStore.getState().revertDeduction(ADDRESS, TX_HASH_B);
    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(1000n);
  });

  it('getPendingDeductions returns only pending entries', () => {
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_A, 1000n);
    useOptimisticStore.getState().addDeduction(ADDRESS, TX_HASH_B, 500n);
    useOptimisticStore.getState().confirmDeduction(ADDRESS, TX_HASH_A);
    const pending = useOptimisticStore.getState().getPendingDeductions(ADDRESS);
    expect(pending).toHaveLength(1);
    expect(pending[0].txHash).toBe(TX_HASH_B);
    expect(pending[0].status).toBe('pending');
  });

  it('returns 0 for an address with no deductions', () => {
    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(0n);
  });

  it('returns empty array for an address with no deductions', () => {
    const pending = useOptimisticStore.getState().getPendingDeductions(ADDRESS);
    expect(pending).toEqual([]);
  });

  it('prune removes old pending entries', () => {
    const oldTimestamp = Date.now() - 31 * 60 * 1000; // 31 minutes ago
    useOptimisticStore.setState({
      deductions: {
        [ADDRESS]: [
          {
            txHash: TX_HASH_A,
            amountWei: 1000n,
            timestamp: oldTimestamp,
            status: 'pending' as const,
          },
          {
            txHash: TX_HASH_B,
            amountWei: 500n,
            timestamp: Date.now(),
            status: 'pending' as const,
          },
        ],
      },
    });

    useOptimisticStore.getState().prune();
    const pending = useOptimisticStore.getState().getPendingDeductions(ADDRESS);
    expect(pending).toHaveLength(1);
    expect(pending[0].txHash).toBe(TX_HASH_B);
  });

  it('prune removes empty address entries', () => {
    useOptimisticStore.setState({
      deductions: {
        [ADDRESS]: [],
      },
    });

    useOptimisticStore.getState().prune();
    const deductions = useOptimisticStore.getState().deductions;
    expect(deductions[ADDRESS]).toBeUndefined();
  });
});