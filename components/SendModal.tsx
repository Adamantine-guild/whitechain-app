'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAccount, useBalance, useGasPrice, useChainId, useConfig } from 'wagmi';
import { buildSendSchema, type SendFormValues } from '@/lib/validation/sendSchema';
import { notifyTxError, notifyTxSuccess } from '@/components/TxToasts';
import { useTransactionToast } from '@/lib/hooks/useTransactionToast';
import { useModalA11y } from '@/lib/hooks/useModalA11y';
import { useTransactionReceiptWatcher } from '@/lib/hooks/useTransactionReceiptWatcher';
import type { Hash } from 'viem';

/** Safety multiplier applied to the estimated gas cost reserved by "Max" (#19). */
const GAS_BUFFER_MULTIPLIER = 2n;

export interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

export function SendModal({ isOpen, onClose }: SendModalProps) {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { data: balance, isLoading: balanceLoading } = useBalance({ address });
  const { data: gasPrice } = useGasPrice({ query: { refetchInterval: 15_000 } });
  const chainId = useChainId();
  const wagmiConfigChain = useConfig().chains.find((c) => c.id === chainId);
  const { trackTransaction } = useTransactionToast();

  // Track the last submitted transaction for optimistic UI updates.
  // Reset when the modal closes.
  const [lastTxHash, setLastTxHash] = useState<Hash | undefined>(undefined);
  const [lastTxAmount, setLastTxAmount] = useState<bigint | undefined>(undefined);

  // Watch for the transaction receipt and update the optimistic store.
  useTransactionReceiptWatcher(
    address as `0x${string}` | undefined,
    lastTxHash,
    lastTxAmount
  );

  const balanceWei = balance ? BigInt(balance.value.toString()) : 0n;
  const schema = React.useMemo(() => buildSendSchema(balanceWei), [balanceWei]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(isOpen, onClose, dialogRef);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
    setError
  } = useForm<SendFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { to: '', amount: '', gasLimit: '21000' }
  });

  const gasLimitValue = watch('gasLimit');

  // Reserve an estimated gas cost (2x the current gas price, per the
  // configured gas limit) so "Max"/the slider never propose spending the
  // whole balance and leaving nothing to pay for the transaction itself.
  const maxSendableWei = useMemo(() => {
    if (balanceWei <= 0n) return 0n;
    let gasLimit: bigint;
    try {
      gasLimit = BigInt(gasLimitValue || '21000');
    } catch {
      gasLimit = 21_000n;
    }
    const buffer = (gasPrice ?? 0n) * gasLimit * GAS_BUFFER_MULTIPLIER;
    return balanceWei > buffer ? balanceWei - buffer : 0n;
  }, [balanceWei, gasPrice, gasLimitValue]);

  const [percent, setPercent] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slider drags fire many onChange events per second; debounce the derived
  // amount write so react-hook-form/zod validation isn't re-run on every tick.
  function handleSliderChange(nextPercent: number) {
    setPercent(nextPercent);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const amount = (maxSendableWei * BigInt(nextPercent)) / 100n;
      setValue('amount', amount.toString(), { shouldValidate: true, shouldDirty: true });
    }, 120);
  }

  function handleMax() {
    setPercent(100);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue('amount', maxSendableWei.toString(), { shouldValidate: true, shouldDirty: true });
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setPercent(0);
      setLastTxHash(undefined);
      setLastTxAmount(undefined);
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    const provider = getInjectedProvider();
    if (!provider) {
      setError('to', { message: t('send.noWallet') });
      return;
    }
    const toastId = notifyTxPending();
    try {
      const txHash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: values.to,
            value: `0x${BigInt(values.amount).toString(16)}`,
            gas: `0x${BigInt(values.gasLimit).toString(16)}`
          }
        ]
      })) as string | undefined;

      if (txHash && txHash !== '0x0') {
        // Dismiss the signing-pending toast — the centralized hook takes over.
        if (toastId) {
          import('sonner').then(({ toast }) => toast.dismiss(toastId));
        }
        trackTransaction(txHash as Hash);
        // Record the optimistic deduction so the UI updates immediately.
        setLastTxHash(txHash as Hash);
        setLastTxAmount(BigInt(values.amount));
      } else {
        // Some wallets resolve without a hash (e.g. hardware approvals); still
        // surface a neutral success so the user isn't left without feedback.
        if (toastId) {
          import('sonner').then(({ toast }) => toast.dismiss(toastId));
        }
        notifyTxSuccess('0x0' as `0x${string}`, wagmiConfigChain);
      }
      onClose();
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message?: string }).message
          : 'The transaction was rejected or failed.';
      notifyTxError(message ?? t('send.txRejected'));
      // Wallet surfaces the real error; keep the modal open and non-blocking.
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('send.sendAsset')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t('send.sendAsset')}</h2>
          <button type="button" className="text-gray-500" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          {t('send.balance')}: {balanceLoading ? '…' : balance ? `${balance.formatted} ${balance.symbol}` : '0'}
        </p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">{t('send.recipientAddress')}</span>
            <input
              {...register('to')}
              placeholder="0x…"
              aria-label={t('send.recipientAddress')}
              className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
            />
            {errors.to && (
              <span role="alert" className="text-xs text-red-600">
                {errors.to.message}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center justify-between text-gray-700">
              {t('send.amountWei')}
              <button
                type="button"
                onClick={handleMax}
                disabled={maxSendableWei <= 0n}
                className="text-xs font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
              >
                {t('common.max')}
              </button>
            </span>
            <input
              {...register('amount')}
              placeholder="0"
              aria-label={t('send.amountWei')}
              className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
            />
            {errors.amount && (
              <span role="alert" className="text-xs text-red-600">
                {errors.amount.message}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center justify-between text-gray-700">
              <span>{t('send.percentOfBalance')}</span>
              <span className="font-mono text-xs text-gray-500">{percent}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={percent}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              aria-label={t('send.percentageLabel')}
              disabled={maxSendableWei <= 0n}
              className="w-full accent-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">{t('send.gasLimit')}</span>
            <input
              {...register('gasLimit')}
              placeholder="21000"
              aria-label={t('send.gasLimit')}
              className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
            />
            {errors.gasLimit && (
              <span role="alert" className="text-xs text-red-600">
                {errors.gasLimit.message}
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={!isValid}
            className="btn mt-2 self-start disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('common.send')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SendModal;
