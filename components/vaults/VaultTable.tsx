'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { VaultCardMobile, type VaultData } from './VaultCardMobile';
import { Lock, Unlock, RefreshCw, Check, TrendingUp } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { useProtocolStats } from '@/lib/hooks/queries/useProtocolStats';
import { Skeleton } from '@/components/Skeleton';

export function VaultTable() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });

  const { data: protocolStats, isLoading, isError, error } = useProtocolStats();

  const [userStakes, setUserStakes] = useState<Record<string, number>>({});
  const [simulatedBalance, setSimulatedBalance] = useState(10.0);

  const vaults: VaultData[] = useMemo(() => {
    const source = protocolStats?.vaults ?? [];
    if (source.length === 0) {
      return [
        { id: 'usdc', name: 'USDC Staking Vault', asset: 'USDC', apy: 4.5, tvl: '$12,500,000', userStake: 0.0 },
        { id: 'eth', name: 'Ethereum Yield Vault', asset: 'ETH', apy: 3.2, tvl: '4,820 ETH', userStake: 0.0 },
        { id: 'wbtc', name: 'WBTC Core Vault', asset: 'WBTC', apy: 2.1, tvl: '320 WBTC', userStake: 0.0 },
      ];
    }
    return source.map((v) => ({
      id: v.id,
      name: v.name,
      asset: v.asset,
      apy: v.apy,
      tvl: v.tvlFormatted,
      userStake: userStakes[v.id] ?? 0,
    }));
  }, [protocolStats, userStakes]);

  // Sync userStakes from localStorage on load
  useEffect(() => {
    const saved = localStorage.getItem('whitechain-vaults-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.vaults) {
          const stakes: Record<string, number> = {};
          for (const v of parsed.vaults) {
            stakes[v.id] = v.userStake ?? 0;
          }
          setUserStakes(stakes);
        }
        if (typeof parsed.simulatedBalance === 'number') setSimulatedBalance(parsed.simulatedBalance);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Sync from Wagmi balance if it loads and simulatedBalance hasn't been modified yet
  useEffect(() => {
    if (balanceData && !localStorage.getItem('whitechain-vaults-state')) {
      setSimulatedBalance(parseFloat(balanceData.formatted));
    }
  }, [balanceData]);

  // Helper to persist state
  const saveState = (updatedStakes: Record<string, number>, updatedBalance: number) => {
    const vaultList = (protocolStats?.vaults ?? []).map((v) => ({
      id: v.id,
      userStake: updatedStakes[v.id] ?? 0,
    }));
    localStorage.setItem(
      'whitechain-vaults-state',
      JSON.stringify({ vaults: vaultList, simulatedBalance: updatedBalance })
    );
  };

  // Staking/Unstaking functions
  const handleStake = async (vaultId: string, amount: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const updatedStakes = { ...userStakes, [vaultId]: (userStakes[vaultId] ?? 0) + amount };
        const updatedBalance = simulatedBalance - amount;
        setUserStakes(updatedStakes);
        setSimulatedBalance(updatedBalance);
        saveState(updatedStakes, updatedBalance);
        resolve();
      }, 1500);
    });
  };

  const handleUnstake = async (vaultId: string, amount: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const current = userStakes[vaultId] ?? 0;
        const updatedStakes = { ...userStakes, [vaultId]: Math.max(0, current - amount) };
        const updatedBalance = simulatedBalance + amount;
        setUserStakes(updatedStakes);
        setSimulatedBalance(updatedBalance);
        saveState(updatedStakes, updatedBalance);
        resolve();
      }, 1500);
    });
  };

  // State for expanded row in desktop table view
  const [expandedRow, setExpandedRow] = useState<{ id: string; type: 'stake' | 'unstake' } | null>(null);
  const [desktopAmount, setDesktopAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleDesktopForm = (vaultId: string, type: 'stake' | 'unstake') => {
    setErrorMsg('');
    setSuccessMsg(false);
    setDesktopAmount('');
    if (expandedRow?.id === vaultId && expandedRow?.type === type) {
      setExpandedRow(null);
    } else {
      setExpandedRow({ id: vaultId, type });
    }
  };

  const currentVault = vaults.find((v) => v.id === expandedRow?.id);
  const maxAvailable = expandedRow?.type === 'stake' ? simulatedBalance : (currentVault?.userStake ?? 0);

  const handleDesktopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedRow || !currentVault) return;
    setErrorMsg('');
    setSuccessMsg(false);

    const val = parseFloat(desktopAmount);
    if (isNaN(val) || val <= 0) {
      setErrorMsg(t('vaults.invalidAmount'));
      return;
    }

    if (val > maxAvailable) {
      setErrorMsg(t('vaults.insufficientBalance', { max: maxAvailable.toFixed(4) }));
      return;
    }

    setIsSubmitting(true);
    try {
      if (expandedRow.type === 'stake') {
        await handleStake(expandedRow.id, val);
      } else {
        await handleUnstake(expandedRow.id, val);
      }
      setSuccessMsg(true);
      setDesktopAmount('');
      setExpandedRow(null);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(t('vaults.txFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Wallet / Balance Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-md border border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('vaults.balanceCenter')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isConnected ? `Wallet: ${address?.slice(0, 6)}...${address?.slice(-4)}` : t('vaults.walletNotConnected')}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('vaults.availableBalance')}</span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {simulatedBalance.toFixed(4)} {balanceData?.symbol || 'ETH'}
          </span>
        </div>
      </div>

      {/* SUCCESS BANNER (GLOBAL FOR DESKTOP VIEW) */}
      {successMsg && (
        <div className="hidden md:flex items-center gap-2 rounded bg-green-50 p-3 text-xs text-green-700 dark:bg-green-950/20 dark:text-green-400" role="status">
          <Check className="h-4 w-4 shrink-0" />
          <span>{t('vaults.txSucceeded')}</span>
        </div>
      )}

      {/* MOBILE BREAKPOINT VIEW: CARDS (md:hidden) */}
      <div className="grid grid-cols-1 gap-4 md:hidden" id="vaults-mobile-cards">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-mobile-${i}`}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                aria-hidden="true"
                data-testid="vault-skeleton-card"
              >
                <div className="flex items-center justify-between mb-3">
                  <Skeleton width="140px" height="1rem" />
                  <Skeleton width="60px" height="1.25rem" radius="rounded-full" />
                </div>
                <div className="space-y-2 mb-4">
                  <Skeleton width="100%" height="0.75rem" />
                  <Skeleton width="80%" height="0.75rem" />
                </div>
                <div className="flex gap-2">
                  <Skeleton width="50%" height="2.25rem" radius="rounded-lg" />
                  <Skeleton width="50%" height="2.25rem" radius="rounded-lg" />
                </div>
              </div>
            ))
          : vaults.map((vault) => (
              <VaultCardMobile
                key={vault.id}
                vault={vault}
                nativeBalance={simulatedBalance}
                onStake={handleStake}
                onUnstake={handleUnstake}
              />
            ))}
      </div>

      {/* DESKTOP BREAKPOINT VIEW: TRADITIONAL TABLE (hidden md:block) */}
      <div className="hidden md:block border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden" id="vaults-desktop-table">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">{t('vaults.vault')}</th>
              <th scope="col" className="px-6 py-3">{t('vaults.apy')}</th>
              <th scope="col" className="px-6 py-3">{t('vaults.tvl')}</th>
              <th scope="col" className="px-6 py-3">{t('vaults.yourStake')}</th>
              <th scope="col" className="px-6 py-3 text-right">{t('vaults.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`skeleton-desktop-${i}`} aria-hidden="true" data-testid="vault-skeleton-row">
                    <td className="px-6 py-4"><Skeleton width="120px" height="1rem" /></td>
                    <td className="px-6 py-4"><Skeleton width="60px" height="1rem" /></td>
                    <td className="px-6 py-4"><Skeleton width="80px" height="1rem" /></td>
                    <td className="px-6 py-4"><Skeleton width="100px" height="1rem" /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Skeleton width="80px" height="2.25rem" radius="rounded-lg" />
                        <Skeleton width="80px" height="2.25rem" radius="rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              : vaults.map((vault) => {
              const isRowExpanded = expandedRow?.id === vault.id;
              return (
                <React.Fragment key={vault.id}>
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                      {vault.name}
                      <span className="block text-xs font-normal text-gray-400 dark:text-gray-500 mt-0.5">
                        {t('vaults.asset')}: {vault.asset}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {vault.apy.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium">
                      {vault.tvl}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-medium">
                      {vault.userStake.toFixed(4)} {vault.asset}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleDesktopForm(vault.id, 'stake')}
                          className="btn inline-flex h-12 min-w-[80px] items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 text-xs font-semibold"
                          aria-expanded={isRowExpanded && expandedRow.type === 'stake'}
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>{t('common.stake')}</span>
                        </button>
                        <button
                          type="button"
                          disabled={vault.userStake <= 0}
                          onClick={() => handleToggleDesktopForm(vault.id, 'unstake')}
                          className="btn-outline inline-flex h-12 min-w-[80px] items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          aria-expanded={isRowExpanded && expandedRow.type === 'unstake'}
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          <span>{t('common.unstake')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Desktop Inline Expanding Form Sub-row */}
                  {isRowExpanded && (
                    <tr className="bg-gray-50/70 dark:bg-gray-800/10">
                      <td colSpan={5} className="px-6 py-4">
                        <form onSubmit={handleDesktopSubmit} className="max-w-md ml-auto flex flex-col gap-3">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span className="capitalize font-medium">{t('vaults.enterAmount')} {t(expandedRow.type === 'stake' ? 'common.stake' : 'common.unstake')}:</span>
                            <button
                              type="button"
                              onClick={() => setDesktopAmount(maxAvailable.toString())}
                              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {t('vaults.useMax')} ({maxAvailable.toFixed(4)} {expandedRow.type === 'stake' ? (balanceData?.symbol || 'ETH') : vault.asset})
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                step="any"
                                value={desktopAmount}
                                onChange={(e) => setDesktopAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                disabled={isSubmitting}
                                className="h-12 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                              />
                              <span className="absolute right-3 top-3.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                                {expandedRow.type === 'stake' ? (balanceData?.symbol || 'ETH') : vault.asset}
                              </span>
                            </div>
                            <button
                              type="submit"
                              disabled={isSubmitting || !desktopAmount}
                              className="btn flex h-12 min-w-[120px] items-center justify-center gap-1.5 bg-gray-900 text-xs font-bold text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <span>{expandedRow.type === 'stake' ? t('vaults.confirmStake') : t('vaults.confirmUnstake')}</span>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => setExpandedRow(null)}
                              className="btn-outline h-12 px-3 text-xs"
                            >
                              {t('vaults.cancel')}
                            </button>
                          </div>
                          {errorMsg && (
                            <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {errorMsg}
                            </p>
                          )}
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VaultTable;
