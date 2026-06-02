import { ChevronRight } from 'lucide-react';

export default function CurrentPlanHero({
  planName,
  statusLabel,
  statusTone,
  expiresAt,
  autoPayEnabled,
  nextBillingDate,
  usedExams,
  cap,
  usagePct,
  fmtDate,
  onViewFeatures,
  planIcon: PlanIcon,
  planBadgeClass,
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg-alt)]/40 shadow-sm overflow-hidden">
      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Current plan</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight flex items-center gap-2">
                {PlanIcon ? <PlanIcon size={22} className="text-[var(--color-primary)]" /> : null}
                {planName}
              </h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusTone}`}>{statusLabel}</span>
            </div>
          </div>
          {onViewFeatures ? (
            <button
              type="button"
              onClick={onViewFeatures}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline shrink-0"
            >
              View plan features <ChevronRight size={14} />
            </button>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Expires</p>
            <p className="font-medium text-[var(--color-text)] mt-0.5 tabular-nums">{expiresAt ? fmtDate(expiresAt) : '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">AutoPay</p>
            <p className="font-medium text-[var(--color-text)] mt-0.5">{autoPayEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
              {autoPayEnabled ? 'Next payment' : 'Next billing'}
            </p>
            <p className="font-medium text-[var(--color-text)] mt-0.5 tabular-nums">{nextBillingDate ? fmtDate(nextBillingDate) : '—'}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Usage</p>
            <p className="font-medium text-[var(--color-text)] mt-0.5 tabular-nums">
              {usedExams} / {cap} exams
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1.5">
            <span>Monthly exam usage</span>
            <span className="tabular-nums font-medium text-[var(--color-text)]">{Math.round(usagePct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'
              }`}
              style={{ width: `${Math.min(100, usagePct)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
