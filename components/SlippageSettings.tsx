'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Settings2, AlertTriangle, Gauge } from 'lucide-react';
import { useUserSettingsStore, type SlippageValue } from '@/lib/store/userSettingsStore';
import {
  PRESET_SLIPPAGE_VALUES,
  SLIPPAGE_WARNING_THRESHOLD,
  validateSlippageInput,
  isSlippageRisky
} from '@/lib/store/userSettingsStore';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SlippageSettings — a popover that lets users view and adjust their slippage
 * tolerance. Supports preset buttons and a custom decimal input with live
 * validation. Warnings are shown for values above 5 % (sandwich-attack risk).
 *
 * The selected value is persisted to localStorage via the Zustand store.
 *
 * Usage:
 * ```tsx
 * import { SlippageSettings } from '@/components/SlippageSettings';
 *
 * <SlippageSettings />
 * ```
 */
export function SlippageSettings() {
  const slippage = useUserSettingsStore((s) => s.slippage);
  const setSlippage = useUserSettingsStore((s) => s.setSlippage);

  const [open, setOpen] = useState(false);
  const [customRaw, setCustomRaw] = useState('');
  const [customTouched, setCustomTouched] = useState(false);
  const [focusedPreset, setFocusedPreset] = useState<SlippageValue | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustom = !PRESET_SLIPPAGE_VALUES.includes(slippage);
  const risky = isSlippageRisky(slippage);

  // Close on outside click (same pattern as ProfileDropdown).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Use pointerdown so it fires before blur events, preventing the input
    // from reopening the popover.
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Focus the custom input when the user clicks the custom option.
  useEffect(() => {
    if (open && isCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, isCustom]);

  // Sync the custom raw input when slippage changes externally or on re-open.
  useEffect(() => {
    if (isCustom) {
      setCustomRaw(String(slippage));
    }
  }, [isCustom, slippage]);

  const handlePresetClick = useCallback(
    (value: SlippageValue) => {
      setSlippage(value);
      setCustomRaw('');
      setCustomTouched(false);
      setOpen(false);
    },
    [setSlippage]
  );

  const handleCustomChange = useCallback(
    (raw: string) => {
      setCustomRaw(raw);
      setCustomTouched(true);

      const validation = validateSlippageInput(raw);
      if (validation.valid && raw !== '' && raw !== '.') {
        const num = Number(raw);
        if (!Number.isNaN(num)) {
          setSlippage(num);
        }
      }
    },
    [setSlippage]
  );

  const handleCustomBlur = useCallback(() => {
    setCustomTouched(true);
    // If the raw input is invalid, reset to the current store value.
    const validation = validateSlippageInput(customRaw);
    if (!validation.valid) {
      setCustomRaw(String(slippage));
      setCustomTouched(false);
    }
  }, [customRaw, slippage]);

  const handleCustomKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const validation = validateSlippageInput(customRaw);
        if (validation.valid) {
          setOpen(false);
        }
      }
    },
    [customRaw]
  );

  // ---- Validation state ----

  const customValidation = customTouched ? validateSlippageInput(customRaw) : null;
  const customError =
    customValidation && !customValidation.valid ? customValidation.message : null;

  // ---- Render ----

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button — shows current slippage + warning dot when risky */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Slippage tolerance: ${slippage} %. Click to adjust.`}
        className={`
          btn-outline relative flex items-center gap-1.5 px-3 py-2 text-xs
          transition-all duration-150
          ${risky ? 'border-amber-300 text-amber-700 hover:border-amber-400 dark:border-amber-700 dark:text-amber-400' : ''}
          ${open ? 'ring-2 ring-gray-400/50 dark:ring-gray-600/50' : ''}
        `}
      >
        <Settings2 size={14} aria-hidden="true" className="shrink-0" />
        <span className="font-medium">{slippage}%</span>
        {risky && (
          <AlertTriangle
            size={12}
            aria-hidden="true"
            className="shrink-0 text-amber-500"
          />
        )}
      </button>

      {/* Popover panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Slippage tolerance settings"
          className="
            absolute right-0 z-50 mt-2 w-72 origin-top-right
            rounded-lg border border-gray-200 bg-white
            shadow-lg shadow-gray-900/10
            dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/30
          "
        >
          {/* Header */}
          <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Gauge size={15} aria-hidden="true" className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Slippage Tolerance
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Your transaction will revert if the price moves by more than this.
            </p>
          </div>

          {/* Preset buttons */}
          <div className="px-4 pt-3">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Quick select
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {PRESET_SLIPPAGE_VALUES.map((value) => {
                const selected = slippage === value && !isCustom;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePresetClick(value)}
                    onMouseEnter={() => setFocusedPreset(value)}
                    onMouseLeave={() => setFocusedPreset(null)}
                    className={`
                      relative rounded-md px-2.5 py-2 text-sm font-medium
                      transition-all duration-100
                      ${
                        selected
                          ? 'bg-gray-900 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }
                      ${focusedPreset === value && !selected ? 'ring-1 ring-gray-300 dark:ring-gray-600' : ''}
                    `}
                    aria-pressed={selected}
                    aria-label={`Set slippage to ${value} %`}
                  >
                    {value}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom input */}
          <div className="px-4 pb-4 pt-3">
            <label
              htmlFor="slippage-custom"
              className="text-xs font-medium text-gray-600 dark:text-gray-400"
            >
              Custom
            </label>
            <div className="relative mt-1.5">
              <input
                ref={inputRef}
                id="slippage-custom"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={customRaw}
                onChange={(e) => handleCustomChange(e.target.value)}
                onBlur={handleCustomBlur}
                onKeyDown={handleCustomKeyDown}
                placeholder="0.5"
                aria-invalid={!!customError}
                aria-describedby={customError ? 'slippage-error' : undefined}
                className={`
                  w-full rounded-md border px-3 py-2 pr-8
                  font-mono text-sm
                  transition-all duration-100
                  placeholder:text-gray-400 dark:placeholder:text-gray-500
                  focus:outline-none focus:ring-2
                  ${
                    customError
                      ? 'border-red-300 bg-red-50 text-red-800 focus:border-red-400 focus:ring-red-300 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:focus:ring-red-700'
                      : 'border-gray-300 bg-white text-gray-900 focus:border-gray-500 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-600'
                  }
                `}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                %
              </span>
            </div>

            {/* Validation error */}
            {customError && (
              <p
                id="slippage-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
              >
                <AlertTriangle size={11} aria-hidden="true" />
                {customError}
              </p>
            )}
          </div>

          {/* Risk warning banner */}
          {risky && (
            <div className="mx-4 mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={14}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    High slippage warning
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                    Setting slippage above {SLIPPAGE_WARNING_THRESHOLD}% puts
                    you at high risk of sandwich attacks. Consider a lower
                    value.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Current value summary */}
          <div className="border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Current tolerance</span>
              <span
                className={`font-semibold ${
                  risky
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {slippage}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SlippageSettings;
