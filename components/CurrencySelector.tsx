'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, Check } from 'lucide-react';

import { SUPPORTED_FIAT_CURRENCIES, type FiatCurrency } from '@/src/utils/format';
import { useFiatCurrencyStore } from '@/lib/store/fiatCurrencyStore';

/**
 * Global fiat currency selector.
 *
 * Lets users pick their preferred display currency (USD, EUR, GBP, ...).
 * The selection is stored in `useFiatCurrencyStore` (persisted to
 * localStorage) and immediately re-renders every fiat value across the app
 * via `formatCurrency`.
 */
export function CurrencySelector() {
  const { t } = useTranslation();
  const currency = useFiatCurrencyStore((s) => s.currency);
  const setCurrency = useFiatCurrencyStore((s) => s.setCurrency);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const current = SUPPORTED_FIAT_CURRENCIES.find((c) => c.code === currency);

  const handleChange = useCallback(
    (code: FiatCurrency) => {
      setCurrency(code);
      setOpen(false);
    },
    [setCurrency],
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('currency.selector')}
        className="btn-outline flex items-center gap-1.5 px-3 py-2 text-xs transition-all duration-150"
      >
        <Banknote size={14} aria-hidden="true" className="shrink-0" />
        <span className="font-medium">{current?.code ?? 'USD'}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('currency.selector')}
          className="absolute end-0 z-50 mt-2 max-h-80 w-56 origin-top-right overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900 animate-in fade-in slide-in-from-top-1"
        >
          {SUPPORTED_FIAT_CURRENCIES.map(({ code, label, symbol }) => {
            const isActive = currency === code;

            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleChange(code)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    isActive
                      ? 'font-semibold text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="w-8 shrink-0 text-base" aria-hidden="true">
                    {symbol}
                  </span>
                  <span className="flex-1">
                    {label}{' '}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      ({code})
                    </span>
                  </span>
                  {isActive && (
                    <Check
                      size={14}
                      className="shrink-0 text-green-600 dark:text-green-400"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default CurrencySelector;