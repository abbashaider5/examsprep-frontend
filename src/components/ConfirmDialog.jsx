import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';

/**
 * Themed confirmation dialog — same shell as other modals (portal + dark overlay + rounded surface card).
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isPending = false,
}) {
  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
      : 'btn-primary';

  return (
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex gap-4">
            <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
              <AlertTriangle size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-[var(--color-text)] leading-snug">{title}</h3>
              {description && (
                <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">{description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 px-6 py-4 bg-[var(--color-bg-alt)]/60 border-t border-[var(--color-border)]">
          <button type="button" onClick={onClose} disabled={isPending} className="btn-secondary text-sm py-2 px-4">
            {cancelLabel}
          </button>
          <button type="button" onClick={() => onConfirm()} disabled={isPending} className={`text-sm py-2 px-4 rounded-xl font-semibold border transition-colors disabled:opacity-50 ${confirmClass}`}>
            {isPending ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
