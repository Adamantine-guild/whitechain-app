import { useCallback, useState } from 'react';
import {
  createPublicClient,
  http,
  type PublicClient,
  type Chain
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { createTransport, parseRpcUrls } from '../transport';

/** Result of simulating a transaction. */
export type SimulationStatus =
  | 'idle'
  | 'simulating'
  | 'success'
  | 'reverts'
  | 'error';

export interface SimulationResult {
  status: SimulationStatus;
  /** Human-readable message, e.g. the revert reason or a success note. */
  message: string;
  /** Raw revert reason string when status === 'reverts', if decodable. */
  revertReason?: string;
}

/** A minimal transaction request to simulate. Mirrors viem's eth_call args. */
export interface SimulationRequest {
  chainId?: number;
  from?: `0x${string}`;
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
}

const CHAINS: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [sepolia.id]: sepolia
};

function getRpcUrls(chainId: number): string[] {
  if (chainId === mainnet.id) {
    return parseRpcUrls(
      process.env.NEXT_PUBLIC_MAINNET_RPC_URLS ?? process.env.NEXT_PUBLIC_RPC_URL
    );
  }
  if (chainId === sepolia.id) {
    return parseRpcUrls(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URLS);
  }
  return [];
}

/**
 * Build a viem public client for the given chain. Reuses the repo's
 * `createTransport` / `parseRpcUrls` helpers so RPC configuration stays
 * consistent with the rest of the app.
 */
export function getPublicClient(chainId: number): PublicClient {
  const chain = CHAINS[chainId] ?? mainnet;
  const urls = getRpcUrls(chainId);
  return createPublicClient({
    chain,
    transport: urls.length > 0 ? createTransport(urls) : http()
  }) as PublicClient;
}

/**
 * Pure simulation: performs an `eth_call` for the request. A reverting
 * transaction makes `eth_call` throw, which we interpret as "this transaction
 * will fail". A successful call means the transaction would not revert.
 *
 * Designed to be fast (single RPC call) and dependency-injectable for tests
 * via the `client` parameter.
 */
export async function simulateTransaction(
  request: SimulationRequest,
  client: PublicClient = getPublicClient(request.chainId ?? mainnet.id)
): Promise<SimulationResult> {
  if (!request.to) {
    return { status: 'error', message: 'A destination address (to) is required.' };
  }
  try {
    await client.request({
      method: 'eth_call',
      params: [
        {
          from: request.from,
          to: request.to,
          value: request.value !== undefined ? `0x${request.value.toString(16)}` : undefined,
          data: request.data
        },
        'latest'
      ]
    });
    return {
      status: 'success',
      message: 'Simulation succeeded — the transaction should not revert.'
    };
  } catch (err) {
    const reason = extractRevertReason(err);
    return {
      status: 'reverts',
      message: 'This transaction will fail.',
      revertReason: reason
    };
  }
}

/** Best-effort decode of a revert reason from a viem/RPC error. */
function extractRevertReason(err: unknown): string | undefined {
  if (err && typeof err === 'object') {
    const e = err as {
      shortMessage?: string;
      reason?: string;
      message?: string;
      data?: unknown;
    };
    if (e.shortMessage && e.shortMessage !== 'An unknown error occurred.') {
      return e.shortMessage;
    }
    if (e.reason) return e.reason;
    if (typeof e.data === 'string') return e.data;
    if (e.message) return e.message;
  }
  return undefined;
}

export interface UseTransactionSimulation {
  result: SimulationResult | null;
  status: SimulationStatus;
  simulate: (request: SimulationRequest) => Promise<SimulationResult>;
  reset: () => void;
}

/**
 * React hook wrapping `simulateTransaction`. Tracks status so the UI can show
 * a loading state and must complete quickly (single eth_call, well under the
 * 1.5s budget from issue #21).
 */
export function useTransactionSimulation(): UseTransactionSimulation {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [status, setStatus] = useState<SimulationStatus>('idle');

  const simulate = useCallback(async (request: SimulationRequest) => {
    setStatus('simulating');
    setResult(null);
    const res = await simulateTransaction(request);
    setResult(res);
    setStatus(res.status);
    return res;
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setStatus('idle');
  }, []);

  return { result, status, simulate, reset };
}
