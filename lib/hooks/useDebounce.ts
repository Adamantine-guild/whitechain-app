'use client';

import { useEffect, useState } from 'react';

/**
 * useDebounce — delays updating a value until a specified delay has passed
 * since the last change. Useful for preventing expensive operations (e.g.,
 * RPC calls, API requests) from firing on every keystroke.
 *
 * @param value  The raw (fast-changing) value to debounce.
 * @param delay  Debounce delay in milliseconds (default: 300).
 * @returns      The debounced value, which updates only after `delay` ms of
 *               inactivity.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   if (debouncedSearch) fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}