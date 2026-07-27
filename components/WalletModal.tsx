'use client';

import { useEffect, useRef, useState } from 'react';
import { useConnect } from 'wagmi';
import { CoinbaseIcon, GenericWalletIcon, MetaMaskIcon, WalletConnectIcon } from './icons';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONNECTOR_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  metaMask: MetaMaskIcon,
  metaMaskSDK: MetaMaskIcon,
  coinbaseWallet: CoinbaseIcon,
  walletConnect: WalletConnectIcon,
  injected: GenericWalletIcon
};

function iconFor(connectorId: string) {
  return CONNECTOR_ICONS[connectorId] ?? GenericWalletIcon;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [pendingConnectorUid, setPendingConnectorUid] = useState<string | null>(null);
  const { connectors, connect, isPending, error, reset } = useConnect({
    mutation: {
      onSuccess: () => onClose(),
      onSettled: () => setPendingConnectorUid(null)
    }
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  if (!isOpen) return null;

  // De-dupe connectors by id (injected() can register the same provider under multiple ids).
  const seen = new Set<string>();
  const uniqueConnectors = connectors.filter((connector) => {
    if (seen.has(connector.id)) return false;
    seen.add(connector.id);
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="wallet-modal-title" className="text-base font-semibold text-gray-900">
            Connect a wallet
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {uniqueConnectors.map((connector) => {
            const Icon = iconFor(connector.id);
            const isConnectingThis = isPending && pendingConnectorUid === connector.uid;

            return (
              <li key={connector.uid}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setPendingConnectorUid(connector.uid);
                    connect({ connector });
                  }}
                  className="btn-outline w-full justify-between disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-6 w-6" />
                    {connector.name}
                  </span>
                  {isConnectingThis && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error.message.includes('User rejected') ? 'Connection request was rejected.' : error.message}
          </p>
        )}
      </div>
    </div>
  );
}
