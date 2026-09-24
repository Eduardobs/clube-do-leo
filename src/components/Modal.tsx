import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  children: ReactNode;
  label: string;
  onClose: () => void;
  className?: string;
}

export function Modal({ children, label, onClose, className = '' }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    contentRef.current?.querySelector<HTMLElement>('button, input, textarea, a[href]')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !contentRef.current) return;

      const focusable = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={label}>
      <button className="modal__overlay" type="button" onClick={onClose} aria-label={`Fechar ${label}`} />
      <div ref={contentRef} className={`modal__content ${className}`.trim()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">
          <X aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
