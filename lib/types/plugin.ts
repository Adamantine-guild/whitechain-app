/**
 * Plugin System Type Definitions
 *
 * Defines the public contract between the WhiteChain host application and
 * third-party plugin developers. All types are exported as part of the Plugin SDK.
 */

// ---------------------------------------------------------------------------
// Plugin identity & manifest
// ---------------------------------------------------------------------------

/** Unique identifier for a registered plugin. */
export type PluginId = string;

/**
 * Static metadata about a plugin. Declared by the plugin author and used by
 * the registry to display and validate the plugin before mounting.
 */
export interface PluginManifest {
  /** Stable, globally unique identifier (e.g. "com.acme.yield-optimizer"). */
  readonly id: PluginId;
  /** Human-readable display name shown in the plugin grid header. */
  readonly name: string;
  /** Short description (max 140 chars) shown in the plugin card. */
  readonly description: string;
  /** Semver string of the plugin (e.g. "1.2.3"). */
  readonly version: string;
  /** Plugin author or organisation name. */
  readonly author: string;
  /**
   * Optional URL to the plugin's icon (displayed 32×32 px).
   * Must be an absolute HTTPS URL or a data URI.
   */
  readonly iconUrl?: string;
  /**
   * Declared permissions the plugin requests at registration time.
   * The host enforces these at runtime; any undeclared access is blocked.
   */
  readonly permissions: PluginPermission[];
}

// ---------------------------------------------------------------------------
// Permissions & wallet access auditing
// ---------------------------------------------------------------------------

/**
 * Enumeration of capabilities a plugin can request.
 * Strict security requirement: wallet private-key access is never grantable.
 */
export type PluginPermission =
  /** Read the currently connected wallet address. */
  | 'wallet:read-address'
  /** Read the current chain ID. */
  | 'wallet:read-chain'
  /** Read the native token balance of the connected account. */
  | 'wallet:read-balance'
  /**
   * Request that the host presents a transaction-signing prompt to the user.
   * The plugin never touches the private key; it only proposes a tx payload.
   */
  | 'wallet:request-sign-tx'
  /** Subscribe to new-block events emitted by the host's public client. */
  | 'chain:subscribe-blocks'
  /** Read cached transaction history from the host's IndexedDB store. */
  | 'history:read';

/**
 * Audit log entry created whenever a plugin attempts to access a wallet
 * capability. Retained in memory by the PluginManager for security review.
 */
export interface WalletAccessAuditEntry {
  readonly pluginId: PluginId;
  readonly permission: PluginPermission;
  /** Whether the host granted or denied the request. */
  readonly granted: boolean;
  /** Unix timestamp (ms) when the access attempt was recorded. */
  readonly timestamp: number;
  /** Optional structured reason provided by the plugin (max 200 chars). */
  readonly reason?: string;
}

/**
 * Request object that a plugin submits to ask the host for wallet access.
 * The PluginManager evaluates it against the manifest's declared permissions.
 */
export interface WalletAccessRequest {
  readonly permission: PluginPermission;
  /** Human-readable explanation of why the plugin needs this capability. */
  readonly reason?: string;
}

// ---------------------------------------------------------------------------
// Plugin lifecycle
// ---------------------------------------------------------------------------

/** Lifecycle status of a registered plugin. */
export type PluginStatus =
  | 'registered'  // Added to registry but not yet mounted
  | 'mounting'    // mount() has been called, awaiting resolution
  | 'active'      // Successfully mounted and rendering
  | 'error'       // mount() threw or the sandbox encountered an error
  | 'unmounted';  // Previously active, now torn down

/**
 * Core interface every plugin must implement.
 *
 * The host calls `mount` once when the plugin's sandbox container is ready,
 * and `unmount` when the plugin is removed or the user navigates away.
 * `getWidget` is called to obtain the React element rendered in the plugin grid.
 */
export interface IAppPlugin {
  /** The plugin's static metadata. Must match what was registered. */
  readonly manifest: PluginManifest;

  /**
   * Called by the host once the sandbox DOM container is available.
   * Plugins may use this to set up subscriptions or load async data.
   *
   * @param container - The DOM element inside the sandboxed iframe (or the
   *   shadow-root div in non-iframe mode). Plugins MAY render their own
   *   vanilla JS into this element as an escape hatch, but the recommended
   *   approach is to return a React element from `getWidget` instead.
   * @param context - The read-only SDK context provided by the host.
   */
  mount(container: HTMLElement, context: PluginSDKContext): Promise<void>;

  /**
   * Called by the host when the plugin should clean up subscriptions,
   * timers, and any DOM mutations it made during `mount`.
   */
  unmount(): void;

  /**
   * Returns the React element the host should render inside the plugin card.
   * Called after `mount` resolves. Return `null` to opt out of React rendering
   * (useful when the plugin manages its own DOM subtree via `mount`).
   */
  getWidget(): React.ReactNode;
}

// ---------------------------------------------------------------------------
// SDK context — the typed API surface exposed to plugins
// ---------------------------------------------------------------------------

/**
 * Read-only context object injected into every plugin at mount time.
 * This is the *only* surface through which plugins can access host capabilities.
 *
 * SECURITY NOTE: Private keys, raw connector instances, and cookie values are
 * intentionally absent. Any attempt to access them via other means (e.g. window
 * globals, document.cookie) is blocked by the sandbox's CSP and iframe policies.
 */
export interface PluginSDKContext {
  /**
   * Read-only wallet info. Only populated when the user has connected a wallet
   * AND the plugin declared the corresponding `wallet:read-*` permissions.
   */
  readonly wallet: {
    /** Connected account address, or `null` if not connected / not permitted. */
    readonly address: `0x${string}` | null;
    /** Current chain ID, or `null` if not permitted. */
    readonly chainId: number | null;
  };

  /**
   * Request a capability at runtime. Returns `true` if the host grants it,
   * `false` if the permission was not declared in the manifest or the user
   * denied it.
   *
   * Access attempts are always written to the audit log regardless of outcome.
   */
  requestAccess(request: WalletAccessRequest): Promise<boolean>;

  /**
   * Subscribe to host events. Returns an unsubscribe function.
   * Only events for which the plugin holds a granted permission are emitted.
   */
  on(event: PluginHostEvent, handler: PluginEventHandler): () => void;

  /**
   * Emit a custom event visible only to the host (for analytics / telemetry).
   * The payload is serialised; it must not contain functions or class instances.
   */
  emit(event: string, payload?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Events the host can push down to a mounted plugin. */
export type PluginHostEvent =
  | 'wallet:address-changed'
  | 'wallet:chain-changed'
  | 'wallet:disconnected'
  | 'chain:new-block';

export type PluginEventHandler = (data: unknown) => void;

// ---------------------------------------------------------------------------
// Registry entry — internal host state
// ---------------------------------------------------------------------------

/**
 * Full registry entry stored in the host's plugin store.
 * Combines the plugin instance with runtime state tracked by the host.
 */
export interface PluginRegistryEntry {
  readonly plugin: IAppPlugin;
  status: PluginStatus;
  /** Error message if status === 'error'. */
  errorMessage?: string;
  /** Audit log for this plugin's wallet/capability access attempts. */
  auditLog: WalletAccessAuditEntry[];
  /** Unix timestamp (ms) when the plugin was first registered. */
  readonly registeredAt: number;
}
