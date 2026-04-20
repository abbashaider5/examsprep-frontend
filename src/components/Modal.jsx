import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal-based modal that renders directly into document.body.
 * This bypasses all stacking context / overflow:hidden issues in the layout.
 * Also locks body scroll while open.
 *
 * Usage:
 *   <Modal onClose={handleClose}>
 *     <div className="bg-[var(--color-surface)] rounded-2xl ...">...</div>
 *   </Modal>
 */
export default function Modal({ children, onClose, className = '' }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 ${className}`}
      onClick={onClose}
    >
      {/* Stop propagation so clicks inside don't close the modal */}
      <div className="animate-slide-up" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
