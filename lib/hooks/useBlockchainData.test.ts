/**
 * useBlockchainData.test.ts
 *
 * Tests for lib/hooks/useBlockchainData.ts (issue #29). Proves the actual
 * regression this hook fixes: the old BalanceDisplay code called
 * `refetch()` on *every* block. These tests assert invalidateQueries is a
 * no-op on irrelevant blocks and only fires when a tx touches the
 * connected address.
 *
 * `wagmi` is mocked; `watchBlocks` is a controllable stub so no network
 * calls are made and we can hand-feed block payloads.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getBalanceQueryKey } from 'wagmi/query';
import { useBlockchainDataSync } from './useBlockchainData';

const ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`;
const OTHER = '0x2222222222222222222222222222222222222222' as `0x${string}`;
const CHAIN_ID = 1;

type OnBlock = (block: {
  number: bigint;
  transactions: Array<{ from?: `0x${string}`; to?: `0x${string}` | null } | string>;
}) => void;

let capturedOnBlock: OnBlock | null = null;
const unwatch = vi.fn();
const watchBlocks = vi.fn((args: { onBlock: OnBlock }) => {
  capturedOnBlock = args.onBlock;
  return unwatch;
});

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: ADDRESS }),
  useChainId: () => CHAIN_ID,
  usePublicClient: () => ({ watchBlocks })
}));

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useBlockchainDataSync', () => {
  beforeEach(() => {
    capturedOnBlock = null;
    watchBlocks.mockClear();
    unwatch.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does NOT invalidate on a block with no transaction touching the address', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useBlockchainDataSync(), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(watchBlocks).toHaveBeenCalledTimes(1));
    capturedOnBlock?.({
      number: 100n,
      transactions: [{ from: OTHER, to: OTHER }]
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('invalidates the balance query key when a tx touches the address (sent)', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useBlockchainDataSync(), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(watchBlocks).toHaveBeenCalledTimes(1));
    capturedOnBlock?.({
      number: 101n,
      transactions: [{ from: ADDRESS, to: OTHER }]
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      queryKey: getBalanceQueryKey({ address: ADDRESS, chainId: CHAIN_ID })
    });
  });

  it('invalidates when a tx touches the address (received)', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useBlockchainDataSync(), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(watchBlocks).toHaveBeenCalledTimes(1));
    capturedOnBlock?.({
      number: 102n,
      transactions: [{ from: OTHER, to: ADDRESS }]
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('ignores string-only (non-hydrated) transaction entries safely', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useBlockchainDataSync(), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(watchBlocks).toHaveBeenCalledTimes(1));
    capturedOnBlock?.({ number: 103n, transactions: ['0xdeadbeef'] });

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not double-process a duplicate emission of the same block number', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useBlockchainDataSync(), { wrapper: makeWrapper(queryClient) });

    await waitFor(() => expect(watchBlocks).toHaveBeenCalledTimes(1));
    const block = { number: 104n, transactions: [{ from: ADDRESS, to: OTHER }] };
    capturedOnBlock?.(block);
    capturedOnBlock?.(block);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from watchBlocks on unmount', async () => {
    const queryClient = new QueryClient();
    const { unmount } = renderHook(() => useBlockchainDataSync(), {
      wrapper: makeWrapper(queryClient)
    });
    await waitFor(() => expect(watchBlocks).toHaveBeenCalledTimes(1));
    unmount();
    expect(unwatch).toHaveBeenCalledTimes(1);
  });
});
