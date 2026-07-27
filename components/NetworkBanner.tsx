'use client';

import React from 'react';
import { useNetworkValidation, TARGET_CHAIN } from '@/lib/network';

/**
 * Prominent banner shown when the connected wallet is on the wrong network.
 * Offers a "Switch Network" button that prompts the wallet to change chains
 * (falling back to adding the chain if unknown). Per issue #3.
 */
export function NetworkBanner() {
  const { isWrongNetwork, status, error, switchNetwork } = useNetworkValidation();

  if (!isWrongNetwork) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      <span>
        You are connected to the wrong network. Please switch to{' '}
        <strong>{TARGET_CHAIN.name}</strong> to use WhiteChain.
      </span>
      <div className="flex items-center gap-2">
        {error && (
          <span className="text-xs text-amber-700" role="status">
            {error}
          </span>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => void switchNetwork()}
          disabled={status === 'switching'}
        >
          {status === 'switching' ? 'Switching…' : 'Switch Network'}
        </button>
      </div>
    </div>
  );
}

export default NetworkBanner;
