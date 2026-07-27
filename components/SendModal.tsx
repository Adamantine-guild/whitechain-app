'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAccount, useBalance } from 'wagmi';
import { buildSendSchema, type SendFormValues } from '@/lib/validation/sendSchema';

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

  const balanceWei = balance ? BigInt(balance.value.toString()) : 0n;
  const schema = React.useMemo(() => buildSendSchema(balanceWei), [balanceWei]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setError
  } = useForm<SendFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { to: '', amount: '', gasLimit: '21000' }
  });

  useEffect(() => {
    if (!isOpen) reset();
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
            <span className="text-gray-700">Amount (wei)</span>
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
