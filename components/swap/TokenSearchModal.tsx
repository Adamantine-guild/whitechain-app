'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Debounce delay for the token contract address input (ms). */
const DEBOUNCE_MS = 300;

/** Regex for a basic Ethereum-compatible address check (0x-prefixed, 40 hex chars). */
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenSearchResult {
  /** The contract address (checksummed). */
  address: string;
  /** Token symbol (e.g., "USDC"), or null if unknown. */
  symbol: string | null;
  /** Token name, or null if unknown. */
  name: string | null;
  /** Number of decimal places. */
  decimals: number | null;
}

export interface TokenSearchModalProps {
  /** Whether the modal is visible. */
  isOpen: boolean;
  /** Called when the user closes the modal without selecting a token. */
  onClose: () => void;
  /**
   * Called when the user selects a token. Receives the resolved
   * TokenSearchResult.
   */
  onSelect: (token: TokenSearchResult) => void;
  /**
   * Optional RPC validation function. When provided, calls this function
   * with the debounced address to validate it on-chain. Defaults to a
   * no-op passthrough that returns the address as-is (no RPC call).
   */
  validateAddress?: (address: string) => Promise<TokenSearchResult | null>;
}

// ---------------------------------------------------------------------------
// Validation states
// ---------------------------------------------------------------------------

type ValidationState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid'; result: TokenSearchResult }
  | { status: 'invalid'; error: string }
  | { status: 'error'; error: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TokenSearchModal({
  isOpen,
  onClose,
  onSelect,
  validateAddress,
}: TokenSearchModalProps) {
  const [inputValue, setInputValue] = useState('');
  const debouncedAddress = useDebounce(inputValue, DEBOUNCE_MS);
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset state when the modal opens/closes.
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      setValidation({ status: 'idle' });
    }
  }, [isOpen]);

  // Focus the input when the modal opens.
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to let the modal render.
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Validate the debounced address.
  useEffect(() => {
    // No input — reset to idle.
    if (!debouncedAddress.trim()) {
      setValidation({ status: 'idle' });
      return;
    }

    // Basic format check.
    if (!ADDRESS_REGEX.test(debouncedAddress.trim())) {
      setValidation({
        status: 'invalid',
        error: 'Invalid address format. Must be a 0x-prefixed 40-character hex string.',
      });
      return;
    }

    // If the address looks valid, start validation.
    let cancelled = false;
    setValidation({ status: 'validating' });

    (async () => {
      try {
        if (validateAddress) {
          const result = await validateAddress(debouncedAddress.trim());
          if (cancelled) return;
          if (result) {
            setValidation({ status: 'valid', result });
          } else {
            setValidation({
              status: 'invalid',
              error: 'Token not found at this address. Check the contract address and try again.',
            });
          }
        } else {
          // No custom validator — just mark as valid (passthrough).
          if (cancelled) return;
          setValidation({
            status: 'valid',
            result: {
              address: debouncedAddress.trim(),
              symbol: null,
              name: null,
              decimals: null,
            },
          });
        }
      } catch (err) {
        if (cancelled) return;
        setValidation({
          status: 'error',
          error:
            err instanceof Error
              ? err.message
              : 'Failed to validate address. Please try again.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedAddress, validateAddress]);

  // Handle selection.
  const handleSelect = useCallback(() => {
    if (validation.status === 'valid') {
      onSelect(validation.result);
      onClose();
    }
  }, [validation, onSelect, onClose]);

  // Keyboard handling (Escape to close, Enter to confirm).
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && validation.status === 'valid') {
        handleSelect();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, validation.status, handleSelect]);

  if (!isOpen) return null;

  // Determine the loading spinner state.
  const showSpinner =
    validation.status === 'validating' && inputValue !== debouncedAddress;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search for a token by contract address"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import Token
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste a token contract address to import an unverified asset.
        </p>

        {/* Search Input */}
        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="0x…"
              aria-label="Token contract address"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm font-mono text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400"
            />
            {/* Inline spinner while debouncing */}
            {showSpinner && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
            )}
          </div>
        </div>

        {/* Validation Status */}
        <div className="mt-3 min-h-[1.25rem]">
          {validation.status === 'validating' && !showSpinner && (
            <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Validating address…</span>
            </div>
          )}

          {validation.status === 'valid' && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/40">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {validation.result.symbol ?? 'Unknown Token'}
                </p>
                {validation.result.name && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {validation.result.name}
                  </p>
                )}
                <p className="truncate text-xs font-mono text-green-600 dark:text-green-400">
                  {validation.result.address}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelect}
                className="flex-shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                Import
              </button>
            </div>
          )}

          {validation.status === 'invalid' && (
            <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validation.error}</span>
            </div>
          )}

          {validation.status === 'error' && (
            <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{validation.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TokenSearchModal;