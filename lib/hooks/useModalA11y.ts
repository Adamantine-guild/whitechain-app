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
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = containerRef.current!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      // Filter out disabled elements and those with display: none or visibility: hidden
      const focusable = Array.from(focusableElements).filter(el => 
        !el.hasAttribute('disabled') && 
        el.tabIndex !== -1 &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0
      );
      
      if (!focusable.length) return;
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === first || document.activeElement === containerRef.current) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen, containerRef]);
}
