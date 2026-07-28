'use client';

import React, { useState } from 'react';
import { TrendingUp, Lock, Unlock, RefreshCw, Check } from 'lucide-react';

export interface VaultData {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: string;
  userStake: number;
}

interface VaultCardMobileProps {
  vault: VaultData;
  nativeBalance: number;
  onStake: (vaultId: string, amount: number) => Promise<void>;
  onUnstake: (vaultId: string, amount: number) => Promise<void>;
}

export function VaultCardMobile({ vault, nativeBalance, onStake, onUnstake }: VaultCardMobileProps) {
  const [activeForm, setActiveForm] = useState<'stake' | 'unstake' | null>(null);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleToggleForm = (type: 'stake' | 'unstake') => {
    setError('');
    setSuccess(false);
    setAmount('');
    if (activeForm === type) {
      setActiveForm(null);
    } else {
      setActiveForm(type);
    }
  };

  const maxAmount = activeForm === 'stake' ? nativeBalance : vault.userStake;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (val > maxAmount) {
      setError(`Insufficient balance. Max available is ${maxAmount.toFixed(4)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeForm === 'stake') {
        await onStake(vault.id, val);
      } else {
        await onUnstake(vault.id, val);
      }
      setSuccess(true);
      setAmount('');
      setActiveForm(null);
      // Auto-hide success after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError('Transaction failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article
      aria-label={`${vault.name} Staking Details`}
      className="card flex flex-col gap-4 border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Header section with Name and APY */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{vault.name}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Asset: {vault.asset}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{vault.apy.toFixed(1)}% APY</span>
        </div>
      </div>

      {/* Grid of Staking Metrics */}
      <div className="grid grid-cols-2 gap-3 border-t border-b border-gray-100 py-3 dark:border-gray-800">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Total Value Locked</span>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{vault.tvl}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Your Deposited Stake</span>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {vault.userStake.toFixed(4)} {vault.asset}
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-2 rounded bg-green-50 p-3 text-xs text-green-700 dark:bg-green-950/20 dark:text-green-400" role="status">
          <Check className="h-4 w-4 shrink-0" />
          <span>Transaction succeeded and dashboard updated!</span>
        </div>
      )}

      {/* Expanding Form Panel */}
      {activeForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded bg-gray-50 p-3 dark:bg-gray-800/40">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span className="capitalize">{activeForm} Amount</span>
            <button
              type="button"
              onClick={() => setAmount(maxAmount.toString())}
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Use Max ({maxAmount.toFixed(4)})
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              disabled={isSubmitting}
              className="h-12 w-full rounded border border-gray-300 px-3 py-2 pr-16 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-3.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {vault.asset}
            </span>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="btn flex h-12 flex-1 items-center justify-center gap-2 bg-gray-900 text-sm font-semibold text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm {activeForm === 'stake' ? 'Stake' : 'Unstake'}</span>
              )}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setActiveForm(null)}
              className="btn-outline h-12 w-20 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Desktop/Mobile Action Buttons */}
      {!activeForm && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleToggleForm('stake')}
            className="btn flex h-12 flex-1 items-center justify-center gap-2 border border-transparent bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            aria-expanded={activeForm === 'stake'}
          >
            <Lock className="h-4 w-4 shrink-0" />
            <span>Stake</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleForm('unstake')}
            disabled={vault.userStake <= 0}
            className="btn-outline flex h-12 flex-1 items-center justify-center gap-2 px-4 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-800"
            aria-expanded={activeForm === 'unstake'}
          >
            <Unlock className="h-4 w-4 shrink-0" />
            <span>Unstake</span>
          </button>
        </div>
      )}
    </article>
  );
}

export default VaultCardMobile;
