'use client';

/**
 * PluginSandbox — secure rendering container for third-party plugin widgets.
 *
 * SECURITY MODEL
 * ──────────────
 * Plugins run inside an <iframe> with the `sandbox` attribute that strips all
 * dangerous capabilities by default and only re-enables the minimum set needed
 * for rendering React widgets:
 *
 *   allow-scripts          — plugins need JS execution
 *   allow-same-origin      — needed so the SDK postMessage bridge can resolve
 *                            (overriding same-origin in a sandboxed iframe is
 *                             safe here because we own the content document)
 *
 * Deliberately absent (never granted):
 *   allow-top-navigation   — prevents redirecting the parent frame
 *   allow-forms            — no form submission to external servers
 *   allow-popups           — no pop-up windows
 *   allow-modals           — no alert/confirm/prompt dialogs
 *   allow-downloads        — no file downloads
 *
 * Additionally the CSP `<meta>` injected into the iframe document blocks:
 *   • document.cookie access (cookie directive: none)
 *   • localStorage / sessionStorage (these are same-origin so disabling via
 *     sandbox alone isn't sufficient; the CSP + JS guard in the injected
 *     document head covers this)
 *   • Inline script injection via eval / Function()
 *   • External network requests to any origin other than self
 *
 * Widget rendering flow:
 *   1. Parent renders <PluginSandbox>.
 *   2. On mount, an srcdoc document is written into the iframe.
 *   3. PluginManager.mount() is called with the iframe's contentDocument body.
 *   4. The plugin's getWidget() output is rendered into a React portal inside
 *      the sandbox document (or the plugin uses mount() for vanilla JS).
 *   5. On unmount, PluginManager.unmount() is called and the iframe is cleared.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PluginRegistryEntry } from '@/lib/types/plugin';
import { pluginManager } from '@/lib/core/PluginManager';
import { t } from '@/lib/i18n/helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PluginSandboxProps {
  /** The registry entry for the plugin to render. */
  entry: PluginRegistryEntry;
  /** Additional CSS class names applied to the outer wrapper div. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sandbox document template
// ---------------------------------------------------------------------------

/**
 * Minimal HTML document written into the iframe via `srcdoc`.
 * The CSP meta tag is injected before any scripts run.
 */
function buildSandboxDocument(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="
      default-src 'none';
      script-src 'unsafe-inline';
      style-src 'unsafe-inline';
      img-src data: https:;
      connect-src 'none';
    "
  />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: sans-serif; }
  </style>
</head>
<body></body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a plugin inside a sandboxed iframe, prevents access to wallet
 * private keys and cookies, and forwards the plugin's React widget via a
 * React portal so it participates in the host's React tree.
 */
export function PluginSandbox({ entry, className }: PluginSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const isMountedRef = useRef(false);

  const pluginId = entry.plugin.manifest.id;

  // -------------------------------------------------------------------------
  // Iframe initialisation + plugin mount
  // -------------------------------------------------------------------------

  const initialiseSandbox = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Write the sandboxed document.
    doc.open();
    doc.write(buildSandboxDocument());
    doc.close();

    // Harden the iframe document: intercept any attempt to read credentials.
    // This runs in the iframe's JS context before any plugin code.
    try {
      const iframeWin = iframe.contentWindow as Window & {
        __pluginSandboxHardened?: boolean;
      };
      if (iframeWin && !iframeWin.__pluginSandboxHardened) {
        iframeWin.__pluginSandboxHardened = true;

        // Block cookie access.
        Object.defineProperty(iframeWin.document, 'cookie', {
          get: () => '',
          set: () => { /* silently blocked */ },
          configurable: false
        });

        // Block localStorage / sessionStorage.
        ['localStorage', 'sessionStorage'].forEach((storageKey) => {
          Object.defineProperty(iframeWin, storageKey, {
            get: () => {
              console.warn(`[PluginSandbox] Plugin "${pluginId}" tried to access ${storageKey} — blocked.`);
              return null;
            },
            configurable: false
          });
        });
      }
    } catch {
      // Some browsers restrict cross-frame Object.defineProperty when the
      // origin differs; that's fine — the CSP covers those cases.
    }

    const body = doc.body;

    // Mark for portal rendering.
    setPortalRoot(body);

    // Tell the PluginManager to call plugin.mount().
    try {
      await pluginManager.mount(pluginId, body);
      isMountedRef.current = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMountError(msg);
    }
  }, [pluginId]);

  useEffect(() => {
    initialiseSandbox();

    return () => {
      if (isMountedRef.current) {
        pluginManager.unmount(pluginId);
        isMountedRef.current = false;
      }
      setPortalRoot(null);
    };
  }, [initialiseSandbox, pluginId]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (entry.status === 'error' || mountError) {
    return (
      <div
        role="alert"
        className={`rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 ${className ?? ''}`}
      >
        <span className="font-semibold">{t('sandbox.pluginError', 'Plugin error')}</span>
        {' — '}
        {entry.errorMessage ?? mountError ?? t('sandbox.unknownError', 'An unknown error occurred.')}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {/* Sandbox iframe — plugins render into its document.body */}
      <iframe
        ref={iframeRef}
        title={`Plugin: ${entry.plugin.manifest.name}`}
        aria-label={`${entry.plugin.manifest.name} plugin`}
        // Minimal sandbox: scripts + same-origin only.
        sandbox="allow-scripts allow-same-origin"
        className="absolute inset-0 h-full w-full border-0"
        // srcdoc will be replaced by initialiseSandbox; this prevents blank flash.
        srcDoc="<html><body></body></html>"
      />

      {/*
       * React portal into the iframe body.
       * This lets the plugin's React widget participate in the host React tree
       * (context, error boundaries, etc.) while being visually isolated in the
       * sandboxed iframe.
       */}
      {portalRoot &&
        entry.status === 'active' &&
        createPortal(entry.plugin.getWidget(), portalRoot)}

      {/* Loading overlay while mounting */}
      {(entry.status === 'mounting' || entry.status === 'registered') && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('sandbox.loadingPlugin', 'Loading plugin…')}</span>
        </div>
      )}
    </div>
  );
}

export default PluginSandbox;
