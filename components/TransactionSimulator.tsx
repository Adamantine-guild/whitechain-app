'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransactionSimulation } from '@/lib/hooks/useTransactionSimulation';
import { simulatorSchema, type SimulatorFormValues } from '@/lib/validation/simulatorSchema';

/**
 * Lets a user paste a destination address (+ optional value) and simulates the
 * transaction via `useTransactionSimulation`. Per issue #21, if the simulation
 * reverts the UI shows "This transaction will fail".
 */
export function TransactionSimulator() {
  const { result, status, simulate, reset } = useTransactionSimulation();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    mode: 'onChange',
    defaultValues: { to: '', value: '' },
  });

  const onSimulate = handleSubmit(async (values) => {
    await simulate({
      chainId: 1,
      to: values.to as `0x${string}`,
      value: values.value ? BigInt(values.value) : undefined,
    });
  });

  return (
    <section id="simulator" className="card">
      <h2 className="text-sm font-semibold text-gray-900">Transaction Simulator</h2>
      <p className="mt-2 text-sm text-gray-600">
        Preview a transaction before sending. The simulator warns you if it would fail.
      </p>

      <form className="mt-4 flex flex-col gap-3" onSubmit={onSimulate} noValidate>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Destination address</span>
          <input
            type="text"
            {...register('to')}
            placeholder="0x…"
            aria-label="Destination address"
            aria-invalid={!!errors.to}
            className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          {errors.to && (
            <p role="alert" className="text-xs text-red-600">{errors.to.message}</p>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Value (wei, optional)</span>
          <input
            type="text"
            {...register('value')}
            onChange={(e) => {
              // Only allow digits for the value field
              const digitOnly = e.target.value.replace(/[^0-9]/g, '');
              e.target.value = digitOnly;
              register('value').onChange(e);
            }}
            placeholder="0"
            aria-label="Value in wei"
            aria-invalid={!!errors.value}
            className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
          />
          {errors.value && (
            <p role="alert" className="text-xs text-red-600">{errors.value.message}</p>
          )}
        </label>

        <button
          type="submit"
          disabled={!isValid || status === 'simulating'}
          className="btn self-start"
        >
          {status === 'simulating' ? 'Simulating…' : 'Simulate transaction'}
        </button>
      </form>

      {result && (
        <div
          role="status"
          aria-live="polite"
          className={
            result.status === 'reverts'
              ? 'mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700'
              : result.status === 'success'
                ? 'mt-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700'
                : 'mt-4 rounded border border-gray-300 bg-gray-50 p-3 text-sm text-gray-700'
          }
        >
          {result.status === 'reverts' && <strong>This transaction will fail.</strong>}
          {result.status === 'success' && <strong>Transaction looks safe.</strong>}
          {result.status === 'error' && <strong>Could not simulate.</strong>}
          <div className="mt-1">{result.message}</div>
          {result.revertReason && (
            <div className="mt-1 font-mono text-xs opacity-80">{result.revertReason}</div>
          )}
        </div>
      )}
    </section>
  );
}

export default TransactionSimulator;
