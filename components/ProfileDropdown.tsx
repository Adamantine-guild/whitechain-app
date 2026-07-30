'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDisconnect, useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { useModalA11y } from '@/lib/hooks/useModalA11y';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * ProfileDropdown — shows the connected address and, on click, a small menu
 * with a "Disconnect" action. Disconnect is dApp-level only (via wagmi's
 * useDisconnect, which clears local connection state); it does NOT force a
 * wallet-level disconnect. Per issue #9.
 */
export function ProfileDropdown() {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useModalA11y(open, () => setOpen(false), ref);

  // Close the menu on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!address) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn-outline flex items-center gap-2"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar address={address as `0x${string}`} size={20} />
        {shortenAddress(address)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            {t('common.disconnect')}
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;
