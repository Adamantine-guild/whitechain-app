/**
 * useTransactionReceiptWatcher.test.ts
 *
 * Tests for lib/hooks/useTransactionReceiptWatcher.ts.
 * Verifies that the hook:
 *  - records an optimistic deduction on mount
 *  - does not record when txHash is undefined
 *  - does not record when amount is 0
 *
 * The receipt polling logic (confirm/revert on receipt) is tested indirectly
 * through the store tests in optimisticStore.test.ts.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTransactionReceiptWatcher } from './useTransactionReceiptWatcher';
import { useOptimisticStore } from '@/lib/store/optimisticStore';
import type { Address, Hash } from 'viem';

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hash;
const AMOUNT = 1000n;

// Mock wagmi hooks
const mockGetTransactionReceipt = vi.fn();
vi.mock('wagmi', () => ({
  usePublicClient: () => ({
    getTransactionReceipt: mockGetTransactionReceipt,
  }),
  useChainId: () => 1,
  useAccount: () => ({ address: ADDRESS }),
}));

// Mock TxToasts to avoid sonner dependency
vi.mock('@/components/TxToasts', () => ({
  notifyTxError: vi.fn(),
}));

describe('useTransactionReceiptWatcher', () => {
  beforeEach(() => {
    useOptimisticStore.setState({ deductions: {} });
    mockGetTransactionReceipt.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records an optimistic deduction on mount', () => {
    renderHook(() =>
      useTransactionReceiptWatcher(ADDRESS, TX_HASH, AMOUNT)
    );

    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(AMOUNT);
  });

  it('does not record when txHash is undefined', () => {
    renderHook(() =>
      useTransactionReceiptWatcher(ADDRESS, undefined, AMOUNT)
    );

    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(0n);
  });

  it('does not record when amount is 0', () => {
    renderHook(() =>
      useTransactionReceiptWatcher(ADDRESS, TX_HASH, 0n)
    );

    const pending = useOptimisticStore.getState().getPendingDeduction(ADDRESS);
    expect(pending).toBe(0n);
  });
});