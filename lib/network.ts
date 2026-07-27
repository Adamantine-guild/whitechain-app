import { useCallback, useEffect, useState } from 'react';
import { useChainId } from 'wagmi';
import { mainnet } from 'wagmi/chains';

/**
 * The network the dApp expects users to be on. WhiteChain targets Ethereum
 * Mainnet (chainId 1), consistent with the existing Etherscan-mainnet explorer
 * config used across the app.
 */
export const TARGET_CHAIN = {
  id: mainnet.id,
  name: mainnet.name,
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.ankr.com/eth'],
  explorerUrls: ['https://etherscan.io'],
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
} as const;

export type SwitchStatus = 'correct' | 'wrong' | 'switching' | 'error';

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

/** Ask the wallet to switch to the target chain (EIP-3326). */
export async function requestSwitchChain(): Promise<void> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error('No injected wallet found');
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${TARGET_CHAIN.id.toString(16)}` }]
  });
}

/** Register + switch to the target chain when the wallet doesn't know it (EIP-3085). */
export async function requestAddChain(): Promise<void> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error('No injected wallet found');
  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${TARGET_CHAIN.id.toString(16)}`,
        chainName: TARGET_CHAIN.name,
        rpcUrls: TARGET_CHAIN.rpcUrls,
        blockExplorerUrls: TARGET_CHAIN.explorerUrls,
        nativeCurrency: TARGET_CHAIN.nativeCurrency
      }
    ]
  });
}

export interface UseNetworkValidation {
  chainId: number;
  isWrongNetwork: boolean;
  status: SwitchStatus;
  error: string | null;
  switchNetwork: () => Promise<void>;
}

/**
 * Watches the active chain id and reports whether the user is on the wrong
 * network. `switchNetwork()` first tries `wallet_switchEthereumChain`; if the
 * wallet doesn't recognize the chain it falls back to `wallet_addEthereumChain`
 * (issue #3 requirement).
 */
export function useNetworkValidation(): UseNetworkValidation {
  const chainId = useChainId();
  const [status, setStatus] = useState<SwitchStatus>('correct');
  const [error, setError] = useState<string | null>(null);

  const isWrongNetwork = chainId !== TARGET_CHAIN.id;

  useEffect(() => {
    setStatus(isWrongNetwork ? 'wrong' : 'correct');
    setError(null);
  }, [isWrongNetwork]);

  const switchNetwork = useCallback(async () => {
    setStatus('switching');
    setError(null);
    try {
      await requestSwitchChain();
      // The chainId change will be picked up by the hook effect.
    } catch (err) {
      const e = err as { code?: number; message?: string };
      if (e?.code === 4902) {
        try {
          await requestAddChain();
        } catch (addErr) {
          setStatus('error');
          setError((addErr as Error).message ?? 'Failed to add network');
        }
      } else {
        setStatus('error');
        setError(e?.message ?? 'Failed to switch network');
      }
    }
  }, []);

  return { chainId, isWrongNetwork, status, error, switchNetwork };
}
