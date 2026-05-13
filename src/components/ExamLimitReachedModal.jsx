import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, TrendingUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Modal from './Modal.jsx';
import { authApi, paymentApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function ExamLimitReachedModal({ open, onClose, managedByOrganization = false }) {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [qty, setQty] = useState(10);
  const [paying, setPaying] = useState(false);

  const { data: subData, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => paymentApi.getSubscription().then((r) => r.data),
    enabled: open && !managedByOrganization,
    staleTime: 0,
  });

  const catalog = subData?.pricingCatalog;
  const unitPaise = catalog?.additionalExamCreditPricePaise ?? 9900;
  const unitInr = unitPaise / 100;
  const totalPaise = Math.round(Math.max(1, qty) * unitPaise);
  const totalInr = totalPaise / 100;

  const planLabel = useMemo(() => {
    const p = user?.plan;
    if (p === 'pro') return 'Premium';
    if (p === 'enterprise') return 'Enterprise';
    return 'Free';
  }, [user?.plan]);

  const hasPaidPlan =
    (user?.plan === 'pro' || user?.plan === 'enterprise')
    && user?.planExpiresAt
    && new Date(user.planExpiresAt) > new Date();

  const daysLeft = user?.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const buyCreditsMut = useMutation({
    mutationFn: async () => {
      const ready = await loadRazorpay();
      if (!ready) throw new Error('Payment gateway failed to load.');
      const { data } = await paymentApi.createOrder({
        purchaseType: 'exam_credits',
        quantity: Math.floor(Number(qty)) || 1,
      });
      return new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'LikhitAI',
          description: `Additional exam credits (${data.examCreditQuantity})`,
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
              qc.invalidateQueries({ queryKey: ['subscription'] });
              qc.invalidateQueries({ queryKey: ['me'] });
              toast.success('Credits added to your account');
              resolve();
              onClose();
            } catch (e) {
              reject(e);
            }
          },
          prefill: { name: user?.name, email: user?.email },
          theme: { color: '#0d9488' },
          modal: { ondismiss: () => resolve() },
        });
        rzp.on('payment.failed', () => reject(new Error('Payment failed')));
        rzp.open();
      });
    },
  });

  const handleBuy = async () => {
    if (!hasPaidPlan) {
      toast.error('Add-on credits require an active paid plan. Upgrade first.');
      return;
    }
    setPaying(true);
    try {
      await buyCreditsMut.mutateAsync();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Checkout failed');
    } finally {
      setPaying(false);
    }
  };

  if (!open) return null;

  const used = subData?.examsCreatedThisMonth ?? user?.examsUsedThisMonth ?? 0;
  const cap = subData?.monthlyLimit ?? user?.monthlyLimit ?? 0;
  const remaining = subData?.remaining ?? user?.remaining ?? 0;
  const baseIncl = subData?.baseMonthlyIncluded ?? user?.examsBaseIncluded ?? cap;
  const bonus = subData?.bonusExamCredits ?? user?.examsBonusSlots ?? 0;

  if (managedByOrganization) {
    return (
      <Modal onClose={onClose}>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
                <Sparkles size={12} aria-hidden /> LikhitAI
              </p>
              <h2 className="text-lg font-semibold text-[var(--color-text)] mt-1">Monthly exam limit reached</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">
                Your organization sets how many AI exams you can create each month. Billing and plan changes are managed by your school or institute — not from this account.
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)]" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-4 space-y-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/60 px-4 py-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Organization</span>
                <span className="font-medium text-[var(--color-text)]">{user?.enterprise?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Used this month</span>
                <span className="font-medium text-[var(--color-text)]">{used} / {cap || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Remaining</span>
                <span className="font-medium text-[var(--color-text)]">{typeof remaining === 'number' ? remaining : '—'}</span>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              If you need a higher allowance or add-on access, contact your principal or organization administrator.
            </p>
            <button type="button" onClick={onClose} className="w-full btn-primary text-sm py-2.5 rounded-xl">
              Understood
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)] flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
              <Sparkles size={12} aria-hidden /> LikhitAI
            </p>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mt-1">Exam generation limit</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">
              You have reached your exam generation limit for this period. Upgrade or add credits to keep building.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-[var(--color-primary)]" size={22} />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/60 px-4 py-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Current plan</span>
                  <span className="font-medium text-[var(--color-text)]">{planLabel}</span>
                </div>
                {typeof daysLeft === 'number' && hasPaidPlan && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Plan renews / ends in</span>
                    <span className="font-medium text-[var(--color-text)]">{daysLeft} day{daysLeft === 1 ? '' : 's'}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Used this month</span>
                  <span className="font-medium text-[var(--color-text)]">{used} / {cap || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--color-text-muted)]">Remaining</span>
                  <span className="font-medium text-[var(--color-text)]">{remaining}</span>
                </div>
                {bonus > 0 && (
                  <p className="text-[10px] text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
                    Includes {baseIncl} from your plan and {bonus} add-on credit{bonus === 1 ? '' : 's'} (valid until your plan ends).
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  to="/plan"
                  onClick={onClose}
                  className="btn-primary text-center text-sm py-2.5 rounded-xl inline-flex items-center justify-center gap-2"
                >
                  <TrendingUp size={15} aria-hidden /> View plans & durations
                </Link>
              </div>

              <div className="rounded-xl border border-[var(--color-border)] p-4 space-y-3">
                <p className="text-xs font-medium text-[var(--color-text)]">Purchase additional exam credits</p>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Credits stack with your monthly allowance and expire when your paid plan ends. They do not extend plan duration.
                </p>
                <div className="flex items-center gap-2">
                  <label htmlFor="exam-credit-qty" className="text-xs text-[var(--color-text-muted)] shrink-0">Quantity</label>
                  <input
                    id="exam-credit-qty"
                    type="number"
                    min={1}
                    max={500}
                    className="input text-sm flex-1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--color-text)]">
                  <span className="text-[var(--color-text-muted)]">Per exam</span>
                  <span>₹{unitInr.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-[var(--color-text)]">
                  <span>Estimated total</span>
                  <span>₹{totalInr.toFixed(0)}</span>
                </div>
                <button
                  type="button"
                  disabled={!hasPaidPlan || paying || buyCreditsMut.isPending}
                  onClick={() => void handleBuy()}
                  className="w-full btn-secondary text-sm py-2.5 rounded-xl disabled:opacity-50"
                >
                  {paying || buyCreditsMut.isPending ? (
                    <span className="inline-flex items-center gap-2 justify-center"><Loader2 size={14} className="animate-spin" /> Processing…</span>
                  ) : (
                    'Buy credits securely'
                  )}
                </button>
                {!hasPaidPlan && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-300/90">Upgrade to Premium first to unlock add-on credits.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
