'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAccount, useBalance, useGasPrice } from 'wagmi';
import { buildSendSchema, type SendFormValues } from '@/lib/validation/sendSchema';

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
  const { address } = useAccount();
  const { data: balance, isLoading: balanceLoading } = useBalance({ address });
  const { data: gasPrice } = useGasPrice({ query: { refetchInterval: 15_000 } });

  const balanceWei = balance ? BigInt(balance.value.toString()) : 0n;
  const schema = React.useMemo(() => buildSendSchema(balanceWei), [balanceWei]);

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
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = handleSubmit(async (values) => {
    const provider = getInjectedProvider();
    if (!provider) {
      setError('to', { message: 'No wallet detected. Connect a wallet to send.' });
      return;
    }
    try {
      await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: values.to,
            value: `0x${BigInt(values.amount).toString(16)}`,
            gas: `0x${BigInt(values.gasLimit).toString(16)}`
          }
        ]
      });
      onClose();
    } catch {
      // Wallet surfaces the real error; keep the modal open and non-blocking.
    }
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send asset"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Send asset</h2>
          <button type="button" className="text-gray-500" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-gray-500">
          Balance: {balanceLoading ? '…' : balance ? `${balance.formatted} ${balance.symbol}` : '0'}
        </p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit} noValidate>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Recipient address</span>
            <input
              {...register('to')}
              placeholder="0x…"
              aria-label="Recipient address"
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
              Amount (wei)
              <button
                type="button"
                onClick={handleMax}
                disabled={maxSendableWei <= 0n}
                className="text-xs font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
              >
                Max
              </button>
            </span>
            <input
              {...register('amount')}
              placeholder="0"
              aria-label="Amount in wei"
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
              <span>Percent of available balance</span>
              <span className="font-mono text-xs text-gray-500">{percent}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={percent}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              aria-label="Percentage of balance to send"
              disabled={maxSendableWei <= 0n}
              className="w-full accent-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Gas limit</span>
            <input
              {...register('gasLimit')}
              placeholder="21000"
              aria-label="Gas limit"
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
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default SendModal;
