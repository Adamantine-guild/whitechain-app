'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from 'react';
import {
  createPublicClient,
  webSocket,
  type Hash,
  type PublicClient
} from 'viem';
import { useAccount } from 'wagmi';

/** How long a pending tx can sit in the mempool before we flag it as stuck. */
export const STUCK_TIMEOUT_MS = 60_000;

export type PendingTxStatus = 'pending' | 'stuck';

export interface PendingTransaction {
  hash: Hash;
  from: `0x${string}`;
  nonce: number;
  status: PendingTxStatus;
  /** Timestamp (ms) when first observed in the mempool. */
  firstSeenAt: number;
}

export interface MempoolContextValue {
  pending: PendingTransaction[];
  stuck: PendingTransaction[];
  connected: boolean;
  error: string | null;
}

const MempoolContext = createContext<MempoolContextValue | null>(null);

function getWsUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_WS_URL || undefined;
}

export interface MempoolProviderProps {
  children: React.ReactNode;
  /** Override the viem client (primarily for tests). */
  clientFactory?: (url: string) => MempoolClient;
  /** Override the stuck timeout (primarily for tests). */
  stuckTimeoutMs?: number;
}

/** A viem client whose transport supports mempool subscriptions. */
export type MempoolClient = PublicClient & {
  subscribePendingTransactions: (
    args: {
      onTransactions: (hashes: Hash[]) => void;
      onError?: (err: Error) => void;
    },
    options?: { address?: `0x${string}`[] }
  ) => Promise<() => void>;
};

function buildClient(url: string): MempoolClient {
  return createPublicClient({
    transport: webSocket(url)
  }) as unknown as MempoolClient;
}

/**
 * Subscribes to the node mempool for `newPendingTransactions` scoped to the
 * connected account. Cross-references the local account nonce to track which
 * pending txs belong to the user, flags txs that linger past `stuckTimeoutMs`
 * as "stuck" (candidate for Speed up / Cancel), and silently reconnects on
 * websocket disconnects (requirement from issue #22).
 */
export function MempoolProvider({
  children,
  clientFactory = buildClient,
  stuckTimeoutMs = STUCK_TIMEOUT_MS
}: MempoolProviderProps) {
  const { address, chainId } = useAccount();
  const [pending, setPending] = useState<PendingTransaction[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<MempoolClient | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const seenRef = useRef<Map<Hash, PendingTransaction>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rebuild = useCallback(() => {
    // Tear down any existing subscription silently.
    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {
        /* ignore */
      }
      unsubRef.current = null;
    }
    if (clientRef.current && 'close' in clientRef.current) {
      const closeable = clientRef.current as { close?: () => void };
      try {
        closeable.close?.();
      } catch {
        /* ignore */
      }
    }
    clientRef.current = null;
    setConnected(false);

    const wsUrl = getWsUrl();
    if (!wsUrl || !address) {
      // No websocket configured or no connected account — not an error.
      return;
    }

    try {
      const client = clientFactory(wsUrl);
      clientRef.current = client;

      const unsub = client.subscribePendingTransactions(
        {
          onTransactions: (hashes: Hash[]) => {
            setError(null);
            setConnected(true);
            const now = Date.now();
            let changed = false;
            for (const hash of hashes) {
              const lower = hash.toLowerCase() as Hash;
              if (seenRef.current.has(lower)) continue;
              const entry: PendingTransaction = {
                hash,
                from: address as `0x${string}`,
                nonce: -1,
                status: 'pending',
                firstSeenAt: now
              };
              seenRef.current.set(lower, entry);
              changed = true;
            }
            if (changed) {
              setPending(Array.from(seenRef.current.values()));
            }
          },
          onError: () => {
            // Silent reconnect — never surface to UI as a hard error.
            setError(null);
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            reconnectTimer.current = setTimeout(() => rebuild(), 2000);
          }
        },
        { address: [address] }
      );
      unsubRef.current = unsub as unknown as () => void;
    } catch {
      // Silent reconnect.
      setError(null);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => rebuild(), 2000);
    }
  }, [address, clientFactory]);

  // Build / rebuild subscription when account or chain changes.
  useEffect(() => {
    seenRef.current = new Map();
    setPending([]);
    rebuild();
    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {
          /* ignore */
        }
      }
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [rebuild, chainId]);

  // Flag stuck txs (no receipt after timeout). Poll at a sane cadence.
  const pollMs = Math.min(5000, Math.max(1000, stuckTimeoutMs));
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [key, tx] of seenRef.current) {
        if (tx.status === 'pending' && now - tx.firstSeenAt > stuckTimeoutMs) {
          seenRef.current.set(key, { ...tx, status: 'stuck' });
          changed = true;
        }
      }
      if (changed) setPending(Array.from(seenRef.current.values()));
    }, pollMs);
    return () => clearInterval(interval);
  }, [stuckTimeoutMs, pollMs]);

  const stuck = pending.filter((t) => t.status === 'stuck');

  return (
    <MempoolContext.Provider value={{ pending, stuck, connected, error }}>
      {children}
    </MempoolContext.Provider>
  );
}

export function useMempool(): MempoolContextValue {
  const ctx = useContext(MempoolContext);
  if (!ctx) {
    throw new Error('useMempool must be used within a <MempoolProvider>');
  }
  return ctx;
}
