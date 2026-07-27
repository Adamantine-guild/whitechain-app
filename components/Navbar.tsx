'use client';

import { useState } from 'react';
import { Menu, X } from "lucide-react";
import { useAccount, useDisconnect } from 'wagmi';
import { WalletModal } from './WalletModal';
import MobileNav from './MobileNav';
import BalanceDisplay from './BalanceDisplay';


function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
     <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <span className="text-lg font-semibold text-gray-900">
          WhiteChain
        </span>

        {/* Desktop Wallet Actions */}
        <div className="hidden md:flex items-center gap-3">
          {isConnected && address ? (
            <>
              <BalanceDisplay />

              <button
                type="button"
                onClick={() => disconnect()}
                className="btn-outline"
              >
                {shortenAddress(address)}
              </button>
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
          className="rounded-md p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 md:hidden"
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
