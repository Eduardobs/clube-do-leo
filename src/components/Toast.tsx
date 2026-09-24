import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({ message, onDismiss, actionLabel, onAction }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className="toast-group" role="status" aria-live="polite">
      <div className="toast">{message}</div>
      {actionLabel && onAction ? (
        <button type="button" className="toast-cart-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
