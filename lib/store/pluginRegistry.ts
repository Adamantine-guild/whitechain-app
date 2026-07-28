/**
 * Plugin Registry — global in-memory store for registered plugins.
 *
 * Intentionally framework-agnostic (no React dependency) so it can be
 * consumed by both the PluginManager (server-side lifecycle logic) and React
 * components via the PluginRegistryContext provider.
 *
 * The registry follows the observer pattern: callers subscribe to mutations
 * and receive the full updated snapshot, making it easy to drive React state.
 */

import type { IAppPlugin, PluginId, PluginRegistryEntry, PluginStatus } from '@/lib/types/plugin';

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export type RegistrySnapshot = ReadonlyMap<PluginId, PluginRegistryEntry>;

export type RegistryListener = (snapshot: RegistrySnapshot) => void;

// ---------------------------------------------------------------------------
// PluginRegistry class
// ---------------------------------------------------------------------------

/**
 * Singleton registry that tracks every plugin known to the host application.
 *
 * Usage:
 * ```ts
 * pluginRegistry.register(myPlugin);
 * pluginRegistry.setStatus('com.acme.plugin', 'active');
 * const all = pluginRegistry.getAll();
 * ```
 */
export class PluginRegistry {
  private readonly entries = new Map<PluginId, PluginRegistryEntry>();
  private readonly listeners = new Set<RegistryListener>();

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Add a plugin to the registry. Throws if the plugin id is already taken.
   * Initial status is always `'registered'`.
   */
  register(plugin: IAppPlugin): void {
    const id = plugin.manifest.id;
    if (this.entries.has(id)) {
      throw new Error(
        `[PluginRegistry] Plugin "${id}" is already registered. ` +
        'Call unregister() first if you want to replace it.'
      );
    }

    const entry: PluginRegistryEntry = {
      plugin,
      status: 'registered',
      auditLog: [],
      registeredAt: Date.now()
    };

    this.entries.set(id, entry);
    this.notify();
  }

  /**
   * Remove a plugin from the registry. Safe to call even when the plugin is
   * still mounted — callers should ensure `unmount()` is called first.
   */
  unregister(id: PluginId): void {
    if (!this.entries.has(id)) return;
    this.entries.delete(id);
    this.notify();
  }

  /**
   * Update the lifecycle status of a registered plugin.
   * Optionally attach an error message (only meaningful when status === 'error').
   */
  setStatus(id: PluginId, status: PluginStatus, errorMessage?: string): void {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`[PluginRegistry] Unknown plugin id "${id}".`);
    }

    entry.status = status;
    entry.errorMessage = errorMessage;
    this.notify();
  }

  /**
   * Append a wallet/capability access audit entry for the given plugin.
   * Creates a new array reference so that React memoisation detects the change.
   */
  appendAuditEntry(
    id: PluginId,
    entry: PluginRegistryEntry['auditLog'][number]
  ): void {
    const registryEntry = this.entries.get(id);
    if (!registryEntry) return;

    registryEntry.auditLog = [...registryEntry.auditLog, entry];
    this.notify();
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /** Return a single registry entry, or `undefined` if not found. */
  getById(id: PluginId): PluginRegistryEntry | undefined {
    return this.entries.get(id);
  }

  /** Return all registry entries as an array (order: insertion order). */
  getAll(): PluginRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /** Return only entries whose status matches the given value. */
  getByStatus(status: PluginStatus): PluginRegistryEntry[] {
    return this.getAll().filter((e) => e.status === status);
  }

  /** Returns `true` if a plugin with the given id exists in the registry. */
  has(id: PluginId): boolean {
    return this.entries.has(id);
  }

  /** Current size of the registry. */
  get size(): number {
    return this.entries.size;
  }

  // -------------------------------------------------------------------------
  // Observer API
  // -------------------------------------------------------------------------

  /**
   * Subscribe to registry changes. The listener is called immediately with
   * the current snapshot, and again on every subsequent mutation.
   *
   * Returns an unsubscribe function.
   */
  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener);
    // Emit current snapshot immediately so the subscriber is in sync.
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private snapshot(): RegistrySnapshot {
    // Return a shallow copy so external code can't mutate internal state.
    return new Map(this.entries);
  }

  private notify(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

/**
 * The application-wide plugin registry.
 *
 * Import this wherever registry access is needed:
 * ```ts
 * import { pluginRegistry } from '@/lib/store/pluginRegistry';
 * ```
 */
export const pluginRegistry = new PluginRegistry();
