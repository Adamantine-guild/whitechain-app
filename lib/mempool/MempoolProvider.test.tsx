/**
 * MempoolProvider.test.tsx
 *
 * Tests for lib/mempool/MempoolProvider.tsx. Verifies:
 *  - subscribes to newPendingTransactions scoped to the connected account
 *  - tracks user pending txs and applies stuck detection after timeout
 *  - silently reconnects (no error surfaced) on subscribe onError
 *
 * `wagmi` is mocked (fixed account) and the viem client is a controllable stub
 * via `clientFactory`.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { MempoolProvider, useMempool, type MempoolClient } from './MempoolProvider';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as `0x${string}`;

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: ACCOUNT, chainId: 1, isConnected: true })
}));

interface Controls {
  emit: (hashes: `0x${string}`[]) => void;
  error: () => void;
}

function makeClient(): { client: MempoolClient; controls: Controls; subscribed: () => boolean } {
  let registered: { onTransactions: (h: `0x${string}`[]) => void; onError?: () => void } | null = null;
  const subscribe = vi.fn(
    async (args: { onTransactions: (h: `0x${string}`[]) => void; onError?: () => void }) => {
      registered = args;
      return vi.fn(); // unsubscribe
    }
  );
  const client = {
    subscribePendingTransactions: subscribe,
    __subscribe: subscribe
  } as unknown as MempoolClient & { __subscribe: ReturnType<typeof vi.fn> };
  return {
    client: client as unknown as MempoolClient,
    controls: {
      emit: (hashes) => registered?.onTransactions(hashes),
      error: () => registered?.onError?.()
    },
    subscribed: () => (client as unknown as { __subscribe: ReturnType<typeof vi.fn> }).__subscribe.mock.calls.length > 0
  };
}

function Probe() {
  const { pending, connected, error } = useMempool();
  return (
    <div>
      <span>{connected ? 'connected' : 'disconnected'}</span>
      {error && <span>error:{error}</span>}
      {pending.map((t) => (
        <div key={t.hash}>
          {t.hash}
          {t.status === 'stuck' && ' Stuck'}
        </div>
      ))}
    </div>
  );
}

describe('MempoolProvider', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WS_URL = 'wss://test.rpc';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    vi.restoreAllMocks();
    cleanup();
  });

  it('subscribes to pending transactions for the connected account', async () => {
    const { client, subscribed } = makeClient();
    render(
      <MempoolProvider clientFactory={() => client}>
        <Probe />
      </MempoolProvider>
    );
    await waitFor(() => expect(subscribed()).toBe(true));
    const calls = (client.subscribePendingTransactions as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1]).toEqual({ address: [ACCOUNT] });
  });

  it('tracks user pending txs and flags them stuck after the timeout', async () => {
    const { client, controls, subscribed } = makeClient();
    render(
      <MempoolProvider clientFactory={() => client} stuckTimeoutMs={50}>
        <Probe />
      </MempoolProvider>
    );
    await waitFor(() => expect(subscribed()).toBe(true));
    act(() => {
      controls.emit(['0xabc' as `0x${string}`]);
    });
    await waitFor(() => expect(screen.getByText(/0xabc/)).toBeTruthy());
    expect(screen.queryByText(/Stuck/)).toBeNull();
    await waitFor(() => expect(screen.getByText(/Stuck/)).toBeTruthy(), { timeout: 2000 });
  });

  it('surfaces no hard error on subscribe onError (silent reconnect)', async () => {
    const { client, controls, subscribed } = makeClient();
    render(
      <MempoolProvider clientFactory={() => client}>
        <Probe />
      </MempoolProvider>
    );
    await waitFor(() => expect(subscribed()).toBe(true));
    // Get connected by receiving a tx, then trigger a silent error.
    act(() => {
      controls.emit(['0xdef' as `0x${string}`]);
    });
    await waitFor(() => expect(screen.getByText(/connected/)).toBeTruthy());
    act(() => {
      controls.error();
    });
    await waitFor(() => expect(screen.queryByText(/error/i)).toBeNull());
  });
});
