'use client';

import React from 'react';
import { useState } from 'react';
import { useTransactionSimulation } from '@/lib/hooks/useTransactionSimulation';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Lets a user paste a destination address (+ optional value) and simulates the
 * transaction via `useTransactionSimulation`. Per issue #21, if the simulation
 * reverts the UI shows "This transaction will fail".
 */
export function TransactionSimulator() {
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const { result, status, simulate, reset } = useTransactionSimulation();

  const isValid = ADDRESS_RE.test(to);

  async function handleSimulate() {
    if (!isValid) return;
    await simulate({
      chainId: 1,
      to: to as `0x${string}`,
      value: value ? BigInt(value) : undefined
    });
  }

  return (
    <section id="simulator" className="card">
      <h2 className="text-sm font-semibold text-gray-900">Transaction Simulator</h2>
      <p className="mt-2 text-sm text-gray-600">
        Preview a transaction before sending. The simulator warns you if it would fail.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Destination address</span>
          <input
            type="text"
            value={to}
            onChange={(e) => {
              setTo(e.target.value.trim());
              reset();
            }}
            placeholder="0x…"
            aria-label="Destination address"
            className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-700">Value (wei, optional)</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            aria-label="Value in wei"
            className="rounded border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </label>

        <button
          type="button"
          onClick={handleSimulate}
          disabled={!isValid || status === 'simulating'}
          className="btn self-start"
        >
          {status === 'simulating' ? 'Simulating…' : 'Simulate transaction'}
        </button>
      </div>

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
