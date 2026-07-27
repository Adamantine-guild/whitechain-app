'use client';

import React from 'react';

/**
 * SkeletonRow — a single shimmering placeholder row used while list data is
 * loading. Uses only an opacity pulse (animate-pulse) so it stays GPU-light
 * and doesn't trigger layout/paint work (issue #10 requirement).
 */
export function SkeletonRow({ columns = 3 }: { columns?: number }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-3"
      aria-hidden="true"
      data-testid="skeleton-row"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-gray-200"
          style={{ width: `${[40, 25, 20][i % 3]}%` }}
        />
      ))}
    </div>
  );
}

export default SkeletonRow;
