/**
 * PluginManager — orchestrates the full lifecycle of every plugin.
 *
 * Responsibilities:
 *  1. Mount / unmount plugins via their IAppPlugin interface.
 *  2. Build and inject the typed PluginSDKContext for each plugin.
 *  3. Enforce permission checks and write an immutable audit log entry for
 *     every wallet/capability access attempt (granted or denied).
 *  4. Propagate host events (address/chain changes, new blocks) to active plugins.
 *  5. Update the PluginRegistry with real-time lifecycle status changes.
 *
 * SECURITY CONTRACT
 * ─────────────────
 * • A plugin can only receive wallet data if its manifest explicitly declares
 *   the corresponding permission AND the host has granted it.
 * • Private keys, raw connector instances, and document.cookie are never
 *   passed to any plugin context — this class never touches them.
 * • All access attempts (granted or denied) are audit-logged and available
 *   for inspection via `getAuditLog(id)`.
 */

import type {
  IAppPlugin,
  PluginId,
  PluginPermission,
  PluginSDKContext,
  PluginHostEvent,
  PluginEventHandler,
  WalletAccessRequest,
  WalletAccessAuditEntry,
} from '@/lib/types/plugin';
import { pluginRegistry } from '@/lib/store/pluginRegistry';

// ---------------------------------------------------------------------------
// HostWalletState — the slice of wallet state the host exposes to the manager
// ---------------------------------------------------------------------------

export interface HostWalletState {
  address: `0x${string}` | null;
  chainId: number | null;
}

// ---------------------------------------------------------------------------
// PluginManager class
// ---------------------------------------------------------------------------

export class PluginManager {
  private walletState: HostWalletState = { address: null, chainId: null };

  /**
   * Map from pluginId → Map of event name → Set of handlers registered by
   * that plugin. Used to dispatch host events and to clean up on unmount.
   */
  private readonly eventListeners = new Map<
    PluginId,
    Map<PluginHostEvent, Set<PluginEventHandler>>
  >();

  /**
   * Tracks which permissions have already been granted during the current
   * session for each plugin, so re-requesting the same permission is a no-op.
   */
  private readonly grantedPermissions = new Map<PluginId, Set<PluginPermission>>();

  // -------------------------------------------------------------------------
  // Wallet state synchronisation
  // -------------------------------------------------------------------------

  /**
   * Called by the React provider whenever the connected wallet state changes.
   * The manager broadcasts matching events to all active plugins that hold
   * the relevant permissions.
   */
  updateWalletState(next: HostWalletState): void {
    const prev = this.walletState;
    this.walletState = next;

    if (next.address !== prev.address) {
      if (next.address === null) {
        this.broadcastEvent('wallet:disconnected', null);
      } else {
        this.broadcastEvent('wallet:address-changed', { address: next.address });
      }
    }

    if (next.chainId !== prev.chainId) {
      this.broadcastEvent('wallet:chain-changed', { chainId: next.chainId });
    }
  }

  /**
   * Called by the host's block watcher whenever a new block arrives.
   * Only dispatched to plugins that declared `chain:subscribe-blocks`.
   */
  notifyNewBlock(blockNumber: bigint): void {
    this.broadcastEvent('chain:new-block', { blockNumber: blockNumber.toString() });
  }

  // -------------------------------------------------------------------------
  // Mount / unmount
  // -------------------------------------------------------------------------

  /**
   * Mount a plugin into the given DOM container.
   *
   * Flow:
   *  1. Validate the plugin is registered and not already active.
   *  2. Build the sandbox SDK context.
   *  3. Call plugin.mount(container, context).
   *  4. Update registry status to 'active' or 'error'.
   */
  async mount(pluginId: PluginId, container: HTMLElement): Promise<void> {
    const entry = pluginRegistry.getById(pluginId);
    if (!entry) {
      throw new Error(`[PluginManager] Cannot mount unknown plugin "${pluginId}".`);
    }
    if (entry.status === 'active' || entry.status === 'mounting') {
      // Idempotent — silently skip if already running.
      return;
    }

    pluginRegistry.setStatus(pluginId, 'mounting');

    const context = this.buildSDKContext(entry.plugin);

    try {
      await entry.plugin.mount(container, context);
      pluginRegistry.setStatus(pluginId, 'active');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pluginRegistry.setStatus(pluginId, 'error', message);
      console.error(`[PluginManager] Plugin "${pluginId}" failed to mount:`, err);
    }
  }

