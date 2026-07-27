'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAccount, useBalance, useDisconnect, useWatchBlockNumber } from 'wagmi';
import { CopyAddress } from './CopyAddress';

// Lazily load the wallet-selection modal. Its connector code (incl. any
// WalletConnect wiring) is only pulled into the client bundle the first time
// a user actually opens the connect dialog, keeping it out of the initial
// route payload.
const WalletModal = dynamic(() => import('./WalletModal').then((m) => m.WalletModal), {
  ssr: false
});

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

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container flex h-16 items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">WhiteChain</span>

        {isConnected && address ? (
          <div className="flex items-center gap-3">
            <BalanceDisplay />
            <span className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5">
              <button type="button" onClick={() => disconnect()} className="text-sm font-medium text-gray-900">
                {shortenAddress(address)}
              </button>
              <CopyAddress address={address} />
            </span>
          </div>
        ) : (
          <button type="button" onClick={() => setIsModalOpen(true)} className="btn">
            Connect Wallet
          </button>
        )}
      </div>

      <WalletModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
}
