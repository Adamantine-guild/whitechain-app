'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CopyIcon } from './icons';

export function CopyAddress({ address, className }: { address: string; className?: string }) {
  const { t } = useTranslation();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'denied'>('idle');

  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), 1500);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopyState('copied');
    } catch {
      setCopyState('denied');
    }
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t('copyAddress.copyToClipboard')}
        className={className ?? 'text-gray-400 hover:text-gray-700'}
      >
        {copyState === 'copied' ? (
          <CheckIcon className="h-4 w-4 text-green-600" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
      </button>
      {copyState !== 'idle' && (
        <span
          role="status"
          className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white"
        >
          {copyState === 'copied' ? t('copyAddress.copied') : t('copyAddress.copyBlocked')}
        </span>
      )}
    </span>
  );
}
