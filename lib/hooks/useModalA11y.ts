import { useEffect, useRef } from 'react';

/**
 * A hook to improve accessibility for modals and dropdowns:
 * - Traps focus inside the provided container when open
 * - Closes the modal on Escape key press
 * - Returns focus to the element that triggered the modal when it closes
 */
export function useModalA11y(isOpen: boolean, onClose: () => void, containerRef: React.RefObject<HTMLElement>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the first focusable element inside the container after a short delay
      // to allow for rendering
      setTimeout(() => {
        if (containerRef.current) {
          const focusable = containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length) {
            focusable[0].focus();
          }
        }
      }, 0);
    } else {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen, containerRef]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          el.tabIndex !== -1 &&
          el.offsetWidth > 0 &&
          el.offsetHeight > 0
      );

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (!focusable.length) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // If focus has escaped the container (e.g. tabbed into the backdrop),
      // bring it back inside instead of letting it wander behind the modal.
      if (!container.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey) {
        // Shift + Tab
        if (active === first || active === container) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen, containerRef]);
}
