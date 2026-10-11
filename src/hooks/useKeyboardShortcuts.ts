import { useEffect } from 'react';

interface ShortcutHandlers {
  onSearchFocus?: () => void;
  onCustomerModal?: () => void;
  onCustomerHistory?: () => void;
  onCashMovement?: () => void;
  onCashSummary?: () => void;
  onDashboard?: () => void;
  onCheckout?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default behaviors for F keys when appropriate
      if (e.key === 'F2') {
        e.preventDefault();
        handlers.onSearchFocus?.();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handlers.onCustomerModal?.();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handlers.onCashMovement?.();
      } else if (e.key === 'F6') {
        e.preventDefault();
        handlers.onCustomerHistory?.();
      } else if (e.key === 'F7') {
        e.preventDefault();
        handlers.onCashSummary?.();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handlers.onDashboard?.();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handlers.onCheckout?.();
      } else if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
