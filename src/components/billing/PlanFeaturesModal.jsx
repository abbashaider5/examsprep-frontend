import { X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { groupFeaturesByCategory, planLimitHighlights } from '../../utils/planFeatures.js';

export default function PlanFeaturesModal({ open, onClose, planName, limits, featureList }) {
  if (!open || typeof document === 'undefined') return null;

  const limitRows = planLimitHighlights(limits);
  const groups = groupFeaturesByCategory(featureList || []);

  return createPortal(
    <div
      className="fixed inset-0 z-[110000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-features-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg max-h-[min(85vh,640px)] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Plan features</p>
            <h2 id="plan-features-title" className="text-lg font-semibold text-[var(--color-text)] tracking-tight">{planName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {limitRows.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Limits</h3>
              <ul className="space-y-1.5">
                {limitRows.map((row) => (
                  <li key={row.key} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                    <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {row.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {groups.map((group) => (
            <section key={group.id}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">{group.label}</h3>
              <ul className="space-y-1.5">
                {group.items.map((f) => (
                  <li key={f.key} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                    <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    {f.label}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-[var(--color-border)]">
          <button type="button" onClick={onClose} className="w-full btn-secondary text-sm py-2.5 rounded-xl">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
