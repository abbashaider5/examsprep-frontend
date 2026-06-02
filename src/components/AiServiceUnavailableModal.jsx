import { AlertCircle, ChevronRight, LifeBuoy, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

/**
 * @param {{ open: boolean, onClose: () => void, onRetry?: () => void, presentation: { kind?: string, title?: string, message?: string, helperText?: string, admin?: object } | null }} props
 */
export default function AiServiceUnavailableModal({
  open,
  onClose,
  onRetry,
  presentation,
}) {
  if (!open || !presentation) return null;
  if (typeof document === 'undefined') return null;

  const isAdmin = presentation.kind === 'admin';
  const body = isAdmin ? presentation.admin : presentation;

  return createPortal(
    (
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ai-error-title"
      >
        <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
        <div className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isAdmin
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                }`}
              >
                <AlertCircle className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="ai-error-title" className="text-lg font-bold text-[var(--color-text)]">
                  {isAdmin ? body.title : presentation.title}
                </h2>
                {!isAdmin && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed whitespace-pre-line">
                    {presentation.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-1 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {isAdmin ? (
              <dl className="mt-5 space-y-2 text-sm">
                {[
                  ['Provider', body.provider],
                  ['Error Type', body.errorType],
                  ['Error Code', body.errorCode],
                  ['Model', body.model],
                  ['Tokens', body.tokensUsed != null ? `Used: ${body.tokensUsed}${body.tokensLimit != null ? ` / Limit: ${body.tokensLimit}` : ''}` : '—'],
                  ['Environment', body.environment],
                  ['Time', body.timestamp],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[120px_1fr] gap-2">
                    <dt className="font-semibold text-[var(--color-text-muted)]">{label}</dt>
                    <dd className="text-[var(--color-text)] break-words">{value}</dd>
                  </div>
                ))}
                {body.rawResponse ? (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">Raw Response</p>
                    <pre className="text-xs p-3 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-border)] overflow-x-auto max-h-48 whitespace-pre-wrap">
                      {body.rawResponse}
                    </pre>
                  </div>
                ) : null}
              </dl>
            ) : (
              <>
                {presentation.helperText && (
                  <p className="mt-4 text-xs text-[var(--color-text-muted)] leading-relaxed">
                    {presentation.helperText}
                  </p>
                )}
                <div className="mt-5 rounded-xl border border-teal-200/60 dark:border-teal-800/40 bg-teal-50/80 dark:bg-teal-950/20 px-4 py-3">
                  <p className="text-xs font-semibold text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
                    <LifeBuoy size={14} aria-hidden />
                    Need help?
                  </p>
                  <Link
                    to="/tickets"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                  >
                    Go to Help &amp; Tickets
                    <ChevronRight size={14} aria-hidden />
                  </Link>
                </div>
              </>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
                Close
              </button>
              {onRetry && !isAdmin && (
                <button type="button" className="btn-primary w-full sm:w-auto" onClick={onRetry}>
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    document.body,
  );
}
