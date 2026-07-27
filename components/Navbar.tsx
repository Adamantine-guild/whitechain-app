'use client';

import { useState } from 'react';
import { useAccount, useBalance, useDisconnect, useWatchBlockNumber } from 'wagmi';
import { useIsMounted } from '@/lib/useIsMounted';
import { WalletModal } from './WalletModal';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function BalanceDisplay() {
  const { address } = useAccount();
  const { data, isLoading, refetch } = useBalance({
    address,
    query: { refetchOnWindowFocus: false }
  });

  // useBalance doesn't poll on its own, so nudge it every block to keep the
  // figure in sync with on-chain state (deposits, withdrawals, gas spend).
  useWatchBlockNumber({
    onBlockNumber: () => {
      refetch();
    }
  });

  if (isLoading) {
    return <span className="h-4 w-16 animate-pulse rounded bg-gray-200" aria-label="Loading balance" />;
  }

  if (!data) return null;

  return (
    <span className="text-sm font-medium text-gray-700">
      {Number(data.formatted).toFixed(4)} {data.symbol}
    </span>
  );
}

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Wagmi's connection state is read from localStorage on the client, so it
  // can differ from the server's initial render. Wait for mount before
  // trusting isConnected, otherwise React throws a hydration mismatch.
  const isMounted = useIsMounted();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container flex h-16 items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">WhiteChain</span>

        {isMounted && isConnected && address ? (
          <div className="flex items-center gap-3">
            <BalanceDisplay />
            <button type="button" onClick={() => disconnect()} className="btn-outline">
              {shortenAddress(address)}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setIsModalOpen(true)} className="btn" disabled={!isMounted}>
            Connect Wallet
          </button>
        )}
      </div>

      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
}