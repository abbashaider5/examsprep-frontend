import { Check, Loader2 } from 'lucide-react';
import { computeUpgradeDeltas, getPlanCardPreview } from '../../utils/planFeatures.js';

function PricingBlock({ quote, fmtAmount }) {
  const planCost = quote?.planCostPaise ?? 0;
  const credit = quote?.creditAppliedPaise ?? 0;
  const payable = quote?.payablePaise ?? planCost;
  const showCredit = credit > 0;

  return (
    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
      {showCredit ? (
        <div className="space-y-1 text-xs text-[var(--color-text-muted)] mb-3">
          <div className="flex justify-between gap-2">
            <span>Plan price</span>
            <span className="tabular-nums text-[var(--color-text)]">{fmtAmount(planCost)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Credit applied</span>
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">− {fmtAmount(credit)}</span>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-[var(--color-text-muted)] mb-1">Plan price</p>
      )}
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">You pay</p>
      <p className="text-3xl font-bold text-[var(--color-text)] tabular-nums tracking-tight leading-none mt-0.5">
        {fmtAmount(payable)}
      </p>
    </div>
  );
}

export default function UpgradePlanCard({
  plan,
  quote,
  currentPlan,
  fmtAmount,
  busy,
  disabled,
  onUpgrade,
  onViewFeatures,
}) {
  const preview = getPlanCardPreview(plan);
  const deltas = currentPlan ? computeUpgradeDeltas(currentPlan, plan) : preview.bullets.map((b) => ({ label: b.label, type: b.type }));
  const showDeltas = deltas.length > 0;

  return (
    <article className="flex flex-col h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm hover:border-[var(--color-primary)]/30 transition-colors">
      <div className="flex-1 min-h-0">
        <h3 className="text-lg font-semibold text-[var(--color-text)] tracking-tight">{plan.name}</h3>
        {plan.description ? (
          <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-2 leading-relaxed">{plan.description}</p>
        ) : null}

        {currentPlan && showDeltas ? (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              What you gain
            </p>
            <ul className="space-y-1.5">
              {deltas.slice(0, 8).map((d, i) => (
                <li key={`${d.label}-${i}`} className="flex gap-2 text-sm text-[var(--color-text)]">
                  <Check size={14} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <span>{d.label}</span>
                </li>
              ))}
            </ul>
            {deltas.length > 8 ? (
              <p className="text-[11px] text-[var(--color-text-muted)] mt-2">+{deltas.length - 8} more improvements</p>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {preview.bullets.map((b) => (
              <li key={b.key || b.label} className="flex gap-2 text-sm text-[var(--color-text)]">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                {b.label}
              </li>
            ))}
          </ul>
        )}

        {preview.hiddenFeatureCount > 0 && (
          <button
            type="button"
            onClick={() => onViewFeatures(plan)}
            className="mt-3 text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            + {preview.hiddenFeatureCount} more feature{preview.hiddenFeatureCount === 1 ? '' : 's'} · View all
          </button>
        )}
      </div>

      <PricingBlock quote={quote} fmtAmount={fmtAmount} />

      <button
        type="button"
        className="mt-4 w-full min-h-[42px] btn-primary text-sm font-semibold rounded-xl disabled:opacity-50"
        disabled={disabled || busy || !quote?.allowedImmediate}
        onClick={() => onUpgrade(plan.code)}
      >
        {busy ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Processing…
          </span>
        ) : (
          `Upgrade to ${plan.name}`
        )}
      </button>
    </article>
  );
}
