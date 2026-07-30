'use client';

import React, { useState } from 'react';
import { ArrowDownUp, RefreshCw } from 'lucide-react';
import { KNOWN_TOKENS } from '@/lib/services/RouteOptimizer';
import { useRouteOptimizer } from '@/lib/hooks/useRouteOptimizer';
import { SwapRouteDisplay } from './SwapRouteDisplay';
import { notifyTxError, notifyTxSuccessLocal } from '@/components/TxToasts';

export function SwapCard() {
  const [tokenInSymbol, setTokenInSymbol] = useState('USDC');
  const [tokenOutSymbol, setTokenOutSymbol] = useState('WBTC');
  const [amountInStr, setAmountInStr] = useState('100');

  const tokenIn = KNOWN_TOKENS[tokenInSymbol];
  const tokenOut = KNOWN_TOKENS[tokenOutSymbol];

  // Parse input amount according to decimals
  const parseAmountIn = (): bigint => {
    try {
      if (!amountInStr || isNaN(Number(amountInStr))) return 0n;
      const num = parseFloat(amountInStr);
      if (num <= 0) return 0n;
      return BigInt(Math.floor(num * 10 ** (tokenIn?.decimals ?? 6)));
    } catch {
      return 0n;
    }
  };

  const amountInBigInt = parseAmountIn();
  const { route, isCalculating } = useRouteOptimizer(
    tokenInSymbol,
    tokenOutSymbol,
    amountInBigInt
  );

  // Format expected output for UI display
  const formatOutput = (): string => {
    if (!route || !route.expectedOutput) return '0.00';
    const decimals = tokenOut?.decimals ?? 18;
    const raw = Number(route.expectedOutput) / 10 ** decimals;
    return raw < 0.0001 ? raw.toExponential(4) : raw.toFixed(6);
  };

  const handleSwapTokens = () => {
    setTokenInSymbol(tokenOutSymbol);
    setTokenOutSymbol(tokenInSymbol);
  };

  const handleExecuteSwap = () => {
    if (!route) {
      notifyTxError('No valid route available for swap');
      return;
    }

    notifyTxSuccessLocal(
      `Swapped ${amountInStr} ${tokenInSymbol} for ~${formatOutput()} ${tokenOutSymbol} via ${
        route.hops.length > 1 ? 'multi-hop route' : 'direct route'
      }`
    );
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-md dark:border-gray-800 dark:bg-gray-900 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Swap Tokens
        </h2>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          Multi-Hop Router
        </span>
      </div>

      {/* Input Token Box */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 dark:border-gray-800 dark:bg-gray-950/60">
        <div className="flex justify-between text-xs text-gray-500">
          <span>You Pay</span>
          <span>Balance: 10,000.00</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={amountInStr}
            onChange={(e) => setAmountInStr(e.target.value)}
            placeholder="0.0"
            className="w-full bg-transparent text-2xl font-bold text-gray-900 focus:outline-none dark:text-gray-100"
          />
          <select
            value={tokenInSymbol}
            onChange={(e) => setTokenInSymbol(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {Object.keys(KNOWN_TOKENS).map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap Switcher Button */}
      <div className="flex justify-center -my-2">
        <button
          type="button"
          onClick={handleSwapTokens}
          aria-label="Switch input and output tokens"
          className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition-transform hover:rotate-180 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowDownUp className="h-4 w-4" />
        </button>
      </div>

      {/* Output Token Box */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 dark:border-gray-800 dark:bg-gray-950/60">
        <div className="flex justify-between text-xs text-gray-500">
          <span>You Receive (Estimated)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-full text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isCalculating ? (
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            ) : (
              formatOutput()
            )}
          </div>
          <select
            value={tokenOutSymbol}
            onChange={(e) => setTokenOutSymbol(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {Object.keys(KNOWN_TOKENS).map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Routing Display */}
      <SwapRouteDisplay route={route} isCalculating={isCalculating} />

      {/* Action Button */}
      <button
        type="button"
        onClick={handleExecuteSwap}
        disabled={isCalculating || !route}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-center font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {isCalculating
          ? 'Calculating Route…'
          : !route
          ? 'No Route Found'
          : `Swap ${tokenInSymbol} to ${tokenOutSymbol}`}
      </button>
    </div>
  );
}

export default SwapCard;
