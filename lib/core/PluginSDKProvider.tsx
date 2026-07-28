'use client';

/**
 * PluginSDKProvider — React context provider that bridges the host's wallet
 * state to the PluginManager and exposes the fully-typed SDK surface to
 * plugin developers.
 *
 * Place this inside <Providers> (after WagmiProvider) so all wallet hooks
 * are available. It keeps the PluginManager's internal wallet snapshot in
 * sync and forwards new-block events to active plugins that declared the
 * `chain:subscribe-blocks` permission.
 *
 * Plugin developers import `usePluginSDK` to access the context in any
 * component rendered inside the PluginGrid, or receive it via `mount()`.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode
} from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { pluginManager } from '@/lib/core/PluginManager';
import { pluginRegistry } from '@/lib/store/pluginRegistry';
import type {
  IAppPlugin,
  PluginId,
  PluginManifest,
  PluginRegistryEntry,
  WalletAccessAuditEntry
} from '@/lib/types/plugin';

// ---------------------------------------------------------------------------
// Context value type — the public SDK surface for the host application
// ---------------------------------------------------------------------------

/**
 * The SDK value available via `usePluginSDK()`.
 *
 * Plugin *developers* consume the `PluginSDKContext` injected by `mount()`.
 * *Host* components (e.g. an admin panel) use this React context to manage
 * registered plugins and inspect audit logs.
 */
export interface PluginSDKContextValue {
  /**
   * Register a plugin at runtime. The plugin's manifest is validated and the
   * plugin is added to the registry with status `'registered'`. Mounting
   * happens automatically when the PluginGrid renders the corresponding card.
   *
   * Throws if a plugin with the same id is already registered.
   */
  registerPlugin(plugin: IAppPlugin): void;

  /**
   * Remove a plugin from the registry. If the plugin is currently active it
   * will be unmounted first.
   */
  unregisterPlugin(id: PluginId): void;

  /** Snapshot of all currently registered plugins. */
  plugins: PluginRegistryEntry[];

  /**
   * Return the full wallet-access audit log for a specific plugin.
   * Returns an empty array if the plugin is unknown.
   */
  getAuditLog(id: PluginId): WalletAccessAuditEntry[];

  /**
   * Validate a plugin manifest before registration. Returns an array of
   * validation error messages (empty array = valid).
   */
  validateManifest(manifest: PluginManifest): string[];
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const PluginSDKContext = createContext<PluginSDKContextValue | null>(null);
PluginSDKContext.displayName = 'PluginSDKContext';

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------

const ALLOWED_PERMISSIONS = new Set([
  'wallet:read-address',
  'wallet:read-chain',
  'wallet:read-balance',
  'wallet:request-sign-tx',
  'chain:subscribe-blocks',
  'history:read',
]);

function validateManifest(manifest: PluginManifest): string[] {
  const errors: string[] = [];

  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('manifest.id must be a non-empty string.');
  } else if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(manifest.id)) {
    errors.push(
      'manifest.id must be a dot-separated identifier (e.g. "com.acme.my-plugin").'
    );
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('manifest.name must be a non-empty string.');
  }

  if (typeof manifest.description !== 'string' || manifest.description.length > 140) {
    errors.push('manifest.description must be a string of max 140 characters.');
  }

  if (!/^\d+\.\d+\.\d+/.test(manifest.version ?? '')) {
    errors.push('manifest.version must follow semver (e.g. "1.0.0").');
  }

  if (!manifest.author || typeof manifest.author !== 'string') {
    errors.push('manifest.author must be a non-empty string.');
  }

  if (manifest.iconUrl !== undefined) {
    if (
      typeof manifest.iconUrl !== 'string' ||
      (!manifest.iconUrl.startsWith('https://') && !manifest.iconUrl.startsWith('data:'))
    ) {
      errors.push('manifest.iconUrl must be an absolute HTTPS URL or a data URI.');
    }
  }

  if (!Array.isArray(manifest.permissions)) {
    errors.push('manifest.permissions must be an array.');
  } else {
    const invalid = manifest.permissions.filter((p) => !ALLOWED_PERMISSIONS.has(p));
    if (invalid.length > 0) {
      errors.push(`Unknown permissions: ${invalid.join(', ')}.`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface PluginSDKProviderProps {
  children: ReactNode;
}

/**
 * Wraps the application (or the dashboard section) and:
 *  1. Syncs connected wallet state → PluginManager on every account/chain change.
 *  2. Forwards new-block events to active plugins.
 *  3. Exposes `registerPlugin` / `unregisterPlugin` / audit-log APIs via context.
 */
export function PluginSDKProvider({ children }: PluginSDKProviderProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });

  // -------------------------------------------------------------------------
  // Keep PluginManager wallet snapshot in sync
  // -------------------------------------------------------------------------

  useEffect(() => {
    pluginManager.updateWalletState({
      address: address ?? null,
      chainId: chainId ?? null
    });
  }, [address, chainId]);

  // -------------------------------------------------------------------------
  // Forward new-block events to plugins
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!publicClient) return;

    const unwatch = publicClient.watchBlocks({
      onBlock: (block) => {
        pluginManager.notifyNewBlock(block.number ?? 0n);
      }
    });

    return () => unwatch();
  }, [publicClient]);

  // -------------------------------------------------------------------------
  // Context value — stable reference via useMemo
  // -------------------------------------------------------------------------

  const value = useMemo<PluginSDKContextValue>(
    () => ({
      registerPlugin(plugin: IAppPlugin) {
        const errors = validateManifest(plugin.manifest);
        if (errors.length > 0) {
          throw new Error(
            `[PluginSDK] Invalid plugin manifest:\n${errors.map((e) => `  • ${e}`).join('\n')}`
          );
        }
        pluginRegistry.register(plugin);
      },

      unregisterPlugin(id: PluginId) {
        const entry = pluginRegistry.getById(id);
        if (entry?.status === 'active' || entry?.status === 'mounting') {
          pluginManager.unmount(id);
        }
        pluginRegistry.unregister(id);
      },

      get plugins() {
        return pluginRegistry.getAll();
      },

      getAuditLog(id: PluginId) {
        return pluginManager.getAuditLog(id);
      },

      validateManifest
    }),
    []
  );

  return (
    <PluginSDKContext.Provider value={value}>
      {children}
    </PluginSDKContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the plugin SDK context in any client component.
 *
 * ```tsx
 * const { registerPlugin, plugins } = usePluginSDK();
 * ```
 *
 * Must be called inside a component that is a descendant of `<PluginSDKProvider>`.
 */
export function usePluginSDK(): PluginSDKContextValue {
  const ctx = useContext(PluginSDKContext);
  if (!ctx) {
    throw new Error(
      'usePluginSDK must be called inside a <PluginSDKProvider>. ' +
      'Add <PluginSDKProvider> to your providers tree.'
    );
  }
  return ctx;
}

export { PluginSDKContext };
export default PluginSDKProvider;
