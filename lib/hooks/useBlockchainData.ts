'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { getBalanceQueryKey } from 'wagmi/query';
import type { Address } from 'viem';

/**
 * Global invalidation engine for issue #29. Watches new blocks and
 * invalidates the connected account's cached balance query only when a
 * transaction in that block actually touches the address (sent or
 * received). This replaces "refetch on every block" polling, which reruns
 * queries even when nothing relevant changed on-chain.
 */
export function useBlockchainDataSync() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const queryClient = useQueryClient();
  // Guards against duplicate `onBlock` emissions for a block we already
  // evaluated (some transports can re-emit the same block number).
  const lastCheckedBlock = useRef<bigint | null>(null);

  useEffect(() => {
    if (!publicClient || !address) return;

    const lowerAddress = address.toLowerCase();

    const unwatch = publicClient.watchBlocks({
      includeTransactions: true,
      onBlock: (block) => {
        if (lastCheckedBlock.current === block.number) return;
        lastCheckedBlock.current = block.number;

        const touchesAddress = block.transactions.some((tx) => {
          if (typeof tx === 'string') return false;
          return (
            tx.from?.toLowerCase() === lowerAddress ||
            tx.to?.toLowerCase() === lowerAddress
          );
        });

        // Requirement: avoid invalidating queries that haven't changed.
        // Only mark the balance query stale when this account was part of
        // a transaction in the block; empty/irrelevant blocks are a no-op.
        if (touchesAddress) {
          queryClient.invalidateQueries({
            queryKey: getBalanceQueryKey({ address: address as Address, chainId })
          });
        }
      }
    });

    return () => unwatch();
  }, [publicClient, address, chainId, queryClient]);
}
