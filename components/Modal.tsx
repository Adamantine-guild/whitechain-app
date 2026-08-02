'use client';

import React, { useEffect, useRef, useCallback, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// useLockBodyScroll — prevents background scrolling while the modal is open.
// ---------------------------------------------------------------------------
function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);
}

// ---------------------------------------------------------------------------
// useAriaHideSiblings — marks all siblings of the portal root as aria-hidden
// so screen readers cannot navigate to background content.
// ---------------------------------------------------------------------------
/** Map from element to its original aria-hidden value (null = no attribute). */
const ariaHiddenStore = new WeakMap<HTMLElement, string | null>();

function useAriaHideSiblings(open: boolean, portalRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open || !portalRef.current) return;

    const hidden: HTMLElement[] = [];
    // Hide all direct children of <body> except the portal root.
    Array.from(document.body.children).forEach((child) => {
      if (child !== portalRef.current && child instanceof HTMLElement) {
        const prev = child.getAttribute('aria-hidden');
        child.setAttribute('aria-hidden', 'true');
        hidden.push(child);
        ariaHiddenStore.set(child, prev);
      }
    });

    return () => {
      hidden.forEach((el) => {
        const restore = ariaHiddenStore.get(el);
        if (restore === null) {
          el.removeAttribute('aria-hidden');
        } else if (restore !== undefined) {
          el.setAttribute('aria-hidden', restore);
        }
        ariaHiddenStore.delete(el);
      });
    };
  }, [open, portalRef]);
}

// ---------------------------------------------------------------------------
// useFocusTrap — traps Tab / Shift+Tab inside the container.
// ---------------------------------------------------------------------------
function useFocusTrap(open: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previousRef = useRef<HTMLElement | null>(null);

  // Save / restore focus on open / close.
  useEffect(() => {
    if (!open) {
      previousRef.current?.focus();
      previousRef.current = null;
      return;
    }
    previousRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element inside the container.
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = Array.from(focusable).find(
        (el) => !el.hasAttribute('disabled') && el.offsetWidth > 0 && el.offsetHeight > 0
      );
      first?.focus();
    });
  }, [open, containerRef]);

  // Trap Tab inside the container.
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape is handled by the parent — we just propagate.
        return;
      }
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const visible = Array.from(focusable).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetWidth > 0 && el.offsetHeight > 0
      );
      if (!visible.length) {
        e.preventDefault();
        return;
      }

      const first = visible[0];
      const last = visible[visible.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [containerRef]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onKeyDown]);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ModalProps {
  /** Whether the modal is visible. */
  open: boolean;
  /** Called when the modal should close (Escape, backdrop click, close button). */
  onClose: () => void;
  /** ID of the element that labels this dialog (the title). */
  labelledBy: string;
  /** Optional ID of the element that describes this dialog (the body text). */
  describedBy?: string;
  /** Modal content. */
  children: ReactNode;
  /** Optional additional class names for the panel wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
/**
 * Accessible modal dialog that follows WAI-ARIA Dialog (Modal) practices.
 *
 * Features:
 * - `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby`
 * - Focus trap with Tab / Shift+Tab cycling
 * - Escape to close
 * - Backdrop click to close
 * - Body scroll lock
 * - `aria-hidden` on background siblings
 * - Focus restoration on close
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  children,
  className = '',
}: ModalProps) {
  const portalRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useLockBodyScroll(open);
  useAriaHideSiblings(open, portalRef);
  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={portalRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative z-10 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;