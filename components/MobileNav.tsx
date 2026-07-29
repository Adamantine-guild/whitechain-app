"use client";

import { X } from "lucide-react";
import BalanceDisplay from "./BalanceDisplay";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from 'react-i18next';

const NAV_LINKS = [
  { href: '/', key: 'nav.home' },
  { href: '/marketplace', key: 'nav.marketplace' },
  { href: '/about', key: 'nav.about' },
];

export default function MobileNav({
  isConnected,
  isMobileMenuOpen,
  address,
  disconnect,
  shortenAddress,
  onConnectWallet,
  onClose,
}: {
  isConnected: boolean;
  isMobileMenuOpen: boolean;
  address?: string;
  disconnect: () => void;
  shortenAddress: (address: string) => string;
  onConnectWallet: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      id="mobile-navigation"
      className={`fixed left-0 top-0 z-50 h-screen w-full overflow-y-auto bg-white transition-all duration-300 ease-in-out dark:bg-gray-950 md:hidden ${
        isMobileMenuOpen
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        {/* Close Button */}
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
                        aria-label={t('nav.closeMenu')}
            className="rounded-md p-2 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label={t('nav.mobileNav')}>
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={onClose}
                  className="block rounded-md px-3 py-3 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile Wallet Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.theme')}</span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
          {isConnected && address ? (
            <div className="flex flex-col gap-3">
              <BalanceDisplay />

              <button
                type="button"
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                className="btn-outline w-full"
              >
                {t('common.disconnect')} {shortenAddress(address)}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectWallet}
              className="btn w-full"
            >
              {t('common.connectWallet')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}