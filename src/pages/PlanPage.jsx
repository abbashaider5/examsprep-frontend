import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Calculator, Check, ChevronDown, CreditCard, Download, LayoutDashboard, Layers, Loader2, Receipt, Shield, Users, X, Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { authApi, paymentApi, profileApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const PLAN_INFO = {
  free: { label: 'Free', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', icon: Zap },
  pro: { label: 'Premium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', icon: Shield },
  enterprise: { label: 'Enterprise', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200', border: 'border-indigo-200 dark:border-indigo-800', icon: Building2 },
};

const SUBSCRIPTION_PLANS = [
  {
    id: 'pro',
    name: 'Premium',
    monthlyLimit: 20,
    maxQuestions: 50,
    desc: 'Full instructor toolkit: AI exams, proctoring, analytics, and classroom-ready limits.',
  },
];

/** Fallback if API omits enterprise renewal meta — must match server ENTERPRISE_RENEWAL_DURATION_TIERS. */
const DEFAULT_ENTERPRISE_RENEWAL_META = [
  { months: 1, discountPercent: 20, label: '1 month' },
  { months: 3, discountPercent: 30, label: '3 months' },
  { months: 6, discountPercent: 50, label: '6 months' },
];

/** Mirrors server `subscriptionLifecycleService.addMonthsClamped`. */
function addMonthsClampedClient(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function getPersonalRenewalChainAnchorClient(user, subData) {
  const now = new Date();
  let anchorMs = now.getTime();
  const planExp = user?.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const trialExp = subData?.instructorTrialEndsAt ? new Date(subData.instructorTrialEndsAt) : null;
  if (planExp && planExp > now && ['pro', 'enterprise'].includes(user?.plan)) {
    anchorMs = Math.max(anchorMs, planExp.getTime());
  }
  if (trialExp && trialExp > now) {
    anchorMs = Math.max(anchorMs, trialExp.getTime());
  }
  return new Date(anchorMs);
}

function getEnterpriseRenewalChainAnchorClient(org) {
  if (!org) return new Date();
  const now = new Date();
  let anchorMs = now.getTime();
  if (org.orgPlanExpiresAt && new Date(org.orgPlanExpiresAt) > now) {
    anchorMs = Math.max(anchorMs, new Date(org.orgPlanExpiresAt).getTime());
  }
  if (org.orgTrialEndsAt && new Date(org.orgTrialEndsAt) > now) {
    anchorMs = Math.max(anchorMs, new Date(org.orgTrialEndsAt).getTime());
  }
  return new Date(anchorMs);
}

/** Where a newly purchased term would sit: after anchor + existing pending queue (same as server recompute). */
function computeAppendedQueueTermWindow(anchorDate, pendingQueue, newDurationMonths) {
  const sorted = [...(pendingQueue || [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  let cursor = new Date(anchorDate.getTime());
  for (const q of sorted) {
    const m = Math.floor(Number(q.durationMonths));
    if (m > 0) cursor = addMonthsClampedClient(cursor, m);
  }
  const start = cursor;
  const end = addMonthsClampedClient(cursor, newDurationMonths);
  return { start, end };
}

const CHOSEN_TERM_QUEUE_SLACK_MS = 60_000;

const QUEUE_PLAN_LABEL = {
  pro: 'Premium',
  enterprise: 'Organization',
};

/** Pending renewal queue rows, FIFO order (matches server). */
function sortPendingRenewalQueue(queue) {
  return [...(queue || [])]
    .filter((q) => !q.status || q.status === 'pending')
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

/** Paid terms waiting to apply automatically after the active period ends. */
function UpcomingAutomaticRenewalsCard({ queue, fmtDate, variant }) {
  const pending = sortPendingRenewalQueue(queue);
  if (!pending.length) return null;
  return (
    <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.05] dark:bg-teal-500/[0.07] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center">
          <Layers size={18} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--color-text)] tracking-tight">Upcoming renewals (automatic)</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
            {variant === 'enterprise'
              ? 'These organization terms are paid and queued. Each one starts when the previous period ends — no action needed at rollover.'
              : 'These Premium terms are paid and queued. Each one starts when the previous period ends — no action needed at rollover.'}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        {pending.map((q, idx) => {
          const start = q.activatesAt ? new Date(q.activatesAt) : null;
          const months = Math.floor(Number(q.durationMonths)) || 0;
          const end = start && months > 0 ? addMonthsClampedClient(start, months) : null;
          const planKey = (q.plan || (variant === 'enterprise' ? 'enterprise' : 'pro')).toLowerCase();
          const planName = QUEUE_PLAN_LABEL[planKey] || (variant === 'enterprise' ? 'Organization' : 'Premium');
          return (
            <li
              key={`${q.sequence ?? idx}-${q.activatesAt ?? idx}`}
              className="flex gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs"
            >
              <span className="shrink-0 w-6 h-6 rounded-md bg-[var(--color-bg-alt)] text-[var(--color-text)] text-[11px] font-semibold flex items-center justify-center tabular-nums">
                {idx + 1}
              </span>
              <div className="min-w-0 text-[var(--color-text-muted)] leading-relaxed">
                <p className="font-medium text-[var(--color-text)]">
                  {planName}
                  <span className="font-normal text-[var(--color-text-muted)]">
                    {' · '}
                    <span className="tabular-nums">{months}</span> month{months === 1 ? '' : 's'}
                  </span>
                </p>
                {start && end ? (
                  <p className="mt-1 tabular-nums">
                    Starts <span className="text-[var(--color-text)] font-medium">{fmtDate(start)}</span>
                    {' · '}
                    Ends <span className="text-[var(--color-text)] font-medium">{fmtDate(end)}</span>
                  </p>
                ) : (
                  <p className="mt-1">Activation dates will appear once the queue is finalized.</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PaymentHistoryList({ transactions, loadingTxn, fmtDate, fmtAmount, title, description }) {
  const [invoiceBusyId, setInvoiceBusyId] = useState(null);
  const downloadInvoice = async (txn) => {
    if (txn.status !== 'paid') {
      toast.error('Receipt is available after the payment succeeds.');
      return;
    }
    setInvoiceBusyId(txn._id);
    try {
      const res = await paymentApi.downloadTransactionInvoice(txn._id);
      const blob = new Blob([res.data], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `likhitai-receipt-${txn.receipt || txn._id}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Download failed. Try again or contact support.');
    } finally {
      setInvoiceBusyId(null);
    }
  };
  return (
    <div className="card animate-fade-in">
      <h3 className="font-semibold text-[var(--color-text)] text-sm mb-1 flex items-center gap-2">
        <Receipt size={15} className="text-[var(--color-primary)]" /> {title}
      </h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">{description}</p>
      {loadingTxn ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10">
          <CreditCard size={30} className="mx-auto mb-2 text-[var(--color-border)]" />
          <p className="text-sm text-[var(--color-text-muted)]">No payment activity yet.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[min(480px,55vh)] overflow-y-auto pr-1">
          {transactions.map((txn) => (
            <div
              key={txn._id}
              className="py-3 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-alt)]/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)] capitalize">
                    {txn.purchaseType === 'exam_credits' ? 'Add-on exam credits' : `${txn.plan} plan`}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 tabular-nums">{fmtDate(txn.createdAt)}</p>
                  <div className="mt-2 space-y-0.5 text-[10px] text-[var(--color-text-muted)] font-mono break-all">
                    <p>
                      <span className="text-[var(--color-text-muted)] font-sans">Order ID: </span>
                      {txn.razorpayOrderId || '—'}
                    </p>
                    {txn.razorpayPaymentId ? (
                      <p>
                        <span className="text-[var(--color-text-muted)] font-sans">Payment ID: </span>
                        {txn.razorpayPaymentId}
                      </p>
                    ) : null}
                    {txn.receipt ? (
                      <p>
                        <span className="text-[var(--color-text-muted)] font-sans">Receipt: </span>
                        {txn.receipt}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{fmtAmount(txn.amount)}</p>
                    <p className={`text-xs ${txn.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{txn.status}</p>
                  </div>
                  {txn.status === 'paid' ? (
                    <button
                      type="button"
                      onClick={() => downloadInvoice(txn)}
                      disabled={invoiceBusyId === txn._id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)] text-[var(--color-text)] hover:bg-[var(--color-border)]/30 disabled:opacity-60"
                    >
                      {invoiceBusyId === txn._id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Receipt
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentConfirmModal({
  open,
  onClose,
  onConfirm,
  busy,
  willQueue,
  amountPaise,
  fmtAmount,
  termStart,
  termEnd,
  fmtDate,
}) {
  if (!open || typeof document === 'undefined') return null;

  /** Portal to body: dashboard sidebar uses z-30 while main has no z-index, so in-DOM modals stack under the sidebar. */
  return createPortal(
    <div
      className="fixed inset-0 z-[110000] isolate flex min-h-0 w-full items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-[3px] overflow-x-hidden overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-confirm-title"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onMouseDown={(e) => {
        if (busy) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative z-[1] w-full max-w-[400px] max-h-[min(520px,calc(100dvh-2rem))] my-auto flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--color-border)]/80">
          <h3 id="payment-confirm-title" className="text-[17px] font-semibold text-[var(--color-text)] tracking-[-0.01em]">
            Checkout
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 -mr-1 p-2 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] active:scale-95 transition-transform disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-4 flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Amount</p>
            <p className="text-[2rem] sm:text-[2.25rem] font-semibold text-[var(--color-text)] tabular-nums tracking-tight leading-none">
              {amountPaise != null ? fmtAmount(amountPaise) : '—'}
            </p>
          </div>

          {termStart && termEnd ? (
            <div className="pt-1 border-t border-[var(--color-border)]/70">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Billing period</p>
              <p className="text-[15px] text-[var(--color-text)] tabular-nums font-medium leading-snug">
                {fmtDate(termStart)}
                <span className="text-[var(--color-text-muted)] font-normal mx-1.5">→</span>
                {fmtDate(termEnd)}
              </p>
            </div>
          ) : null}

          {willQueue ? (
            <p className="text-[13px] text-[var(--color-text-muted)] leading-snug">
              Starts automatically after your current plan ends.
            </p>
          ) : null}
        </div>

        <div className="shrink-0 mt-auto px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5 border-t border-[var(--color-border)]/80 bg-[var(--color-surface)] flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full sm:w-auto order-2 sm:order-1 min-h-[44px] px-4 rounded-xl text-[15px] font-medium text-[var(--color-text)] bg-[var(--color-bg-alt)]/80 hover:bg-[var(--color-bg-alt)] border border-transparent disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="w-full sm:min-w-[200px] sm:w-auto order-1 sm:order-2 min-h-[44px] btn-primary text-[15px] font-semibold rounded-xl px-5 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Processing…
              </span>
            ) : (
              'Continue to Razorpay'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ChosenTermScheduleCallout({ start, end, fmtDate }) {
  if (!start || !end) return null;
  const queued = start.getTime() > Date.now() + CHOSEN_TERM_QUEUE_SLACK_MS;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 px-3.5 py-3 mb-6">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
        Billing period (this purchase)
      </p>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
        {queued ? (
          <>
            <span className="tabular-nums font-medium text-[var(--color-text)]">{fmtDate(start)}</span>
            {' · '}
            <span className="tabular-nums font-medium text-[var(--color-text)]">{fmtDate(end)}</span>
            <span className="text-[var(--color-text-muted)]">
              {' '}
              — begins after your current access ends, including any renewals already queued.
            </span>
          </>
        ) : (
          <>
            <span className="tabular-nums font-medium text-[var(--color-text)]">{fmtDate(start)}</span>
            {' · '}
            <span className="tabular-nums font-medium text-[var(--color-text)]">{fmtDate(end)}</span>
            <span className="text-[var(--color-text-muted)]"> — effective dates for the term you are purchasing.</span>
          </>
        )}
      </p>
    </div>
  );
}

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const TAB = { overview: 'overview', plan: 'plan', transactions: 'transactions' };

const PLAN_TABS = [
  { id: TAB.overview, label: 'Overview', icon: LayoutDashboard },
  { id: TAB.plan, label: 'Upgrade & renew', icon: CreditCard },
  { id: TAB.transactions, label: 'Transactions', icon: Receipt },
];

const PRINCIPAL_TABS = [
  { id: TAB.overview, label: 'Overview', icon: LayoutDashboard },
  { id: TAB.plan, label: 'Renew organization', icon: Building2 },
  { id: TAB.transactions, label: 'Payments', icon: Receipt },
];

/** Organization owner: custom enterprise billing only (no individual Premium SKUs). */
function PrincipalBillingView({
  user,
  subData,
  org,
  tab,
  setTab,
  durationMonths,
  setDurationMonths,
  durationOptions,
  selectedTier,
  enterpriseCheckoutPaise,
  orgBillingMonthlyPaise,
  chosenTermWindow,
  loadingKey,
  handleSubscribe,
  fmtDate,
  fmtAmount,
  transactions,
  loadingTxn,
}) {
  const [teamUsageOpen, setTeamUsageOpen] = useState(true);
  const bd = org?.billingBreakdown;
  const tu = org?.teacherExamUsage;
  const agg = tu?.aggregate;
  const pendingOrgRenewals = useMemo(() => sortPendingRenewalQueue(org?.subscriptionRenewalQueue), [org?.subscriptionRenewalQueue]);
  const orgTimelineForDisplay = useMemo(() => {
    const segs = org?.renewalTimeline || [];
    if (!pendingOrgRenewals.length) return segs;
    return segs.filter((s) => s.kind !== 'queued');
  }, [org?.renewalTimeline, pendingOrgRenewals.length]);

  if (!org?.id) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Organization billing</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">No organization is linked to this account yet.</p>
        </div>
        <div className="card border border-amber-500/25 bg-amber-500/[0.04] text-sm text-[var(--color-text-muted)]">
          If you should be a school or institute owner, contact support so we can attach your workspace.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Organization billing</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Custom enterprise terms, usage across your faculty, and renewal — no individual instructor plans.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-[var(--color-border)]">
            <Building2 size={14} className="opacity-80" /> {org.name}
          </span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {PRINCIPAL_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === TAB.overview && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Current monthly charge</p>
              <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums mt-1">
                {bd ? fmtAmount(bd.effectiveMonthlyPaise) : '—'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-snug">
                {bd?.usesManualOverride
                  ? 'Contract rate set by LikhitAI for your organization.'
                  : 'Estimated from admin limits and platform rate card (INR / month).'}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Faculty</p>
              <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums mt-1">
                {org.teacherUsed ?? 0}<span className="text-base font-semibold text-[var(--color-text-muted)]"> / {org.teacherLimit ?? '—'}</span>
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Active teachers vs licensed seats</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Subscription window</p>
              <p className="text-sm font-semibold text-[var(--color-text)] mt-1.5 tabular-nums">
                {org.orgPlanExpiresAt ? fmtDate(org.orgPlanExpiresAt) : org.orgTrialEndsAt ? `Trial · ${fmtDate(org.orgTrialEndsAt)}` : '—'}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Renew or queue a term before expiry</p>
            </div>
          </div>

          {bd?.usesManualOverride && bd.formulaMonthlyPaise != null ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 px-4 py-3 text-xs text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">Formula reference</span>
              {' '}— would be {fmtAmount(bd.formulaMonthlyPaise)} / mo from limits; your invoice uses the agreed {fmtAmount(bd.effectiveMonthlyPaise)} / mo.
            </div>
          ) : null}

          {pendingOrgRenewals.length > 0 ? (
            <UpcomingAutomaticRenewalsCard queue={org.subscriptionRenewalQueue} fmtDate={fmtDate} variant="enterprise" />
          ) : null}

          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <Shield size={15} className="text-[var(--color-primary)]" /> Admin-configured limits
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl bg-[var(--color-bg-alt)] px-3 py-2.5 border border-[var(--color-border)]/80">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Teacher seats</p>
                <p className="font-semibold text-[var(--color-text)] tabular-nums mt-0.5">{bd?.limits?.teacherSeats ?? org.teacherLimit ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-bg-alt)] px-3 py-2.5 border border-[var(--color-border)]/80">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Exams / teacher / mo</p>
                <p className="font-semibold text-[var(--color-text)] tabular-nums mt-0.5">{bd?.limits?.examsPerTeacherMonth ?? org.examsPerTeacherLimit ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-bg-alt)] px-3 py-2.5 border border-[var(--color-border)]/80">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Questions / exam</p>
                <p className="font-semibold text-[var(--color-text)] tabular-nums mt-0.5">{bd?.limits?.questionsPerExam ?? org.questionsPerExamLimit ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-bg-alt)] px-3 py-2.5 border border-[var(--color-border)]/80">
                <p className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">Student cap</p>
                <p className="font-semibold text-[var(--color-text)] tabular-nums mt-0.5">{(bd?.limits?.studentCap ?? org.studentLimit)?.toLocaleString?.() ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-1 flex items-center gap-2">
              <Calculator size={15} className="text-[var(--color-primary)]" /> How this monthly estimate is built
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Rates come from LikhitAI&apos;s enterprise rate card. Your admin sets capacity; we multiply seats, exam slots, and question capacity accordingly.
            </p>
            {bd?.lines?.length ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--color-bg-alt)] text-left text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                      <th className="px-3 py-2 font-semibold">Component</th>
                      <th className="px-3 py-2 font-semibold hidden sm:table-cell">Detail</th>
                      <th className="px-3 py-2 font-semibold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {bd.lines.map((line) => (
                      <tr key={line.id} className="hover:bg-[var(--color-bg-alt)]/40">
                        <td className="px-3 py-2.5 font-medium text-[var(--color-text)]">{line.label}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text-muted)] text-xs hidden sm:table-cell max-w-md">{line.detail}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[var(--color-text)]">{fmtAmount(line.subtotalPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--color-bg-alt)]/80">
                      <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-[var(--color-text)]">Formula subtotal (reference)</td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-[var(--color-text)]">{fmtAmount(bd.formulaSubtotalPaise)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">Breakdown loads with your subscription data.</p>
            )}
          </div>

          {(orgTimelineForDisplay?.length > 0) && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Current access</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-3 leading-relaxed">
                {pendingOrgRenewals.length > 0
                  ? 'Organization trial or paid window only. Queued paid terms that will apply automatically are listed under Upcoming renewals (earlier on this page).'
                  : 'Organization trial or paid subscription window.'}
              </p>
              <ul className="space-y-0">
                {orgTimelineForDisplay.map((seg, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center w-2.5 shrink-0 pt-0.5">
                      <span className={`w-2 h-2 rounded-full ${seg.kind === 'inactive' ? 'bg-[var(--color-border)]' : 'bg-[var(--color-primary)]'}`} />
                      {idx < orgTimelineForDisplay.length - 1 ? <span className="w-px flex-1 min-h-[28px] bg-[var(--color-border)]" /> : null}
                    </div>
                    <div className="pb-4 last:pb-0 flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text)]">{seg.title}</p>
                      {seg.kind === 'current' && seg.endsAt ? (
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 tabular-nums">
                          Access through {fmtDate(seg.endsAt)}{seg.durationMonths ? ` · ${seg.durationMonths}-month term` : ''}
                        </p>
                      ) : null}
                      {seg.kind === 'trial' && seg.endsAt ? (
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 tabular-nums">Trial through {fmtDate(seg.endsAt)}</p>
                      ) : null}
                      {seg.kind === 'inactive' ? (
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Queue a renewal to restore full access.</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setTeamUsageOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[var(--color-bg-alt)]/60 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users size={16} className="text-[var(--color-primary)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)]">Team AI exam usage</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {agg
                      ? `${agg.examsUsedThisMonth.toLocaleString('en-IN')} / ${agg.totalMonthlyAllocation.toLocaleString('en-IN')} exams this month (all teachers)`
                      : 'Loading faculty usage…'}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${teamUsageOpen ? 'rotate-180' : ''}`} />
            </button>
            {teamUsageOpen && (
              <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-bg-alt)]/20">
                {agg && agg.totalMonthlyAllocation > 0 ? (
                  <>
                    <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full ${agg.utilizationPct >= 90 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`}
                        style={{ width: `${agg.utilizationPct}%` }}
                      />
                    </div>
                    {tu?.teachers?.length ? (
                      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] bg-[var(--color-bg-alt)]">
                              <th className="px-3 py-2 font-semibold">Teacher</th>
                              <th className="px-3 py-2 font-semibold text-right">Used</th>
                              <th className="px-3 py-2 font-semibold text-right">Allowance</th>
                              <th className="px-3 py-2 font-semibold text-right hidden sm:table-cell">Remaining</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)]">
                            {tu.teachers.map((row) => (
                              <tr key={row.id} className="hover:bg-[var(--color-bg-alt)]/50">
                                <td className="px-3 py-2.5">
                                  <p className="font-medium text-[var(--color-text)] truncate max-w-[200px]">{row.name}</p>
                                  <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[220px]">{row.email}</p>
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text)]">{row.usedThisMonth}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{row.monthlyCap}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-text-muted)] hidden sm:table-cell">{row.remaining}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No instructors yet. Invite teachers from your enterprise dashboard.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)]">Usage will appear when teachers are active on your plan.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === TAB.plan && (
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[var(--color-border)] bg-gradient-to-br from-teal-500/[0.07] via-transparent to-transparent">
              <h3 className="font-semibold text-[var(--color-text)] text-base tracking-tight flex items-center gap-2">
                <Building2 size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
                Renew your organization
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-2 max-w-2xl">
                Pricing is based on <span className="font-medium text-[var(--color-text)]">your organization&apos;s custom monthly rate</span> (admin limits and contract), not instructor Premium list prices. Longer terms include a loyalty discount on the subtotal.
              </p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-2 max-w-2xl">
                Pay before the current term ends and the new period is <span className="font-medium text-[var(--color-text)]">queued</span> — it starts when access would otherwise lapse; remaining days on the active term are preserved.
              </p>
            </div>
            <div className="p-5 sm:p-6">
              {durationOptions.length > 0 ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">Billing period</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
                    {durationOptions.map((d) => {
                      const active = durationMonths === d.months;
                      return (
                        <button
                          key={d.months}
                          type="button"
                          onClick={() => setDurationMonths(d.months)}
                          className={`rounded-xl border text-left transition-all px-4 py-3.5 ${
                            active
                              ? 'border-teal-500/50 bg-teal-500/[0.08] ring-2 ring-teal-500/20 shadow-sm'
                              : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 hover:border-teal-500/35 hover:bg-[var(--color-bg-alt)]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-sm font-semibold text-[var(--color-text)] capitalize">{d.label}</span>
                            <span
                              className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${
                                d.discountPercent > 0
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                              }`}
                            >
                              {d.discountPercent > 0 ? `${d.discountPercent}% off` : 'List'}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {d.discountPercent > 0 ? (
                              <p className="text-xs text-[var(--color-text-muted)] line-through tabular-nums">
                                {fmtAmount(d.listTotalPaise)} subtotal
                              </p>
                            ) : null}
                            <p className="text-lg font-bold text-[var(--color-text)] tabular-nums">
                              {fmtAmount(d.payableTotalPaise)}
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                              {fmtAmount(d.effectiveMonthlyPaise)} effective / month
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {chosenTermWindow ? (
                    <ChosenTermScheduleCallout start={chosenTermWindow.start} end={chosenTermWindow.end} fmtDate={fmtDate} />
                  ) : null}
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 mb-5 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Summary</p>
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <div>
                        <p className="text-xl font-bold text-[var(--color-text)] tabular-nums tracking-tight">
                          {enterpriseCheckoutPaise != null && selectedTier ? fmtAmount(enterpriseCheckoutPaise) : '—'}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
                          {selectedTier
                            ? `${selectedTier.label} at ${fmtAmount(orgBillingMonthlyPaise)} / month × ${durationMonths}, before term discount.`
                            : '—'}
                        </p>
                      </div>
                      <p className="text-[11px] text-[var(--color-text-muted)] sm:text-right max-w-[220px] leading-snug">
                        Total charged at checkout. Contract reference: {fmtAmount(orgBillingMonthlyPaise)} / month.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary text-sm font-medium rounded-xl px-6 py-2.5 w-full sm:w-auto"
                    disabled={loadingKey.endsWith('-enterprise') || !orgBillingMonthlyPaise || !selectedTier}
                    onClick={() => handleSubscribe('enterprise', { billingScope: 'enterprise', enterpriseId: org.id })}
                  >
                    {loadingKey.endsWith('-enterprise') ? (
                      <span className="inline-flex items-center gap-2 justify-center">
                        <Loader2 size={14} className="animate-spin" /> Processing payment…
                      </span>
                    ) : (
                      'Continue to secure checkout'
                    )}
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text)] mb-1">Monthly rate not available</p>
                  We need a valid organization monthly charge to show renewal options. If this persists, contact support so your contract rate can be configured.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === TAB.transactions && (
        <PaymentHistoryList
          transactions={transactions}
          loadingTxn={loadingTxn}
          fmtDate={fmtDate}
          fmtAmount={fmtAmount}
          title="Invoices & payments"
          description="Order and payment IDs, amounts, and downloadable HTML receipts."
        />
      )}
    </div>
  );
}

export default function PlanPage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [loadingKey, setLoadingKey] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [tab, setTab] = useState(TAB.overview);
  const plan = user?.plan || 'free';
  const isFreePlan = plan === 'free';
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const PlanIcon = planInfo.icon;

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => paymentApi.getSubscription().then((r) => r.data),
  });
  const managedByOrganization = !!(subData?.managedByOrganization || user?.subscriptionBillingManagedByOrg);
  const org = subData?.enterprise ?? user?.enterprise;
  const selfServeInstructor = !managedByOrganization && ['instructor', 'principal', 'admin'].includes(user?.role || '');

  const catalog = subData?.pricingCatalog;
  const durationOptions = useMemo(() => catalog?.durations || [], [catalog?.durations]);
  const selectedTier = useMemo(
    () => durationOptions.find((d) => d.months === durationMonths) || durationOptions[0],
    [durationOptions, durationMonths],
  );

  const { data: txnData, isLoading: loadingTxn } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => paymentApi.getTransactions().then((r) => r.data),
    enabled: selfServeInstructor,
  });
  const transactions = txnData?.transactions || [];

  const updateMut = useMutation({
    mutationFn: (data) => profileApi.update(data),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Plan preferences updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const planExpiryDays = user?.planExpiresAt ? Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / 86400000) : null;
  const expiringSoon = !isFreePlan && typeof planExpiryDays === 'number' && planExpiryDays >= 0 && planExpiryDays <= 7;
  const cap = user?.monthlyLimit || 3;
  const usedExams = user?.examsUsedThisMonth ?? Math.max(0, cap - (user?.remaining ?? cap));
  const usagePct = cap > 0 ? Math.min(100, (usedExams / cap) * 100) : 0;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtAmount = (paise) => `₹${(paise / 100).toFixed(0)}`;

  const orgBillingMonthlyPaise =
    org?.billingMonthlyBasePaise ?? org?.estimatedMonthlyCostPaise ?? org?.estimatedMonthlyCost ?? 0;
  const principalRenewalOptions = useMemo(() => {
    const monthly = Number(orgBillingMonthlyPaise) || 0;
    if (monthly < 1) return [];
    const meta = catalog?.enterpriseRenewalDurations?.length
      ? catalog.enterpriseRenewalDurations
      : DEFAULT_ENTERPRISE_RENEWAL_META;
    return meta.map((t) => {
      const listTotal = monthly * t.months;
      const factor = (100 - t.discountPercent) / 100;
      const payableTotal = Math.max(100, Math.round(listTotal * factor));
      return {
        months: t.months,
        discountPercent: t.discountPercent,
        label: t.label || (t.months === 6 ? '6 months' : t.months === 3 ? '3 months' : '1 month'),
        listTotalPaise: listTotal,
        payableTotalPaise: payableTotal,
        effectiveMonthlyPaise: Math.max(100, Math.round(payableTotal / t.months)),
      };
    });
  }, [catalog?.enterpriseRenewalDurations, orgBillingMonthlyPaise]);

  const selectedPrincipalTier = useMemo(
    () => principalRenewalOptions.find((d) => d.months === durationMonths) || principalRenewalOptions[0],
    [principalRenewalOptions, durationMonths],
  );

  const enterpriseCheckoutPaise = selectedPrincipalTier?.payableTotalPaise ?? null;

  const pendingPersonalRenewals = useMemo(
    () => sortPendingRenewalQueue(subData?.personalRenewalQueue),
    [subData?.personalRenewalQueue],
  );
  const personalTimelineForDisplay = useMemo(() => {
    const segs = subData?.personalRenewalTimeline || [];
    if (!pendingPersonalRenewals.length) return segs;
    return segs.filter((s) => s.kind !== 'queued');
  }, [subData?.personalRenewalTimeline, pendingPersonalRenewals.length]);

  const personalChosenTermWindow = useMemo(() => {
    const m = Number(durationMonths);
    if (![1, 3, 6].includes(m) || !subData) return null;
    const anchor = getPersonalRenewalChainAnchorClient(user, subData);
    return computeAppendedQueueTermWindow(anchor, subData.personalRenewalQueue, m);
  }, [user, subData, durationMonths]);

  const principalChosenTermWindow = useMemo(() => {
    const m = Number(durationMonths);
    if (![1, 3, 6].includes(m) || !org?.id) return null;
    const anchor = getEnterpriseRenewalChainAnchorClient(org);
    return computeAppendedQueueTermWindow(anchor, org.subscriptionRenewalQueue, m);
  }, [org, durationMonths]);

  const proCatalogLimit = subData?.pricingCatalog?.planExamLimits?.pro ?? SUBSCRIPTION_PLANS[0].monthlyLimit;
  const proCatalogMaxQ = subData?.pricingCatalog?.planMaxQuestions?.pro ?? SUBSCRIPTION_PLANS[0].maxQuestions;

  const [checkoutIntent, setCheckoutIntent] = useState(null);

  const handleSubscribe = (planId, opts = {}) => {
    if (user?.role === 'user') {
      toast.error('Upgrades are available on instructor or admin accounts.');
      return;
    }
    setCheckoutIntent({ planId, opts: opts || {} });
  };

  const closeCheckoutModal = () => {
    if (loadingKey) return;
    setCheckoutIntent(null);
  };

  const confirmAndPay = async () => {
    if (!checkoutIntent) return;
    const { planId, opts } = checkoutIntent;
    const billingScope = opts.billingScope || 'personal';
    const enterpriseId = opts.enterpriseId || undefined;
    const loadKey = `${planId}-${durationMonths}-${billingScope}`;
    setLoadingKey(loadKey);
    try {
      const ready = await loadRazorpay();
      if (!ready) {
        toast.error('Payment gateway failed to load.');
        setLoadingKey('');
        return;
      }
      const { data } = await paymentApi.createOrder({
        plan: planId,
        durationMonths,
        billingScope,
        enterpriseId,
      });
      setCheckoutIntent(null);
      const tierLabel =
        billingScope === 'enterprise'
          ? (selectedPrincipalTier?.label || `${durationMonths} month(s)`)
          : (selectedTier?.label || `${durationMonths} month(s)`);
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'LikhitAI',
        description: billingScope === 'enterprise' ? `Organization renewal · ${tierLabel}` : `Premium upgrade · ${tierLabel}`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const me = await authApi.getMe();
            setUser(me.data.user);
            qc.invalidateQueries({ queryKey: ['transactions'] });
            qc.invalidateQueries({ queryKey: ['subscription'] });
            qc.invalidateQueries({ queryKey: ['me'] });
            toast.success('Payment confirmed.');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setLoadingKey('');
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#0d9488' },
        modal: { ondismiss: () => setLoadingKey('') },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment.');
      setLoadingKey('');
    }
  };

  const billingScopeFromIntent = checkoutIntent?.opts?.billingScope || 'personal';
  const onInstructorTrialForModal = subData?.instructorTrialEndsAt && new Date(subData.instructorTrialEndsAt) > new Date();
  const personalWillQueueNext =
    billingScopeFromIntent === 'personal'
    && !onInstructorTrialForModal
    && user?.plan === 'pro'
    && user?.planExpiresAt
    && new Date(user.planExpiresAt) > new Date()
    && (subData?.paidPersonalSubscriptionCount ?? 0) > 0;
  const enterpriseWillQueueNext =
    billingScopeFromIntent === 'enterprise' && !!org?.checkoutWillQueueEnterpriseTerm;
  const modalWillQueue = billingScopeFromIntent === 'enterprise' ? enterpriseWillQueueNext : personalWillQueueNext;
  const modalTermWindow = billingScopeFromIntent === 'enterprise' ? principalChosenTermWindow : personalChosenTermWindow;
  const modalAmountPaise =
    billingScopeFromIntent === 'enterprise' ? enterpriseCheckoutPaise : selectedTier?.payableTotalPaise;

  const paymentConfirmModalEl = (
    <PaymentConfirmModal
      open={!!checkoutIntent}
      onClose={closeCheckoutModal}
      onConfirm={confirmAndPay}
      busy={!!loadingKey}
      willQueue={modalWillQueue}
      amountPaise={modalAmountPaise}
      fmtAmount={fmtAmount}
      termStart={modalTermWindow?.start}
      termEnd={modalTermWindow?.end}
      fmtDate={fmtDate}
    />
  );

  /** Enterprise teachers: read-only org entitlement, no billing UI. */
  if (managedByOrganization) {
    const maxQ = org?.questionsPerExamLimit ?? subData?.maxQuestions ?? 50;
    const examsMo = org?.examsPerTeacherLimit ?? cap;
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Your plan</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Usage and limits from your organization — no individual billing on this account.</p>
        </div>

        <div className="card border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{org?.name || 'Your organization'}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                This subscription is managed by your organization. You can see what is included for you below; upgrades and payments are handled by your administrator.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 p-4 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Exam usage (this month)</p>
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-2xl font-bold text-[var(--color-text)]">{user?.remaining ?? '—'}</span>
                <span className="text-xs text-[var(--color-text-muted)] ml-1">remaining</span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{usedExams} / {cap} used</span>
            </div>
            <div className="bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
              <div className={`h-2 rounded-full ${usagePct >= 90 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${usagePct}%` }} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">AI exams / month</p>
              <p className="text-lg font-semibold text-[var(--color-text)] mt-0.5">{examsMo}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Per-teacher allowance set by your org</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] p-3">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">Questions / exam</p>
              <p className="text-lg font-semibold text-[var(--color-text)] mt-0.5">Up to {maxQ}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] p-3 sm:col-span-2">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">AI proctoring</p>
              <p className="text-sm font-medium text-[var(--color-text)] mt-0.5">
                {org?.aiProctoringEnabled === false ? 'Not enabled for your organization' : 'Included (per org policy)'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role === 'user') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Plan & billing</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Student accounts use LikhitAI for free. Instructors and schools can upgrade from the instructor dashboard.</p>
        </div>
        <div className="card text-center py-10">
          <p className="text-sm text-[var(--color-text-muted)]">No subscription options on student accounts.</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'principal') {
    return (
      <>
        <PrincipalBillingView
          user={user}
          subData={subData}
          org={org}
          tab={tab}
          setTab={setTab}
          durationMonths={durationMonths}
          setDurationMonths={setDurationMonths}
          durationOptions={principalRenewalOptions}
          selectedTier={selectedPrincipalTier}
          enterpriseCheckoutPaise={enterpriseCheckoutPaise}
          orgBillingMonthlyPaise={orgBillingMonthlyPaise}
          chosenTermWindow={principalChosenTermWindow}
          loadingKey={loadingKey}
          handleSubscribe={handleSubscribe}
          fmtDate={fmtDate}
          fmtAmount={fmtAmount}
          transactions={transactions}
          loadingTxn={loadingTxn}
        />
        {paymentConfirmModalEl}
      </>
    );
  }

  const onInstructorTrial = subData?.instructorTrialEndsAt && new Date(subData.instructorTrialEndsAt) > new Date();
  const hasActivePremiumForQueue =
    user?.plan === 'pro'
    && user?.planExpiresAt
    && new Date(user.planExpiresAt) > new Date()
    && !onInstructorTrial;
  const showQueueRenewalHint = hasActivePremiumForQueue && ['instructor', 'admin'].includes(user?.role || '');

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Plan &amp; billing</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Usage, upgrades, renewal queue, and invoices — in one place.
        </p>
        {subData?.instructorTrialEndsAt && new Date(subData.instructorTrialEndsAt) > new Date() && (
          <p className="text-xs text-teal-700 dark:text-teal-400 mt-2 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2">
            Instructor trial through {fmtDate(subData.instructorTrialEndsAt)}. Limits match Premium until then.
          </p>
        )}
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {PLAN_TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === TAB.overview && (
        <div className="space-y-5 animate-fade-in">
          {showQueueRenewalHint && (
            <div className="card border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.06] to-transparent">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Renewal queue</h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3">
                Premium is active through{' '}
                <span className="font-semibold text-[var(--color-text)]">{fmtDate(user.planExpiresAt)}</span>.
                Purchase another 1-, 3-, or 6-month term anytime; it lines up in your queue and starts when this period ends. Unused time is not lost.
              </p>
              <button type="button" className="btn-primary text-sm font-medium py-2 px-4 rounded-xl" onClick={() => setTab(TAB.plan)}>
                Select term &amp; renew
              </button>
            </div>
          )}

          <div className={`card border-2 ${planInfo.border}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-3">Current plan</p>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${planInfo.color}`}>
                <PlanIcon size={13} /> {planInfo.label}
              </div>
              {!isFreePlan && user?.planExpiresAt && (
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums">Active through {fmtDate(user.planExpiresAt)}</span>
              )}
            </div>
            {expiringSoon && (
              <div className="mb-4 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs">
                Access ends soon. Open <span className="font-medium">Upgrade &amp; renew</span> to queue your next term.
              </div>
            )}
            <div className="text-xs text-[var(--color-text-muted)] mb-2">
              Exam usage this month: <span className="font-bold text-[var(--color-text)]">{usedExams} / {cap}</span>
            </div>
            <div className="bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
              <div className={`h-2 rounded-full ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${usagePct}%` }} />
            </div>
            {(user?.examsBonusSlots ?? 0) > 0 && (
              <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
                Includes {user.examsBonusSlots} purchased add-on credit{user.examsBonusSlots === 1 ? '' : 's'} (expire with your paid plan).
              </p>
            )}
            {!isFreePlan && (
              <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Auto-renew preference</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Stored on your profile for reminders.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateMut.mutate({ autoRenew: !user?.autoRenew })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${user?.autoRenew ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${user?.autoRenew ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            )}
          </div>

          {pendingPersonalRenewals.length > 0 ? (
            <UpcomingAutomaticRenewalsCard queue={subData?.personalRenewalQueue} fmtDate={fmtDate} variant="personal" />
          ) : null}

          {(personalTimelineForDisplay?.length > 0) && (
            <div className="card text-sm border border-[var(--color-border)]">
              <p className="font-semibold text-[var(--color-text)] mb-1">Schedule</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-3 leading-relaxed">
                {pendingPersonalRenewals.length > 0
                  ? <>Trial and active access only. Paid terms in your queue appear in <span className="font-medium text-[var(--color-text)]">Upcoming renewals</span> (above).</>
                  : 'Trial and active Premium access.'}
              </p>
              <ul className="space-y-0">
                {personalTimelineForDisplay.map((seg, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center w-2.5 shrink-0 pt-0.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                      {idx < personalTimelineForDisplay.length - 1 ? <span className="w-px flex-1 min-h-[24px] bg-[var(--color-border)]" /> : null}
                    </div>
                    <div className="pb-3 last:pb-0 flex-1">
                      <p className="text-xs font-medium text-[var(--color-text)]">{seg.title}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                        {seg.endsAt ? `Through ${fmtDate(seg.endsAt)}` : '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === TAB.plan && (
        <div className="space-y-6 animate-fade-in">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]/25">
              <h2 className="text-base font-semibold text-[var(--color-text)] tracking-tight flex items-center gap-2">
                <CreditCard size={17} className="text-[var(--color-primary)] shrink-0" />
                Premium
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed max-w-2xl">
                Choose a billing period, then upgrade or queue your next term. Longer commitments reduce the total versus list price.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              {durationOptions.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2.5">Billing period</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {durationOptions.map((d) => {
                      const active = durationMonths === d.months;
                      return (
                        <button
                          key={d.months}
                          type="button"
                          onClick={() => setDurationMonths(d.months)}
                          className={`rounded-xl border px-3.5 py-3 text-left transition-all ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]/20 shadow-sm' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/35'}`}
                        >
                          <div className="text-xs font-semibold text-[var(--color-text)]">{d.label}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)] line-through mt-1 tabular-nums">₹{(d.listTotalPaise / 100).toFixed(0)} list</div>
                          <div className="text-sm font-bold text-[var(--color-text)] tabular-nums mt-0.5">₹{(d.payableTotalPaise / 100).toFixed(0)}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)] mt-1 tabular-nums">
                            ~₹{((d.effectiveMonthlyPaise ?? d.payableTotalPaise / d.months) / 100).toFixed(0)} / mo
                          </div>
                          {d.discountPercent > 0 ? (
                            <div className="inline-flex mt-1.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">{d.discountPercent}% off</div>
                          ) : (
                            <div className="inline-flex mt-1.5 text-[9px] font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] px-1.5 py-0.5 rounded-md">List price</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedTier && selectedTier.savingsPaise > 0 && (
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-3">
                      Save <span className="font-semibold text-[var(--color-text)] tabular-nums">₹{(selectedTier.savingsPaise / 100).toFixed(0)}</span> vs list for this period.
                    </p>
                  )}
                </div>
              )}

              {personalChosenTermWindow && durationOptions.length > 0 ? (
                <ChosenTermScheduleCallout
                  start={personalChosenTermWindow.start}
                  end={personalChosenTermWindow.end}
                  fmtDate={fmtDate}
                />
              ) : null}

              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 p-4 sm:p-5">
                {SUBSCRIPTION_PLANS.map((p) => {
                  const isCurrent = plan === p.id && !isFreePlan;
                  const busy = loadingKey === `${p.id}-${durationMonths}-personal`;
                  const ctaLabel = busy
                    ? 'Processing…'
                    : isCurrent
                      ? `Queue renewal — ${selectedTier?.label || 'Premium'}`
                      : `Upgrade — ${selectedTier?.label || 'Premium'}`;
                  return (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
                          <h3 className="text-sm font-semibold text-[var(--color-text)]">{p.name}</h3>
                          {isCurrent ? (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-primary)]">Current plan</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-4">{p.desc}</p>
                        <ul className="text-[11px] text-[var(--color-text-muted)] space-y-1.5">
                          <li className="flex gap-2"><Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />{proCatalogLimit} AI exams / month (calendar month)</li>
                          <li className="flex gap-2"><Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />Up to {proCatalogMaxQ} questions per exam</li>
                          <li className="flex gap-2"><Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />Proctoring and analytics</li>
                          <li className="flex gap-2"><Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />Listening, resources, coding, AI generation</li>
                        </ul>
                      </div>
                      <div className="shrink-0 w-full sm:w-auto sm:min-w-[200px] flex flex-col items-stretch sm:items-end gap-2 pt-1 sm:pt-0 border-t border-[var(--color-border)] sm:border-0 sm:pl-4">
                        {selectedTier ? (
                          <p className="text-right w-full sm:w-auto">
                            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide block mb-0.5">Due today</span>
                            <span className="text-lg font-bold text-[var(--color-text)] tabular-nums">₹{(selectedTier.payableTotalPaise / 100).toFixed(0)}</span>
                          </p>
                        ) : null}
                        <button
                          type="button"
                          className={`w-full sm:w-auto min-h-[40px] px-5 rounded-xl text-sm font-medium transition-colors ${isCurrent ? 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]' : 'btn-primary'}`}
                          disabled={busy || !selectedTier}
                          onClick={() => handleSubscribe(p.id)}
                        >
                          {busy ? <span className="inline-flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Processing…</span> : ctaLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === TAB.transactions && (
        <PaymentHistoryList
          transactions={transactions}
          loadingTxn={loadingTxn}
          fmtDate={fmtDate}
          fmtAmount={fmtAmount}
          title="Invoices & payments"
          description="Order and payment IDs, amounts, and downloadable HTML receipts."
        />
      )}
      {paymentConfirmModalEl}
    </div>
  );
}
