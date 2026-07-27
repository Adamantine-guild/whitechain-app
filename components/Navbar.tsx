'use client';

import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { WalletModal } from './WalletModal';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
          <button type="button" onClick={() => disconnect()} className="btn-outline">
            {shortenAddress(address)}
          </button>
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
