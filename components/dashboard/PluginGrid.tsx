'use client';

/**
 * PluginGrid — renders all registered plugin widgets as cards on the dashboard.
 *
 * Subscribes to the global PluginRegistry so it automatically re-renders
 * whenever plugins are registered, unregistered, or change status.
 *
 * Each plugin is wrapped in:
 *   • An ErrorBoundary — so a crashing plugin can't break the whole dashboard.
 *   • A PluginSandbox — which enforces the iframe/CSP security model and
 *     calls PluginManager.mount/unmount on the plugin's behalf.
 */

import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { PluginSandbox } from '@/components/dashboard/PluginSandbox';
import { pluginRegistry } from '@/lib/store/pluginRegistry';
import type { PluginRegistryEntry } from '@/lib/types/plugin';
import { useTranslation } from 'react-i18next';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a responsive grid of plugin cards sourced from the global registry.
 *
 * Returns `null` when no plugins are registered so it takes up zero space and
 * doesn't affect the existing dashboard layout.
 */
export function PluginGrid() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<PluginRegistryEntry[]>(() =>
    pluginRegistry.getAll()
  );

  // Keep local state in sync with the registry.
  useEffect(() => {
    const unsubscribe = pluginRegistry.subscribe((snapshot) => {
      setEntries(Array.from(snapshot.values()));
    });
    return unsubscribe;
  }, []);

  // Don't render anything if there are no registered plugins — avoids layout
  // jitter on initial load when the plugin list is empty.
  if (entries.length === 0) return null;

  return (
    <section
      id="plugins"
      aria-label={t('plugins.communityPlugins')}
      className="card lg:col-span-2"
    >
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('plugins.communityPlugins')}
        </h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('plugins.pluginLoaded', { count: entries.length })}
        </span>
      </div>

      {/* Plugin grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <PluginCard key={entry.plugin.manifest.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// PluginCard — individual card wrapper for a single plugin
// ---------------------------------------------------------------------------

interface PluginCardProps {
  entry: PluginRegistryEntry;
}

function PluginCard({ entry }: PluginCardProps) {
  const { t } = useTranslation();
  const { manifest } = entry.plugin;
  const iconFallback = (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-gray-100 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    >
      {manifest.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        {manifest.iconUrl && (
          <ImageWithFallback
            src={manifest.iconUrl}
            alt=""
            role="presentation"
            width={20}
            height={20}
            className="h-5 w-5 rounded-sm object-contain"
            fallback={iconFallback}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
            {manifest.name}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            v{manifest.version} · {manifest.author}
          </p>
        </div>
        <PluginStatusBadge status={entry.status} />
      </div>

      {/* Plugin description */}
      <p className="px-3 pb-1 pt-2 text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">
        {manifest.description}
      </p>

      {/* Plugin sandbox — the actual widget rendering area */}
      <ErrorBoundary
        fallback={
          <div
            role="alert"
            className="m-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          >
            {t('pluginCard.suspended')}
          </div>
        }
      >
        <PluginSandbox
          entry={entry}
          className="min-h-[180px] flex-1"
        />
      </ErrorBoundary>

      {/* Permissions disclosure */}
      {manifest.permissions.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-1.5 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            <span className="font-medium">{t('plugins.permissions')}: </span>
            {manifest.permissions.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

type BadgeProps = { status: PluginRegistryEntry['status'] };

const STATUS_STYLES: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  mounting:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  active:     'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  error:      'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  unmounted:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

function PluginStatusBadge({ status }: BadgeProps) {
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status] ?? STATUS_STYLES.registered}`}
    >
      {status}
    </span>
  );
}

export default PluginGrid;
