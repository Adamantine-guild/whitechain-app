'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  headline?: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  headline,
  description,
  primaryLabel,
  primaryHref = '/dashboard',
  secondaryLabel,
  secondaryHref,
  icon,
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      data-testid="empty-state"
    >
      <div className="mb-6 text-gray-300">
        {icon ?? <Inbox size={64} strokeWidth={1} />}
      </div>

      <h3 className="text-lg font-semibold text-gray-900">
        {headline ?? t('activity.empty.headline')}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-gray-500">
        {description ?? t('activity.empty.description')}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Link href={primaryHref} className="btn">
          {primaryLabel ?? t('activity.empty.exploreVaults')}
        </Link>

        {secondaryLabel && secondaryHref && (
          <Link href={secondaryHref} className="btn-outline">
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
