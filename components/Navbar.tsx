'use client';

import { useState } from 'react';
import { Menu, X } from "lucide-react";
import { WalletModal } from './WalletModal';
import MobileNav from './MobileNav';
import BalanceDisplay from './BalanceDisplay';

import dynamic from 'next/dynamic';
import { useAccount, useBalance, useDisconnect, useWatchBlockNumber } from 'wagmi';
import { useIsMounted } from '@/lib/useIsMounted';
import { CopyAddress } from './CopyAddress';
import { ThemeToggle } from './ThemeToggle';
import { ProfileDropdown } from './ProfileDropdown';
import { SlippageSettings } from './SlippageSettings';
import { Avatar } from './Avatar';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Wagmi's connection state is read from localStorage on the client, so it
  // can differ from the server's initial render. Wait for mount before
  // trusting isConnected, otherwise React throws a hydration mismatch.
  const isMounted = useIsMounted();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
     <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          WhiteChain
        </span>

        {/* Desktop Wallet Actions */}
        <div className="hidden md:flex items-center gap-3">
          <SlippageSettings />
          <ThemeToggle />
          {isConnected && address ? (
            <>
              <BalanceDisplay />

              <button
                type="button"
                onClick={() => disconnect()}
                className="btn-outline flex items-center gap-2"
              >
                <Avatar address={address} size={20} />
                {shortenAddress(address)}
              </button>
              <ProfileDropdown />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={
            isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          className="rounded-md p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 md:hidden"
        >
          {isMobileMenuOpen ? (
            <X size={24} aria-hidden="true" />
          ) : (
            <Menu size={24} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {/* {isMobileMenuOpen && ( */}
        <MobileNav
          isConnected={isConnected}
          address={address}
          disconnect={disconnect}
          shortenAddress={shortenAddress}
          onConnectWallet={() => {
            closeMobileMenu();
            setIsModalOpen(true);
          }}
          onClose={closeMobileMenu}
          isMobileMenuOpen={isMobileMenuOpen}
        />
      {/* )} */}

      {/* Wallet Modal */}
      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </header>
  );
}