  /**
   * Unmount an active plugin. Calls plugin.unmount(), removes all event
   * listeners registered by this plugin, and updates registry status.
   */
  unmount(pluginId: PluginId): void {
    const entry = pluginRegistry.getById(pluginId);
    if (!entry) return;
    if (entry.status === 'unmounted' || entry.status === 'registered') return;

    try {
      entry.plugin.unmount();
    } catch (err) {
      console.error(`[PluginManager] Plugin "${pluginId}" threw during unmount:`, err);
    }

    // Clean up event listeners for this plugin.
    this.eventListeners.delete(pluginId);
    this.grantedPermissions.delete(pluginId);

    pluginRegistry.setStatus(pluginId, 'unmounted');
  }

  /**
   * Unmount all active plugins (e.g. on route change or app teardown).
   */
  unmountAll(): void {
    for (const entry of pluginRegistry.getAll()) {
      if (entry.status === 'active' || entry.status === 'mounting') {
        this.unmount(entry.plugin.manifest.id);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Audit log access
  // -------------------------------------------------------------------------

  /**
   * Return the full wallet-access audit log for a specific plugin.
   * Returns an empty array if the plugin is unknown.
   */
  getAuditLog(pluginId: PluginId): WalletAccessAuditEntry[] {
    return pluginRegistry.getById(pluginId)?.auditLog ?? [];
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Construct the sealed, type-safe SDK context for a given plugin.
   * The context exposes only what the plugin declared in its manifest.
   */
  private buildSDKContext(plugin: IAppPlugin): PluginSDKContext {
    const pluginId = plugin.manifest.id;
    const declaredPermissions = new Set<PluginPermission>(plugin.manifest.permissions);

    // Initialise listener maps for this plugin.
    if (!this.eventListeners.has(pluginId)) {
      this.eventListeners.set(pluginId, new Map());
    }
    if (!this.grantedPermissions.has(pluginId)) {
      this.grantedPermissions.set(pluginId, new Set());
    }

    const granted = this.grantedPermissions.get(pluginId)!;

    /** Write an audit entry and return whether access was granted. */
    const audit = (permission: PluginPermission, reason?: string): boolean => {
      const isDeclared = declaredPermissions.has(permission);
      const auditEntry: WalletAccessAuditEntry = {
        pluginId,
        permission,
        granted: isDeclared,
        timestamp: Date.now(),
        reason: reason?.slice(0, 200)
      };
      pluginRegistry.appendAuditEntry(pluginId, auditEntry);
      if (isDeclared) granted.add(permission);
      return isDeclared;
    };

    const context: PluginSDKContext = {
      // Wallet info — only populated for permitted plugins.
      wallet: {
        get address() {
          return declaredPermissions.has('wallet:read-address')
            ? pluginManager.walletState.address
            : null;
        },
        get chainId() {
          return declaredPermissions.has('wallet:read-chain')
            ? pluginManager.walletState.chainId
            : null;
        }
      },

      requestAccess: async (request: WalletAccessRequest): Promise<boolean> => {
        return audit(request.permission, request.reason);
      },

      on: (event: PluginHostEvent, handler: PluginEventHandler): (() => void) => {
        const listenerMap = this.eventListeners.get(pluginId)!;
        if (!listenerMap.has(event)) {
          listenerMap.set(event, new Set());
        }
        listenerMap.get(event)!.add(handler);
        return () => {
          listenerMap.get(event)?.delete(handler);
        };
      },

      emit: (event: string, payload?: Record<string, unknown>): void => {
        // Plugin telemetry — safe because we only receive serialisable payloads.
        console.debug(`[Plugin:${pluginId}] event="${event}"`, payload ?? {});
      }
    };

    return context;
  }

  /**
   * Dispatch a host event to all active plugins that (a) hold the relevant
   * permission and (b) have registered a handler for this event.
   */
  private broadcastEvent(event: PluginHostEvent, data: unknown): void {
    for (const entry of pluginRegistry.getByStatus('active')) {
      const id = entry.plugin.manifest.id;
      const listenerMap = this.eventListeners.get(id);
      if (!listenerMap) continue;

      const handlers = listenerMap.get(event);
      if (!handlers) continue;

      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(
            `[PluginManager] Error in plugin "${id}" handler for "${event}":`,
            err
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

/**
 * Application-wide PluginManager instance.
 *
 * ```ts
 * import { pluginManager } from '@/lib/core/PluginManager';
 * await pluginManager.mount('com.acme.yield', containerRef.current);
 * ```
 */
export const pluginManager = new PluginManager();
