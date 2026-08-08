'use client';

import React from 'react';

/**
 * Skeleton — a low-level shimmering placeholder block used while async data
 * is loading. Wraps Tailwind's `animate-pulse` with a consistent set of
 * shape-oriented props so callers can build rich skeleton layouts without
 * repeating the same utility classes.
 *
 * Kept property-light on purpose: it accepts the same dimensional/style props
 * as a plain div so it drops into any markup shape (text lines, cards, avatars,
 * table cells, etc.).
 */
export interface SkeletonProps {
  /** Width in any CSS length (defaults to '100%'). */
  width?: string;
  /** Height in any CSS length (defaults to '1rem'). */
  height?: string;
  /** Optional border-radius override (defaults to 'rounded'). */
  radius?: string;
  /** Extra Tailwind/utility classes appended to the base styling. */
  className?: string;
  /** Optional aria hidden flag — most skeletons are presentational. */
  ariaHidden?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  radius = 'rounded',
  className = '',
  ariaHidden = true,
}: SkeletonProps) {
  return (
    <div
      aria-hidden={ariaHidden}
      style={{ width, height }}
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${radius} ${className}`}
    />
  );
}

export default Skeleton;