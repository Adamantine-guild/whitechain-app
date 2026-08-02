'use client';

import { useEffect, useRef, useState } from 'react';
import { useConnect } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { CoinbaseIcon, GenericWalletIcon, LedgerIcon, MetaMaskIcon, WalletConnectIcon } from './icons';
import { Modal } from './Modal';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONNECTOR_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  metaMask: MetaMaskIcon,
  metaMaskSDK: MetaMaskIcon,
  coinbaseWallet: CoinbaseIcon,
  walletConnect: WalletConnectIcon,
  injected: GenericWalletIcon,
  ledgerWebUsb: LedgerIcon
};

function iconFor(connectorId: string) {
  return CONNECTOR_ICONS[connectorId] ?? GenericWalletIcon;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { t } = useTranslation();
  const [pendingConnectorUid, setPendingConnectorUid] = useState<string | null>(null);
  const { connectors, connect, isPending, error, reset } = useConnect({
    mutation: {
      onSuccess: () => onClose(),
      onSettled: () => setPendingConnectorUid(null)
    }
  });
  const titleId = 'wallet-modal-title';
  const descId = 'wallet-modal-desc';

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  // De-dupe connectors by id (injected() can register the same provider under multiple ids).
  const seen = new Set<string>();
  const uniqueConnectors = connectors.filter((connector) => {
    if (seen.has(connector.id)) return false;
    seen.add(connector.id);
    return true;
  });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={descId}
      className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          {t('wallet.connectWallet')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <p id={descId} className="sr-only">
        {t('wallet.connectWallet')}
      </p>

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
          {error.message.includes('User rejected')
            ? t('wallet.connectionRejected')
            : error.message.includes('unplugged') || error.message.includes('disconnected')
              ? t('wallet.ledgerUnplugged')
              : error.message.includes('open the Ethereum app')
                ? t('wallet.ledgerOpenApp')
                : error.message.includes('WebUSB')
                  ? t('wallet.webUsbUnavailable')
                  : error.message}
        </p>
      )}
    </Modal>
  );
}

export default WalletModal;