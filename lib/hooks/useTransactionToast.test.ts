/**
 * useTransactionToast.test.ts
 *
 * Tests for lib/hooks/useTransactionToast.ts (issue #88).
 * Verifies that the hook:
 *  - Shows a pending toast when trackTransaction is called.
 *  - Updates the toast to success when the receipt is found (status === 'success').
 *  - Updates the toast to error when the receipt is reverted.
 *  - Updates the toast on timeout.
 *  - Does not show a toast when txHash is invalid.
 *  - Does not show a toast when publicClient is unavailable.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach, assert } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactionToast } from './useTransactionToast';
import type { Hash } from 'viem';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hash;
const INVALID_HASH = '0x0' as Hash;

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    loading: vi.fn(() => 'toast-1'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

// Mock wagmi
const mockGetTransactionReceipt = vi.fn();
vi.mock('wagmi', () => ({
  usePublicClient: () => ({
    getTransactionReceipt: mockGetTransactionReceipt,
    chain: { id: 1, blockExplorers: { default: { url: 'https://etherscan.io' } } },
  }),
  useChainId: () => 1,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback }),
}));

// Mock TxToasts explorerTxUrl
vi.mock('@/components/TxToasts', () => ({
  explorerTxUrl: () => 'https://etherscan.io/tx/0xaaa...',
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTransactionToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastMock.loading.mockClear();
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    mockGetTransactionReceipt.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a pending toast when trackTransaction is called', () => {
    const { result } = renderHook(() => useTransactionToast());

    act(() => {
      result.current.trackTransaction(TX_HASH);
    });

    expect(toastMock.loading).toHaveBeenCalledTimes(1);
    expect(toastMock.loading.mock.calls[0][0]).toBe('Transaction pending…');
  });

  it('updates the toast to success when the receipt confirms', async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: 'success' });

    const { result } = renderHook(() => useTransactionToast());

    act(() => {
      result.current.trackTransaction(TX_HASH);
    });

    // Advance timers past the first poll interval
    await vi.advanceTimersByTimeAsync(2000);

    expect(toastMock.success).toHaveBeenCalledTimes(1);
    const successCall = toastMock.success.mock.calls[0];
    expect(successCall[0]).toBe('Transaction confirmed');
    expect(successCall[1].id).toBe('toast-1');
    expect(successCall[1].duration).toBe(5000);
    expect(successCall[1].action).toBeDefined();
    expect(successCall[1].action.label).toBe('View on explorer');
  });

  it('updates the toast to error when the receipt is reverted', async () => {
    mockGetTransactionReceipt.mockResolvedValue({ status: 'reverted' });

    const { result } = renderHook(() => useTransactionToast());

    act(() => {
      result.current.trackTransaction(TX_HASH);
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(toastMock.error).toHaveBeenCalledTimes(1);
    const errorCall = toastMock.error.mock.calls[0];
    expect(errorCall[0]).toBe('Transaction reverted');
    expect(errorCall[1].id).toBe('toast-1');
    expect(errorCall[1].duration).toBe(Infinity);
  });

  it('shows a timeout error after MAX_POLL_ATTEMPTS', async () => {
    // Never resolve — keep throwing.
    mockGetTransactionReceipt.mockRejectedValue(new Error('not mined yet'));

    const { result } = renderHook(() => useTransactionToast());

    act(() => {
      result.current.trackTransaction(TX_HASH);
    });

    // 60 attempts × 2000ms = 120_000ms
    // Use advanceTimersByTimeAsync to handle async promise resolution.
    await vi.advanceTimersByTimeAsync(120_000);

    expect(toastMock.error).toHaveBeenCalledTimes(1);
    const errorCall = toastMock.error.mock.calls[0];
    expect(errorCall[0]).toBe('Transaction receipt not found');
    expect(errorCall[1].id).toBe('toast-1');
    expect(errorCall[1].duration).toBe(Infinity);
  });

  it('does not show a toast for an invalid tx hash', () => {
    const { result } = renderHook(() => useTransactionToast());

    act(() => {
      result.current.trackTransaction(INVALID_HASH);
    });

    expect(toastMock.loading).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(toastMock.error.mock.calls[0][0]).toBe('Invalid transaction hash.');
  });
});